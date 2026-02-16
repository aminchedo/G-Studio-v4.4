# Upload in several steps (no zip files)

- **Do not upload:** `.zip`, `.tar`, `.gz`, `.rar`, `.7z`, `.iso` (ignored and blocked by pre-commit).
- **Already ignored:** `node_modules/`, `backup/`, `*.log`, `*.db`, etc. (see `.gitignore`).

## How to upload in steps

When you have new or changed files:

**Step 1 — Config / root**

```bash
git add .gitignore .env.example *.json index.html
git status   # confirm no .zip or huge files
git commit -m "chore: config and root files"
git push origin main
```

**Step 2 — Source**

```bash
git add src/
git status
git commit -m "feat: source updates"
git push origin main
```

**Step 3 — Rest**

```bash
git add .
git status   # .gitignore will exclude zip, node_modules, etc.
git commit -m "chore: remaining project files"
git push origin main
```

The pre-commit hook will reject any staged `.zip` (and other archives) or files over 50MB.
