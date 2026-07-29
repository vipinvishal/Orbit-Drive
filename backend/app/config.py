from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7

    token_encryption_key: str

    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str = "http://localhost:8000/accounts/google/callback"

    frontend_url: str = "http://localhost:3000"


settings = Settings()
