#!/usr/bin/env node
// Dario Integration Test

import '../src/index.mjs';

const oc = globalThis.__dario;
let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    console.log('✅', name);
    passed++;
  } else {
    console.log('❌', name);
    failed++;
  }
}

console.log('=== Dario Comprehensive Integration Test ===\n');

// Test 1: Sections count
test('24+ sections exist', Object.keys(oc).length >= 24);
console.log('  Sections:', Object.keys(oc).length);

// Test 2: Tool override mechanism
test('toolOverrides is a Map', oc.toolOverrides instanceof Map);
test('registerToolOverride exists', typeof oc.registerToolOverride === 'function');
test('unregisterToolOverride exists', typeof oc.unregisterToolOverride === 'function');
test('hasToolOverride exists', typeof oc.hasToolOverride === 'function');
test('getToolOverride exists', typeof oc.getToolOverride === 'function');
test('wrapTool exists', typeof oc.wrapTool === 'function');
test('applyOverrides exists', typeof oc.applyOverrides === 'function');

// Test 3: Integration module
test('integration.initializeTools exists', typeof oc.integration?.initializeTools === 'function');
const tools = oc.integration.initializeTools();
test('18 tools initialized', Object.keys(tools).length === 18);
console.log('  Tools:', Object.keys(tools).join(', '));

// Test 4: Tool override workflow
oc.registerToolOverride('Bash', tools.Bash);
test('Tool override registered', oc.hasToolOverride('Bash'));
test('Override is our readable tool', oc.getToolOverride('Bash') === tools.Bash);

// Test 5: applyOverrides works
const mockTools = [{ name: 'Bash', call: async function*() {} }, { name: 'Read', call: async function*() {} }];
const applied = oc.applyOverrides(mockTools);
test('applyOverrides returns array', Array.isArray(applied));
test('applyOverrides preserves length', applied.length === 2);

// Test 6: Core modules
test('hooks module exists', oc.hooks && typeof oc.hooks.runPreToolUse === 'function');
test('plan module exists', oc.plan && typeof oc.plan.enter === 'function');
test('agents module exists', oc.agents && typeof oc.agents.spawn === 'function');
test('tasks module exists', oc.tasks && typeof oc.tasks.spawn === 'function');
test('session module exists', oc.session && typeof oc.session.createSession === 'function');
test('plugins module exists', oc.plugins && Object.keys(oc.plugins).length > 0);

// Test 7: API and auth
test('api module exists', oc.api && typeof oc.api.sendRequest === 'function');
test('auth module exists', oc.auth && typeof oc.auth.authenticate === 'function');

// Test 8: Readable tool structure - Core tools
test('Bash tool has name', tools.Bash?.name === 'Bash');
test('Bash tool has call function', typeof tools.Bash?.call === 'function');
test('Read tool exists and is callable', tools.Read && typeof tools.Read.call === 'function');
test('Edit tool has name', tools.Edit?.name === 'Edit');
test('Write tool exists and is callable', tools.Write && typeof tools.Write.call === 'function');
test('Glob tool exists and is callable', tools.Glob && typeof tools.Glob.call === 'function');
test('Grep tool exists and is callable', tools.Grep && typeof tools.Grep.call === 'function');

// Test 8b: Additional tools
test('Task tool exists', tools.Task && typeof tools.Task.call === 'function');
test('TodoWrite tool exists', tools.TodoWrite && typeof tools.TodoWrite.call === 'function');
test('TodoRead tool exists', tools.TodoRead && typeof tools.TodoRead.call === 'function');
test('WebFetch tool exists', tools.WebFetch && typeof tools.WebFetch.call === 'function');
test('WebSearch tool exists', tools.WebSearch && typeof tools.WebSearch.call === 'function');
test('NotebookEdit tool exists', tools.NotebookEdit && typeof tools.NotebookEdit.call === 'function');
test('AskUserQuestion tool exists', tools.AskUserQuestion && typeof tools.AskUserQuestion.call === 'function');
test('LSP tool exists', tools.LSP && typeof tools.LSP.call === 'function');
test('EnterPlanMode tool exists', tools.EnterPlanMode && typeof tools.EnterPlanMode.call === 'function');
test('ExitPlanMode tool exists', tools.ExitPlanMode && typeof tools.ExitPlanMode.call === 'function');
test('Skill tool exists', tools.Skill && typeof tools.Skill.call === 'function');
test('MultiEdit tool exists', tools.MultiEdit && typeof tools.MultiEdit.call === 'function');

// Test 9: Tool overrides auto-registered (if env var set)
// Check this BEFORE cleanup since we registered Bash manually
const expectedOverrides = process.env.DARIO_USE_READABLE_TOOLS === '1' ? 18 : 1;
test('Tool overrides count correct', oc.toolOverrides.size === expectedOverrides);

// Cleanup
oc.unregisterToolOverride('Bash');
test('Tool override unregistered', oc.hasToolOverride('Bash') === false);

console.log('\n=== Summary ===');
console.log('Passed:', passed);
console.log('Failed:', failed);
console.log('Sections:', Object.keys(oc).length);
console.log('Total exports:', Object.values(oc).reduce((sum, section) =>
  sum + (typeof section === 'object' && section !== null ? Object.keys(section).length : 1), 0
));
console.log('Tool overrides:', oc.toolOverrides.size);

if (failed === 0) {
  console.log('\n🎉 All tests passed!');
} else {
  console.log('\n⚠️  Some tests failed');
}

process.exit(failed === 0 ? 0 : 1);
