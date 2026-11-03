from sentence_transformers import SentenceTransformer

from app.config import EMBEDDING_MODEL


class EmbeddingService:

    def __init__(self):
        self.model = SentenceTransformer(EMBEDDING_MODEL)

    def embed_documents(self, texts):
        embeddings = self.model.encode(
            texts,
            normalize_embeddings=True
        )

        return embeddings.tolist()

    def embed_query(self, text):
        embedding = self.model.encode(
            [text],
            normalize_embeddings=True
        )

        return embedding[0].tolist()


embedding_service = EmbeddingService()