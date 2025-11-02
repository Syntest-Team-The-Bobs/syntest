from flask import (
    Flask, render_template, request, redirect, url_for,
    flash, session, jsonify, abort
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from models import (
    db, Participant, Researcher, Test, TestResult, ScreeningResponse,
    ColorStimulus, ColorTrial
)
from views import api_screening as screening_api

app = Flask(__name__)

# =====================================
# CONFIGURATION
# =====================================
app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///syntest.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
with app.app_context():
    db.create_all()

app.register_blueprint(screening_api)

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

        user = (Participant.query.filter_by(email=email).first()
                if role == 'participant'
                else Researcher.query.filter_by(email=email).first())

        if user and check_password_hash(user.password_hash, password):
            user.last_login = datetime.utcnow()
            db.session.commit()

            session['user_id'] = user.id
            session['user_role'] = role
            session['user_name'] = user.name

            # ✅ Removed flash, goes straight to dashboard
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid email or password', 'error')

    return render_template('login.html')



@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        # (signup logic here)
        # ✅ Redirect to dashboard after creating account
        return redirect(url_for('dashboard'))
    return render_template('signup.html')


@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out', 'info')
    return redirect(url_for('index'))

# =====================================
# DASHBOARD
# =====================================
@app.route('/dashboard')
def dashboard():
    """Shared dashboard for both participants and researchers"""
    if 'user_id' not in session:
        flash('Please login to access this page', 'error')
        return redirect(url_for('login'))

    role = session.get('user_role')
    user = Participant.query.get(session['user_id']) if role == 'participant' else Researcher.query.get(session['user_id'])

    completed_tests = TestResult.query.filter_by(participant_id=user.id, status='completed').all()
    all_tests = Test.query.all()
    completion_percentage = int((len(completed_tests) / len(all_tests)) * 100) if all_tests else 0

    return render_template(
        'dashboard.html',
        user=user,
        role=role,
        tests_completed=len(completed_tests),
        tests_pending=len(all_tests) - len(completed_tests),
        completion_percentage=completion_percentage
    )

# =====================================
# STUDY PAGES
# =====================================
@app.route("/color")
def color():
    return render_template("color.html")

@app.route("/flavor")
def flavor():
    return render_template("flavor.html")

@app.route("/association")
def association():
    return render_template("association.html")

@app.route("/screening")
def screening():
    """Entry point for the Pre-Screening Test"""
    if 'user_id' not in session:
        flash('Please login first', 'error')
        return redirect(url_for('login'))
    return redirect(url_for('flow', step=0))

# =====================================
# SCREENING FLOW
# =====================================
@app.route('/screening/<int:step>')
def flow(step):
    step = max(0, min(step, 5))
    return render_template('screen_flow.html', step=step)

EXIT_CONTENT = {
    "A": {
        "chip_label": "Exit: A",
        "heading": "Thanks for your time",
        "lead": "You indicated no synesthetic experience, so you are unable to continue in this study.",
    },
    "BC": {
        "chip_label": "Exit: B/C",
        "heading": "Not eligible (B/C)",
        "lead": "Based on your health and substances responses, you are not eligible for this study.",
    },
    "D": {
        "chip_label": "Exit: D",
        "heading": "Not eligible (D)",
        "lead": "Experiences triggered by pain or emotions are excluded from this screening.",
    },
    "NONE": {
        "chip_label": "Exit: None",
        "heading": "No eligible types selected",
        "lead": "You didn’t select Yes or Maybe for any supported types, so there isn’t a follow-up task to run.",
    },
}

@app.route('/screening/exit/<code>')
def exit_page(code):
    data = EXIT_CONTENT.get(code.upper())
    if not data:
        return abort(404)
    return render_template('exit.html', **data)

# =====================================
# COLOR TEST API
# =====================================
def _clamp_255(x):
    try:
        return max(0, min(255, int(x)))
    except Exception:
        return None

def _sanitize_meta(meta):
    if not isinstance(meta, dict):
        return None
    out = {}
    if "phase" in meta:
        out["phase"] = str(meta["phase"])[:16]
    if "repetition" in meta:
        try:
            out["repetition"] = int(meta["repetition"])
        except Exception:
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


@app.get('/api/color/stimuli')
def get_color_stimuli():
    q = ColorStimulus.query
    set_id = request.args.get('set_id', type=int)
    if set_id is not None:
        q = q.filter_by(set_id=set_id)
    rows = q.order_by(ColorStimulus.id.asc()).all()
    return jsonify([r.to_dict() for r in rows])


@app.post('/api/color/stimuli')
def create_color_stimulus():
    data = request.get_json(force=True) or {}
    s = ColorStimulus(
        set_id=data.get('set_id'),
        description=data.get('description'),
        r=int(data['r']),
        g=int(data['g']),
        b=int(data['b']),
        trigger_type=data.get('trigger_type'),
    )
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201


@app.post('/api/color/trials')
def save_color_trials():
    payload = request.get_json(force=True)
    items = payload if isinstance(payload, list) else [payload]
    saved = []
    for t in items:
        trial = ColorTrial(
            participant_id=t.get('participant_id'),
            stimulus_id=t.get('stimulus_id'),
            trial_index=t.get('trial_index'),
            selected_r=_clamp_255(t.get('selected_r')),
            selected_g=_clamp_255(t.get('selected_g')),
            selected_b=_clamp_255(t.get('selected_b')),
            response_ms=t.get('response_ms'),
            meta_json=_sanitize_meta(t.get('meta_json')),
        )
        db.session.add(trial)
        saved.append(trial)
    db.session.commit()
    return jsonify({'saved': len(saved), 'ids': [tr.id for tr in saved]}), 201


@app.get('/api/color/trials')
def list_color_trials():
    pid = request.args.get('participant_id')
    q = ColorTrial.query
    if pid:
        q = q.filter_by(participant_id=pid)
    rows = q.order_by(ColorTrial.created_at.asc()).all()
    return jsonify([r.to_dict() for r in rows])

# =====================================
# RUN
# =====================================
if __name__ == '__main__':
    app.run(debug=True)
