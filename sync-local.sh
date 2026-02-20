#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash sync-local.sh [--source <path>] [--with-agents] [--commit <message>] [--push]

Options:
  --source <path>     Source folder to sync from (default: parent folder ../)
  --with-agents       Also copy AGENTS.md from source to repo root
  --commit <message>  Create commit after syncing with given message
  --push              Push current branch after a successful commit
  -h, --help          Show this help

Examples:
  bash sync-local.sh
  bash sync-local.sh --with-agents
  bash sync-local.sh --with-agents --commit "Sync local workspace files" --push
EOF
}

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_dir="${repo_dir}/.."
with_agents='false'
commit_message=''
should_push='false'

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)
      if [[ $# -lt 2 ]]; then
        echo "Error: --source requires a path argument" >&2
        exit 1
      fi
      source_dir="$2"
      shift 2
      ;;
    --with-agents)
      with_agents='true'
      shift
      ;;
    --commit)
      if [[ $# -lt 2 ]]; then
        echo "Error: --commit requires a message argument" >&2
        exit 1
      fi
      commit_message="$2"
      shift 2
      ;;
    --push)
      should_push='true'
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown argument '$1'" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -d "$source_dir" ]]; then
  echo "Error: source directory not found: $source_dir" >&2
  exit 1
fi

src_index="$source_dir/index.html"
src_agents="$source_dir/AGENTS.md"
dst_index="$repo_dir/client/index.html"
dst_agents="$repo_dir/AGENTS.md"

if [[ ! -f "$src_index" ]]; then
  echo "Error: missing source file: $src_index" >&2
  exit 1
fi

if [[ ! -f "$dst_index" ]]; then
  echo "Error: missing destination file: $dst_index" >&2
  exit 1
fi

cp "$src_index" "$dst_index"
echo "Synced: $src_index -> $dst_index"

if [[ "$with_agents" == 'true' ]]; then
  if [[ ! -f "$src_agents" ]]; then
    echo "Error: --with-agents enabled but source file missing: $src_agents" >&2
    exit 1
  fi
  cp "$src_agents" "$dst_agents"
  echo "Synced: $src_agents -> $dst_agents"
fi

echo
git -C "$repo_dir" status --short

if [[ -n "$commit_message" ]]; then
  git -C "$repo_dir" add client/index.html
  if [[ "$with_agents" == 'true' ]]; then
    git -C "$repo_dir" add AGENTS.md
  fi

  if git -C "$repo_dir" diff --cached --quiet; then
    echo "No staged changes to commit."
    exit 0
  fi

  git -C "$repo_dir" commit -m "$commit_message"

  if [[ "$should_push" == 'true' ]]; then
    current_branch="$(git -C "$repo_dir" rev-parse --abbrev-ref HEAD)"
    git -C "$repo_dir" push origin "$current_branch"
  fi
fi
