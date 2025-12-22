---
id: spotify
name: Spotify
description: Control Spotify playback on macOS
icon: https://cdn.simpleicons.org/spotify
color: "#1DB954"
platform: macos

website: https://www.spotify.com
privacy_url: https://www.spotify.com/privacy
terms_url: https://www.spotify.com/legal/end-user-agreement

tags: [music, playback, media, audio]

requires:
  - osascript  # Pre-installed on macOS

actions:
  get_current:
    readonly: true
    description: Get currently playing track info
    run: |
      osascript << 'EOF'
      tell application "Spotify"
        if player state is stopped then
          return "{\"playing\":false,\"state\":\"stopped\"}"
        end if
        
        set trackName to name of current track
        set artistName to artist of current track
        set albumName to album of current track
        set trackDuration to duration of current track
        set trackPosition to player position
        set trackId to id of current track
        set trackUrl to spotify url of current track
        set artworkUrl to artwork url of current track
        set isPlaying to player state is playing
        set shuffleState to shuffling
        set repeatState to repeating
        set volumeLevel to sound volume
        
        -- Convert duration from ms to seconds for display
        set durationSecs to trackDuration / 1000
        set positionSecs to round trackPosition
        
        set jsonOutput to "{\"playing\":" & isPlaying & ","
        set jsonOutput to jsonOutput & "\"shuffle\":" & shuffleState & ","
        set jsonOutput to jsonOutput & "\"repeat\":" & repeatState & ","
        set jsonOutput to jsonOutput & "\"volume\":" & volumeLevel & ","
        set jsonOutput to jsonOutput & "\"position\":" & positionSecs & ","
        set jsonOutput to jsonOutput & "\"duration\":" & (round durationSecs) & ","
        set jsonOutput to jsonOutput & "\"track\":\"" & trackName & "\","
        set jsonOutput to jsonOutput & "\"artist\":\"" & artistName & "\","
        set jsonOutput to jsonOutput & "\"album\":\"" & albumName & "\","
        set jsonOutput to jsonOutput & "\"uri\":\"" & trackId & "\","
        set jsonOutput to jsonOutput & "\"url\":\"" & trackUrl & "\","
        set jsonOutput to jsonOutput & "\"artwork\":\"" & artworkUrl & "\"}"
        
        return jsonOutput
      end tell
      EOF

  play:
    description: Resume playback
    run: |
      osascript -e 'tell application "Spotify" to play'
      echo '{"status":"playing"}'

  pause:
    description: Pause playback
    run: |
      osascript -e 'tell application "Spotify" to pause'
      echo '{"status":"paused"}'

  toggle:
    description: Toggle play/pause
    run: |
      osascript << 'EOF'
      tell application "Spotify"
        playpause
        if player state is playing then
          return "{\"status\":\"playing\"}"
        else
          return "{\"status\":\"paused\"}"
        end if
      end tell
      EOF

  next:
    description: Skip to next track
    run: |
      osascript << 'EOF'
      tell application "Spotify"
        next track
        delay 0.3
        set trackName to name of current track
        set artistName to artist of current track
        return "{\"status\":\"skipped\",\"track\":\"" & trackName & "\",\"artist\":\"" & artistName & "\"}"
      end tell
      EOF

  previous:
    description: Go to previous track
    run: |
      osascript << 'EOF'
      tell application "Spotify"
        previous track
        delay 0.3
        set trackName to name of current track
        set artistName to artist of current track
        return "{\"status\":\"previous\",\"track\":\"" & trackName & "\",\"artist\":\"" & artistName & "\"}"
      end tell
      EOF

  set_volume:
    description: Set playback volume
    params:
      level:
        type: integer
        required: true
        description: Volume level (0-100)
    run: |
      osascript << EOF
      tell application "Spotify"
        set sound volume to $PARAM_LEVEL
        return "{\"volume\":$PARAM_LEVEL}"
      end tell
      EOF

  volume_up:
    description: Increase volume by 10
    run: |
      osascript << 'EOF'
      tell application "Spotify"
        set currentVol to sound volume
        set newVol to currentVol + 10
        if newVol > 100 then set newVol to 100
        set sound volume to newVol
        return "{\"volume\":" & newVol & "}"
      end tell
      EOF

  volume_down:
    description: Decrease volume by 10
    run: |
      osascript << 'EOF'
      tell application "Spotify"
        set currentVol to sound volume
        set newVol to currentVol - 10
        if newVol < 0 then set newVol to 0
        set sound volume to newVol
        return "{\"volume\":" & newVol & "}"
      end tell
      EOF

  set_shuffle:
    description: Enable or disable shuffle
    params:
      enabled:
        type: boolean
        required: true
        description: true to enable, false to disable
    run: |
      osascript << EOF
      tell application "Spotify"
        set shuffling to $PARAM_ENABLED
        return "{\"shuffle\":$PARAM_ENABLED}"
      end tell
      EOF

  set_repeat:
    description: Enable or disable repeat
    params:
      enabled:
        type: boolean
        required: true
        description: true to enable, false to disable
    run: |
      osascript << EOF
      tell application "Spotify"
        set repeating to $PARAM_ENABLED
        return "{\"repeat\":$PARAM_ENABLED}"
      end tell
      EOF

  seek:
    description: Seek to position in current track
    params:
      position:
        type: integer
        required: true
        description: Position in seconds
    run: |
      osascript << EOF
      tell application "Spotify"
        set player position to $PARAM_POSITION
        return "{\"position\":$PARAM_POSITION}"
      end tell
      EOF

  play_uri:
    description: Play a Spotify URI (track, album, playlist)
    params:
      uri:
        type: string
        required: true
        description: Spotify URI (e.g., spotify:track:xxx or spotify:album:xxx)
    run: |
      osascript << EOF
      tell application "Spotify"
        play track "$PARAM_URI"
        delay 0.5
        set trackName to name of current track
        set artistName to artist of current track
        return "{\"status\":\"playing\",\"track\":\"" & trackName & "\",\"artist\":\"" & artistName & "\"}"
      end tell
      EOF

  open_uri:
    readonly: true
    description: Open a Spotify URI in the app
    params:
      uri:
        type: string
        required: true
        description: Spotify URI to open
    run: |
      open "$PARAM_URI"
      echo '{"status":"opened","uri":"'"$PARAM_URI"'"}'

  get_status:
    readonly: true
    description: Get player status (is Spotify running, playing, etc.)
    run: |
      osascript << 'EOF'
      if application "Spotify" is running then
        tell application "Spotify"
          set state to player state as string
          return "{\"running\":true,\"state\":\"" & state & "\"}"
        end tell
      else
        return "{\"running\":false}"
      end if
      EOF

  launch:
    description: Launch Spotify app
    run: |
      open -a Spotify
      sleep 1
      echo '{"status":"launched"}'

---

# Spotify

Control Spotify playback on macOS using the native Spotify app. No authentication required - uses AppleScript to control the local Spotify app directly.

## Requirements

- **macOS only** - Uses Spotify's AppleScript interface
- **Spotify desktop app** - Must be installed (not the web player)
- **Spotify running** - The app should be open for playback controls

## Actions

### Playback Control

| Action | Purpose |
|--------|---------|
| `play` | Resume playback |
| `pause` | Pause playback |
| `toggle` | Toggle play/pause |
| `next` | Skip to next track |
| `previous` | Go to previous track |

### Now Playing

| Action | Purpose |
|--------|---------|
| `get_current` | Get full info about currently playing track |
| `get_status` | Check if Spotify is running and player state |

### Volume & Settings

| Action | Purpose |
|--------|---------|
| `set_volume` | Set volume (0-100) |
| `volume_up` | Increase volume by 10 |
| `volume_down` | Decrease volume by 10 |
| `set_shuffle` | Enable/disable shuffle |
| `set_repeat` | Enable/disable repeat |
| `seek` | Seek to position in track (seconds) |

### Play Content

| Action | Purpose |
|--------|---------|
| `play_uri` | Play a Spotify URI directly |
| `open_uri` | Open a Spotify URI in the app |
| `launch` | Launch the Spotify app |

---

## get_current

Get detailed information about the currently playing track.

**Returns:**
```json
{
  "playing": true,
  "shuffle": false,
  "repeat": false,
  "volume": 75,
  "position": 45,
  "duration": 210,
  "track": "Bohemian Rhapsody",
  "artist": "Queen",
  "album": "A Night at the Opera",
  "uri": "spotify:track:xxx",
  "url": "https://open.spotify.com/track/xxx",
  "artwork": "https://i.scdn.co/image/xxx"
}
```

---

## play_uri

Play a specific Spotify URI. You can get URIs from Spotify by right-clicking and selecting "Copy Spotify URI".

**Parameters:**
- `uri` (required): A Spotify URI

**URI Formats:**
- Track: `spotify:track:6rqhFgbbKwnb9MLmUQDhG6`
- Album: `spotify:album:6dVIqQ8qmQ5GBnJ9shOYGE`
- Playlist: `spotify:playlist:37i9dQZF1DXcBWIGoYBM5M`
- Artist: `spotify:artist:1dfeR4HaWDbWqFHLkxsg1d`

**Examples:**
```
play_uri(uri: "spotify:track:4uLU6hMCjMI75M1A2tKUQC")
play_uri(uri: "spotify:album:6dVIqQ8qmQ5GBnJ9shOYGE")
play_uri(uri: "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M")
```

---

## Volume Control

**set_volume:**
```
set_volume(level: 50)    # Set to 50%
set_volume(level: 0)     # Mute
set_volume(level: 100)   # Max volume
```

**volume_up / volume_down:**
```
volume_up()    # Increase by 10
volume_down()  # Decrease by 10
```

---

## Shuffle & Repeat

```
set_shuffle(enabled: true)   # Turn shuffle on
set_shuffle(enabled: false)  # Turn shuffle off

set_repeat(enabled: true)    # Turn repeat on
set_repeat(enabled: false)   # Turn repeat off
```

---

## Seek

Jump to a specific position in the current track.

```
seek(position: 0)     # Go to start
seek(position: 60)    # Go to 1:00
seek(position: 120)   # Go to 2:00
```

---

## Notes

- **No authentication needed** - This app controls Spotify locally via AppleScript
- **Premium not required** for basic controls (may be needed for some features like shuffle)
- **Spotify must be installed** - This doesn't work with the web player
- **Launch first** - If Spotify isn't running, use `launch()` or `get_status()` to check

## Finding Spotify URIs

To get a URI for any track, album, or playlist:
1. Right-click on the item in Spotify
2. Go to **Share** → **Copy Spotify URI**
3. Use that URI with `play_uri(uri: "...")`

Or use the **Share** → **Copy Link** and convert:
- `https://open.spotify.com/track/abc123` → `spotify:track:abc123`

## Limitations

- Cannot search Spotify (would require Web API + OAuth)
- Cannot manage playlists or library (would require Web API + OAuth)
- Cannot see queue or add to queue (would require Web API + OAuth)
- Cannot "like" the current track (Spotify doesn't expose this via AppleScript)

