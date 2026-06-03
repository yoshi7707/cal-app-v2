# Git push (cal-app-v2)

This project has **one** Git repository. Push only from this folder.

## Quick check

```bash
cd /Users/yoshitaguchi/Documents/projects/cal-app-v2
git status -sb
git push
```

Expected: `## feature...origin/feature` and `Everything up-to-date` (or a successful push after you commit).

## If push fails in Cursor

1. **Reload window** (Command Palette → Developer: Reload Window).
2. Open **`cal-app-v2.code-workspace`** (not the parent `Documents` folder).
3. In Source Control, select repository **cal-app-v2** only.
4. Commit changes first, then push (`git push` only uploads commits).

## Remote

- URL: `https://github.com/yoshi7707/cal-app-v2.git`
- Branch: `feature`

Do **not** push `react-big-calendar` — it was removed as a submodule; use the npm package instead.
