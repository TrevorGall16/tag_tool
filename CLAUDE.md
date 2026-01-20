# TagArchitect Project Rules

- **Primary Mission:** Build a resilient batch-tagging tool for Etsy/Adobe Stock.
- **Rules Reference:** Follow all modular guidelines in `.claude/rules/`.
- **Formatting:** Always run `pnpm prettier --write` after file edits.
- **Safety:** Never commit files containing `sk_` or `sk-ant`.
- **Constraint:** All image processing must happen locally (resize < 512px) before API calls.
