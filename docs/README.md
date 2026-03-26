# FM Engine documentation

| Document | Purpose |
|----------|---------|
| [HISTORY-AND-CHANGES.md](./HISTORY-AND-CHANGES.md) | What existed **before** the refactor vs **after**; env, bugs fixed, UI, DB migration summary. |
| [BACKLOG.md](./BACKLOG.md) | Deferred work (phone Auth, stricter RLS, webhook routing, etc.). |

Start with **HISTORY-AND-CHANGES** for rollback context; use **BACKLOG** for planned next steps.

## Publishing this work to GitHub

The work is committed on branch **`feature/fm-engine-refactor-march-2025`**. If automated push is unavailable in your environment, run locally:

```bash
git fetch origin
git checkout feature/fm-engine-refactor-march-2025
git push -u origin feature/fm-engine-refactor-march-2025
```

Then open a PR into `main` on GitHub, or merge when satisfied. To roll back the app only: `git checkout main` (database changes on Supabase are separate — see HISTORY-AND-CHANGES).
