---
name: apple-ecosystem
description: "Apple/macOS ecosystem integration — Notes, Reminders, Find My, iMessage, and system features. Unified entry point for all Apple-native app automation."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [macos]
metadata:
  hermes:
    tags: [Apple, macOS, Notes, Reminders, FindMy, iMessage, System]
---

# Apple Ecosystem

Unified skill for interacting with Apple-native apps and macOS system features. Covers Notes, Reminders, Find My, and iMessage.

## Prerequisites

- macOS with the target app installed
- Accessibility permissions may be required for some operations
- No `gh` or external CLI needed — uses AppleScript, Shortcuts, or native APIs

## 1. Apple Notes

Read, search, create, and edit notes in Apple Notes.

### Common Operations

```bash
# Search notes
osascript -e 'tell application "Notes" to set matchingNotes to (every note whose name contains "search term")'

# Create a note
osascript -e 'tell application "Notes" to make new note at folder "Notes" with properties {name:"Title", body:"Content"}'
```

### Pitfalls

- Notes body uses HTML, not plain text
- Folder names are case-sensitive
- Large notes may timeout via AppleScript

---

## 2. Apple Reminders

Create, list, and manage reminders across lists.

### Common Operations

```bash
# List all reminders
osascript -e 'tell application "Reminders" to set output to ""' \
  -e 'repeat with r in (every reminder)' \
  -e 'set output to output & name of r & linefeed' \
  -e 'end repeat' \
  -e 'return output'

# Create a reminder
osascript -e 'tell application "Reminders" to make new reminder in list "Reminders" with properties {name:"Task", due date:date "2026-07-15"}'
```

### Pitfalls

- List names must match exactly
- Due dates require AppleScript date format
- Completed reminders are hidden by default

---

## 3. Find My

Locate devices and people through Find My.

### Notes

- Find My requires iCloud sign-in
- Device locations may have significant delay (15-30 min)
- Precision depends on device type and signal

---

## 4. iMessage

Send and read iMessages.

### Common Operations

```bash
# Send a message
osascript -e 'tell application "Messages" to send "Hello" to buddy "+1234567890" of service "iMessage"'

# Read recent messages
osascript -e 'tell application "Messages" to get every message of chat 1'
```

### Pitfalls

- iMessage must be enabled in System Preferences
- Phone numbers require country code prefix
- Group chats have different addressing

---

## Cross-App Patterns

### AppleScript Error Handling

```applescript
try
  -- your operation
on error errMsg number errNum
  display dialog "Error " & errNum & ": " & errMsg
end try
```

### Checking App Availability

```bash
osascript -e 'tell application "System Events" to (name of processes) contains "Notes"'
```

## Related Skills

- `computer-use` — Drive the desktop for GUI interactions
- `hermes-agent` — Hermes Agent configuration and setup
