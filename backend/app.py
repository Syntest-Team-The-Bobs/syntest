# app.py
import os
from flask import Flask, request, session, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

# -----------------------------
# Models (must exist in models.py)
# -----------------------------
from models import db, Participant, Researcher, Test, TestResult, ScreeningResponse, \
    ColorStimulus, ColorTrial, SpeedCongruency, TestData

# -----------------------------
# Screening API blueprint (expects views/api_screening.py to expose `bp`)
# -----------------------------
import views as screening_api

# Set instance path for Flask (where database will be stored)
basedir = os.path.abspath(os.path.dirname(__file__))
instance_path = os.path.join(basedir, 'instance')
os.makedirs(instance_path, exist_ok=True)

# -----------------------------
# Flask App Setup
# -----------------------------
app = Flask(__name__, instance_path=instance_path)
CORS(app,
     origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
     expose_headers=['Content-Type', 'Authorization'],
     always_send=True)

# Configuration
app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'
db_path = os.path.join(instance_path, 'syntest.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_DOMAIN'] = None  # for localhost

# Initialize database
db.init_app(app)
with app.app_context():
    db.create_all()

# Register blueprint
app.register_blueprint(screening_api.bp)

# =====================================
# AUTHENTICATION ENDPOINTS
# =====================================

@app.route('/api/auth/signup', methods=['POST'])
def api_signup():
    try:
        print(f"Signup request from origin: {request.headers.get('Origin')}")
        data = request.get_json(force=True)
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        confirm_password = data.get('confirmPassword')
        role = data.get('role', 'participant')

        if password != confirm_password:
            return jsonify({'error': 'Passwords do not match'}), 400

        existing_user = (Participant.query.filter_by(email=email).first()
                         if role == 'participant'
                         else Researcher.query.filter_by(email=email).first())
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 400

        password_hash = generate_password_hash(password)

        if role == 'participant':
            new_user = Participant(
                name=name,
                email=email,
                password_hash=password_hash,
                age=data.get('age'),
                country=data.get('country', 'Spain')
            )
        else:
            access_code = data.get('accessCode')
            if access_code != 'RESEARCH2025':
                return jsonify({'error': 'Invalid researcher access code'}), 400
            new_user = Researcher(
                name=name,
                email=email,
                password_hash=password_hash,
                institution=data.get('institution')
            )

        db.session.add(new_user)
        db.session.commit()
        print(f"User created successfully: {email}")
        return jsonify({'success': True, 'message': 'Account created successfully'})

    except Exception as e:
        db.session.rollback()
        print(f"Error creating account: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Error creating account: {str(e)}'}), 500


@app.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'participant')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        user = (Participant.query.filter_by(email=email).first()
                if role == 'participant'
                else Researcher.query.filter_by(email=email).first())

        if user and check_password_hash(user.password_hash, password):
            user.last_login = datetime.utcnow()
            db.session.commit()

            session['user_id'] = user.id
            session['user_role'] = role
            session['user_name'] = user.name

            return jsonify({
                'success': True,
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'email': user.email,
                    'role': role
                }
            })
        else:
            return jsonify({'error': 'Invalid email or password'}), 401

    except Exception as e:
        print(f"Exception in login: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True})


@app.route('/api/auth/me', methods=['GET'])
def api_get_current_user():
    try:
        if 'user_id' not in session:
            return jsonify({'error': 'Not authenticated'}), 401

        user_id = session['user_id']
        role = session.get('user_role')

        user = Participant.query.get(user_id) if role == 'participant' else Researcher.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': role
        })
    except Exception as e:
        print(f"Exception in api_get_current_user: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500


# =====================================
# ROOT HEALTH CHECK
# =====================================
@app.route('/')
def index():
    return jsonify({
        'status': 'ok',
        'message': 'SYNTEST API is running',
        'version': '1.0.0'
    })


# =====================================
# RUN DEVELOPMENT SERVER
# =====================================
if __name__ == '__main__':
    app.run(debug=True)
