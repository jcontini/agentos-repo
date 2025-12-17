#!/usr/bin/env node
/**
 * Browser automation script using Playwright
 * 
 * Captures console logs, errors, and network activity for debugging.
 * Screenshots are optional and expensive (tokens) - use sparingly.
 * 
 * For run_flow: Resolves element selectors to screen coordinates,
 * then executes OS-level input actions via AgentOS for screen recording.
 * 
 * Session Management:
 * - start_session: Launch browser server, keep it running
 * - Other actions can use session_id to connect to existing browser
 * - end_session: Close the browser server
 */

import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const action = process.env.PARAM_ACTION || process.argv[2];
const url = process.env.PARAM_URL;
const selector = process.env.PARAM_SELECTOR;
const text = process.env.PARAM_TEXT;
const script = process.env.PARAM_SCRIPT;
const actionsJson = process.env.PARAM_ACTIONS;
const sessionId = process.env.PARAM_SESSION_ID;
const waitMs = parseInt(process.env.PARAM_WAIT_MS || '1000', 10);
const includeScreenshot = process.env.PARAM_SCREENSHOT === 'true';
const headless = process.env.SETTING_HEADLESS !== 'false';
const slowMo = parseInt(process.env.SETTING_SLOW_MO || '0', 10);
const timeout = parseInt(process.env.SETTING_TIMEOUT || '30', 10) * 1000;
const locale = process.env.SETTING_LOCALE || 'en-US';
const userAgentSetting = process.env.SETTING_USER_AGENT || 'chrome';

const userAgents = {
  chrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
};

const userAgent = userAgents[userAgentSetting] || userAgents.chrome;
const downloadsDir = process.env.AGENTOS_DOWNLOADS || join(homedir(), 'Downloads');

// Session storage
const sessionsDir = join(homedir(), '.agentos');
const sessionsFile = join(sessionsDir, 'browser-sessions.json');

function loadSessions() {
  try {
    if (existsSync(sessionsFile)) {
      return JSON.parse(readFileSync(sessionsFile, 'utf-8'));
    }
  } catch (e) {
    // Ignore errors, return empty
  }
  return {};
}

function saveSessions(sessions) {
  try {
    if (!existsSync(sessionsDir)) {
      mkdirSync(sessionsDir, { recursive: true });
    }
    writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
  } catch (e) {
    console.error('Failed to save sessions:', e.message);
  }
}

function generateSessionId() {
  return 'session_' + Math.random().toString(36).substring(2, 10);
}

/**
 * Start a persistent browser session.
 * Spawns a daemon process that keeps the browser alive.
 */
async function startSession(initialUrl) {
  const newSessionId = generateSessionId();
  
  // Path to daemon script
  const daemonScript = join(__dirname, 'browser-daemon.mjs');
  
  // Spawn daemon as detached background process
  const args = [daemonScript, newSessionId];
  if (initialUrl) {
    args.push(initialUrl);
  }
  
  const daemon = spawn('node', args, {
    detached: true,
    stdio: 'ignore', // Don't inherit stdio so parent can exit
    cwd: __dirname,
  });
  
  // Unref so parent can exit independently
  daemon.unref();
  
  // Wait for daemon to be ready (poll sessions file)
  const maxWait = 30000; // 30 seconds max (navigation can take time)
  const pollInterval = 300;
  let waited = 0;
  
  while (waited < maxWait) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    waited += pollInterval;
    
    const sessions = loadSessions();
    const session = sessions[newSessionId];
    
    // Accept 'ready' or 'active' - both mean browser is running
    if (session && (session.status === 'active' || session.status === 'ready') && session.cdpEndpoint) {
      // Wait a tiny bit more if still navigating
      if (session.status === 'ready' && initialUrl) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return {
        success: true,
        session_id: newSessionId,
        cdp_endpoint: session.cdpEndpoint,
        message: initialUrl 
          ? `Browser session started on ${initialUrl}. Use session_id "${newSessionId}" for subsequent actions.`
          : `Browser session started. Use session_id "${newSessionId}" in subsequent actions.`,
      };
    }
  }
  
  // Timeout - something went wrong
  return {
    success: false,
    error: `Session ${newSessionId} did not become ready within ${maxWait/1000} seconds. Check if Playwright is installed.`,
  };
}

/**
 * End a persistent browser session.
 * Kills the daemon process and cleans up.
 */
async function endSession(sessionIdToEnd) {
  const sessions = loadSessions();
  const session = sessions[sessionIdToEnd];
  
  if (!session) {
    return {
      success: false,
      error: `Session not found: ${sessionIdToEnd}`
    };
  }
  
  // Kill the daemon process if we have its PID
  if (session.pid) {
    try {
      process.kill(session.pid, 'SIGTERM');
    } catch (e) {
      // Process might already be dead
    }
  }
  
  // Also try to close via CDP in case daemon didn't clean up
  if (session.cdpEndpoint) {
    try {
      const browser = await chromium.connectOverCDP(session.cdpEndpoint);
      await browser.close();
    } catch (e) {
      // Browser might already be closed
    }
  }
  
  // Remove from sessions
  delete sessions[sessionIdToEnd];
  saveSessions(sessions);
  
  return {
    success: true,
    message: `Session ${sessionIdToEnd} closed.`
  };
}

/**
 * Get browser and page for a session, or launch new browser if no session.
 * Returns { browser, page, isSession } or throws error.
 */
async function getBrowserAndPage(sessionIdParam, urlParam) {
  if (sessionIdParam) {
    // Use existing session via CDP - this lets us see the SAME pages
    const sessions = loadSessions();
    const session = sessions[sessionIdParam];
    
    if (!session) {
      throw new Error(`Session not found: ${sessionIdParam}. Start a new session with start_session.`);
    }
    
    try {
      // Connect via CDP - this gives us access to existing pages!
      const browser = await chromium.connectOverCDP(session.cdpEndpoint);
      
      // Update last used
      sessions[sessionIdParam].lastUsed = new Date().toISOString();
      saveSessions(sessions);
      
      // Get existing context and page (the ones the user sees!)
      const contexts = browser.contexts();
      let page;
      
      if (contexts.length > 0) {
        const pages = contexts[0].pages();
        if (pages.length > 0) {
          // Reuse existing page - this is the magic!
          page = pages[0];
        } else {
          page = await contexts[0].newPage();
        }
      } else {
        // Fallback: create new context/page
        const context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          userAgent,
          locale
        });
        page = await context.newPage();
      }
      
      // Navigate only if URL provided AND different from current
      if (urlParam && page.url() !== urlParam && !page.url().includes(urlParam)) {
        await page.goto(urlParam, { waitUntil: 'domcontentloaded', timeout: 15000 });
      }
      
      return { browser, page, isSession: true };
    } catch (e) {
      throw new Error(`Failed to connect to session ${sessionIdParam}: ${e.message}. The browser may have been closed.`);
    }
  } else {
    // Launch new browser (non-session mode)
    const useHeadless = action === 'run_flow' ? false : headless;
    const browser = await chromium.launch({ headless: useHeadless, slowMo });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent,
      locale
    });
    const page = await context.newPage();
    
    if (urlParam) {
      await page.goto(urlParam, { waitUntil: 'networkidle', timeout: 30000 });
    }
    
    return { browser, page, isSession: false };
  }
}

/**
 * Output a line of JSON to stdout and flush immediately.
 * Used for streaming actions to the parent AgentOS process.
 */
function streamAction(data) {
  // Write JSON line and flush
  process.stdout.write(JSON.stringify(data) + '\n');
}

// Collected diagnostics
const consoleLogs = [];
const consoleErrors = [];
const networkRequests = [];
const networkErrors = [];

/**
 * Get screen coordinates for an element, accounting for window position and browser chrome.
 * @param {Page} page - Playwright page
 * @param {string} selector - CSS selector
 * @param {string} anchor - Where to click: 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'
 * @returns {Promise<{screenX: number, screenY: number} | {error: string}>}
 */
async function getScreenCoordinates(page, selector, anchor = 'center') {
  // First ensure element is in view
  try {
    const element = page.locator(selector).first();
    await element.scrollIntoViewIfNeeded({ timeout: 5000 });
  } catch (e) {
    return { error: `Element not found or not scrollable: ${selector}` };
  }

  // Small delay to let scroll settle
  await page.waitForTimeout(100);

  // Get screen coordinates via JavaScript
  const coords = await page.evaluate(({ sel, anchor }) => {
    const el = document.querySelector(sel);
    if (!el) return { error: 'Element not found' };

    const rect = el.getBoundingClientRect();
    
    // Check if element is visible
    if (rect.width === 0 || rect.height === 0) {
      return { error: 'Element has no size (hidden or collapsed)' };
    }

    // Window position on screen
    const windowX = window.screenX;
    const windowY = window.screenY;

    // Browser chrome offset (toolbars, tabs, bookmark bar, etc.)
    // outerHeight - innerHeight = total vertical chrome (usually all at top)
    const chromeHeight = window.outerHeight - window.innerHeight;
    // Horizontal chrome is usually minimal (window frame)
    const chromeWidth = (window.outerWidth - window.innerWidth) / 2;

    // Calculate anchor point within element
    let offsetX, offsetY;
    switch (anchor) {
      case 'top-left':
        offsetX = 5;
        offsetY = 5;
        break;
      case 'top-right':
        offsetX = rect.width - 5;
        offsetY = 5;
        break;
      case 'bottom-left':
        offsetX = 5;
        offsetY = rect.height - 5;
        break;
      case 'bottom-right':
        offsetX = rect.width - 5;
        offsetY = rect.height - 5;
        break;
      case 'center':
      default:
        offsetX = rect.width / 2;
        offsetY = rect.height / 2;
    }

    return {
      screenX: Math.round(windowX + chromeWidth + rect.x + offsetX),
      screenY: Math.round(windowY + chromeHeight + rect.y + offsetY),
      // Include debug info
      debug: {
        windowPos: { x: windowX, y: windowY },
        chrome: { width: chromeWidth, height: chromeHeight },
        elementRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        anchor: { x: offsetX, y: offsetY }
      }
    };
  }, { sel: selector, anchor });

  return coords;
}

/**
 * Estimate duration of input actions for timing synchronization.
 */
function estimateInputDuration(inputActions) {
  let total = 0;
  for (const action of inputActions) {
    switch (action.input) {
      case 'move':
        total += action.duration_ms || 500;
        break;
      case 'wait':
        total += action.ms || 0;
        break;
      case 'type':
        total += (action.text?.length || 0) * (action.delay_ms || 50);
        break;
      case 'click':
      case 'double_click':
        total += 100; // Small buffer for click
        break;
      default:
        total += 50; // Default small buffer
    }
  }
  return total;
}

/**
 * Process a flow of actions with streaming execution.
 * Each action's input commands are streamed to AgentOS for immediate execution.
 * This allows the browser to stay open and page state to update between actions.
 */
async function processFlow(page, actions) {
  let actionsProcessed = 0;
  let inputActionsExecuted = 0;
  
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const actionType = action.action;
    
    try {
      // Collect input actions for this flow action
      const inputActions = [];
      
      switch (actionType) {
        case 'goto': {
          await page.goto(action.url, { waitUntil: 'networkidle', timeout: 30000 });
          // Small wait after navigation
          await page.waitForTimeout(500);
          break;
        }
        
        case 'wait': {
          inputActions.push({ input: 'wait', ms: action.ms || 1000 });
          break;
        }
        
        case 'wait_for': {
          const timeoutMs = action.timeout_ms || 10000;
          await page.locator(action.selector).first().waitFor({ state: 'visible', timeout: timeoutMs });
          break;
        }
        
        case 'click': {
          const coords = await getScreenCoordinates(page, action.selector, action.anchor || 'center');
          if (coords.error) {
            throw new Error(`Failed to get coordinates for ${action.selector}: ${coords.error}`);
          }
          inputActions.push({
            input: 'move',
            x: coords.screenX,
            y: coords.screenY,
            duration_ms: action.duration_ms || 500,
            easing: 'ease_out'
          });
          inputActions.push({ input: 'wait', ms: 50 });
          inputActions.push({ input: 'click', button: action.button || 'left' });
          if (action.wait_after_ms) {
            inputActions.push({ input: 'wait', ms: action.wait_after_ms });
          }
          break;
        }
        
        case 'double_click': {
          const coords = await getScreenCoordinates(page, action.selector, action.anchor || 'center');
          if (coords.error) {
            throw new Error(`Failed to get coordinates for ${action.selector}: ${coords.error}`);
          }
          inputActions.push({
            input: 'move',
            x: coords.screenX,
            y: coords.screenY,
            duration_ms: action.duration_ms || 500,
            easing: 'ease_out'
          });
          inputActions.push({ input: 'wait', ms: 50 });
          inputActions.push({ input: 'double_click', button: 'left' });
          break;
        }
        
        case 'hover': {
          const coords = await getScreenCoordinates(page, action.selector, action.anchor || 'center');
          if (coords.error) {
            throw new Error(`Failed to get coordinates for ${action.selector}: ${coords.error}`);
          }
          inputActions.push({
            input: 'move',
            x: coords.screenX,
            y: coords.screenY,
            duration_ms: action.duration_ms || 500,
            easing: 'ease_out'
          });
          if (action.hover_ms) {
            inputActions.push({ input: 'wait', ms: action.hover_ms });
          }
          break;
        }
        
        case 'type': {
          const coords = await getScreenCoordinates(page, action.selector, 'center');
          if (coords.error) {
            throw new Error(`Failed to get coordinates for ${action.selector}: ${coords.error}`);
          }
          inputActions.push({
            input: 'move',
            x: coords.screenX,
            y: coords.screenY,
            duration_ms: action.duration_ms || 300,
            easing: 'ease_out'
          });
          inputActions.push({ input: 'wait', ms: 50 });
          inputActions.push({ input: 'click', button: 'left' });
          inputActions.push({ input: 'wait', ms: 100 });
          inputActions.push({
            input: 'type',
            text: action.text,
            delay_ms: action.delay_ms || 50
          });
          break;
        }
        
        case 'scroll': {
          const direction = action.direction || 'down';
          const amount = action.amount || 300;
          const deltaY = direction === 'down' ? amount : -amount;
          inputActions.push({
            input: 'scroll',
            delta_x: 0,
            delta_y: deltaY
          });
          break;
        }
        
        case 'scroll_to': {
          const element = page.locator(action.selector).first();
          await element.scrollIntoViewIfNeeded({ timeout: 5000 });
          await page.waitForTimeout(300);
          break;
        }
        
        case 'key': {
          inputActions.push({
            input: 'key',
            key: action.key
          });
          break;
        }
        
        case 'key_combo': {
          inputActions.push({
            input: 'key_combo',
            keys: action.keys
          });
          break;
        }
        
        default:
          throw new Error(`Unknown flow action: ${actionType}`);
      }
      
      // Stream input actions to AgentOS for immediate execution
      if (inputActions.length > 0) {
        streamAction({ type: 'input', actions: inputActions });
        inputActionsExecuted += inputActions.length;
        
        // Wait for the estimated duration so page can react before next action
        const estimatedDuration = estimateInputDuration(inputActions);
        if (estimatedDuration > 0) {
          await page.waitForTimeout(estimatedDuration + 100); // Add small buffer
        }
      }
      
      actionsProcessed++;
      
    } catch (error) {
      // Stream error and done signal
      streamAction({ 
        type: 'error', 
        message: `Action ${i} (${actionType}) failed: ${error.message}`,
        actions_processed: actionsProcessed
      });
      streamAction({ type: 'done', success: false });
      return {
        success: false,
        error: `Action ${i} (${actionType}) failed: ${error.message}`,
        flow_actions_processed: actionsProcessed,
        input_actions_executed: inputActionsExecuted
      };
    }
  }
  
  // Signal completion
  streamAction({ type: 'done', success: true });
  
  return {
    success: true,
    flow_actions_processed: actionsProcessed,
    input_actions_executed: inputActionsExecuted
  };
}

async function run() {
  // Handle session management actions first
  if (action === 'start_session') {
    try {
      const result = await startSession(url);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.log(JSON.stringify({
        success: false,
        error: `Failed to start session: ${error.message}`
      }, null, 2));
      process.exit(1);
    }
    return;
  }
  
  if (action === 'end_session') {
    if (!sessionId) {
      console.log(JSON.stringify({
        success: false,
        error: 'session_id is required for end_session'
      }, null, 2));
      process.exit(1);
    }
    try {
      const result = await endSession(sessionId);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.log(JSON.stringify({
        success: false,
        error: `Failed to end session: ${error.message}`
      }, null, 2));
      process.exit(1);
    }
    return;
  }
  
  // Get browser and page (either from session or new launch)
  let browser, page, isSession;
  try {
    ({ browser, page, isSession } = await getBrowserAndPage(sessionId, url));
  } catch (error) {
    console.log(JSON.stringify({
      success: false,
      error: error.message
    }, null, 2));
    process.exit(1);
  }
  
  // Capture console messages
  page.on('console', msg => {
    const entry = { type: msg.type(), text: msg.text() };
    if (msg.type() === 'error') {
      consoleErrors.push(entry);
    }
    consoleLogs.push(entry);
  });
  
  // Capture page errors (uncaught exceptions)
  page.on('pageerror', error => {
    consoleErrors.push({ type: 'exception', text: error.message });
  });
  
  // Capture network requests
  page.on('requestfailed', request => {
    networkErrors.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || 'Unknown error'
    });
  });
  
  page.on('response', response => {
    const status = response.status();
    if (status >= 400) {
      networkErrors.push({
        url: response.url(),
        status,
        statusText: response.statusText()
      });
    }
    // Only track non-asset requests to reduce noise
    const respUrl = response.url();
    if (!respUrl.match(/\.(png|jpg|jpeg|gif|svg|css|woff|woff2|ttf|ico)(\?|$)/)) {
      networkRequests.push({
        url: respUrl.length > 100 ? respUrl.substring(0, 100) + '...' : respUrl,
        status,
        method: response.request().method()
      });
    }
  });
  
  try {
    // getBrowserAndPage already handles navigation, just wait if needed
    if (url && action !== 'run_flow') {
      await page.waitForTimeout(waitMs);
    }
    
    let result = { success: true };
    
    // Include session info in result if using a session
    if (isSession && sessionId) {
      result.session_id = sessionId;
    }
    
    // Helper to add diagnostics to result
    const addDiagnostics = () => {
      if (consoleErrors.length > 0) {
        result.console_errors = consoleErrors.slice(-10); // Last 10 errors
      }
      if (networkErrors.length > 0) {
        result.network_errors = networkErrors.slice(-10); // Last 10 errors
      }
    };
    
    // Helper to optionally add screenshot
    const maybeScreenshot = async (prefix) => {
      if (includeScreenshot) {
        const screenshotPath = join(downloadsDir, `browser-${prefix}-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        result.screenshot = screenshotPath;
      }
    };
    
    switch (action) {
      case 'run_flow': {
        if (!actionsJson) {
          throw new Error('actions parameter is required for run_flow');
        }
        
        let actions;
        try {
          actions = JSON.parse(actionsJson);
        } catch (e) {
          throw new Error(`Invalid actions JSON: ${e.message}`);
        }
        
        if (!Array.isArray(actions)) {
          throw new Error('actions must be an array');
        }
        
        // Process flow with streaming execution
        // Input actions are streamed to AgentOS via stdout as NDJSON
        // AgentOS executes each batch immediately while browser stays open
        result = await processFlow(page, actions);
        
        // Final result is also output for the MCP response
        // (processFlow already streamed the done signal)
        break;
      }
      
      case 'inspect': {
        // Diagnostic overview without screenshot
        result.title = await page.title();
        result.url = page.url();
        
        // Get visible text summary
        const bodyText = await page.locator('body').textContent();
        result.text_preview = bodyText?.trim().substring(0, 500) + (bodyText?.length > 500 ? '...' : '');
        
        // Get all headings for structure
        const headings = await page.locator('h1, h2, h3').allTextContents();
        if (headings.length > 0) {
          result.headings = headings.slice(0, 10).map(h => h.trim()).filter(Boolean);
        }
        
        // Get all buttons and links for interactivity
        const buttons = await page.locator('button, [role="button"]').allTextContents();
        if (buttons.length > 0) {
          result.buttons = buttons.slice(0, 15).map(b => b.trim()).filter(Boolean);
        }
        
        // Get form inputs
        const inputs = await page.locator('input, textarea, select').evaluateAll(els => 
          els.map(el => ({
            type: el.type || el.tagName.toLowerCase(),
            name: el.name || el.id || el.placeholder || null,
            value: el.value ? (el.value.length > 50 ? el.value.substring(0, 50) + '...' : el.value) : null
          })).filter(i => i.name)
        );
        if (inputs.length > 0) {
          result.inputs = inputs.slice(0, 10);
        }
        
        // Add console/network diagnostics
        if (consoleLogs.length > 0) {
          result.console_logs = consoleLogs.slice(-15);
        }
        result.network_requests = networkRequests.slice(-20);
        addDiagnostics();
        
        await maybeScreenshot('inspect');
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'console': {
        // Just get console logs
        result.title = await page.title();
        result.console_logs = consoleLogs;
        result.console_errors = consoleErrors;
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'network': {
        // Just get network activity
        result.title = await page.title();
        result.requests = networkRequests;
        result.errors = networkErrors;
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'screenshot': {
        const screenshotPath = join(downloadsDir, `browser-screenshot-${Date.now()}.png`);
        if (selector) {
          const element = await page.locator(selector).first();
          await element.screenshot({ path: screenshotPath });
        } else {
          await page.screenshot({ path: screenshotPath, fullPage: false });
        }
        result.screenshot = screenshotPath;
        result.title = await page.title();
        result.url = page.url();
        addDiagnostics();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'click': {
        if (!selector) throw new Error('selector is required for click action');
        await page.locator(selector).first().click();
        await page.waitForTimeout(waitMs);
        result.clicked = selector;
        result.title = await page.title();
        result.url = page.url();
        addDiagnostics();
        await maybeScreenshot('click');
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'type': {
        if (!selector) throw new Error('selector is required for type action');
        if (!text) throw new Error('text is required for type action');
        await page.locator(selector).first().fill(text);
        await page.waitForTimeout(waitMs);
        result.typed = { selector, text };
        result.title = await page.title();
        result.url = page.url();
        addDiagnostics();
        await maybeScreenshot('type');
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'get_text': {
        if (!selector) throw new Error('selector is required for get_text action');
        const elements = await page.locator(selector).all();
        const texts = await Promise.all(elements.map(el => el.textContent()));
        result.texts = texts.map(t => t?.trim()).filter(Boolean);
        result.count = result.texts.length;
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'evaluate': {
        if (!script) throw new Error('script is required for evaluate action');
        const evalResult = await page.evaluate(script);
        result.result = evalResult;
        addDiagnostics();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'get_html': {
        const html = selector 
          ? await page.locator(selector).first().innerHTML()
          : await page.content();
        result.html = html;
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
  } catch (error) {
    console.log(JSON.stringify({ 
      success: false, 
      error: error.message,
      console_errors: consoleErrors,
      network_errors: networkErrors
    }, null, 2));
    process.exit(1);
  } finally {
    if (isSession) {
      // Disconnect without closing - browser stays open via daemon
      await browser.disconnect?.() || browser.close?.();
    } else {
      // Close browser for non-session mode
      await browser.close();
    }
  }
}

run();
