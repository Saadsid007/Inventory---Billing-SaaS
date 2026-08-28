# Bahikhata — docs

The build spec (`../inventory-billing-saas-build-spec.md`) is the source of truth
for **what** to build. These docs record **what was actually built, and why** —
the things a spec can't know in advance.

| File | What it holds |
|---|---|
| [progress.md](./progress.md) | Phase-by-phase status. What is done, what was verified, what is still open. |
| [decisions.md](./decisions.md) | Every non-obvious choice and its reasoning. Read before overturning one. |
| [architecture.md](./architecture.md) | How the monorepo hangs together and which boundaries are machine-enforced. |
| [runbook.md](./runbook.md) | Commands, environment setup, and the traps that have already cost time. |

## Rules for keeping these useful

1. **Update at the end of each phase, not "later".** A decision's reasoning has a
   half-life of about a week.
2. **Record the reasoning, not the outcome.** "We use postgres.js" is visible in
   `package.json`. *Why* it beat the Neon serverless driver is not.
3. **Write down what failed too.** A dead end someone else will otherwise retry
   is worth more than another paragraph about what worked.
4. Anything that turns out to be wrong gets **corrected in place**, not appended
   to. These are notes to work from, not a changelog.
