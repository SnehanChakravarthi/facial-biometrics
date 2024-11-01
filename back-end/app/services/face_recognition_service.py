import tempfile
import os
import time
import face_recognition
from werkzeug.utils import secure_filename
from .pinecone_service import PineconeService
from config import Config

pinecone_service = PineconeService(api_key=Config.PINECONE_API_KEY)


def generate_face_embeddings(firstName, lastName, age, images):
    """
    Service function to generate face embeddings from uploaded images
    """
    start_time = time.time()
    embeddings = []

    with tempfile.TemporaryDirectory() as temp_dir:
        for image in images:
            embedding_result = generate_query_embedding(image)
            if "embedding" in embedding_result:
                embeddings.append(embedding_result["embedding"])

    if not embeddings:
        return {"error": "No valid face embeddings could be generated"}, 400

    storage_result = pinecone_service.store_embeddings(
        firstName, lastName, age, embeddings
    )

    elapsed_time = time.time() - start_time

    return {
        "firstName": firstName,
        "lastName": lastName,
        "age": age,
        # "embeddings": embeddings,
        "num_embeddings": len(embeddings),
        "processing_time_milliseconds": f"{int(elapsed_time * 1000)}ms",
        "storage_result": storage_result,
    }


def generate_query_embedding(image):
    """
    Generate face embedding for a single query image
    """
    start_time = time.time()

    with tempfile.TemporaryDirectory() as temp_dir:
        # Save uploaded image
        filename = secure_filename(image.filename)
        temp_path = os.path.join(temp_dir, filename)
        image.save(temp_path)

        try:
            # Generate embedding
            face_image = face_recognition.load_image_file(temp_path)
            face_encodings = face_recognition.face_encodings(face_image)

            if not face_encodings:
                return {"error": "No face found in the image"}

            elapsed_time = time.time() - start_time

            return {
                "embedding": face_encodings[0].tolist(),
                "processing_time_milliseconds": f"{int(elapsed_time * 1000)}ms",
            }

        except Exception as e:
            return {"error": f"Error processing image: {str(e)}"}


def find_similar_faces(query_vector, top_k=1):
    """
    Find the most similar face in Pinecone if similarity score > 0.95
    """
    try:
        # Search in Pinecone
        results = pinecone_service.search_similar_faces(query_vector, top_k)

        # Check if there are any matches and if the best match exceeds threshold
        if results.matches and float(results.matches[0].score) > 0.95:
            match = results.matches[0]
            return {
                "match": {
                    "firstName": match.metadata["firstName"],
                    "lastName": match.metadata["lastName"],
                    "age": match.metadata["age"],
                    "similarity_score": round(float(match.score), 3),
                    "timestamp": match.metadata["timestamp"],
                }
            }

        return {"match": None, "message": "User not found in our records"}

    except Exception as e:
        return {"error": f"Error searching for similar faces: {str(e)}"}
