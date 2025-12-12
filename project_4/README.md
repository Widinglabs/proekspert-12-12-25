# Exercise 2: Systematic Implementation with the PIV Loop

## Overview

This is the second exercise for the Dynamous Agentic Coding Course. After experiencing your natural workflow in Exercise 1, you'll now apply the **PIV Loop** - a systematic approach to AI-assisted coding that dramatically improves output quality and gives you more control over the implementation.

You'll implement the same product filtering feature from Exercise 1, but this time using what you learned in Module 2: the PIV Loop methodology.

**PIV Loop**: **P**lanning → **I**mplementing → **V**alidating → Iterating

> Note this implementation is simple enough where it will really just be one iteration of the "loop".

## Quick Start

If you haven't already set up the application from Exercise 1, get it running in two terminals:

**Terminal 1 - Backend**:
```bash
cd app/backend
uv venv --python 3.12
uv sync
uv run python run_api.py
# → http://localhost:8000
```

**Terminal 2 - Frontend**:
```bash
cd app/frontend
npm install -g bun
bun install
bun dev
# → http://localhost:3000
```

## Goals

1. **Apply the PIV Loop methodology** to a real fullstack implementation
2. **Experience the difference** in process smoothness, control, and confidence versus Exercise 1
3. **Learn to create rich context** that guides AI toward better implementations
4. **Stay in the driver's seat** while delegating coding work to your AI assistant

**What to Pay Attention To**: The implementation itself should turn out about the same as exercise 1 - we covered the simplicity of the task already. Instead, focus on:
- How much smoother does the PIV Loop make the process?
- How much more control do you have over implementation details?
- How much better do you understand what's being built?
- Are you directing the AI, or is the AI directing you?

## The Task

> Open your AI coding assistant in the `app/` folder for this!

You'll implement the same product filtering feature from Exercise 1, but this time using the PIV Loop methodology.

### Part 1: Create Your Implementation Plan

Start with the structured task specifications provided:

- **Backend Task**: `tasks/TASK1.md`
- **Frontend Task**: `tasks/TASK2.md`

These tasks are written in the format you might receive from a project management tool like Linear, Jira, or Asana. They include requirements, acceptance criteria, technical notes, and definition of done. Including this in your context/plan is applying the RAG part of Context Engineering!

Use these task specifications to create a structured implementation plan that can include sections like:

1. **Success Criteria**: How will you know you're done?
   - All tests in `app/backend/tests/test_products_filtering.py` pass
   - Frontend UI provides all required filtering controls
   - Manual testing checklist items pass

2. **Documentation to Reference**:
   - Existing code patterns in `app/backend/app/`
   - Existing frontend patterns in `app/frontend/src/`
   - Test files that show expected behavior

3. **Task Breakdown**:
   - Backend: Parameter model, service function, endpoint updates
   - Frontend: Filter component, API client updates, state management

4. **Desired Codebase Structure**:
   - What naming conventions to use
   - What file organization to follow
   - What logging patterns to implement
   - What type safety to maintain

### Part 2: Implement Using Your Plan

With your plan created, ask the AI coding assistant to implement the features:

- Provide your full plan as context when prompting your AI assistant
- Reference specific sections of your plan for each step
- Keep your AI focused on your desired approach
- Notice how much more control you have compared to Exercise 1

### Part 3: Validate and Iterate

Have the AI coding assistant:

- Run the test suite: `cd app/backend && uv run pytest tests/ -v`
- Check that code follows your planned patterns

Yourself:
- Test the UI manually in the browser
- Iterate on any issues found

## Project Structure

This exercise uses the same application structure as Exercise 1:

```
5_exercise/
├── app/
│   ├── backend/      # FastAPI backend application
│   │   ├── app/
│   │   │   ├── api/
│   │   │   ├── models/
│   │   │   ├── services/
│   │   │   └── ...
│   │   └── tests/    # Backend tests (make these pass!)
│   └── frontend/     # React frontend application
│       └── src/
│           ├── components/
│           ├── lib/
│           └── types/
└── tasks/           # Task specifications
    ├── TASK1.md     # Backend filtering task
    └── TASK2.md     # Frontend filtering task
```

## What to Track

As you work through Exercise 2, track the following metrics to compare with Exercise 1:

### 💬 AI Interaction Quality

- **Number of prompts**: More or fewer than Exercise 1?
- **Prompt effectiveness**: Did the AI understand your intentions better with the plan?
- **Rework required**: How much code needed to be redone?

### 😊 Confidence & Control

After completing the exercise, reflect on (1-10 scale):

- **Control**: How much more control did you feel compared to Exercise 1?
- **Understanding**: How much did you understand what was being implemented?
- **Confidence**: How confident are you in the resulting code quality?
- **AI Alignment**: How well did the AI follow your plan and structure?

### 🐛 Issues Encountered

- Did the AI deviate from your plan? In what ways?
- Did you need to adjust your plan during implementation?
- Were there fewer surprises than Exercise 1?

## Success Criteria

You've completed the exercise when:

- ✅ You created a comprehensive implementation plan before coding
- ✅ All backend tests pass (`uv run pytest`)
- ✅ Backend API accepts and processes filter parameters correctly
- ✅ Frontend displays a working filter interface
- ✅ Filters can be applied and results update accordingly
- ✅ Code follows your planned patterns and structure
- ✅ You can articulate how the PIV Loop improved your workflow

## Important Notes

### This is About Process Comparison

The goal isn't just to complete the feature - it's to **experience the difference** between your Exercise 1 workflow and the PIV Loop approach. Be honest about:

- Process smoothness (was it actually smoother?)
- Control over implementation (did you feel more in control?)
- Understanding of the code (do you understand it better?)
- Confidence in quality (are you more confident?)

### Don't Skip the Planning Phase

It might feel like extra work upfront, but this is where the PIV Loop's power comes from:

- **Better AI alignment**: The AI has clear context about what you want
- **Fewer surprises**: You've thought through the approach before code appears
- **Easier debugging**: You know what should happen, so deviations are obvious
- **More control**: You're directing the AI with your plan, not reacting to its suggestions

### Key Differences from Exercise 1

| Aspect | Exercise 1 | Exercise 2 |
|--------|-----------|-----------|
| **Approach** | Ad-hoc prompting | Planned, systematic |
| **Context** | Minimal | Rich, structured plan |
| **Control** | Following AI suggestions | Directing AI with plan |
| **Understanding** | Learning as you go | Understanding upfront |
| **Validation** | Reactive debugging | Proactive verification |

### Tips for Success

1. **Don't skip planning**: It feels like extra work, but it saves time overall
2. **Make your plan detailed**: The more specific, the better the AI can follow it
3. **Include examples**: Reference existing code patterns you want to emulate
4. **Use your plan as context**: Copy relevant sections into every prompt
5. **Validate frequently**: Don't wait until the end to check if things work
6. **Update your plan**: If you discover something new, adjust the plan

## Questions?

- Review the task specifications in `tasks/TASK1.md` and `tasks/TASK2.md`
- Check existing code patterns in `app/backend/app/` and `app/frontend/src/`
- Reference Exercise 1 README for more details on the application architecture
- Check API docs when backend is running: http://localhost:8000/docs

## Ready?

1. Read the task specifications in `tasks/TASK1.md` and `tasks/TASK2.md`
2. Create your comprehensive implementation plan using the PIV Loop Planning phase
3. Implement the features using your plan as context
4. Validate your implementation against your success criteria
5. Compare your experience to Exercise 1

Good luck!
