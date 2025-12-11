Think hard and follow these instructions

- Read TASK.md
- Explore the codebase for existing patterns to follow
- You must deeply analyze project_2/app/\* and identify all patterns we need to follow to satisfy the task and codebase patterns
- We must pass tests in project_2/tests/test_products_filtering.py

OUTPUT: Save the following prompt into a file named prompt.md

## Prompt template to fill for the user report

````md
# Feature: <Feature Name>

## Task Reference

- Task ID: <FEAT-XXXX or issue number>
- Priority: <High/Medium/Low>

## What & Why

### Feature Description

<Clearly describe what functionality is being added and why it's valuable>

### User Story

As a <user type>
I want to <goal>
So that <benefit>

## Requirements

### Functional Requirements

- <Requirement 1>
- <Requirement 2>
- <Requirement 3>

### API Changes (if applicable)

<If adding/modifying endpoints, specify the parameters, types, and validation rules>

| Parameter  | Type    | Required | Validation             | Description |
| ---------- | ------- | -------- | ---------------------- | ----------- |
| param_name | Decimal | No       | >= 0, 2 decimal places | Description |

### Business Rules

- <Rule 1: e.g., "Multiple filters use AND logic">
- <Rule 2: e.g., "Search is case-insensitive">
- <Rule 3: e.g., "Invalid price range returns 400 error">

## Implementation Plan

### Files to Modify

1. **app/models/<file>.py** - <What changes and why>
2. **app/services/<file>.py** - <What changes and why>
3. **app/api/<file>.py** - <What changes and why>
4. **tests/test\_<feature>.py** - <What tests to verify>

### Files to Create (if needed)

- <List new files if required>

### Step-by-Step Tasks

#### Step 1: Data Models

- [ ] Add `<ModelName>` to `app/models/<file>.py`
- [ ] Include proper type hints and Field() validation
- [ ] Follow naming conventions (product\_ prefix, \_usd suffix for money)
- [ ] Add comprehensive docstring

#### Step 2: Service Layer

- [ ] Add `<function_name>()` to `app/services/<file>.py`
- [ ] Implement core business logic
- [ ] Add structured logging for operation start/completion/errors
- [ ] Validate inputs and raise appropriate exceptions
- [ ] Add comprehensive docstring with Args, Returns, Raises
- [ ] Follow patterns from CLAUDE.md

#### Step 3: API Layer

- [ ] Update endpoint in `app/api/<file>.py`
- [ ] Use Depends() for query parameter injection (if applicable)
- [ ] Add error handling (catch service exceptions → HTTP errors)
- [ ] Log API requests with relevant parameters
- [ ] Return appropriate response model
- [ ] Update endpoint docstring

#### Step 4: Testing & Validation

- [ ] Verify test file exists: `tests/test_<feature>.py`
- [ ] Run tests: `uv run pytest tests/test_<feature>.py -v`
- [ ] Ensure all tests pass
- [ ] Run full test suite to check for regressions

## Success Criteria

- [ ] All tests in `tests/test_<feature>.py` pass (X/X tests)
- [ ] Backwards compatible (no breaking changes)
- [ ] Follows CLAUDE.md patterns (naming, types, logging, errors)
- [ ] Invalid inputs return proper ErrorResponse with error_code
- [ ] Structured logging captures all operations
- [ ] All acceptance criteria from TASK.md met

## Testing & Validation

### Testing Commands

Run these commands to validate the implementation:

```bash
# Run feature-specific tests
uv run pytest tests/test_<feature>.py -v

# Run all tests to check for regressions
uv run pytest tests/ -v

# Manual API test (if applicable)
curl "http://localhost:8567/api/<endpoint>?param=value"
```
````

### Pattern Compliance Checklist

Before marking complete, verify code follows CLAUDE.md patterns:

- [ ] ✅ Uses `Decimal` for money (never float)
- [ ] ✅ Complete type hints on all functions
- [ ] ✅ Verbose naming (product\_ prefix, \_usd suffix)
- [ ] ✅ Structured logging with logger.info() and logger.error()
- [ ] ✅ ErrorResponse model for all API errors
- [ ] ✅ Business logic in service layer (not in routes)
- [ ] ✅ Pydantic models with Field() validation
- [ ] ✅ Comprehensive docstrings

## Expected Behavior

### Example Request

```bash
curl "http://localhost:8567/api/<endpoint>?param1=value1&param2=value2"
```

### Expected Response (Success)

```json
{
  "<key>": [...],
  "total_count": X
}
```

### Expected Response (Error)

```json
{
  "error_code": "invalid_<something>",
  "error_message": "Human-friendly message",
  "error_details": {
    "field": "value",
    "constraint": "rule violated"
  },
  "timestamp_utc": "2025-01-15T10:30:45.123456Z"
}
```

## Notes & Considerations

<Any additional context, gotchas, dependencies, or future considerations>

```

```
