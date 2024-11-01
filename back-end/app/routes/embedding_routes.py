from flask import Blueprint, request, jsonify
from app.services.face_recognition_service import (
    generate_face_embeddings,
    find_similar_faces,
    generate_query_embedding,
)

embedding_bp = Blueprint("embedding", __name__)


@embedding_bp.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Face Recognition API is running"}), 200


@embedding_bp.route("/enroll", methods=["POST"])
def generate_embeddings_route():
    """
    Generate face embeddings for uploaded images
    Expects:
    - multipart/form-data with 'images' (multiple files) and 'name' fields
    Returns: JSON with embeddings or error message
    """

    if "images" not in request.files:
        return jsonify({"error": "No images provided"}), 400

    if (
        "firstName" not in request.form
        or "lastName" not in request.form
        or "age" not in request.form
    ):
        return jsonify({"error": "No name provided"}), 400

    firstName = request.form["firstName"]
    lastName = request.form["lastName"]
    age = request.form["age"]
    images = request.files.getlist("images")

    # Only use the last image for generating embeddings
    if images:
        last_image = images[-1]
        result = generate_face_embeddings(firstName, lastName, age, [last_image])
    else:
        return jsonify({"error": "No images provided"}), 400

    return jsonify(result)


@embedding_bp.route("/authenticate", methods=["POST"])
def find_similar_faces_route():
    """
    Find similar faces by comparing uploaded image with stored embeddings
    Expects:
    - multipart/form-data with 'image' file
    Returns: JSON with matching faces and similarity scores
    """
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image = request.files["image"]
    top_k = request.form.get("top_k", 5, type=int)

    # Get the query embedding from the uploaded image
    query_embedding = generate_query_embedding(image)
    if "error" in query_embedding:
        return jsonify(query_embedding), 400

    # Search for similar faces
    result = find_similar_faces(query_embedding["embedding"], top_k)
    return jsonify(result)
