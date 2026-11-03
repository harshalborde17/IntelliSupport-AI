
from fastembed import TextEmbedding


class EmbeddingService:
    def __init__(self):
        self.model = None
        self.model_name = "BAAI/bge-small-en-v1.5"

    def _load_model(self):
        if self.model is None:
            print("Loading embedding model...")
            self.model = TextEmbedding(model_name=self.model_name)
            print("Embedding model loaded successfully.")

    def embed_documents(self, texts):
        if not texts:
            return []

        self._load_model()
        embeddings = list(self.model.embed(texts))
        return [embedding.tolist() for embedding in embeddings]

    def embed_query(self, text):
        if not text or not text.strip():
            raise ValueError("Query text cannot be empty.")

        self._load_model()
        embedding = list(self.model.query_embed(text))[0]
        return embedding.tolist()


embedding_service = EmbeddingService()
