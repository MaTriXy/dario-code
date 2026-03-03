# Plan: Rich Plan Display after ExitPlanMode

## Goal

When Claude calls `ExitPlanMode`, render a rich boxed plan display in the TUI — matching the visual you showed: a coloured-border box with the plan title, sections, and an "★ Insight" block below.

## How it works today

1. Claude calls `ExitPlanMode` tool → `exitPlanMode()` sets plan status to `AWAITING_APPROVAL`, saves to `~/.dario/plans/<id>.json`
2. The tool returns a plain success string: "Exited plan mode. Your plan is ready for review."
3. That string flows back as a `tool_result` message and is rendered as `⎿ Exited plan mode...` — no visual plan box
4. `onPlanApproved` callback exists for compaction but there's no approve/reject UI

## Approach

### 1. Subscribe to plan state changes in the TUI (`main.mjs`)

Add a `pendingPlan` state: `const [pendingPlan, setPendingPlan] = useState(null)`

Import `{ isInPlanMode, getCurrentPlan }` from `../../plan/plan.mjs` and subscribe via a polling `useEffect` (or expose an event emitter from plan.mjs — polling every 200ms is simpler and correct).

When `ExitPlanMode` fires, the tool calls `exitPlanMode()` from `plan.mjs`. We detect this by watching `isInPlanMode()` transition from `true → false` with a `currentPlan.status === 'awaiting_approval'`.

### 2. Export a plan event emitter from `plan.mjs`

Add:
```js
let _onExitCallbacks = []
export function onPlanExit(cb) {
  _onExitCallbacks.push(cb)
  return () => { _onExitCallbacks = _onExitCallbacks.filter(c => c !== cb) }
}
```

Call `_onExitCallbacks.forEach(cb => cb(plan))` inside `exitPlanMode()`.

### 3. Subscribe in the TUI

```js
useEffect(() => {
  const unregister = onPlanExit((plan) => {
    setPendingPlan(plan)
  })
  return unregister
}, [])
```

### 4. Build `PlanDisplay` component

A new component rendered when `pendingPlan != null`, shown below the live message area (before the prompt input). Uses a `suggestion`-coloured border (`THEME.suggestion` = `#3B82F6`).

Structure:
```
╭─ Plan to implement ──────────────────────╮
│                                          │
│  <plan.title>                            │
│                                          │
│  <plan.description rendered as sections> │
│                                          │
│  [✓ Accept] [✗ Reject]                  │
╰──────────────────────────────────────────╯
★ Insight ────────────────────────────────
  <insight text>
──────────────────────────────────────────
```

The plan description is rendered as markdown-like text (reuse existing `Text` rendering — no need for full markdown parser).

The insight text is a fixed contextual message about the plan, e.g.:
> "Review the plan above carefully before accepting. Once approved, the conversation history will be compacted and implementation will begin."

### 5. Accept / Reject keyboard handling

When `pendingPlan` is set:
- **`y` or Enter** → call `approvePlan(pendingPlan.id)` → clears `pendingPlan`
- **`n` or Escape** → call `cancelPlan(pendingPlan.id)` → clears `pendingPlan`, shows "Plan cancelled" message

Block normal input submission while `pendingPlan` is set (show hint in prompt area).

### 6. Read the plan markdown content

`plan.mjs` already writes a `.md` file alongside `.json`. Read the `.md` file content with `fs.readFileSync` to display the full human-readable plan, falling back to `plan.description` if the file is missing.

## Files Modified

- `src/plan/plan.mjs` — add `onPlanExit` event emitter, call it in `exitPlanMode()`
- `src/tui/claude/main.mjs` — add `pendingPlan` state, `onPlanExit` subscription, `PlanDisplay` component, keyboard handling

## Verification

1. `npm run test:unit`
2. Manual test: ask Claude to implement something non-trivial → it calls `EnterPlanMode` → explores → calls `ExitPlanMode` → plan box appears → accept with `y` → compaction fires → implementation begins
