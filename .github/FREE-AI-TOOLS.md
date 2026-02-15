# Free AI tools used in this project

## On GitHub (free for public repos)

| Tool                | What it does                                                       | Where                                                         |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| **CodeQL**          | AI-powered static analysis: finds security issues and bugs in code | **Actions** → `CodeQL` workflow; **Security** → Code scanning |
| **Copilot Autofix** | Suggests fixes for CodeQL findings in PRs and in the Security tab  | Auto when CodeQL finds alerts (no extra setup)                |
| **Dependabot**      | Automated dependency updates (PRs)                                 | **Security** → Dependabot alerts; **Pull requests**           |
| **CI (Actions)**    | Runs type-check, lint, build on every push/PR                      | **Actions** → `CI` workflow                                   |

## In this repo

- **`.github/workflows/codeql.yml`** — CodeQL analysis (JavaScript/TypeScript), runs on push/PR and weekly.
- **`.github/workflows/ci.yml`** — Lint, type-check, build.
- **`.github/dependabot.yml`** — Dependency and Actions updates.

## Enabling more (no code change)

- **Copilot in Pull Requests**: Repo **Settings** → **General** → Features → **Copilot** (if available for your account).
- **Code scanning alerts**: After the first CodeQL run, **Security** → **Code scanning** shows results and Copilot Autofix for open alerts.

All of the above are free for public repositories.
