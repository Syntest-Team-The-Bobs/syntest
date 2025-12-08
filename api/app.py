# app.py
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

# -----------------------------
# Models (must exist in models.py)
# -----------------------------
from models import (
    db,
)

# -----------------------------
# Versioned API Blueprints
# -----------------------------
from v1 import bp_v1

# from v2 import bp_v2

# Set instance path for Flask (where database will be stored)
basedir = os.path.abspath(os.path.dirname(__file__))
instance_path = os.path.join(basedir, "instance")
os.makedirs(instance_path, exist_ok=True)

# -----------------------------
# Flask App Setup
# -----------------------------
app = Flask(
    __name__, instance_path=instance_path, static_folder="../dist", static_url_path="/"
)

# CORS configuration - support both localhost and Heroku
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    os.environ.get("FRONTEND_URL", ""),
]

CORS(
    app,
    origins=allowed_origins,
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    expose_headers=["Content-Type", "Authorization"],
    always_send=True,
)

# Configuration
app.config["SECRET_KEY"] = os.environ.get(
    "SECRET_KEY", "your-secret-key-change-this-in-production"
)

# Database configuration - use Heroku's PostgreSQL if available, otherwise SQLite
database_url = os.environ.get("DATABASE_URL")
if database_url:
    # Heroku uses postgres:// but SQLAlchemy needs postgresql://
    database_url = database_url.replace("postgres://", "postgresql://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
else:
    db_path = os.path.join(instance_path, "syntest.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_DOMAIN"] = None

# Initialize database (guarded so deployment failures don't crash the app)
try:
    db.init_app(app)
    with app.app_context():
        db.create_all()
except Exception as e:
    # Log but do not prevent the app from starting up
    print(f"Database initialization error: {str(e)}")
    import traceback

    traceback.print_exc()

# Register versioned blueprints
app.register_blueprint(bp_v1, url_prefix="/api/v1")
# app.register_blueprint(bp_v2, url_prefix="/api/v2")


# =====================================
# STATIC FILE SERVING (for production)
# Serve React app after all API routes
# =====================================
@app.route("/")
def index():
    return app.send_static_file("index.html")


@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Not found"}), 404
    return app.send_static_file("index.html")


# Return JSON for uncaught server errors on API routes to make debugging easier
@app.errorhandler(500)
def handle_500(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": str(e)}), 500
    # For non-API routes fall back to default behavior
    return app.send_static_file("index.html"), 500


# =====================================
# RUN DEVELOPMENT SERVER
# =====================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
