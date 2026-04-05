import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore

from app.core.config import settings

def ingest_course_pdf(file_path: str, course_id: str, minio_url: str):
    """
    Parses a PDF, splits it into chunks, embeds it, and stores it in Qdrant 
    with a strict course_id metadata lock.
    """
    print(f"Starting ingestion for Course: {course_id}")

    try:
        # 1. Document Parsing
        # PyPDFLoader extracts text and automatically attaches the 'page' number to metadata
        loader = PyPDFLoader(file_path)
        documents = loader.load()

        # 2. Intelligent Chunking
        # 1000 characters with a 150-character overlap (15%)
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150,
            length_function=len,
        )
        chunks = text_splitter.split_documents(documents)
        print(f"Document split into {len(chunks)} chunks.")

        # 3. Metadata Injection (The Context Lock & Citation Link)
        for chunk in chunks:
            # We append our custom metadata alongside the 'page' number PyPDFLoader created
            chunk.metadata["course_id"] = course_id
            chunk.metadata["source_url"] = minio_url

        # 4. Vectorization & Storage
        # Initialize the specific large embedding model
        embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key=settings.OPENAI_API_KEY
        )

        # Store the embedded chunks directly into our pre-existing Qdrant collection
        QdrantVectorStore.from_documents(
            documents=chunks,
            embedding=embeddings,
            collection_name="aura_embeddings",
            url=f"http://{settings.QDRANT_HOST}:{settings.QDRANT_PORT}" # Connect to local Qdrant
        )

        print(f"Ingestion complete! {len(chunks)} vectors stored in Qdrant for course {course_id}.")
        return True

    finally:
        # 5. Cleanup
        # Delete the temp file so we don't waste space on the server
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"Cleaned up temp file: {file_path}")