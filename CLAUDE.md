# Dario Code Development Guide

## Commands
- Build: `npm install` (Node.js 18+ required)
- Run: `node cli.mjs` or `./dario.mjs`
- Test All: `npm run test:all` (integration + unit tests)
- Test Unit: `npm run test:unit` (vitest)
- Test Single: `npx vitest run tests/keyboard.test.mjs`
- Test Integration: `npm test`
- Dev Readable: `DARIO_USE_READABLE_TOOLS=1 ./cli.mjs`

## Code Style
- ES Modules (`import`/`export`, not `require`)
- Single quotes, template literals for interpolation
- camelCase for variables/functions, PascalCase for classes
- Async/await for async operations
- Comprehensive error handling with descriptive messages
- JSDoc for public APIs and complex functions
- Functional patterns preferred; avoid mutations

## Project Structure
- Entry: `cli.mjs` (main), `dario.mjs` (readable tools)
- `src/` - Modular source: tools/, api/, cli/, hooks/, plugins/
- `vendor/` - Bundled dependencies (SDK, ripgrep)
- `tests/` - Vitest unit tests (*.test.mjs)
