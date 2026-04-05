import os
from redis import Redis
from rq import Worker, Queue
from app.core.config import settings

# 1. Connect to the Redis container using the URL from our config
redis_conn = Redis.from_url(settings.REDIS_URL)

# 2. Define which queues this worker should listen to
listen = ['pdf_ingestion_queue']

if __name__ == '__main__':
    # 3. Create the queue objects for the worker to monitor
    queues = [Queue(name, connection=redis_conn) for name in listen]
    
    # 4. Initialize and start the worker
    # We pass the queues directly; the 'Connection' is handled automatically
    worker = Worker(queues, connection=redis_conn)
    
    print(f"--- Aura AI Worker Active ---")
    print(f"Listening on queue: {listen}")
    worker.work()