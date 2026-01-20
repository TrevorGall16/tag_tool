1. The Pre-Session Checklist
   Do these 3 things every time you start a coding session:

Sync Rules: Ensure your .claude/rules/ folder has the latest versions of the Architecture, UI, Business, Security, and SEO docs.

Check Context: Run /statusline to see how much of Claude’s 200k context window is left. If it’s low, run /compact.

Verify Environment: Run pnpm tsc --noEmit to make sure you aren't starting with existing bugs.

2. Master AI Agent Roles
   Use the @ tag to delegate specific checks to your specialized "workers":

@planner: Use first for any new feature. He breaks tasks into "Boring & Practical" steps.

@architect: The "UI & Logic Police." Ask him: "Does this component match the visual polish in @3. Ui.md?".

@security-reviewer: The "Bank & Privacy Guard." Ask him: "Is this credit deduction atomic and is the metadata scheduled for 24-hour deletion?".

3. The "Non-Negotiable" Rules
   If Claude suggests a shortcut, check it against these laws:

Local-First Resize: All images must be resized to < 512px locally using the Canvas API before being sent to any API.

The "Token Saver": Only one representative image per cluster is sent to Claude Vision; the rest inherit the tags.

Atomic Credits: All credit additions or subtractions must be wrapped in a prisma.$transaction.

Visual Polish: Never use pure black (#000000). Use slate-900. Use rounded-xl for everything.

Data Shredding: All metadata must have an expiresAt timestamp set to 24 hours after creation.

4. Slash Command Quick Reference
   Use these commands to manage the workflow efficiently:

/plan: Use before coding. Restates requirements and identifies risks (e.g., API costs).

/build-fix: Use when pnpm build fails. It fixes errors one-by-one to prevent cascading bugs.

/refactor-clean: Use to delete dead code and "clever" logic. Keeps the project "Boring".

/fork: Use to test a risky fix in a separate "universe" without breaking your main progress.

5. Implementation Roadmap
   Follow this "Happy Path" for every feature:

Plan: /plan [Feature Description].

Confirm: Type "yes" once you approve the phase-by-phase breakdown.

Build: Let Claude implement the code.

Audit: Delegate to @architect: "Does this follow the patterns in @ui-patterns.md?".

Secure: Delegate to @security-reviewer: "Ensure no keys are leaked and credits are safe.".

Polish: /refactor-clean to remove console.logs and unused types.
