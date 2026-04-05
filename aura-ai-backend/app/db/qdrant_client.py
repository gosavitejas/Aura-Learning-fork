from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams
from app.core.config import settings

# 1. The Singleton Connection
# We initialize this outside of any function so it is created once when the file is imported.
qdrant_client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT) #

def init_qdrant():
    """Check if the collection exists, create it if it doesn't."""
    collection_name = "aura_embeddings"
    
    # 2. Startup Initialization
    # We check if it exists so we don't crash the server by trying to overwrite it
    if not qdrant_client.collection_exists(collection_name): #
        qdrant_client.create_collection( #
            collection_name=collection_name,
            vectors_config=VectorParams( #
                size=1536,  # This must match your OpenAI model's dimension size exactly
                distance=Distance.COSINE # The standard way OpenAI measures semantic similarity
            ),
        )
        print(f"Vector collection '{collection_name}' created successfully.")
    else:
        print(f"Vector collection '{collection_name}' already exists and is ready.")

# 3. Dependency Injection helper
def get_qdrant_client():
    """Yields the client for FastAPI routes to use."""
    return qdrant_client