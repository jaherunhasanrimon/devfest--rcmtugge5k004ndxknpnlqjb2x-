#!/bin/bash
# Competition Git and Time Check Script

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT" || exit 1

echo "==================== [GIT-CHECK REPORT] ===================="

# 1. Elapsed time
if [ -f .t0 ]; then
  T0=$(cat .t0 | tr -d '[:space:]')
  NOW=$(date +%s)
  ELAPSED_SEC=$((NOW - T0))
  ELAPSED_MIN=$((ELAPSED_SEC / 60))
  echo "Clock:"
  echo "  - Start (.t0):      $(date -r "$T0" "+%Y-%m-%d %H:%M:%S %Z" 2>/dev/null || date -d "@$T0" "+%Y-%m-%d %H:%M:%S %Z" 2>/dev/null || echo "$T0")"
  echo "  - Current time:     $(date "+%Y-%m-%d %H:%M:%S %Z")"
  echo "  - Minutes elapsed:  ${ELAPSED_MIN} min (${ELAPSED_SEC}s) / 90 min"
else
  echo "Clock: .t0 file NOT FOUND!"
  T0=0
  ELAPSED_MIN=0
fi

# 2. Total commit count and time since last commit
COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo 0)
echo ""
echo "Commits:"
echo "  - Total commit count: $COMMIT_COUNT"

if [ "$COMMIT_COUNT" -gt 0 ]; then
  LAST_COMMIT_TIME=$(git log -1 --format=%ct)
  LAST_COMMIT_MSG=$(git log -1 --format="%h - %s")
  MIN_SINCE_LAST=$(( (NOW - LAST_COMMIT_TIME) / 60 ))
  echo "  - Last commit:        $LAST_COMMIT_MSG"
  echo "  - Time since last:    ${MIN_SINCE_LAST} min"
  
  if [ "$MIN_SINCE_LAST" -ge 25 ]; then
    echo "  - [ALERT] 25+ minutes since last commit! Must commit immediately!"
  elif [ "$MIN_SINCE_LAST" -ge 20 ]; then
    echo "  - [WARN] 20+ minutes since last commit! Plan commit soon."
  else
    echo "  - Cadence status:     OK (< 20 min)"
  fi
else
  echo "  - Last commit:        None yet"
  if [ "$ELAPSED_MIN" -ge 25 ]; then
    echo "  - [ALERT] 25+ minutes since start with no commits!"
  elif [ "$ELAPSED_MIN" -ge 20 ]; then
    echo "  - [WARN] 20+ minutes since start with no commits!"
  else
    echo "  - Cadence status:     OK (< 20 min since start)"
  fi
fi

# 3. Uncommitted work
echo ""
echo "Working Directory Status (git status --short):"
STATUS_OUTPUT=$(git status --short)
if [ -z "$STATUS_OUTPUT" ]; then
  echo "  (clean working tree)"
else
  echo "$STATUS_OUTPUT" | sed 's/^/  /'
fi

# 4. Unpushed commits
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
echo ""
echo "Unpushed Commits (branch: $CURRENT_BRANCH):"
if git rev-parse --verify "origin/$CURRENT_BRANCH" >/dev/null 2>&1; then
  UNPUSHED=$(git log "origin/$CURRENT_BRANCH..HEAD" --oneline)
  if [ -z "$UNPUSHED" ]; then
    echo "  (all commits pushed to origin/$CURRENT_BRANCH)"
  else
    echo "$UNPUSHED" | sed 's/^/  /'
  fi
else
  if [ "$COMMIT_COUNT" -gt 0 ]; then
    echo "  (remote tracking branch origin/$CURRENT_BRANCH not yet established, local commits to be pushed):"
    git log --oneline | sed 's/^/  /'
  else
    echo "  (no commits yet to push)"
  fi
fi

# 5. First commit timestamp vs .t0
echo ""
echo "First commit verification:"
if [ "$COMMIT_COUNT" -gt 0 ] && [ "$T0" -gt 0 ]; then
  FIRST_COMMIT_TIME=$(git log --reverse --format=%ct | head -n 1)
  if [ "$FIRST_COMMIT_TIME" -ge "$T0" ]; then
    echo "  - [PASS] First commit is after .t0 (First: $FIRST_COMMIT_TIME >= T0: $T0)"
  else
    echo "  - [FAIL] First commit is BEFORE .t0! (First: $FIRST_COMMIT_TIME < T0: $T0)"
  fi
else
  echo "  - (Will verify when first commit is created)"
fi

echo "============================================================"
