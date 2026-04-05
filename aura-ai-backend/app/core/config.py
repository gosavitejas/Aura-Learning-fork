from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Project Info
    PROJECT_NAME: str = "Aura LMS AI Backend"
    
    # API Keys
    OPENAI_API_KEY: str
    
    # PostgreSQL
    POSTGRES_URL: str
    
    # MinIO
    MINIO_ENDPOINT: str
    MINIO_ROOT_USER: str
    MINIO_ROOT_PASSWORD: str
    MINIO_SECURE: bool = False
    
    # Qdrant
    QDRANT_HOST: str
    QDRANT_PORT: int
    
    # Redis
    REDIS_URL: str

    # Pydantic v2 configuration to read from the .env file
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        extra="ignore"
    )

# Instantiate the settings object so we can import it everywhere
settings = Settings()