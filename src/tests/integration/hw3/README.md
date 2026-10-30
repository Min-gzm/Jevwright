# Integration fixtures

Real page data captured with Playwright from **Tasklane**, a static demo app in [`src/tests/benchmark/demo-app/`](../../benchmark/demo-app/). Jev Harness tests read these files instead of launching a browser.

## Layout

```text
src/tests/integration/hw3/
├── scenarios.ts   # page states to capture, with ground-truth targets and statements
├── capture.ts     # serves ../../benchmark/demo-app and writes fixtures/
└── fixtures/<scenario>/
    ├── screenshot.png   # 1280×800 viewport, the Visual Locate input
    ├── snapshot.json    # interactive elements + visible text, the DOM Locate input
    └── expected.json    # ground truth
```

## Scenarios

| Scenario | What it covers |
| --- | --- |
| `login-empty` | Plain form fields, an icon-only button, a target that does not exist |
| `login-error` | An error alert, invalid fields shown only by a red border |
| `board-default` | Six identical "Delete task" buttons and "Mark as done" checkboxes, icon-only top bar |
| `board-new-task-dialog` | Modal dialog; elements behind it are `hittable: false` |
| `board-delete-confirm` | A confirm dialog whose title names the row |
| `board-search-empty` | Empty state; a row target that disappeared |
| `board-done-tab` | Selected tab state, filtered rows |
| `settings-default` | Switches named by `aria-labelledby`, a disabled field, a canvas chart only Visual Locate can see |
| `settings-saved` | A success message after an action |

## Formats

`snapshot.json`

```jsonc
{
  "url": "/board.html",
  "title": "Website redesign · Tasklane",
  "viewport": { "width": 1280, "height": 800 },
  "elements": [
    // visible interactive elements inside the viewport, in DOM order
    { "id": 21, "tag": "button", "role": "button", "name": "Delete task",
      "attrs": {}, "bbox": { "x": 1205, "y": 348, "width": 32, "height": 32 },
      "hittable": true }   // false when something covers its center, e.g. a modal backdrop
  ],
  "texts": [
    // visible text nodes with their own boxes
    { "text": "Write release notes", "tag": "td", "bbox": { "x": 327, "y": 356, "width": 136, "height": 16 } }
  ]
}
```

`expected.json`

```jsonc
{
  "scenario": "board-default",
  "description": "...",
  "targets": [
    // elementId: the matching snapshot element, or null when the target is not interactive (an alert, a canvas)
    // present: false and bbox: null when the target is not on the page
    { "target": "Delete (trash) icon in the 'Write release notes' row",
      "present": true, "elementId": 21, "bbox": { "x": 1205, "y": 348, "width": 32, "height": 32 } }
  ],
  "statements": [
    { "statement": "Two tasks are marked as done", "holds": true }
  ]
}
```

All coordinates are CSS pixels relative to the viewport, with device scale factor 1, so they match screenshot pixels.

## Regenerating

```bash
pnpm fixtures:capture                 # all scenarios
pnpm fixtures:capture login-error     # one scenario
```

To add a scenario, add it to `scenarios.ts` and run the command. Capture fails if a ground-truth selector matches anything other than exactly one element, or if the element is outside the viewport.

The JSON output is deterministic. Screenshots can differ by a few anti-aliased pixels between runs, so do not compare them byte for byte.

If Chromium fails to launch with a missing shared library, install its system dependencies with `pnpm exec playwright install-deps chromium`.
