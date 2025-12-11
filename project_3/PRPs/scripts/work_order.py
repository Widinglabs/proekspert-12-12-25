#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "pydantic",
#   "python-dotenv",
#   "click",
#   "rich",
# ]
# ///
"""
Run PRP story creation and execution workflow.

This script runs two slash commands in sequence:
1. /prp-story-task-create - Creates a detailed PRP from a user story
2. /prp-story-task-execute - Executes the tasks in the created PRP

Usage:
    # Method 1: Direct execution (requires uv)
    ./PRPs/scripts/work_order.py "Add error handling to all API endpoints"

    # Method 2: Using uv run
    uv run PRPs/scripts/work_order.py "Refactor database connection logic"

Examples:
    # Run with specific model
    ./PRPs/scripts/work_order.py "Add logging to agent.py" --model opus

    # Run from a different working directory
    ./PRPs/scripts/work_order.py "Update documentation" --working-dir /path/to/project
"""

import os
import sys
import json
import re
import subprocess
import secrets
from pathlib import Path
from dataclasses import dataclass
from typing import Optional
import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.rule import Rule


def generate_short_id() -> str:
    """Generate a short random ID for tracking workflows."""
    return secrets.token_hex(4)


@dataclass
class CommandResponse:
    """Response from executing a Claude Code command."""
    success: bool
    output: str
    session_id: Optional[str] = None
    retry_code: Optional[int] = None


def read_and_expand_slash_command(
    slash_command: str,
    args: list[str],
    working_dir: str,
) -> str:
    """Read a slash command file and expand it with arguments.

    Args:
        slash_command: The slash command name (e.g., "/prp-story-task-create")
        args: Arguments to replace $ARGUMENTS with
        working_dir: Working directory to find .claude/commands

    Returns:
        The expanded prompt from the slash command file
    """
    # Remove leading slash
    cmd_name = slash_command.lstrip("/")

    # Look for the command file in .claude/commands/prp-commands/
    cmd_path = Path(working_dir) / ".claude" / "commands" / "prp-commands" / f"{cmd_name}.md"

    if not cmd_path.exists():
        raise FileNotFoundError(f"Slash command file not found: {cmd_path}")

    # Read the command file
    with open(cmd_path, "r") as f:
        content = f.read()

    # Strip YAML frontmatter (content between --- delimiters)
    if content.startswith("---"):
        # Find the end of frontmatter
        parts = content.split("---", 2)
        if len(parts) >= 3:
            # Use content after the second ---
            content = parts[2].strip()

    # Replace $ARGUMENTS with the actual arguments
    args_str = " ".join(args)
    expanded = content.replace("$ARGUMENTS", args_str)

    return expanded


def execute_slash_command(
    slash_command: str,
    args: list[str],
    model: str,
    working_dir: str,
) -> CommandResponse:
    """Execute a Claude Code slash command using the CLI.

    Args:
        slash_command: The slash command to execute (e.g., "/prp-story-task-create")
        args: Arguments to pass to the slash command
        model: Claude model to use ("sonnet" or "opus")
        working_dir: Working directory for command execution

    Returns:
        CommandResponse with success status and output
    """
    try:
        # Read and expand the slash command
        expanded_prompt = read_and_expand_slash_command(slash_command, args, working_dir)

        # Build the claude CLI command
        cmd = [
            "claude",
            "-p",  # Non-interactive mode
            expanded_prompt,
            "--model", model,
            "--add-dir", working_dir,
            "--permission-mode", "bypassPermissions",  # Skip all permission prompts
        ]

        result = subprocess.run(
            cmd,
            cwd=working_dir,
            capture_output=True,
            text=True,
            timeout=600,  # 10 minute timeout
        )

        success = result.returncode == 0

        # Combine stdout and stderr to capture all output
        output = result.stdout.strip()
        if result.stderr.strip():
            output += "\n" + result.stderr.strip()

        # If output is empty but command succeeded, that's unusual - report it
        if success and not output:
            output = "[Command executed successfully but produced no output]"

        return CommandResponse(
            success=success,
            output=output,
            session_id=None,
            retry_code=result.returncode if not success else None,
        )

    except subprocess.TimeoutExpired:
        return CommandResponse(
            success=False,
            output="Command timed out after 10 minutes",
            retry_code=124,
        )
    except FileNotFoundError as e:
        return CommandResponse(
            success=False,
            output=f"Slash command file not found: {str(e)}",
            retry_code=1,
        )
    except Exception as e:
        return CommandResponse(
            success=False,
            output=f"Error executing command: {str(e)}",
            retry_code=1,
        )

# Output file name constant
SUMMARY_JSON = "workflow_summary.json"


def extract_prp_path(output: str) -> str:
    """Extract the PRP file path from the prp-story-task-create command output.

    Looks for patterns like:
    - PRPs/story_add_logging.md
    - Created PRP at: PRPs/story_...
    - PRP file: PRPs/story_...
    """
    # Try multiple patterns to find the PRP path
    patterns = [
        r"PRPs/story_[a-zA-Z0-9_\-]+\.md",
        r"Created (?:PRP|plan) at:\s*(PRPs/story_[a-zA-Z0-9_\-]+\.md)",
        r"(?:PRP|Plan) file:\s*(PRPs/story_[a-zA-Z0-9_\-]+\.md)",
        r"(?:Saved|Save) (?:as|to|at):\s*`?(PRPs/story_[a-zA-Z0-9_\-]+\.md)`?",
    ]

    for pattern in patterns:
        match = re.search(pattern, output, re.IGNORECASE | re.MULTILINE)
        if match:
            return match.group(1) if match.groups() else match.group(0)

    # If no match found, raise an error
    raise ValueError("Could not find PRP file path in create output")


@click.command()
@click.argument("prompt", required=True)
@click.option(
    "--model",
    type=click.Choice(["sonnet", "opus"]),
    default="sonnet",
    help="Claude model to use",
)
@click.option(
    "--working-dir",
    type=click.Path(exists=True, file_okay=False, dir_okay=True, resolve_path=True),
    help="Working directory for command execution (default: current directory)",
)
def main(
    prompt: str,
    model: str,
    working_dir: str,
):
    """Run PRP story creation and execution workflow."""
    console = Console()

    # Generate a unique ID for this workflow
    prp_id = generate_short_id()

    # Use project_3 directory if no working directory specified
    if not working_dir:
        # Get the script's directory and go up to find project_3
        script_dir = Path(__file__).parent
        # Assume script is in PRPs/scripts/, so go up 2 levels to project_3
        working_dir = str(script_dir.parent.parent.absolute())

    # Set default agent names
    creator_name = "creator"
    executor_name = "executor"

    console.print(
        Panel(
            f"[bold blue]PRP Story Workflow[/bold blue]\n\n"
            f"[cyan]PRP ID:[/cyan] {prp_id}\n"
            f"[cyan]Model:[/cyan] {model}\n"
            f"[cyan]Working Dir:[/cyan] {working_dir}",
            title="[bold blue]🚀 Workflow Configuration[/bold blue]",
            border_style="blue",
        )
    )
    console.print()

    # Phase 1: Run /prp-story-task-create command
    console.print(Rule("[bold yellow]Phase 1: PRP Creation (/prp-story-task-create)[/bold yellow]"))
    console.print()

    # Display creation execution info
    create_info_table = Table(show_header=False, box=None, padding=(0, 1))
    create_info_table.add_column(style="bold cyan")
    create_info_table.add_column()

    create_info_table.add_row("PRP ID", prp_id)
    create_info_table.add_row("Workflow", "prp_story (creation)")
    create_info_table.add_row("Command", "/prp-story-task-create")
    create_info_table.add_row("Story", prompt)
    create_info_table.add_row("Model", model)
    create_info_table.add_row("Agent", creator_name)

    console.print(
        Panel(
            create_info_table,
            title="[bold blue]🚀 Creation Inputs[/bold blue]",
            border_style="blue",
        )
    )
    console.print()

    prp_path = None

    try:
        # Execute the PRP creation command
        with console.status("[bold yellow]Creating PRP...[/bold yellow]"):
            create_response = execute_slash_command(
                slash_command="/prp-story-task-create",
                args=[prompt],
                model=model,
                working_dir=working_dir,
            )

        # Display the creation result
        if create_response.success:
            # Success panel
            console.print(
                Panel(
                    create_response.output,
                    title="[bold green]✅ PRP Creation Success[/bold green]",
                    border_style="green",
                    padding=(1, 2),
                )
            )

            # Extract the PRP path from the output
            try:
                prp_path = extract_prp_path(create_response.output)
                console.print(f"\n[bold cyan]PRP created at:[/bold cyan] {prp_path}")
            except ValueError as e:
                console.print(
                    Panel(
                        f"[bold red]Could not extract PRP path: {str(e)}[/bold red]\n\n"
                        "The creation command succeeded but the PRP file path could not be found in the output.",
                        title="[bold red]❌ Parse Error[/bold red]",
                        border_style="red",
                    )
                )
                sys.exit(3)

        else:
            # Error panel
            console.print(
                Panel(
                    create_response.output,
                    title="[bold red]❌ PRP Creation Failed[/bold red]",
                    border_style="red",
                    padding=(1, 2),
                )
            )
            console.print("\n[bold red]Workflow aborted: Creation phase failed[/bold red]")
            sys.exit(1)

        # Save creation phase summary
        create_output_dir = f"./agents/{prp_id}/{creator_name}"
        create_summary_path = f"{create_output_dir}/{SUMMARY_JSON}"

        # Create directory if it doesn't exist
        os.makedirs(create_output_dir, exist_ok=True)

        with open(create_summary_path, "w") as f:
            json.dump(
                {
                    "phase": "creation",
                    "prp_id": prp_id,
                    "slash_command": "/prp-story-task-create",
                    "args": [prompt],
                    "path_to_slash_command_prompt": ".claude/commands/prp-commands/prp-story-task-create.md",
                    "model": model,
                    "working_dir": working_dir,
                    "success": create_response.success,
                    "session_id": create_response.session_id,
                    "retry_code": create_response.retry_code,
                    "output": create_response.output,
                    "prp_path": prp_path,
                },
                f,
                indent=2,
            )

        # Show creation output files
        console.print()
        console.print(f"[bold cyan]Summary saved:[/bold cyan] {create_summary_path}")
        console.print()

        # Phase 2: Run /prp-story-task-execute command
        console.print(Rule("[bold yellow]Phase 2: PRP Execution (/prp-story-task-execute)[/bold yellow]"))
        console.print()

        # Display execution info
        execute_info_table = Table(show_header=False, box=None, padding=(0, 1))
        execute_info_table.add_column(style="bold cyan")
        execute_info_table.add_column()

        execute_info_table.add_row("PRP ID", prp_id)
        execute_info_table.add_row("Workflow", "prp_story (execution)")
        execute_info_table.add_row("Command", "/prp-story-task-execute")
        execute_info_table.add_row("PRP File", prp_path)
        execute_info_table.add_row("Model", model)
        execute_info_table.add_row("Agent", executor_name)

        console.print(
            Panel(
                execute_info_table,
                title="[bold blue]🚀 Execution Inputs[/bold blue]",
                border_style="blue",
            )
        )
        console.print()

        # Execute the PRP execution command
        with console.status("[bold yellow]Executing PRP...[/bold yellow]"):
            execute_response = execute_slash_command(
                slash_command="/prp-story-task-execute",
                args=[prp_path],
                model=model,
                working_dir=working_dir,
            )

        # Display the execution result
        if execute_response.success:
            # Success panel
            console.print(
                Panel(
                    execute_response.output,
                    title="[bold green]✅ Execution Success[/bold green]",
                    border_style="green",
                    padding=(1, 2),
                )
            )

            if execute_response.session_id:
                console.print(
                    f"\n[bold cyan]Session ID:[/bold cyan] {execute_response.session_id}"
                )
        else:
            # Error panel
            console.print(
                Panel(
                    execute_response.output,
                    title="[bold red]❌ Execution Failed[/bold red]",
                    border_style="red",
                    padding=(1, 2),
                )
            )

        # Save execution phase summary
        execute_output_dir = f"./agents/{prp_id}/{executor_name}"
        execute_summary_path = f"{execute_output_dir}/{SUMMARY_JSON}"

        # Create directory if it doesn't exist
        os.makedirs(execute_output_dir, exist_ok=True)

        with open(execute_summary_path, "w") as f:
            json.dump(
                {
                    "phase": "execution",
                    "prp_id": prp_id,
                    "slash_command": "/prp-story-task-execute",
                    "args": [prp_path],
                    "path_to_slash_command_prompt": ".claude/commands/prp-commands/prp-story-task-execute.md",
                    "model": model,
                    "working_dir": working_dir,
                    "success": execute_response.success,
                    "session_id": execute_response.session_id,
                    "retry_code": execute_response.retry_code,
                    "output": execute_response.output,
                },
                f,
                indent=2,
            )

        # Show execution output files
        console.print()
        console.print(f"[bold cyan]Summary saved:[/bold cyan] {execute_summary_path}")
        console.print()

        # Show workflow summary
        console.print()
        console.print(Rule("[bold blue]Workflow Summary[/bold blue]"))
        console.print()

        summary_table = Table(show_header=True, box=None)
        summary_table.add_column("Phase", style="bold cyan")
        summary_table.add_column("Status", style="bold")
        summary_table.add_column("Output Directory", style="dim")

        # Creation phase row
        creation_status = "✅ Success" if create_response.success else "❌ Failed"
        summary_table.add_row(
            "Creation (/prp-story-task-create)",
            creation_status,
            f"./agents/{prp_id}/{creator_name}/",
        )

        # Execution phase row
        execution_status = "✅ Success" if execute_response.success else "❌ Failed"
        summary_table.add_row(
            "Execution (/prp-story-task-execute)",
            execution_status,
            f"./agents/{prp_id}/{executor_name}/",
        )

        console.print(summary_table)

        # Create overall workflow summary
        workflow_summary_path = f"./agents/{prp_id}/workflow_summary.json"
        os.makedirs(f"./agents/{prp_id}", exist_ok=True)

        with open(workflow_summary_path, "w") as f:
            json.dump(
                {
                    "workflow": "prp_story",
                    "prp_id": prp_id,
                    "prompt": prompt,
                    "model": model,
                    "working_dir": working_dir,
                    "prp_path": prp_path,
                    "phases": {
                        "creation": {
                            "success": create_response.success,
                            "session_id": create_response.session_id,
                            "agent": creator_name,
                            "output_dir": f"./agents/{prp_id}/{creator_name}/",
                        },
                        "execution": {
                            "success": execute_response.success,
                            "session_id": execute_response.session_id,
                            "agent": executor_name,
                            "output_dir": f"./agents/{prp_id}/{executor_name}/",
                        },
                    },
                    "overall_success": create_response.success and execute_response.success,
                },
                f,
                indent=2,
            )

        console.print(f"\n[bold cyan]Workflow summary:[/bold cyan] {workflow_summary_path}")
        console.print()

        # Exit with appropriate code
        if create_response.success and execute_response.success:
            console.print("[bold green]✅ Workflow completed successfully![/bold green]")
            sys.exit(0)
        else:
            console.print("[bold yellow]⚠️  Workflow completed with errors[/bold yellow]")
            sys.exit(1)

    except Exception as e:
        console.print(
            Panel(
                f"[bold red]{str(e)}[/bold red]",
                title="[bold red]❌ Unexpected Error[/bold red]",
                border_style="red",
            )
        )
        sys.exit(2)


if __name__ == "__main__":
    main()
