from flask import Flask
from flask_cors import CORS
from app.routes.embedding_routes import embedding_bp


def create_app():
    app = Flask(__name__)
    CORS(app)

    # Register blueprints
    from app.routes.embedding_routes import embedding_bp

    app.register_blueprint(embedding_bp)

    return app
