from minio import Minio
from minio.error import S3Error
from app.core.config import settings

# 1. The Singleton Connection
minio_client = Minio(
    endpoint=settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ROOT_USER,
    secret_key=settings.MINIO_ROOT_PASSWORD,
    secure=settings.MINIO_SECURE # Set to False for local HTTP development
)

def init_minio():
    """Ensure our required buckets exist on startup."""
    buckets_needed = ["course-pdfs", "course-videos", "course-thumbnails"]
    
    # 2. Startup Initialization
    for bucket in buckets_needed:
        try:
            if not minio_client.bucket_exists(bucket):
                minio_client.make_bucket(bucket)
                print(f"MinIO bucket '{bucket}' created successfully.")
            else:
                print(f"MinIO bucket '{bucket}' already exists.")
        except S3Error as err:
            print(f"Critical error initializing MinIO bucket '{bucket}': {err}")

# 3. Dependency Injection helper
def get_minio_client():
    return minio_client