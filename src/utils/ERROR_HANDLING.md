# Error Handling Utilities

Centralized error handling system for Dario with custom error types, formatting, and utilities.

## Custom Error Classes

### AppError (Base)
```javascript
import { AppError } from './utils/errors.mjs'

throw new AppError('Something went wrong', 'CUSTOM_CODE')
```

Base class for all application errors with optional error codes.

### FileError
```javascript
import { FileError } from './utils/errors.mjs'

throw new FileError('File not found', '/path/to/file.txt', 'read')
```

For file system operations. Includes `filePath` and `operation` properties.

### ApiError
```javascript
import { ApiError } from './utils/errors.mjs'

throw new ApiError('Request failed', 404, { error: 'Not found' })
```

For API/network errors. Includes `statusCode` and `response` properties.

### ConfigError
```javascript
import { ConfigError } from './utils/errors.mjs'

throw new ConfigError('API key missing', 'ANTHROPIC_API_KEY')
```

For configuration errors. Includes `configKey` property.

### ToolError
```javascript
import { ToolError } from './utils/errors.mjs'

throw new ToolError('Tool execution failed', 'bash')
```

For tool execution errors. Includes `toolName` property.

### PluginError
```javascript
import { PluginError } from './utils/errors.mjs'

throw new PluginError('Plugin load failed', 'test-plugin')
```

For plugin errors. Includes `pluginName` property.

### ValidationError
```javascript
import { ValidationError } from './utils/errors.mjs'

throw new ValidationError('Invalid email', 'email', 'not-an-email')
```

For validation errors. Includes `field` and `value` properties.

## Error Formatting

### formatError()
Format errors for display with optional stack traces and verbose mode:

```javascript
import { formatError } from './utils/errors.mjs'

try {
  // ... code
} catch (error) {
  const formatted = formatError(error, {
    includeStack: false,  // Include stack trace
    verbose: false        // Include extra details
  })
  console.error(formatted)
}
```

Output example:
```
[FILE_ERROR] File not found
  File: /path/to/file.txt
  Operation: read
```

### formatErrorForClaude()
Concise error formatting for Claude responses:

```javascript
import { formatErrorForClaude } from './utils/errors.mjs'

const message = formatErrorForClaude(error, 'Reading config')
// Output: "Reading config: File not found"
```

### getErrorMessage()
Extract just the error message:

```javascript
import { getErrorMessage } from './utils/errors.mjs'

const message = getErrorMessage(error)
// Returns: "File not found"
```

## Error Handling Helpers

### withErrorHandler()
Wrap functions with error handling:

```javascript
import { withErrorHandler } from './utils/errors.mjs'

const safeFn = withErrorHandler(
  async () => {
    // ... code that might throw
  },
  (error) => {
    console.error('Handled:', error)
    return 'default value'
  }
)

const result = await safeFn()
```

### tryCatch()
Safe execution returning `[error, result]` tuple:

```javascript
import { tryCatch } from './utils/errors.mjs'

const [error, result] = await tryCatch(async () => {
  return await riskyOperation()
})

if (error) {
  console.error('Operation failed:', error)
} else {
  console.log('Success:', result)
}
```

### rethrowWithContext()
Add context to errors:

```javascript
import { rethrowWithContext } from './utils/errors.mjs'

try {
  await loadConfig()
} catch (error) {
  rethrowWithContext(error, 'Loading application config')
  // Throws: "Loading application config: Original error message"
}
```

### normalizeError()
Convert various inputs to Error objects:

```javascript
import { normalizeError } from './utils/errors.mjs'

const error1 = normalizeError('String error')
const error2 = normalizeError({ message: 'Object error' })
const error3 = normalizeError(new Error('Already an error'))
```

### isRetryableError()
Check if an error should be retried:

```javascript
import { isRetryableError } from './utils/errors.mjs'

try {
  await apiRequest()
} catch (error) {
  if (isRetryableError(error)) {
    // Retry the operation
    await retry(() => apiRequest())
  } else {
    throw error
  }
}
```

Detects:
- Timeout errors
- Network errors (ECONNRESET, ENOTFOUND, etc.)
- Rate limits (429)
- Service unavailable (503)

### aggregateErrors()
Combine multiple errors into one message:

```javascript
import { aggregateErrors } from './utils/errors.mjs'

const errors = [
  new Error('First error'),
  new Error('Second error'),
  new Error('Third error')
]

const message = aggregateErrors(errors, 'Validation failed')
// Output:
// Validation failed:
// 1. First error
// 2. Second error
// 3. Third error
```

## Usage Patterns

### Tool Implementation
```javascript
import { ToolError, formatErrorForClaude } from './utils/errors.mjs'

export async function myTool(params) {
  try {
    // ... tool logic
    return { success: true }
  } catch (error) {
    throw new ToolError(
      formatErrorForClaude(error, 'Executing myTool'),
      'myTool'
    )
  }
}
```

### API Client
```javascript
import { ApiError, ConfigError, isRetryableError } from './utils/errors.mjs'

export async function apiRequest(endpoint) {
  if (!API_KEY) {
    throw new ConfigError('API key missing', 'API_KEY')
  }

  try {
    const response = await fetch(endpoint)
    if (!response.ok) {
      throw new ApiError(
        response.statusText,
        response.status,
        await response.json()
      )
    }
    return response.json()
  } catch (error) {
    if (isRetryableError(error)) {
      // Retry logic
    }
    throw error
  }
}
```

### Plugin System
```javascript
import { PluginError, rethrowWithContext } from './utils/errors.mjs'

export async function loadPlugin(name) {
  try {
    const manifest = await loadManifest(name)
    return await initPlugin(manifest)
  } catch (error) {
    rethrowWithContext(error, `Loading plugin ${name}`)
  }
}
```

### User-Facing Errors
```javascript
import { formatError } from './utils/errors.mjs'

try {
  await runOperation()
} catch (error) {
  // User-friendly formatted error
  ui.showError(formatError(error))
}
```

## Migration Guide

### Before
```javascript
try {
  // code
} catch (error) {
  throw new Error(`API error: ${error.message}`)
}
```

### After
```javascript
import { ApiError, formatErrorForClaude } from './utils/errors.mjs'

try {
  // code
} catch (error) {
  throw new ApiError(formatErrorForClaude(error, 'API request'))
}
```

## Benefits

1. **Consistent Error Types** - All errors use standardized classes
2. **Rich Context** - Errors include structured metadata
3. **Better Formatting** - User-friendly and Claude-friendly formats
4. **Type Safety** - Easy to check error types with `instanceof`
5. **Retry Logic** - Built-in detection of retryable errors
6. **Stack Preservation** - Stack traces maintained through rethrows
7. **Aggregation** - Multiple errors handled cleanly

## Testing

All error utilities are fully tested. See `tests/errors.test.mjs` for examples.

```bash
npx vitest run tests/errors.test.mjs
```
