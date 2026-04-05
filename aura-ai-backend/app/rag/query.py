import json
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain_core.prompts import ChatPromptTemplate

from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_classic.chains import create_retrieval_chain
from qdrant_client.http import models

from app.core.config import settings
from datetime import timedelta
from app.db.minio_client import minio_client

from app.db.postgres_client import SessionLocal, Course

# Initialize the standard LLM (Strict/Cold for Tutoring)
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, api_key=settings.OPENAI_API_KEY)

# Initialize a separate LLM specifically for Quiz Generation (Creative/JSON Forced)
quiz_llm = ChatOpenAI(
    model="gpt-4o-mini", 
    temperature=0.7, # Higher temp ensures varied questions each time
    api_key=settings.OPENAI_API_KEY,
    model_kwargs={"response_format": {"type": "json_object"}} # Force strict JSON
)

# Initialize the embeddings and vectorstore
embeddings = OpenAIEmbeddings(model="text-embedding-3-small", api_key=settings.OPENAI_API_KEY)
vectorstore = QdrantVectorStore.from_existing_collection(
    embedding=embeddings,
    collection_name="aura_embeddings",
    url=f"http://{settings.QDRANT_HOST}:{settings.QDRANT_PORT}"
)

def tutor_pipeline(query: str, course_id: str):
    """Strict Context-Locked RAG for enrolled students."""
    qdrant_filter = models.Filter(
        must=[models.FieldCondition(key="metadata.course_id", match=models.MatchValue(value=course_id))]
    )
    
    retriever = vectorstore.as_retriever(search_kwargs={"filter": qdrant_filter, "k": 4})

    system_prompt = (
        "You are Aura, an expert AI teaching assistant for this course. "
        "Use ONLY the following pieces of retrieved context to answer the question. "
        "If the answer is not contained strictly within the context, you must politely "
        "refuse to answer and instruct the student to raise their doubt in the course's comment section. "
        "\n\nContext:\n{context}"
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])

    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    rag_chain = create_retrieval_chain(retriever, question_answer_chain)

    response = rag_chain.invoke({"input": query})
    
    citations = []
    for doc in response.get("context", []):
        raw_url = doc.metadata.get("source_url")
        if not raw_url:
            raw_url = ""
            
        secure_url = raw_url
        if isinstance(raw_url, str) and "course-pdfs/" in raw_url:
            try:
                object_name = raw_url.split("course-pdfs/")[1]
                secure_url = minio_client.presigned_get_object(
                    bucket_name="course-pdfs", object_name=object_name, expires=timedelta(hours=1)
                )
            except Exception as e:
                print(f"Error generating secure URL: {e}")
                secure_url = raw_url

        citations.append({"page": doc.metadata.get("page", "Unknown"), "source_url": secure_url})

    return {
        "answer": response["answer"],
        "citations": citations,
        "is_upsell": False
    }

def sales_pipeline(query: str):
    """Lightweight Advisor pipeline for non-enrolled students."""
    
    # 1. Fetch live published courses from the database
    db = SessionLocal()
    try:
        courses = db.query(Course).filter(Course.status == "Published").all()
        if courses:
            # Create a clean string of available courses for the AI to read
            available_courses = "\n".join([f"- {c.title}: {c.description}" for c in courses])
        else:
            available_courses = "Currently, there are no published courses available in the catalog."
    finally:
        db.close()

    # 2. Feed the live data into the prompt
    sales_prompt = (
        "You are an academic advisor for Aura LMS. The user asked a question about a course they "
        "are not enrolled in. Briefly explain that they need to purchase a course to get specific tutoring. "
        "Based on their question, recommend a course from this live catalog list and explain why it will help them achieve their learning goal: "
        f"\n{available_courses}"
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", sales_prompt),
        ("human", "{input}"),
    ])
    
    chain = prompt | llm
    response = chain.invoke({"input": query})
    
    return {
        "answer": response.content,
        "citations": [],
        "is_upsell": True
    }

# 🚀 NEW: The Quiz Generator Pipeline
def generate_quiz_pipeline(course_id: str):
    """Generates a dynamic 10-question JSON quiz based on course materials."""
    
    # 1. Strict Context Lock
    qdrant_filter = models.Filter(
        must=[models.FieldCondition(key="metadata.course_id", match=models.MatchValue(value=course_id))]
    )
    
    # Grab a large, diverse chunk of the document (k=12)
    retriever = vectorstore.as_retriever(search_kwargs={"filter": qdrant_filter, "k": 12})
    
    # 2. Broad Query Trigger to pull diverse knowledge
    docs = retriever.invoke("Core concepts, definitions, formulas, key terms, and main ideas.")
    
    # The Empty Brain Problem
    if not docs or len(docs) == 0:
        raise ValueError("No course materials found. The instructor must upload a PDF first.")
        
    # Combine docs into a single context string
    context = "\n\n".join([d.page_content for d in docs])

    # 3. The Strict JSON Prompt (Escaped for LangChain)
    system_prompt = """You are an expert university professor. 
    Based ONLY on the provided context, generate up to 10 unique multiple-choice questions. 
    If the context is too brief, generate as many high-quality questions as possible without repeating concepts.
    Select random, diverse facts from across the text to ensure variety.

    You MUST return ONLY a valid JSON object matching this exact schema:
    {{
      "questions": [
        {{
          "id": 1,
          "question": "The question text?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct": 0
        }}
      ]
    }}
    (Note: 'correct' must be the integer index 0-3 of the right option).

    Context:
    {context}
    """

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "Generate the JSON knowledge check now."),
    ])

    chain = prompt | quiz_llm
    
    try:
        response = chain.invoke({"context": context})
        # Edge Case 1: Safely parse the strict JSON output
        quiz_data = json.loads(response.content)
        return quiz_data
    except json.JSONDecodeError:
        raise ValueError("The AI generated a malformed quiz. Please try generating again.")
    except Exception as e:
        raise ValueError(f"AI Generation Error: {str(e)}")