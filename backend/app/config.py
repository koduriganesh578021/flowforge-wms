from pathlib import Path


class Settings:
    def __init__(self) -> None:
        backend_dir = Path(__file__).resolve().parents[1]
        self.database_path = backend_dir / "flowforge.db"
        self.database_url = f"sqlite:///{self.database_path}"


settings = Settings()

