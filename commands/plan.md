---
description: Analyze requirements against TagArchitect Docs and create a step-by-step plan. MUST WAIT for user confirmation.
---

# /plan Command

This command forces a pre-production planning phase to prevent "vague iteration" and technical debt.

## Execution Steps

1. **Context Loading**: Read `@Overview.md`, `@TechStack.md`, and `@Database.md`.
2. **Requirements Audit**: Restate what needs to be built in simple, boring terms.
3. **Constraint Check**: Identify if the feature affects:
   - AI Token Costs (Local resize required?)
   - Credit Balance (Atomic transaction required?)
   - Marketplace Schemas (Adobe vs. Etsy limits?)
4. **Implementation Phases**: Break the work into small, 300-line-max files.
5. **Risk Assessment**: Identify where the "Builder" might fail (e.g., "Browser memory limit for ZIPs").

**CRITICAL**: You are FORBIDDEN from writing implementation code until the user says "yes" or "proceed."
