# Workshop Materials - AI-Assisted Development

Workshop materials for learning systematic AI-assisted software development practices.

## Directory Structure

### **challenge/**

Introductory Python API project demonstrating AI-friendly code patterns. Features a FastAPI product catalog with structured JSON logging, complete type hints, and verbose naming conventions. Includes comprehensive tests and serves as the foundation for learning systematic AI development practices through hands-on exercises.

### **challenge_2/**

Git branch cleaner challenge focused on prompt engineering skills. Contains a single-file task requiring participants to write effective prompts that produce working Python scripts for identifying and cleaning stale git branches. Includes requirements for branch listing, merge detection, and interactive deletion with a 10-minute time limit.

### **my_assets/**

Personal workshop materials and custom slash commands. Contains prompt templates for product exercises (`PROMPT_product_2.md`), challenge prompts (`prompt_challange_2.md`), canvas setup documentation, and a collection of reusable slash commands in `commands_product_1/` for common development workflows.

### **project_1/**

Module 1 exercise implementing a Product Catalog API with AI-friendly architecture. Demonstrates service layer pattern, Pydantic validation, structured JSON logging, and comprehensive type safety. Includes complete setup instructions, exercise documentation (`EXERCISE.md`), and tests. Features verbose naming conventions and clear separation between API, service, and data layers.

### **project_2/**

Enhanced version of the Product Catalog API with advanced filtering capabilities. Extends project_1 with additional context in `CLAUDE.md` covering architectural patterns, naming conventions, error handling, and logging strategies. Includes detailed documentation on Pydantic model patterns and type annotation best practices for AI-assisted development.

### **project_3/**

Advanced workshop module featuring Product Catalog API with PRP (Prompt-Response Pattern) workflow automation. Includes comprehensive task documentation (`TASK.md`) for implementing filtering, searching, and sorting capabilities. Contains PRP templates, structured logging configuration, and automated test generation. Demonstrates production-ready patterns for complex AI-assisted feature development.

### **workshop_assets/**

Centralized collection of reusable workshop configuration and automation tools. Contains extensive Claude Code configuration in `.claude/` directory with 12 specialized agents (code-reviewer, test-runner, dependency-manager, etc.), 13 custom slash commands for common tasks, and 3 hooks for workflow automation. Includes PRP templates for standardized development workflows. Serves as a complete toolkit for systematic AI-assisted development across all workshop modules.

## Quick Start

Each project directory contains its own README with specific setup instructions. Most projects use Python 3.12 with `uv` for dependency management:

```bash
cd project_1  # or project_2, project_3, challenge
uv venv --python 3.12
uv sync
uv run python run_api.py
```

## Key Concepts

- **AI-Friendly Code**: Verbose naming, complete type hints, structured logging
- **Service Layer Architecture**: Clear separation between API, business logic, and data
- **Type Safety**: Comprehensive Pydantic models and type annotations throughout
- **Systematic Development**: Consistent patterns, conventions, and automation tools
