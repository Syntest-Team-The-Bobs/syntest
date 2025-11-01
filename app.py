from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from models import (
    db, Participant, Researcher, Test, TestResult, ScreeningResponse,
    ColorStimulus, ColorTrial
)

app = Flask(__name__)

# =====================================
# CONFIGURATION
# =====================================
app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///syntest.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize database
db.init_app(app)
with app.app_context():
    db.create_all()

# =====================================
# LANDING PAGE
# =====================================
@app.route('/')
def index():
    return render_template('index.html')

# =====================================
# AUTHENTICATION ROUTES
# =====================================
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        role = request.form.get('role')

        user = Participant.query.filter_by(email=email).first() if role == 'participant' \
               else Researcher.query.filter_by(email=email).first()

        if user and check_password_hash(user.password_hash, password):
            user.last_login = datetime.utcnow()
            db.session.commit()

            session['user_id'] = user.id
            session['user_role'] = role
            session['user_name'] = user.name

            flash('Login successful!', 'success')
            return redirect(url_for('participant_dashboard' if role == 'participant' else 'researcher_dashboard'))
        else:
            flash('Invalid email or password', 'error')
    return render_template('login.html')


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        role = request.form.get('role')

        if password != confirm_password:
            flash('Passwords do not match', 'error')
            return render_template('signup.html')

        existing_user = Participant.query.filter_by(email=email).first() if role == 'participant' \
                         else Researcher.query.filter_by(email=email).first()
        if existing_user:
            flash('Email already registered', 'error')
            return render_template('signup.html')

        password_hash = generate_password_hash(password)
        try:
            if role == 'participant':
                new_user = Participant(
                    name=name,
                    email=email,
                    password_hash=password_hash,
                    age=request.form.get('age'),
                    country=request.form.get('country', 'Spain')
                )
            else:
                access_code = request.form.get('access_code')
                if access_code != 'RESEARCH2025':
                    flash('Invalid researcher access code', 'error')
                    return render_template('signup.html')

                new_user = Researcher(
                    name=name,
                    email=email,
                    password_hash=password_hash,
                    institution=request.form.get('institution')
                )

            db.session.add(new_user)
            db.session.commit()
            flash('Account created successfully! Please login.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error creating account: {e}', 'error')
    return render_template('signup.html')


@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out', 'info')
    return redirect(url_for('index'))

# =====================================
# PARTICIPANT DASHBOARD
# =====================================
@app.route('/participant/dashboard')
def participant_dashboard():
    if 'user_id' not in session or session.get('user_role') != 'participant':
        flash('Please login to access this page', 'error')
        return redirect(url_for('login'))

    user = Participant.query.get(session['user_id'])
    completed_tests = TestResult.query.filter_by(participant_id=user.id, status='completed').all()
    all_tests = Test.query.all()

    completion_percentage = int((len(completed_tests) / len(all_tests)) * 100) if all_tests else 0
    recommended_tests = Test.query.all()

    return render_template(
        'participant_dashboard.html',
        user=user,
        tests_completed=len(completed_tests),
        tests_pending=len(all_tests) - len(completed_tests),
        completion_percentage=completion_percentage,
        recommended_tests=recommended_tests,
        completed_tests=completed_tests
    )

# =====================================
# RESEARCHER DASHBOARD
# =====================================
@app.route('/researcher/dashboard')
def researcher_dashboard():
    if 'user_id' not in session or session.get('user_role') != 'researcher':
        flash('Please login to access this page', 'error')
        return redirect(url_for('login'))

    user = Researcher.query.get(session['user_id'])
    total_participants = Participant.query.count()
    completed_tests = TestResult.query.filter_by(status='completed').count()

    return render_template(
        'researcher_dashboard.html',
        user=user,
        total_participants=total_participants,
        completed_tests=completed_tests
    )

# =====================================
# ASSOCIATION PAGE
# =====================================
@app.route("/association")
def association():
    return render_template("association.html")

# =====================================
# COLOR TEST API
# =====================================
def _clamp_255(x):
    try:
        return max(0, min(255, int(x)))
    except Exception:
        return None


def _sanitize_meta(meta):
    """Sanitize metadata for Color Trials"""
    if not isinstance(meta, dict):
        return None
    out = {}
    if "phase" in meta:
        out["phase"] = str(meta["phase"])[:16]
    if "repetition" in meta:
        try:
            out["repetition"] = int(meta["repetition"])
        except:
            pass
    if "stimulus_label" in meta:
        out["stimulus_label"] = str(meta["stimulus_label"])[:128]
    if isinstance(meta.get("display_rgb"), dict):
        r = _clamp_255(meta["display_rgb"].get("r"))
        g = _clamp_255(meta["display_rgb"].get("g"))
        b = _clamp_255(meta["display_rgb"].get("b"))
        if None not in (r, g, b):
            out["display_rgb"] = {"r": r, "g": g, "b": b}
    return out or None


@app.get("/api/color/stimuli")
def get_color_stimuli():
    q = ColorStimulus.query
    set_id = request.args.get("set_id", type=int)
    if set_id is not None:
        q = q.filter_by(set_id=set_id)
    rows = q.order_by(ColorStimulus.id.asc()).all()
    return jsonify([r.to_dict() for r in rows])


@app.post("/api/color/stimuli")
def create_color_stimulus():
    data = request.get_json(force=True) or {}
    s = ColorStimulus(
        set_id=data.get("set_id"),
        description=data.get("description"),
        r=int(data["r"]),
        g=int(data["g"]),
        b=int(data["b"]),
        trigger_type=data.get("trigger_type"),
    )
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201


@app.post("/api/color/trials")
def save_color_trials():
    payload = request.get_json(force=True)
    items = payload if isinstance(payload, list) else [payload]

    saved = []
    for t in items:
        trial = ColorTrial(
            participant_id=t.get("participant_id"),
            stimulus_id=t.get("stimulus_id"),
            trial_index=t.get("trial_index"),
            selected_r=_clamp_255(t.get("selected_r")),
            selected_g=_clamp_255(t.get("selected_g")),
            selected_b=_clamp_255(t.get("selected_b")),
            response_ms=t.get("response_ms"),
            meta_json=_sanitize_meta(t.get("meta_json")),
        )
        db.session.add(trial)
        saved.append(trial)

    db.session.commit()
    return jsonify({"saved": len(saved), "ids": [tr.id for tr in saved]}), 201


@app.get("/api/color/trials")
def list_color_trials():
    pid = request.args.get("participant_id")
    q = ColorTrial.query
    if pid:
        q = q.filter_by(participant_id=pid)
    rows = q.order_by(ColorTrial.created_at.asc()).all()
    return jsonify([r.to_dict() for r in rows])


# =====================================
# RUN APP
# =====================================
if __name__ == '__main__':
    app.run(debug=True)
