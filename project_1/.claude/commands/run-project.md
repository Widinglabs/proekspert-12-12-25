# Install

## Run

- Think through each of these steps to make sure you don't miss anything.
- Install BE dependencies with UV
- Run:
  `uv venv --python 3.12` to create a virtual environment
  `uv sync` to sync the virtual environment and install dependencies
  `uv run python run_api.py` to start the API server
- In a new bash instance run:
  `curl http://localhost:8000/api/products` to ensure the API is running
  `uv run pytest tests/test_products_basic.py -v` to test the API

## Report

- Output the work you've just done in a concise bullet point list.
- Mention the localhost address where the application runs based on `run_api.py`
