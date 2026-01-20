---
description: Identify and remove dead code, console logs, and "clever" logic to keep the codebase boring and practical.
---

# /refactor-clean Command

Keeps the codebase under the 300-line-per-file limit and ensures we are not wasting context on dead code.

## Execution Steps

1. **Audit**: Scan for unused exports using `knip` or `ts-prune`.
2. **Polish Check**: Search for forbidden patterns:
   - `console.log` (Must be removed)
   - Pure black `#000000` (Must be changed to `slate-900`)
   - Non-WebP thumbnails
3. **Deletion Proposal**: List files/functions to be deleted.
4. **Safety Check**: Run `pnpm tsc --noEmit` before and after deletion.
5. **Rollback**: If types break, immediately undo the deletion.

**GOAL**: Maintain a "Boring" and small codebase that is easy for AI to navigate.
