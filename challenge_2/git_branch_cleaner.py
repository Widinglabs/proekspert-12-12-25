#!/usr/bin/env -S uv run --script
# /// script
# dependencies = [
#   "colorama",
# ]
# requires-python = ">=3.10"
# ///
"""Git Branch Cleaner - Identify and safely remove stale git branches."""

import subprocess
import sys
from datetime import datetime, timezone
from typing import Any

from colorama import Fore, Style, init


def run_git_command(args: list[str]) -> str:
    """Run a git command and return stdout."""
    result = subprocess.run(
        ["git"] + args,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def get_current_branch() -> str:
    """Get the currently checked-out branch name."""
    return run_git_command(["branch", "--show-current"])


def get_default_branch() -> str:
    """Detect the default branch (main/master)."""
    try:
        ref = run_git_command(["symbolic-ref", "refs/remotes/origin/HEAD"])
        return ref.split("/")[-1]
    except subprocess.CalledProcessError:
        pass

    try:
        branches = run_git_command(["branch", "--list"]).split("\n")
        branch_names = [b.strip().lstrip("* ") for b in branches if b.strip()]
        if "main" in branch_names:
            return "main"
        if "master" in branch_names:
            return "master"
    except subprocess.CalledProcessError:
        pass

    return "main"


def calculate_days_since_commit(branch_name: str) -> int:
    """Calculate days since the last commit on a branch."""
    try:
        timestamp_str = run_git_command(["log", "-1", "--format=%at", branch_name])
        commit_timestamp = int(timestamp_str)
        commit_date = datetime.fromtimestamp(commit_timestamp, tz=timezone.utc)
        now = datetime.now(tz=timezone.utc)
        delta = now - commit_date
        return delta.days
    except (subprocess.CalledProcessError, ValueError):
        return 0


def get_all_branch_info() -> dict[str, dict[str, Any]]:
    """Gather information about all local branches."""
    default_branch = get_default_branch()

    try:
        merged_output = run_git_command(["branch", "--merged", default_branch])
        merged_branches = {
            b.strip().lstrip("* ") for b in merged_output.split("\n") if b.strip()
        }
    except subprocess.CalledProcessError:
        merged_branches = set()

    branches_output = run_git_command(["branch", "--list"])
    branches = [b.strip().lstrip("* ") for b in branches_output.split("\n") if b.strip()]

    branch_info: dict[str, dict[str, Any]] = {}
    for branch in branches:
        days_old = calculate_days_since_commit(branch)
        is_merged = branch in merged_branches and branch != default_branch

        try:
            commit_hash = run_git_command(["log", "-1", "--format=%h", branch])
        except subprocess.CalledProcessError:
            commit_hash = "unknown"

        try:
            timestamp_str = run_git_command(["log", "-1", "--format=%at", branch])
            last_commit_date = datetime.fromtimestamp(
                int(timestamp_str), tz=timezone.utc
            )
        except (subprocess.CalledProcessError, ValueError):
            last_commit_date = datetime.now(tz=timezone.utc)

        branch_info[branch] = {
            "days_old": days_old,
            "is_merged": is_merged,
            "commit_hash": commit_hash,
            "last_commit_date": last_commit_date,
        }

    return branch_info


def format_time_ago(days: int) -> str:
    """Format days into human-readable time string."""
    if days == 0:
        return "today"
    elif days == 1:
        return "1 day ago"
    elif days < 7:
        return f"{days} days ago"
    elif days < 14:
        return "1 week ago"
    elif days < 30:
        weeks = days // 7
        return f"{weeks} weeks ago"
    elif days < 60:
        return "1 month ago"
    elif days < 365:
        months = days // 30
        return f"{months} months ago"
    else:
        years = days // 365
        if years == 1:
            return "1 year ago"
        return f"{years} years ago"


def display_branch_summary(branch_info: dict[str, dict[str, Any]]) -> None:
    """Display a color-coded summary of all branches."""
    init(autoreset=True)

    current_branch = get_current_branch()
    default_branch = get_default_branch()

    stale_merged: list[tuple[str, dict[str, Any]]] = []
    stale_unmerged: list[tuple[str, dict[str, Any]]] = []
    active: list[tuple[str, dict[str, Any]]] = []

    for name, info in branch_info.items():
        if name == default_branch or name == current_branch:
            active.append((name, info))
        elif info["days_old"] >= 30:
            if info["is_merged"]:
                stale_merged.append((name, info))
            else:
                stale_unmerged.append((name, info))
        else:
            active.append((name, info))

    print()
    print(f"{Fore.CYAN}{Style.BRIGHT}{'═' * 48}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{Style.BRIGHT}  Git Branch Cleanup Tool{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{Style.BRIGHT}{'═' * 48}{Style.RESET_ALL}")
    print()

    total = len(branch_info)
    print(f"  {Style.BRIGHT}Summary:{Style.RESET_ALL}")
    print(f"  {Fore.WHITE}Total branches: {total}{Style.RESET_ALL}")
    print(
        f"  {Fore.RED}Merged & stale (safe to delete): {len(stale_merged)}{Style.RESET_ALL}"
    )
    print(f"  {Fore.YELLOW}Stale (unmerged): {len(stale_unmerged)}{Style.RESET_ALL}")
    print(f"  {Fore.GREEN}Active: {len(active)}{Style.RESET_ALL}")
    print()

    if stale_merged:
        print(f"  {Fore.RED}{Style.BRIGHT}Merged & Stale (30+ days):{Style.RESET_ALL}")
        for name, info in sorted(stale_merged, key=lambda x: -x[1]["days_old"]):
            time_str = format_time_ago(info["days_old"])
            print(f"    {Fore.RED}  {name} ({time_str}){Style.RESET_ALL}")
        print()

    if stale_unmerged:
        print(f"  {Fore.YELLOW}{Style.BRIGHT}Stale but Unmerged:{Style.RESET_ALL}")
        for name, info in sorted(stale_unmerged, key=lambda x: -x[1]["days_old"]):
            time_str = format_time_ago(info["days_old"])
            print(f"    {Fore.YELLOW}  {name} ({time_str}){Style.RESET_ALL}")
        print()

    if active:
        print(f"  {Fore.GREEN}{Style.BRIGHT}Active Branches:{Style.RESET_ALL}")
        for name, info in sorted(active, key=lambda x: x[1]["days_old"]):
            time_str = format_time_ago(info["days_old"])
            marker = ""
            if name == current_branch:
                marker = " (current)"
            elif name == default_branch:
                marker = " (default)"
            print(f"    {Fore.GREEN}  {name} ({time_str}){marker}{Style.RESET_ALL}")
        print()


def show_interactive_deletion_menu() -> str:
    """Show deletion menu and get user choice."""
    print(f"  {Style.BRIGHT}What would you like to do?{Style.RESET_ALL}")
    print(f"    {Fore.CYAN}1{Style.RESET_ALL}) Delete all merged & stale branches")
    print(f"    {Fore.CYAN}2{Style.RESET_ALL}) Delete only merged branches (any age)")
    print(f"    {Fore.CYAN}3{Style.RESET_ALL}) Select branches individually")
    print(f"    {Fore.CYAN}4{Style.RESET_ALL}) Exit without changes")
    print()

    while True:
        choice = input(f"  Enter choice (1-4): ").strip()
        if choice in ("1", "2", "3", "4"):
            return choice
        print(f"  {Fore.RED}Invalid choice. Please enter 1-4.{Style.RESET_ALL}")


def select_branches_for_deletion(
    branches: list[tuple[str, dict[str, Any]]]
) -> list[str]:
    """Let user select specific branches for deletion."""
    print()
    print(f"  {Style.BRIGHT}Select branches to delete:{Style.RESET_ALL}")
    for i, (name, info) in enumerate(branches, 1):
        time_str = format_time_ago(info["days_old"])
        merged_str = " [merged]" if info["is_merged"] else ""
        print(f"    {Fore.CYAN}{i}{Style.RESET_ALL}) {name} ({time_str}){merged_str}")

    print()
    print(f"  Enter numbers separated by spaces, or 'all' to select all:")
    selection = input(f"  > ").strip().lower()

    if selection == "all":
        return [name for name, _ in branches]

    selected: list[str] = []
    for part in selection.split():
        try:
            idx = int(part) - 1
            if 0 <= idx < len(branches):
                selected.append(branches[idx][0])
        except ValueError:
            continue

    return selected


def delete_selected_branches(branches_to_delete: list[str]) -> None:
    """Delete selected branches with confirmation."""
    if not branches_to_delete:
        print(f"  {Fore.YELLOW}No branches selected for deletion.{Style.RESET_ALL}")
        return

    current_branch = get_current_branch()

    print()
    print(f"  {Style.BRIGHT}Branches to delete:{Style.RESET_ALL}")
    for name in branches_to_delete:
        print(f"    - {name}")

    print()
    confirm = input(f"  Confirm deletion? (yes/no): ").strip().lower()

    if confirm not in ("yes", "y"):
        print(f"  {Fore.YELLOW}Deletion cancelled.{Style.RESET_ALL}")
        return

    print()
    for branch in branches_to_delete:
        if branch == current_branch:
            print(
                f"  {Fore.YELLOW}Skipping '{branch}' - cannot delete current branch{Style.RESET_ALL}"
            )
            continue

        try:
            run_git_command(["branch", "-D", branch])
            print(f"  {Fore.GREEN}Deleted: {branch}{Style.RESET_ALL}")
        except subprocess.CalledProcessError as e:
            print(f"  {Fore.RED}Failed to delete '{branch}': {e}{Style.RESET_ALL}")


def main() -> None:
    """Main entry point."""
    try:
        run_git_command(["status"])
    except subprocess.CalledProcessError:
        print(f"{Fore.RED}Error: Not in a git repository{Style.RESET_ALL}")
        print("Please run this script from within a git repository.")
        sys.exit(1)
    except FileNotFoundError:
        print(f"{Fore.RED}Error: git is not installed or not in PATH{Style.RESET_ALL}")
        sys.exit(1)

    branch_info = get_all_branch_info()

    if not branch_info:
        print("No branches found.")
        return

    display_branch_summary(branch_info)

    current_branch = get_current_branch()
    default_branch = get_default_branch()

    stale_merged = [
        (name, info)
        for name, info in branch_info.items()
        if info["is_merged"]
        and info["days_old"] >= 30
        and name != current_branch
        and name != default_branch
    ]

    all_merged = [
        (name, info)
        for name, info in branch_info.items()
        if info["is_merged"] and name != current_branch and name != default_branch
    ]

    deletable = [
        (name, info)
        for name, info in branch_info.items()
        if name != current_branch and name != default_branch
    ]

    if not deletable:
        print(f"  {Fore.GREEN}All branches are active. Nothing to clean up!{Style.RESET_ALL}")
        return

    choice = show_interactive_deletion_menu()

    if choice == "1":
        if stale_merged:
            delete_selected_branches([name for name, _ in stale_merged])
        else:
            print(
                f"  {Fore.YELLOW}No merged & stale branches to delete.{Style.RESET_ALL}"
            )
    elif choice == "2":
        if all_merged:
            delete_selected_branches([name for name, _ in all_merged])
        else:
            print(f"  {Fore.YELLOW}No merged branches to delete.{Style.RESET_ALL}")
    elif choice == "3":
        selected = select_branches_for_deletion(deletable)
        delete_selected_branches(selected)
    else:
        print(f"  {Fore.CYAN}Exiting without changes.{Style.RESET_ALL}")


if __name__ == "__main__":
    main()
