#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "pyttsx3",
# ]
# ///

"""
Standalone System Notification Hook for Claude Code

A self-contained notification hook that uses pyttsx3 for offline TTS.
This file has no dependencies on other project files and can be dropped
into any codebase.

Features:
    - 10-second delay before speaking (prevents interruption while typing)
    - Different messages for Stop vs Notification hooks
    - Optional engineer name personalization (30% chance)
    - Offline TTS using pyttsx3 (no API keys required)

Configuration:
    Add to .claude/settings.json:
    {
        "hooks": {
            "Notification": [{
                "matcher": "",
                "hooks": [{
                    "type": "command",
                    "command": "/path/to/system_notification.py --notify"
                }]
            }],
            "Stop": [{
                "matcher": "",
                "hooks": [{
                    "type": "command",
                    "command": "/path/to/system_notification.py --notify"
                }]
            }]
        }
    }

Environment Variables (optional):
    NOTIFICATION_MESSAGE   Custom message for Notification hook
                          Example: export NOTIFICATION_MESSAGE="Hey boss, I need input"
                          Default: "Your agent needs your input"

    STOP_MESSAGE          Custom message for Stop hook
                          Example: export STOP_MESSAGE="Task complete"
                          Default: "All done boss"

    NOTIFICATION_DELAY    Delay in seconds before speaking (prevents interruption)
                          Example: export NOTIFICATION_DELAY="5"
                          Default: 10 seconds

    TTS_VOICE             Voice name to use for text-to-speech
                          Example: export TTS_VOICE="Samantha"
                          Default: "Moira" - Irish female voice
                          Popular options:
                            - Flo (English (UK)) - British female
                            - Samantha - US female
                            - Shelley (English (US)) - US female
                            - Karen - Australian female
                            - Moira - Irish female

    TTS_RATE              Speech rate in words per minute
                          Example: export TTS_RATE="200"
                          Default: 180

    TTS_VOLUME            Volume level (0.0 to 1.0)
                          Example: export TTS_VOLUME="0.9"
                          Default: 0.8

    MINIMUM_TURN_DURATION_SECONDS
                          Minimum turn duration (in seconds) before Stop hook notifies
                          Only speaks "All done boss" if the task took longer than this
                          Example: export MINIMUM_TURN_DURATION_SECONDS="180"
                          Default: 180 (3 minutes)
                          Set to 0 to always notify on Stop

    CLAUDE_HOOKS_LOG_DIR  Override default log directory (default: "logs")
                          Example: export CLAUDE_HOOKS_LOG_DIR="/var/log/claude"

Command Line Arguments:
    --notify              Enable TTS notifications (required for audio)
    --delay SECONDS       Delay before speaking (overrides NOTIFICATION_DELAY env var)
    --log-dir PATH        Base directory for logs (default: "logs")

Default Messages:
    Stop hook:            "All done boss"
    Notification hook:    "Your agent needs your input"

Customization:
    Use environment variables to customize messages (see above).
    Or edit the get_notification_message() function for hardcoded changes.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path


def get_session_log_dir(session_id: str, base_dir: str = "logs") -> Path:
    """
    Get the log directory for a specific session.

    Args:
        session_id: The Claude session ID
        base_dir: Base directory for logs (default: "logs")

    Returns:
        Path object for the session's log directory
    """
    log_base = os.environ.get("CLAUDE_HOOKS_LOG_DIR", base_dir)
    return Path(log_base) / session_id


def ensure_session_log_dir(session_id: str, base_dir: str = "logs") -> Path:
    """
    Ensure the log directory for a session exists.

    Args:
        session_id: The Claude session ID
        base_dir: Base directory for logs (default: "logs")

    Returns:
        Path object for the session's log directory
    """
    log_dir = get_session_log_dir(session_id, base_dir)
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def speak_text_pyttsx3(text: str) -> bool:
    """
    Speak text using pyttsx3 offline TTS engine.

    Args:
        text: The text to speak

    Returns:
        True if successful, False otherwise
    """
    try:
        import pyttsx3

        # Initialize TTS engine
        engine = pyttsx3.init()

        # Configure speech rate from environment or use default
        rate = int(os.getenv("TTS_RATE", "180"))
        engine.setProperty("rate", rate)

        # Configure volume from environment or use default
        volume = float(os.getenv("TTS_VOLUME", "0.8"))
        engine.setProperty("volume", volume)

        # Set voice if specified in environment
        voice_name = os.getenv("TTS_VOICE", "Moira")  # Default to Irish female
        if voice_name:
            voices = engine.getProperty("voices")
            for voice in voices:
                if voice_name.lower() in voice.name.lower():
                    engine.setProperty("voice", voice.id)
                    break

        # Speak the text
        engine.say(text)
        engine.runAndWait()

        return True

    except ImportError:
        # pyttsx3 not available
        return False
    except Exception:
        # Any other error - fail silently
        return False


def get_notification_message(hook_type: str = "notification") -> str:
    """
    Generate a notification message based on hook type and environment variables.

    Args:
        hook_type: Type of hook ("notification" or "stop")

    Returns:
        Notification message string
    """
    if hook_type == "stop":
        # Use STOP_MESSAGE env var or default
        return os.getenv("STOP_MESSAGE", "All done boss")
    else:
        # Use NOTIFICATION_MESSAGE env var or default
        return os.getenv("NOTIFICATION_MESSAGE", "Your agent needs your input")


def announce_notification(
    hook_type: str = "notification",
    delay_seconds: int = 10,
    minimum_duration_seconds: int = 0
) -> None:
    """
    Announce notification using pyttsx3 after a delay.

    Args:
        hook_type: Type of hook ("notification" or "stop")
        delay_seconds: Delay in seconds before speaking (default: 10)
        minimum_duration_seconds: Minimum turn duration before notifying (default: 0, always notify)
    """
    try:
        # Wait for the specified delay
        time.sleep(delay_seconds)

        # Skip notification if minimum duration not met
        if minimum_duration_seconds > 0:
            # Notification should not happen - duration check failed
            return

        notification_message = get_notification_message(hook_type)
        speak_text_pyttsx3(notification_message)
    except Exception:
        # Fail silently for any errors
        pass


def log_notification(session_id: str, input_data: dict) -> None:
    """
    Log notification data to session directory.

    Args:
        session_id: The Claude session ID
        input_data: The notification data to log
    """
    try:
        # Ensure session log directory exists
        log_dir = ensure_session_log_dir(session_id)
        log_file = log_dir / "system_notification.json"

        # Read existing log data or initialize empty list
        if log_file.exists():
            with open(log_file, "r") as f:
                try:
                    log_data = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    log_data = []
        else:
            log_data = []

        # Append new data
        log_data.append(input_data)

        # Write back to file with formatting
        with open(log_file, "w") as f:
            json.dump(log_data, f, indent=2)

    except Exception:
        # Fail silently on logging errors
        pass


def get_turn_start_time(session_id: str) -> float | None:
    """
    Get the timestamp when the current turn started.

    Args:
        session_id: The Claude session ID

    Returns:
        Unix timestamp of turn start, or None if not available
    """
    try:
        log_dir = get_session_log_dir(session_id)
        turn_start_file = log_dir / "turn_start.txt"

        if turn_start_file.exists():
            with open(turn_start_file, "r") as f:
                return float(f.read().strip())
        return None
    except Exception:
        return None


def set_turn_start_time(session_id: str, timestamp: float) -> None:
    """
    Store the timestamp when the current turn started.

    Args:
        session_id: The Claude session ID
        timestamp: Unix timestamp to store
    """
    try:
        log_dir = ensure_session_log_dir(session_id)
        turn_start_file = log_dir / "turn_start.txt"

        with open(turn_start_file, "w") as f:
            f.write(str(timestamp))
    except Exception:
        # Fail silently on write errors
        pass


def calculate_turn_duration_seconds(session_id: str) -> int:
    """
    Calculate how long the current turn took in seconds.

    Args:
        session_id: The Claude session ID

    Returns:
        Duration in seconds, or 0 if unable to calculate
    """
    try:
        turn_start = get_turn_start_time(session_id)
        if turn_start is None:
            # First turn - no previous timestamp
            return 0

        current_time = time.time()
        duration = int(current_time - turn_start)
        return max(0, duration)  # Ensure non-negative
    except Exception:
        return 0


def main() -> None:
    """Main entry point for the system notification hook."""
    # Debug: write to a debug log to verify hook is being called
    debug_log = Path.home() / ".claude" / "notification_debug.log"
    try:
        with open(debug_log, 'a') as f:
            from datetime import datetime
            f.write(f"{datetime.now().isoformat()} - Hook called with args: {sys.argv}\n")
    except:
        pass

    try:
        # Parse command line arguments
        parser = argparse.ArgumentParser(
            description="Standalone system notification hook with pyttsx3 TTS"
        )
        parser.add_argument("--notify", action="store_true", help="Enable TTS notifications")
        parser.add_argument(
            "--log-dir", type=str, default="logs", help="Base directory for logs (default: logs)"
        )
        parser.add_argument(
            "--delay", type=int, default=None, help="Delay in seconds before speaking (overrides NOTIFICATION_DELAY env var)"
        )
        args = parser.parse_args()

        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())

        # Extract session_id
        session_id = input_data.get("session_id", "unknown")

        # Detect hook type from input_data
        # Stop hook has 'stop_hook_active' field, Notification hook doesn't
        hook_type = "stop" if "stop_hook_active" in input_data else "notification"

        # Determine delay: CLI arg > env var > default (10)
        delay_seconds = args.delay
        if delay_seconds is None:
            delay_seconds = int(os.getenv("NOTIFICATION_DELAY", "10"))

        # Log the notification
        log_notification(session_id, input_data)

        # Announce notification via TTS only if --notify flag is set
        # Skip TTS for the generic "Claude is waiting for your input" message
        if args.notify and input_data.get("message") != "Claude is waiting for your input":
            # For Stop hook: check if turn duration exceeds minimum threshold
            minimum_duration_seconds = 0
            if hook_type == "stop":
                # Get minimum duration from env var (default: 180 seconds = 3 minutes)
                minimum_turn_duration = int(os.getenv("MINIMUM_TURN_DURATION_SECONDS", "180"))

                # Calculate how long this turn took
                turn_duration = calculate_turn_duration_seconds(session_id)

                # Only notify if turn took longer than minimum
                if turn_duration < minimum_turn_duration:
                    # Turn was too short - skip notification
                    minimum_duration_seconds = 1  # Non-zero signals skip

                # Store current timestamp for next turn
                set_turn_start_time(session_id, time.time())

            announce_notification(hook_type, delay_seconds, minimum_duration_seconds)

        sys.exit(0)

    except json.JSONDecodeError:
        # Handle JSON decode errors gracefully
        sys.exit(0)
    except Exception:
        # Handle any other errors gracefully
        sys.exit(0)


if __name__ == "__main__":
    main()
