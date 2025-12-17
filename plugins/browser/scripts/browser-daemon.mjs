#!/usr/bin/env node
/**
 * Browser Daemon - Runs as a background process to keep browser alive.
 * 
 * Usage: node browser-daemon.mjs <session-id> [initial-url]
 * 
 * This script:
 * 1. Launches Chrome with remote debugging enabled (CDP)
 * 2. Writes the CDP endpoint to the sessions file
 * 3. Stays running until killed
 * 4. Other scripts can connect via connectOverCDP and see the SAME pages
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const sessionId = process.argv[2];
const initialUrl = process.argv[3];

if (!sessionId) {
  console.error('Usage: node browser-daemon.mjs <session-id> [initial-url]');
  process.exit(1);
}

const sessionsDir = join(homedir(), '.agentos');
const sessionsFile = join(sessionsDir, 'browser-sessions.json');

// Find an available port for CDP
async function findAvailablePort(startPort = 9222) {
  const net = await import('net');
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

function loadSessions() {
  try {
    if (existsSync(sessionsFile)) {
      return JSON.parse(readFileSync(sessionsFile, 'utf-8'));
    }
  } catch (e) {}
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

async function main() {
  console.error(`[browser-daemon] Starting session ${sessionId}...`);
  
  // Find available port for CDP
  const cdpPort = await findAvailablePort(9222);
  console.error(`[browser-daemon] Using CDP port ${cdpPort}`);
  
  // Launch browser with remote debugging enabled
  // This allows other scripts to connect and see the SAME pages
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--remote-debugging-port=${cdpPort}`,
    ],
  });
  
  const cdpEndpoint = `http://localhost:${cdpPort}`;
  console.error(`[browser-daemon] Browser launched with CDP: ${cdpEndpoint}`);
  
  // Create a context and page
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  
  // Save session info immediately (status: ready)
  const sessions = loadSessions();
  sessions[sessionId] = {
    cdpEndpoint,
    pid: process.pid,
    startedAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    status: 'ready',
    initialUrl: initialUrl || null,
  };
  saveSessions(sessions);
  
  // Navigate to initial URL if provided
  if (initialUrl) {
    console.error(`[browser-daemon] Navigating to ${initialUrl}...`);
    try {
      await page.goto(initialUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.error(`[browser-daemon] Navigation complete`);
    } catch (e) {
      console.error(`[browser-daemon] Navigation error (continuing): ${e.message}`);
    }
  }
  
  // Update status to active
  const sessions2 = loadSessions();
  if (sessions2[sessionId]) {
    sessions2[sessionId].status = 'active';
    sessions2[sessionId].lastUsed = new Date().toISOString();
    saveSessions(sessions2);
  }
  
  console.error(`[browser-daemon] Session ${sessionId} ready. CDP: ${cdpEndpoint}`);
  
  // Handle graceful shutdown
  const cleanup = async () => {
    console.error(`[browser-daemon] Shutting down...`);
    try {
      await browser.close();
    } catch (e) {}
    const sessions = loadSessions();
    delete sessions[sessionId];
    saveSessions(sessions);
    process.exit(0);
  };
  
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  
  // Keep process alive with heartbeat
  setInterval(() => {
    const sessions = loadSessions();
    if (sessions[sessionId]) {
      sessions[sessionId].lastUsed = new Date().toISOString();
      saveSessions(sessions);
    }
  }, 30000);
}

main().catch(err => {
  console.error(`[browser-daemon] Fatal error: ${err.message}`);
  process.exit(1);
});
