# AI-augmented automation

This repo is set up for AI-augmented automation with minimal, reversible changes.

## What runs automatically

| Workflow              | Trigger                     | What it does                                                                              |
| --------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| **CI**                | Push / PR to `main`         | ESLint, type-check, build; **on PRs**: posts a comment with CI status and link to CodeQL. |
| **CodeQL**            | Push / PR to `main`, weekly | Security/code quality analysis (JavaScript/TypeScript).                                   |
| **Code Intelligence** | Push / PR, weekly, manual   | Runs `tools/g_studio_intelligence_v7.3.2.py`; uploads reports.                            |

- **No secrets** are used in these workflows (no API keys in repo or in workflow files).
- **Business logic** is unchanged; only CI/workflow config and this doc were added.

## GitHub App for automated PR review (optional)

To add a **free GitHub App** for automated PR review (e.g. suggestions, review comments):

1. **You must approve first.** When the agent or doc says:  
   **"Type YES to authorize installation on this repository."**  
   reply **YES** if you want the app installed on this repo.

2. **Suggested apps** (free tiers; install only after you approve):
   - **Gitar** – PR review and fixes (install from [GitHub Marketplace](https://github.com/marketplace) or the app’s site).
   - **CodeRabbit** – AI PR reviews (free for public repos).
   - **Sourcery** – code review (if applicable to your stack).

3. **How to install (after approval):**  
   Repo **Settings** → **Integrations** → **GitHub Apps** → **Configure** for the chosen app → select this repository and authorize.

## Reverting

- To remove the PR comment: delete the `pr-comment` job from `.github/workflows/ci.yml`.
- To disable CodeQL: delete or disable `.github/workflows/codeql.yml`.
- Uninstall any installed GitHub App from repo **Settings** → **Integrations** → **GitHub Apps**.
