# Git Branch Cleaner - workflow style prompt

# Prompt:

## Goal

Create a single-file Python script that helps me identify and safely remove stale git branches from my local repositories.

## Why

- **Problem**: I accumulate dozens of local branches over time, making navigation difficult and git operations slower
- **Impact**: Cluttered repositories reduce productivity and increase cognitive load when switching contexts
- **Users**: I regularly create multiple feature branches across active projects

## What

Interactive CLI tool that:

- Scans all local git branches for age and merge status
- Displays color-coded summary with visual indicators
- Offers safe, interactive deletion with multiple selection modes
- Handles edge cases gracefully (no repo, protected branches, current branch)

## Success Criteria

- [ ] Executes in any git repository without setup or installation
- [ ] Zero false positives - never suggests deleting active work
- [ ] Clear visual distinction between branch states (merged, stale, active)
- [ ] Maximum 3 user interactions to complete any deletion workflow
- [ ] Graceful error messages for non-git directories

## Tasks

```
Task 1 - Create single-file UV script:
CREATE git_branch_cleaner.py:
  - STRUCTURE: Single file with inline UV script metadata
  - DEPENDENCIES: subprocess, datetime, colorama via UV inline metadata
  - PATTERN: if __name__ == "__main__": main() entry point

Task 2 - Implement branch information gathering:
IMPLEMENT get_all_branch_info() -> Dict[str, Dict[str, Any]]:
  - RETURNS: {branch_name: {'days_old': int, 'is_merged': bool, 'commit_hash': str, 'last_commit_date': datetime}}
  - USE: git log -1 --format=%at for Unix timestamp calculation
  - USE: git branch --merged {default_branch} for merge detection

IMPLEMENT get_default_branch() -> str:
  - PRIMARY: git symbolic-ref refs/remotes/origin/HEAD
  - FALLBACK: Check for 'main' then 'master' in branch list
  - DEFAULT: Return 'main' if no detection succeeds

IMPLEMENT calculate_days_since_commit(branch_name: str) -> int:
  - EXTRACT: Unix timestamp via git log -1 --format=%at
  - CALCULATE: Days difference from current time
  - HANDLE: Return 0 for any git command failures

Task 3 - Implement display formatting:
IMPLEMENT display_branch_summary(branch_info: Dict):
  - HEADER: "🌿 Git Branch Cleanup Tool" with exactly 48x "═"
  - STATS: "• Total branches: X" format for counts
  - SECTIONS: Separate stale (>30 days) and active (<30 days)
  - ICONS: ❌ for merged+stale, ⚠️ for unmerged+stale, ✅ for active
  - COLORS: Fore.RED for merged+stale, Fore.YELLOW for stale, Fore.GREEN for active

IMPLEMENT format_time_ago(days: int) -> str:
  - FORMAT: "X hours ago" for today, "X days ago" for recent
  - PLURALIZE: Proper singular/plural forms
  - READABLE: Human-friendly time descriptions

Task 4 - Implement interactive deletion:
IMPLEMENT show_interactive_deletion_menu() -> str:
  - OPTIONS: 1=Delete merged+stale, 2=Delete only merged, 3=Select individually, 4=Exit
  - VALIDATE: Only accept 1-4, re-prompt on invalid input
  - RETURN: User's validated choice as string

IMPLEMENT select_branches_for_deletion(stale_branches: List[str]) -> List[str]:
  - DISPLAY: Numbered list of branches with age info
  - INPUT: Accept space-separated numbers
  - SPECIAL: Accept "all" to select everything
  - VALIDATE: Ignore invalid indices silently

IMPLEMENT delete_selected_branches(branches_to_delete: List[str]):
  - CONFIRM: Show list and ask for yes/no confirmation
  - EXECUTE: git branch -D for each confirmed branch
  - FEEDBACK: "✓ Deleted: {branch}" for each success
  - SAFETY: Skip current branch with warning message

Task 5 - Implement safety and error handling:
IMPLEMENT get_current_branch() -> str:
  - USE: git branch --show-current
  - PURPOSE: Never delete the checked-out branch

IMPLEMENT main():
  - CHECK: Verify git repository with git status
  - CATCH: subprocess.CalledProcessError for non-repo case
  - MESSAGE: "❌ Error: Not in a git repository" with helpful text
  - FLOW: Get info → Display → Offer menu → Execute choice
```
