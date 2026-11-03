import chromadb

from app.config import (
    CHROMA_PERSIST_DIRECTORY,
    COLLECTION_NAME
)

from app.embeddings import embedding_service


class ChromaDBService:

    def __init__(self):

        self.client = chromadb.PersistentClient(
            path=CHROMA_PERSIST_DIRECTORY
        )

        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME
        )

    def add_documents(self, documents, metadatas, ids):

        embeddings = embedding_service.embed_documents(
            documents
        )

        self.collection.add(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )

    def search(self, query, top_k=5):

        query_embedding = embedding_service.embed_query(
            query
        )

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )

        return results


chroma_service = ChromaDBService()