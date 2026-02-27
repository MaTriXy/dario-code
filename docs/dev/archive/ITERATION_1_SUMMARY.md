# Ralph Loop - Iteration 1 Complete

## Task
> Run evals on Dario CLI - make it launch with -p for streaming, capture logs, judge results, feed improvements back

## ✅ Completed

### 1. CLI Streaming Mode
- ✅ Added `--output-format` flag (text, json, stream-json)
- ✅ Matches Dario Code's API: `claude -p "prompt" --output-format stream-json`
- ✅ Streams tool calls and results in real-time
- ✅ Works exactly like subagents

**Files:**
- `cli.mjs` - Added `--output-format` option
- `src/cli/print-mode.mjs` - Implemented stream-json format

### 2. Log Capture
- ✅ Spawns CLI process with stream-json output
- ✅ Captures all messages (assistant, user, tool_use, tool_result)
- ✅ Extracts tool calls, tool results, errors
- ✅ Saves to `.evals/<eval-id>/`

**Files:**
- `src/eval/runner.mjs` - Eval runner that spawns CLI and captures logs

### 3. Evaluation System
- ✅ Judges results on 6 criteria:
  - Success (30%) - Exit code 0?
  - Tool Usage (20%) - Tool success rate
  - Efficiency (15%) - Tool calls per response
  - Output Quality (15%) - Generated output?
  - Error Handling (10%) - Recovered from errors?
  - Methodology (10%) - Best practices?
- ✅ Grades: A/B/C/D/F
- ✅ Generates detailed reports

**Files:**
- `src/eval/judge.mjs` - Scoring and grading logic

### 4. Feedback Loop
- ✅ Analyzes failures by category
- ✅ Generates improvement suggestions
- ✅ Identifies specific files to fix
- ✅ Saves improvement plans to `.evals/feedback/`
- ✅ Tracks history in JSONL

**Files:**
- `src/eval/feedback.mjs` - Feedback analysis and plan generation
- `src/eval/index.mjs` - Main eval orchestrator

### 5. Documentation
- ✅ `EVALS.md` - Complete eval system documentation
- ✅ Usage examples, scoring criteria, output structure

## Test Results (Iteration 1)

### simple_read
**Grade: B (81.3%)**
- ✅ Completed successfully
- ⚠️ Tool errors (View tool parameter issues)
- ⚠️ Used Bash for search instead of Grep/Glob

### search_and_edit
**Grade: D (67.3%)**
- ✅ Completed successfully
- ❌ Many tool errors (11 out of 16 calls)
- ⚠️ High tool usage (16 calls)
- ⚠️ Used Bash for search

### create_file
**Grade: B (85.0%)**
- ✅ Completed successfully
- ✅ Perfect tool usage
- ❌ No text output (silent execution)

## Issues Found

1. **View Tool Errors** - `Cannot destructure property 'path'`
   - Needs investigation and fix

2. **Bash Usage for Search** - Claude using `bash grep` instead of GrepTool
   - System prompt should emphasize dedicated search tools

3. **Silent Execution** - Some tasks don't output text
   - May need to add confirmations

## Next Iteration Actions

1. Fix View tool parameter destructuring
2. Update system prompt to discourage Bash for file operations
3. Add test cases for common patterns
4. Run full eval suite again
5. Verify all grades improve to A/B

## Integration Ready

The eval system is now functional and can be integrated with Ralph loop for continuous improvement cycles:

```bash
# Run evals manually
node src/eval/index.mjs run

# Future: Ralph loop will run this automatically
# and feed improvements back each iteration
```

## Files Created/Modified

### Created
- `src/eval/runner.mjs` - Log capture
- `src/eval/judge.mjs` - Evaluation logic
- `src/eval/feedback.mjs` - Improvement plans
- `src/eval/index.mjs` - Main orchestrator
- `EVALS.md` - Documentation
- `ITERATION_1_SUMMARY.md` - This file

### Modified
- `cli.mjs` - Added --output-format
- `src/cli/print-mode.mjs` - Stream-json support

## Commands

```bash
# Run all evals
node src/eval/index.mjs run

# Test single prompt
node cli.mjs -p "Read README.md" --output-format stream-json

# Test with verbose
node cli.mjs -p "Your prompt" --output-format stream-json --verbose
```
