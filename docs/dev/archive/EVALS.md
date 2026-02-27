# Eval System

Comprehensive evaluation system for Dario CLI that runs tests, captures logs, judges results, and generates improvement feedback.

## Features

1. **CLI Streaming** - Run CLI with `--output-format stream-json` like Dario Code
2. **Log Capture** - Captures all messages, tool calls, and results
3. **Automated Judging** - Scores based on success, tool usage, efficiency, methodology
4. **Feedback Loop** - Analyzes failures and generates improvement plans

## Usage

### Run Evals

```bash
node src/eval/index.mjs run
```

This will:
- Run all test cases defined in `src/eval/index.mjs`
- Capture streaming JSON output
- Judge each result
- Generate improvement plan
- Save logs to `.evals/`

### CLI Options (Matching Dario Code)

```bash
# Text output (default)
node cli.mjs -p "Your prompt"

# Stream JSON (like subagent)
node cli.mjs -p "Your prompt" --output-format stream-json

# With verbose output
node cli.mjs -p "Your prompt" --output-format stream-json --verbose

# With specific model
node cli.mjs -p "Your prompt" --output-format stream-json --model claude-opus-4
```

## Evaluation Criteria

### Scores (0.0 - 1.0)

1. **Success** (30% weight) - Did it complete without errors?
2. **Tool Usage** (20% weight) - Tool success rate
3. **Efficiency** (15% weight) - Number of tool calls
4. **Output Quality** (15% weight) - Generated meaningful output?
5. **Error Handling** (10% weight) - Recovered from errors?
6. **Methodology** (10% weight) - Followed best practices?

### Methodology Checks

- ✅ Read files before editing
- ✅ Use dedicated search tools (not Bash)
- ✅ Minimize tool calls
- ✅ Handle errors gracefully

### Grades

- **A**: 90%+ - Excellent
- **B**: 80-89% - Good
- **C**: 70-79% - Acceptable
- **D**: 60-69% - Needs improvement
- **F**: <60% - Failed

## Test Cases

Located in `src/eval/index.mjs`:

```javascript
const TEST_CASES = [
  {
    name: 'simple_read',
    prompt: 'Read the README.md and summarize',
    expectedTools: ['Read']
  },
  {
    name: 'search_and_edit',
    prompt: 'Find and remove console.log statements',
    expectedTools: ['Grep', 'Read', 'Edit']
  },
  // ... more cases
]
```

## Output

### Directory Structure

```
.evals/
├── <eval-id>/           # Individual eval logs
│   ├── messages.json    # All messages
│   └── result.json      # Eval result + judgment
├── runs/                # Daily summaries
│   └── 2026-01-07/
│       ├── summary.json
│       ├── simple_read.json
│       └── search_and_edit.json
└── feedback/            # Improvement plans
    ├── history.jsonl
    └── 2026-01-07T12-00-00-plan.md
```

### Report Example

```
═══════════════════════════════════════
📊 EVAL REPORT
═══════════════════════════════════════
Eval ID: 8f7a9c2d-...
Prompt: Read README.md and summarize
Duration: 1234ms

SCORES:
  Overall: 92.0% (Grade: A)
  success           : ██████████ 100.0%
  tool_usage        : ████████░░ 80.0%
  efficiency        : ██████████ 100.0%
  output_quality    : ██████████ 100.0%
  error_handling    : ██████████ 100.0%
  methodology       : ██████████ 100.0%

FEEDBACK:
  • Used 1 tools, 0 errors (100.0% success)

TOOL USAGE:
  Read: 1x
═══════════════════════════════════════
```

### Improvement Plan Example

```markdown
# Improvement Plan
Generated: 2026-01-07T12:00:00.000Z
Based on 4 eval runs
Average Score: 72.5%

## Issues Identified

### METHODOLOGY

**Editing files without reading first**
- Suggestion: Update system prompt to emphasize Read-before-Edit pattern
- Files: src/prompts/system.mjs

**Too many sequential searches**
- Suggestion: Improve search tools or add batching capability
- Files: src/tools/grep.mjs, src/tools/glob.mjs

## Next Steps

1. Review the suggestions above
2. Update identified files
3. Re-run evals to verify improvements
4. Iterate until all tests pass
```

## Integration with Ralph Loop

The eval system integrates with Ralph loop (`.claude/ralph-loop.local.md`):

1. Ralph loop runs evals automatically
2. Analyzes failures
3. Generates improvement plan
4. Feeds improvements back to next iteration
5. Verifies fixes
6. Repeats until all tests pass

## Adding New Test Cases

Edit `src/eval/index.mjs`:

```javascript
{
  name: 'my_test',
  prompt: 'Test prompt',
  expectedTools: ['Tool1', 'Tool2'],
  expectedBehavior: 'Description of expected behavior'
}
```

## Implementation Files

- `src/eval/runner.mjs` - Spawns CLI, captures streaming output
- `src/eval/judge.mjs` - Scoring and grading logic
- `src/eval/feedback.mjs` - Analyzes failures, generates plans
- `src/eval/index.mjs` - Main eval orchestrator
- `src/cli/print-mode.mjs` - CLI streaming mode
