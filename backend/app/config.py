import json
import os
from pathlib import Path


class Settings:
    def __init__(self) -> None:
        backend_dir = Path(__file__).resolve().parents[1]
        default_db_path = backend_dir / "flowforge.db"

        self.database_url = os.getenv("DATABASE_URL", f"sqlite:///{default_db_path}")
        if self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace("postgres://", "postgresql://", 1)

        self.secret_key = os.getenv("SECRET_KEY", "change_me_default_dev_key")

        cors_env = os.getenv("CORS_ORIGINS")
        if cors_env:
            try:
                parsed = json.loads(cors_env)
                if isinstance(parsed, list):
                    self.cors_origins = parsed
                else:
                    self.cors_origins = [str(parsed)]
            except Exception:
                self.cors_origins = [cors_env]
        else:
            self.cors_origins = [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]


settings = Settings()


