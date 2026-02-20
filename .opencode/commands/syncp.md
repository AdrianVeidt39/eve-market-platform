---
description: Sync local workspace and push
agent: build
---
Synchronize this repository from the parent local workspace and publish changes.

Run this command from the project root:

`bash sync-local.sh --syncp`

If there are no changes, report that the repository is already synchronized.
If a commit is created, include changed files, branch, commit hash, and push result.
