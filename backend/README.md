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

## Notes

- SQLite file path: `backend/flowforge.db`
- Tables are created automatically at startup for this local MVP.
- No seed data is included.
