from pinecone.grpc import PineconeGRPC as Pinecone
from pinecone import ServerlessSpec
import uuid
import time


class PineconeService:
    def __init__(self, api_key):
        self.pc = Pinecone(api_key=api_key)
        self.index_name = "face-embeddings"
        self.ensure_index_exists()

    def ensure_index_exists(self):
        """Create index if it doesn't exist"""
        try:
            # Create a serverless index if it doesn't exist
            if self.index_name not in self.pc.list_indexes().names():
                self.pc.create_index(
                    name=self.index_name,
                    dimension=128,  # face_recognition generates 128-dimensional embeddings
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-west-2"),
                )
        except Exception as e:
            print(f"Error creating index: {str(e)}")

    def store_embeddings(self, firstName, lastName, age, embeddings):
        """
        Store face embeddings in Pinecone
        Args:
            name (str): Person's name
            embeddings (list): List of face embedding vectors
        """
        try:
            index = self.pc.Index(self.index_name)

            # Prepare vectors for upsert
            vectors = []
            timestamp = int(time.time())

            for i, embedding in enumerate(embeddings):
                vector_id = f"{firstName.lower().replace(' ', '-')}-{lastName.lower().replace(' ', '-')}-{uuid.uuid4()}"
                vectors.append(
                    {
                        "id": vector_id,
                        "values": embedding,
                        "metadata": {
                            "firstName": firstName,
                            "lastName": lastName,
                            "age": age,
                            "timestamp": timestamp,
                            "embedding_number": i + 1,
                        },
                    }
                )

            # Upsert vectors in batches of 100
            batch_size = 100
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i : i + batch_size]
                index.upsert(vectors=batch)

            return {
                "success": True,
                "message": f"Stored {len(vectors)} embeddings for {firstName} {lastName}",
                "vectors_stored": len(vectors),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def search_similar_faces(self, query_vector, top_k=5):
        """
        Search for similar faces
        Args:
            query_vector (list): Face embedding vector to search for
            top_k (int): Number of results to return
        """
        try:
            index = self.pc.Index(self.index_name)

            results = index.query(
                vector=query_vector, top_k=top_k, include_metadata=True
            )

            return results

        except Exception as e:
            return {"success": False, "error": str(e)}
