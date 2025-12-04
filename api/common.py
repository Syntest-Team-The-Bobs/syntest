# Cmon API functions
from flask import Flask, request, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

from models import (
    db,
    Participant,
    Researcher,
)


def api_signup():
    try:
        print(f"Signup request from origin: {request.headers.get('Origin')}")
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "No data provided"}), 400

        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        confirm_password = data.get("confirmPassword")
        role = data.get("role", "participant")

        if password != confirm_password:
            return jsonify({"error": "Passwords do not match"}), 400

        existing_user = (
            Participant.query.filter_by(email=email).first()
            if role == "participant"
            else Researcher.query.filter_by(email=email).first()
        )
        if existing_user:
            return jsonify({"error": "Email already registered"}), 400

        password_hash = generate_password_hash(password)

        if role == "participant":
            # Handle age - convert empty string to None, or try to convert to int
            age = data.get("age")
            if age == "" or age is None:
                age = None
            else:
                try:
                    age = int(age) if age else None
                except (ValueError, TypeError):
                    age = None

            new_user = Participant(
                name=name,
                email=email,
                password_hash=password_hash,
                age=age,
                country=data.get("country", "Spain") or "Spain",
            )
        else:
            access_code = data.get("accessCode")
            if access_code != "RESEARCH2025":
                return jsonify({"error": "Invalid researcher access code"}), 400
            new_user = Researcher(
                name=name,
                email=email,
                password_hash=password_hash,
                institution=data.get("institution"),
            )

        db.session.add(new_user)
        db.session.commit()
        print(f"User created successfully: {email}")
        return jsonify({"success": True, "message": "Account created successfully"})

    except Exception as e:
        db.session.rollback()
        print(f"Error creating account: {str(e)}")
        import traceback

        traceback.print_exc()
        error_message = str(e)
        # Make error message more user-friendly
        if "UNIQUE constraint" in error_message or "unique" in error_message.lower():
            return jsonify({"error": "Email already registered"}), 400
        if "NOT NULL constraint" in error_message:
            return jsonify({"error": "Missing required fields"}), 400
        return jsonify({"error": f"Error creating account: {error_message}"}), 500


def api_login():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "No data provided"}), 400

        email = data.get("email")
        password = data.get("password")
        role = data.get("role", "participant")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        user = (
            Participant.query.filter_by(email=email).first()
            if role == "participant"
            else Researcher.query.filter_by(email=email).first()
        )

        if user and check_password_hash(user.password_hash, password):
            user.last_login = datetime.utcnow()
            db.session.commit()

            session["user_id"] = user.id
            session["user_role"] = role
            session["user_name"] = user.name

            return jsonify(
                {
                    "success": True,
                    "user": {
                        "id": user.id,
                        "name": user.name,
                        "email": user.email,
                        "role": role,
                    },
                }
            )
        else:
            return jsonify({"error": "Invalid email or password"}), 401

    except Exception as e:
        print(f"Exception in login: {str(e)}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500


def api_logout():
    session.clear()
    return jsonify({"success": True})


def api_get_current_user():
    try:
        if "user_id" not in session:
            return jsonify({"error": "Not authenticated"}), 401

        user_id = session["user_id"]
        role = session.get("user_role")

        if role == "participant":
            user = Participant.query.get(user_id)
        elif role == "researcher":
            user = Researcher.query.get(user_id)
        else:
            # Invalid role, clear session and return error
            session.clear()
            return jsonify({"error": "Invalid role"}), 400

        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify(
            {"id": user.id, "name": user.name, "email": user.email, "role": role}
        )
    except Exception as e:
        print(f"Exception in api_get_current_user: {str(e)}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500
