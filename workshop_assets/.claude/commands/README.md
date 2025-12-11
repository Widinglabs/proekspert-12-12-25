# Slash Commands Library

This is a library of slash commands and reusable prompts that can be used with any AI coding agent.

## How to Use

1. Create a `.claude/commands/` directory in your repository
2. Copy one or more command files (or entire folders) from this library into your `.claude/commands/` directory
3. Commands become available as slash commands in Claude Code (e.g., `/review`, `/test`, `/debug`)
4. For other AI coding agents, copy and paste the command content directly into your prompt

## Command Categories

- **code-quality** - Debugging, refactoring, validation, and documentation tools
- **content** - Blog posts, SEO optimization, and content generation
- **git** - Commit management, branching, and version control workflows
- **github** - Issue management, pull requests, and GitHub-specific operations
- **learn** - Onboarding and learning resources for new developers
- **primers** - Project context loading and codebase analysis
- **product** - PRD generation, user stories, and technical breakdowns
- **prp-commands** - Product Requirements Prompt creation and execution
- **python** - Python-specific dependency and project management
- **review** - Code review workflows and quality assurance
- **test** - Test generation with edge cases and coverage analysis
- **utilities** - API design, error handling, and dependency management

## Primers - Start Here

The **primers** commands are extremely useful universal commands to use before starting any new task. They help your AI coding assistant explore and learn your codebase, providing essential context whether you're planning features, writing code, or creating tests. Running a primer first significantly improves the quality of all subsequent interactions.

## Important Note

These slash commands are written as **general-purpose templates** that work across different tech stacks. While they're ready to use as-is, they'll perform significantly better when customized for your specific:
- Tech stack and languages (React vs Vue, Python vs Node.js)
- Testing frameworks (Jest vs Pytest, etc.)
- Coding standards and conventions
- Development tools and CI/CD pipelines

**Recommendation:** Before using, adapt the commands to match your project's specific technologies and patterns.

## Compatibility Note

These commands are written using **Claude Code syntax**, including:
- Argument placeholders (`$ARGUMENTS`, `$1`, `$2`)
- Bash command execution with `!` prefix
- Frontmatter configuration

If you're using a different AI coding assistant, you may need to adapt:
- **Argument syntax** - Your assistant may use different placeholders or no argument support
- **Command execution** - Bash integration syntax may differ
- **Metadata format** - Frontmatter may not be supported

For non-Claude Code assistants, simply copy the command content and replace argument placeholders with your specific values.

## Command Combinations

Some commands are designed to work together in workflows:
- **Product Development Flow**: `/prd-generate` → `/user-story` → `/technical-breakdown` (each command's output feeds the next)
- **PRP Workflow**: `/generate-prp [feature]` → `/execute-prp [prp-file]` (research then implementation)
- **Quality Flow**: Write code → `/test` → `/review` → `/commit` (development to deployment)

Commands can be chained by passing outputs as arguments to create powerful automated workflows.