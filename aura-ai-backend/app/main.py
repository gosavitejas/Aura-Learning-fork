from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # 1. Import the middleware
from app.api.webhooks import router as webhook_router
from contextlib import asynccontextmanager
from app.api.routes import router as ai_router
from app.db.postgres_client import init_postgres

# Import the initialization functions we just wrote
from app.db.qdrant_client import init_qdrant
from app.db.minio_client import init_minio
from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP PHASE ---
    # Everything before the 'yield' keyword happens exactly once before the server accepts requests.
    print(f"Starting {settings.PROJECT_NAME}...")
    
    # 1. Initialize Vector Database Collection
    try:
        init_qdrant()
    except Exception as e:
        print(f"Failed to initialize Qdrant: {e}")

    # 2. Initialize Object Storage Buckets
    try:
        init_minio()
    except Exception as e:
        print(f"Failed to initialize MinIO: {e}")

    # 3. Initialize Relational Database
    try:
        init_postgres()
    except Exception as e:
        print(f"Failed to initialize PostgreSQL: {e}")

    print("All databases initialized successfully. Server is ready.")
    
    # This 'yield' pauses the function and lets FastAPI run and serve user requests.
    yield 
    
    # --- SHUTDOWN PHASE ---
    # Everything after the 'yield' keyword happens when you stop the server (Ctrl+C).
    print("Shutting down Aura LMS AI Backend. Cleaning up resources...")

# Initialize the FastAPI app and attach our lifespan manager
app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

# 2. --- ADD CORS MIDDLEWARE HERE ---
# This acts as a VIP pass, explicitly allowing your React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Strictly trust your React Vite port
    allow_credentials=True,
    allow_methods=["*"], # Allow GET, POST, PUT, DELETE, etc.
    allow_headers=["*"], # Allow all headers (especially Authorization for our JWT!)
)

# A simple health-check route to ensure the server is alive
@app.get("/")
async def health_check():
    return {"status": "Aura LMS AI is running!"}

# Register the AI routes
app.include_router(ai_router, prefix="/api/v1")

app.include_router(webhook_router, prefix="/api/v1/webhooks", tags=["Webhooks"])