# FlowForge WMS Backend

Backend foundation for the FlowForge WMS hackathon project using FastAPI, SQLAlchemy, and SQLite.

## Prerequisites

- Python 3.11+

## Setup

### Windows PowerShell

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### macOS/Linux

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Run API

From the `backend` folder:

```bash
uvicorn app.main:app --reload
```

Health endpoint:

```text
GET /health
```

## Run tests

From the repository root:

```bash
pytest backend/tests -q
```

## Seed demo data

From the `backend` folder, load the documented base scenario and then add the
three sample exception events shown on the Exceptions page:

```bash
python seed.py
python db/seed_exceptions.py
```

The exception seed is idempotent and can be rerun safely.

## Notes

- SQLite file path: `backend/flowforge.db`
- Tables are created automatically at startup for this local MVP.
- Simulation endpoint: `POST /simulate/event` with `NEW_URGENT_ORDER`,
  `ITEM_DAMAGED`, `ITEM_MISSING`, or `QC_FAILURE`. It coordinates the existing
  priority and event engines and returns a before/after decision summary.
