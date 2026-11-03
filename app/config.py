import os
from dotenv import load_dotenv

load_dotenv()

# LLM configuration
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_API_URL = os.getenv("LLM_API_URL", "")
LLM_MODEL = os.getenv("LLM_MODEL", "")

# RAG configuration
EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL",
    "all-MiniLM-L6-v2"
)

CHROMA_PERSIST_DIRECTORY = os.getenv(
    "CHROMA_PERSIST_DIRECTORY",
    "./chroma_db"
)

COLLECTION_NAME = os.getenv(
    "COLLECTION_NAME",
    "customer_support"
)

TOP_K = int(os.getenv("TOP_K", "5"))

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "800"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "100"))