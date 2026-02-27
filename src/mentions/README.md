# Mentions Module

This module provides @-mention support for Dario, allowing users to reference files in their prompts with automatic content injection.

## Features

### 1. @-mention Syntax

Include files in your prompts using the `@` symbol:

```
@path/to/file.js          # Relative path
@./relative/file.ts       # Relative with ./
@~/config/file.md         # Home directory reference
@**/*.test.js             # Glob pattern (multiple files)
@/absolute/path/file.rs   # Absolute path
```

### 2. Glob Pattern Support

Include multiple files at once:

```
@src/**/*.component.tsx       # All component files
@tests/**/*.test.mjs          # All test files
@lib/**/*.{js,mjs,ts}         # Multiple extensions
```

### 3. Tab Completion

Press `TAB` after typing `@` to get suggestions:

```
> Review @src/
         ├─ core/
         ├─ api/
         ├─ components/
         └─ utils/
```

### 4. Image Paste from Clipboard

Paste images directly from clipboard (macOS/Linux):

```
> @clipboard-image
Image pasted from clipboard: PNG (45234 bytes)
```

## Usage

### Basic Usage

```javascript
import { parseMentions, processMentions, createMentionContext } from './index.mjs'

// Parse mentions from input
const input = "Review @src/utils.mjs and fix @bugs.md"
const mentions = parseMentions(input)
// → [{ fullMatch: '@src/utils.mjs', path: 'src/utils.mjs', ... },
//    { fullMatch: '@bugs.md', path: 'bugs.md', ... }]

// Process mentions (read files)
const results = await processMentions(input)
// → { mentions: [...], files: [...], warnings: [...] }

// Get formatted context
const context = await createMentionContext(results)
// → "\n\n-- @mention References --\n### src/utils.mjs\n```\n..."
```

### Integration with App

```javascript
import { processUserInput } from './integration.mjs'

const userInput = "Check @config.json and @src/main.js"
const processed = await processUserInput(userInput)

console.log(processed.displaySummary)
// -- Files included --
// config.json (1.2 KB, 25 lines)
// src/main.js (3.4 KB, 120 lines)

// Send to Claude with injected file content
await sendToClaude(processed.messageContent)
```

### Tab Completion

```javascript
import { createReadlineWithMentionCompletion } from './completer.mjs'

// Create readline interface with mention completion
const rl = createReadlineWithMentionCompletion(process.stdin, process.stdout)

rl.question('> ', (input) => {
  // User pressed TAB after @src/ to get completions
  console.log(input)
})
```

## API Reference

### Core Functions

#### `parseMentions(input: string): Mention[]`

Parse @-mentions from user input. Returns array of mention objects.

```javascript
const mentions = parseMentions("Check @file.js and @**/*.test.js")
// Returns:
// [
//   { fullMatch: '@file.js', path: 'file.js', startIndex: 6, endIndex: 15 },
//   { fullMatch: '@**/*.test.js', path: '**/*.test.js', startIndex: 20, endIndex: 33 }
// ]
```

#### `resolveMention(path: string, basePath?: string): Promise<MentionResult>`

Resolve a single mention to file(s). Returns result object with success status, content, and metadata.

```javascript
const result = await resolveMention('@src/utils.js')
// Returns:
// {
//   success: true,
//   path: '/Users/dev/project/src/utils.js',
//   displayPath: '@src/utils.js',
//   content: '...',
//   size: 1234,
//   files: ['/Users/dev/project/src/utils.js']
// }
```

#### `processMentions(input: string, basePath?: string): Promise<ProcessResults>`

Process all mentions in input. Returns all resolved files and warnings.

```javascript
const results = await processMentions("Review @config.json")
// Returns:
// {
//   mentions: [...],
//   files: ['/path/to/config.json'],
//   warnings: []
// }
```

#### `createMentionContext(results: ProcessResults): Promise<string>`

Create formatted context string with file contents for injection into message.

```javascript
const context = await createMentionContext(results)
// Returns:
// "\n\n-- @mention References --\n
//  ### config.json\n
//  ```\n
//  {...file contents...}\n
//  ```\n"
```

#### `getTabCompletions(partial: string, basePath?: string): Suggestion[]`

Get tab completion suggestions for partial @-mention path.

```javascript
const suggestions = getTabCompletions('@src/')
// Returns:
// [
//   { label: 'api', path: '/.../ src/api', isDirectory: true, suffix: '/' },
//   { label: 'components', path: '/.../ src/components', isDirectory: true, suffix: '/' },
//   { label: 'utils.js', path: '/.../ src/utils.js', isDirectory: false, suffix: '' }
// ]
```

### Integration Functions

#### `processUserInput(input: string): Promise<ProcessedInput>`

Main entry point for processing user input with mentions.

```javascript
const processed = await processUserInput("Review @app.js")
// Returns:
// {
//   input: "Review @app.js",
//   mentions: [...],
//   files: [...],
//   warnings: [],
//   messageContent: "Review @app.js\n\n-- @mention References --\n...",
//   displaySummary: "\n-- Files included --\napp.js (..."
// }
```

#### `createMentionsMiddleware(originalSendMessage): Function`

Middleware wrapper for API client to automatically process mentions.

```javascript
const originalSend = api.sendMessage
api.sendMessage = createMentionsMiddleware(originalSend)

// Now mentions are automatically processed before sending
await api.sendMessage(conversation)
```

### Completer Functions

#### `createMentionCompleter(): Function`

Create readline completer function for tab completion.

```javascript
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: createMentionCompleter()
})
```

#### `createReadlineWithMentionCompletion(input, output): ReadlineInterface`

Create readline interface with mention completion pre-configured.

```javascript
const rl = createReadlineWithMentionCompletion(process.stdin, process.stdout)
```

## File Size Limits

- Single file max: 2000 lines (auto-truncated with warning)
- Glob pattern max: 50 files
- Total context size: Handled by Claude's context window

## Error Handling

Mentions handles various error conditions gracefully:

```javascript
// File not found
@nonexistent.js
// → Warning: "File not found: nonexistent.js"

// Permission denied
@/root/.ssh/id_rsa
// → Warning: "Failed to read file: Permission denied"

// Invalid glob pattern
@[invalid
// → Warning: "Failed to resolve glob pattern: Invalid pattern"
```

## Image Clipboard Support

Paste images from clipboard (experimental):

```javascript
const image = await processClipboardImage()
// Returns:
// {
//   success: true,
//   path: '/tmp/clipboard-1234567890.png',
//   type: 'png',
//   size: 45234
// }
```

Supported formats:
- PNG: Magic bytes `89 50 4E 47`
- JPEG: Magic bytes `FF D8 FF`
- GIF: Magic bytes `47 49 46`

## Testing

Test the module with:

```bash
node src/mentions/test.mjs
```

This runs several tests demonstrating:
1. Mention parsing
2. File resolution
3. Multiple mention processing
4. Tab completion
5. Glob pattern handling

## Performance Considerations

- **Glob patterns**: Async operation, consider limiting to <50 files
- **File reading**: Files are read synchronously; large files may block
- **Tab completion**: Searches directory synchronously; may be slow for large directories
- **Image paste**: Clipboard operations are platform-dependent

## Security

The module includes security checks:

- Relative paths are resolved to project root, preventing directory traversal
- Home directory (~) expansion is safe
- File reading respects filesystem permissions
- No arbitrary command execution

## Future Enhancements

- [ ] Async file reading with progress indicator
- [ ] Syntax highlighting in file previews
- [ ] Code folding for large files
- [ ] Custom file filters (e.g., `@*.js:exclude node_modules`)
- [ ] File diff comparison (`@file1.js vs @file2.js`)
- [ ] Binary file detection with preview message
- [ ] Git-aware file selection (`@git:staged`, `@git:modified`)
- [ ] Video clipboard paste
- [ ] Directory structure visualization

## Examples

### Example 1: Review Multiple Files

```
> Review @src/components/*.tsx and @src/hooks/*.ts for performance issues

-- Files included --
src/components/Button.tsx (2.1 KB, 45 lines)
src/components/Modal.tsx (3.4 KB, 78 lines)
src/components/Form.tsx (4.2 KB, 95 lines)
src/hooks/useForm.ts (2.8 KB, 62 lines)
src/hooks/useFetch.ts (1.9 KB, 41 lines)
```

### Example 2: Debug Config File

```
> Why is @config/database.json not working?

-- Files included --
config/database.json (1.2 KB, 28 lines)

[File content is injected here for Claude to analyze]
```

### Example 3: Compare Files

```
> Check differences between @src/old.js and @src/new.js

-- Files included --
src/old.js (5.6 KB, 142 lines)
src/new.js (6.1 KB, 156 lines)
```

## Troubleshooting

### Tab completion not working

Ensure readline is properly configured:
```javascript
const rl = createReadlineWithMentionCompletion(process.stdin, process.stdout)
```

### Files not being included

Check that mentions are formatted correctly:
- Use `@` prefix: `@file.js` not `file.js`
- Use proper paths: `@src/file.js` not `@./src/file.js` (both work, but be consistent)
- Glob patterns: `@**/*.js` not `@src/*.js` (both work, latter is more specific)

### Large files causing issues

Files are automatically truncated at 2000 lines. For larger files:
- Ask Claude to view specific sections
- Use grep to extract relevant portions
- Create a smaller file focusing on relevant code

### Image paste not working

Image paste requires:
- macOS: `pbpaste` (built-in)
- Linux: `xclip` package installed
- Windows: Not yet supported

## License

This module is part of Dario and follows the same license terms.
