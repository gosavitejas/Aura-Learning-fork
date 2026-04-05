from redis import Redis
from rq import Queue
from app.core.config import settings

# 1. Establish the connection to the Redis Docker container
redis_conn = Redis.from_url(settings.REDIS_URL)

# 2. Create a specific queue for our heavy AI tasks
# We pass the redis connection so the queue knows where to live
ingestion_queue = Queue("pdf_ingestion_queue", connection=redis_conn)

def get_redis_connection():
    return redis_conn

def get_ingestion_queue():
    return ingestion_queue