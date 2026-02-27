# Dario Keyboard Shortcuts

This document describes the keyboard shortcuts and input modes implemented for Dario.

## Overview

Dario supports three keyboard input modes:
- **Normal Mode** (default): Basic keyboard shortcuts
- **Emacs Mode**: Emacs-style key bindings for text editing
- **Vim Mode**: Vim-style key bindings for advanced users

## Global Keyboard Shortcuts

These shortcuts work in all modes:

| Key | Function | Description |
|-----|----------|-------------|
| Ctrl+R | History Search | Open reverse-i-search style history search |
| Ctrl+Z | Suspend Operation | Suspend current operation and move to background |
| Tab | Toggle Thinking | Toggle thinking animation display |
| Shift+Tab | Cycle Mode | Cycle through display modes |
| ? | Show Help | Display keyboard shortcuts and help |

## Normal Mode (Default)

The default mode for basic text editing and command execution.

```
Ctrl+R  - Search command history
Ctrl+Z  - Suspend current operation
Tab     - Toggle thinking animation
Shift+Tab - Cycle display modes
```

## Emacs Mode

Emacs-style key bindings for command-line text editing:

| Key | Function | Description |
|-----|----------|-------------|
| Ctrl+A | Begin Line | Move cursor to beginning of line |
| Ctrl+E | End Line | Move cursor to end of line |
| Ctrl+K | Kill Line | Delete from cursor to end of line |
| Ctrl+U | Kill Start | Delete from start of line to cursor |
| Ctrl+W | Delete Word | Delete word backward |
| Alt+F | Forward Word | Move cursor forward one word |
| Alt+B | Backward Word | Move cursor backward one word |

Enable Emacs mode:
```bash
set keyboard mode emacs
```

Or configure in `~/.config/dario/config.json`:
```json
{
  "keyboard": {
    "mode": "emacs"
  }
}
```

## Vim Mode

Vim-style key bindings with multiple modes (insert, normal, command):

### Insert Mode

Standard text insertion. Press ESC to enter normal mode.

```
Regular characters - Insert text
BACKSPACE - Delete character backward
TAB - Insert spaces
ESC - Enter normal mode
```

### Normal Mode

Navigate and edit without inserting text:

#### Navigation
| Key | Function |
|-----|----------|
| h | Move cursor left |
| j | Move cursor down |
| k | Move cursor up |
| l | Move cursor right |
| w | Move to next word |
| b | Move to previous word |
| e | Move to end of word |
| 0 | Move to beginning of line |
| $ | Move to end of line |

#### Editing
| Key | Function |
|-----|----------|
| i | Enter insert mode |
| a | Append (enter insert mode after cursor) |
| x | Delete character at cursor |
| dd | Delete entire line |
| yy | Copy (yank) line |
| p | Paste after cursor |
| u | Undo |
| Ctrl+R | Redo |

#### Command Mode
| Key | Function |
|-----|----------|
| : | Enter command mode |

### Command Mode

Execute vim-style commands starting with `:`:

```
:q or :quit    - Quit the application
:w or :write   - Save/write
:set mode      - Set keyboard mode (normal, emacs, vim)
```

Enable Vim mode:
```bash
set keyboard mode vim
```

Or configure in `~/.config/dario/config.json`:
```json
{
  "keyboard": {
    "mode": "vim"
  }
}
```

## History Search (Ctrl+R)

The history search feature provides reverse-i-search style searching through command history:

1. Press **Ctrl+R** to start search
2. Type search query - results update in real-time
3. Use **Ctrl+R** or **Ctrl+P** to navigate through results
4. Press **Enter** to select and execute a result
5. Press **ESC** to cancel search

Example:
```
(reverse-i-search)`curl': curl https://api.example.com
```

## Suspend Operation (Ctrl+Z)

Suspend the current operation and move it to background:

1. Press **Ctrl+Z** while an operation is running
2. Operation is paused and moved to background
3. Use `fg` command to resume
4. Use `jobs` command to list suspended operations

Example:
```bash
# During a long-running operation
Ctrl+Z
[Operation suspended]

# Later, resume with:
fg
```

## Configuration

Keyboard settings are stored in `~/.config/dario/config.json`:

```json
{
  "keyboard": {
    "mode": "normal",
    "enabled": true,
    "shortcuts": {
      "historySearch": "ctrl+r",
      "suspend": "ctrl+z",
      "toggleThinking": "tab",
      "cycleMode": "shift+tab"
    },
    "emacs": {
      "enabled": true,
      "bindings": {
        "beginLine": "ctrl+a",
        "endLine": "ctrl+e",
        "killLine": "ctrl+k",
        "killStart": "ctrl+u",
        "deleteWord": "ctrl+w",
        "forwardWord": "alt+f",
        "backwardWord": "alt+b"
      }
    },
    "vim": {
      "enabled": false,
      "bindings": {
        "normalMode": "esc",
        "insertMode": "i",
        "delete": "dd",
        "copy": "yy",
        "paste": "p",
        "deleteChar": "x",
        "exit": ":q"
      }
    }
  }
}
```

## Changing Keyboard Mode

### At Runtime

Use the keyboard mode command:
```bash
set keyboard mode vim
set keyboard mode emacs
set keyboard mode normal
```

### In Configuration

Edit `~/.config/dario/config.json`:
```json
{
  "keyboard": {
    "mode": "vim"
  }
}
```

## Implementation Details

### Module Structure

The keyboard module is organized into several submodules:

- **`keyboard/index.mjs`** - Main keyboard manager and key handling
- **`keyboard/config.mjs`** - Configuration loading and management
- **`keyboard/history-search.mjs`** - History search implementation
- **`keyboard/suspend.mjs`** - Operation suspend/resume handling
- **`keyboard/vim-mode.mjs`** - Vim mode implementation
- **`keyboard/integration.mjs`** - Integration with CLI and UI

### Event Handling

The keyboard module uses Node.js EventEmitter for event-driven architecture:

```javascript
keyboardManager.on('history-search', () => {
  // Handle history search
})

keyboardManager.on('suspend', () => {
  // Handle suspend
})

keyboardManager.on('emacs-begin-line', () => {
  // Handle Ctrl+A in Emacs mode
})
```

## Testing

Run keyboard tests:
```bash
npm run test -- tests/keyboard.test.mjs
```

Or test a specific feature:
```bash
npx vitest run tests/keyboard.test.mjs -t "HistorySearch"
npx vitest run tests/keyboard.test.mjs -t "VimMode"
```

## Troubleshooting

### Keyboard shortcuts not working

1. Verify keyboard shortcuts are enabled in config
2. Check if terminal supports raw mode: `stty -a | grep raw`
3. Verify mode is set correctly: `cat ~/.config/dario/config.json`

### Vim mode not activating

1. Check if Vim mode is enabled: `set keyboard mode vim`
2. Verify terminal TTY: `tty`
3. Check for conflicting readline bindings

### History search not showing results

1. Verify command history is being saved
2. Check if history search is enabled in configuration
3. Ensure there are entries in command history

## Future Enhancements

- [ ] Macro recording and playback (Vim)
- [ ] Custom key bindings configuration
- [ ] Vim search and replace (/)
- [ ] Multi-line command editing
- [ ] Shell integration (bash, zsh, fish)
- [ ] Key binding profiles/presets
- [ ] Keyboard shortcut cheat sheet command

## References

- [Vim Key Bindings](https://vim.rtorr.com/)
- [Emacs Key Bindings](https://www.gnu.org/software/emacs/manual/html_node/emacs/Key-Bindings.html)
- [Node.js Readline Module](https://nodejs.org/api/readline.html)
- [Reverse-i-search](https://www.gnu.org/software/bash/manual/html_node/Searching.html)
