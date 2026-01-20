---
description: Incrementally fix TypeScript and build errors using the TagArchitect Tech Stack.
---

# /build-fix Command

Use this when `pnpm build` fails. Do not attempt "clever" workarounds; follow the project's strict typing.

## Execution Steps

1. **Run Build**: Execute `pnpm build` (as specified in `@TechStack.md`).
2. **Isolate First Error**: Identify the first breaking error in the output.
3. **Context Analysis**: Show 5 lines of code around the error and explain the conflict with our `@TechStack.md` or `@Database.md`.
4. **Apply Fix**: Propose a fix that maintains **Strict TypeScript Mode**.
5. **Verify**: Re-run the build. If a new error appears, stop and report.

**RULE**: Fix only ONE error at a time to prevent cascading bugs.
