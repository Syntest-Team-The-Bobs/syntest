# SYNTEST Backend (Flask)

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Run the Flask server:

```bash
python app.py
```

The server will run on `http://localhost:5000`

## Project Structure

- `app.py` - Main Flask application (API-only, no templates)
- `models.py` - SQLAlchemy database models
- `views.py` - API blueprints (screening endpoints)
- `services.py` - Business logic services
- `requirements.txt` - Python dependencies
- `instance/` - SQLite database files (preserved)
- `tests/` - Test files
- `populate_sample_data.py` - Script to populate sample data
- `speed_congruencydev.py` - Development utilities (if needed)

## API Endpoints

- `/api/auth/login` - POST - User login
- `/api/auth/signup` - POST - User registration
- `/api/auth/logout` - POST - User logout
- `/api/auth/me` - GET - Get current user
- `/api/screening/*` - Screening flow endpoints
- `/api/color/*` - Color test endpoints
- `/api/speed-congruency/*` - Speed congruency test endpoints
- `/api/participant/dashboard` - GET - Participant dashboard data
- `/api/researcher/dashboard` - GET - Researcher dashboard data
