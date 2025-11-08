# app.py
from flask import (
    Flask, render_template, request, redirect, url_for,
    flash, session, jsonify, abort
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

# -----------------------------
# Models (must exist in models.py)
# -----------------------------
from models import (
    db, Participant, Researcher, Test, TestResult, ScreeningResponse,
    ColorStimulus, ColorTrial, SpeedCongruency, TestData
)

# -----------------------------
# Screening API blueprint (expects views/api_screening.py to expose `bp`)
# Adjust the import path if your layout differs.
# -----------------------------
import views as screening_api

app = Flask(__name__)

# =====================================
# CONFIGURATION
# =====================================
app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///syntest.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SCREENING_SECURITY_TOKEN'] = 'syntest-preview'

# Initialize database
db.init_app(app)
with app.app_context():
    db.create_all()

# Register screening API blueprint (modular /api/... endpoints)
app.register_blueprint(screening_api.bp)

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

            flash('Login successful!', 'success')
            return redirect(url_for('participant_dashboard' if role == 'participant'
                                    else 'researcher_dashboard'))
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

        existing_user = (Participant.query.filter_by(email=email).first()
                         if role == 'participant'
                         else Researcher.query.filter_by(email=email).first())
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
    completed_tests = TestResult.query.filter_by(
        participant_id=user.id, status='completed'
    ).all()
    all_tests = Test.query.all()

    completion_percentage = int((len(completed_tests) / len(all_tests)) * 100) if all_tests else 0
    recommended_tests = Test.query.all()

    return render_template(
        'dashboard.html',
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
@app.route('/association')
def association():
    return render_template('association.html')

# =====================================
# SCREENING FLOW (UI)
# =====================================
@app.route('/screening/<int:step>')
def flow(step):
    step = max(0, min(step, 5))  # adjust the upper bound as you add steps
    return render_template('screen_flow.html', step=step)


@app.route('/screening/security')
def screening_security_console():
    token = request.args.get('dev')
    if token != app.config['SCREENING_SECURITY_TOKEN']:
        abort(404)
    return render_template('security_console.html')

EXIT_CONTENT = {
    "A": {
        "chip_label": "Exit: A",
        "heading": "Thanks for your time",
        "lead": "You indicated no synesthetic experience, so you are unable to continue in this study.",
        "thanks_line": None,
        "bullets": None,
        "note": None,
    },
    "BC": {
        "chip_label": "Exit: B/C",
        "heading": "Not eligible (B/C)",
        "thanks_line": "Thanks for your time!",
        "lead": "Based on your health and substances responses, you are not eligible for this study.",
        "bullets": None,
        "note": None,
    },
    "D": {
        "chip_label": "Exit: D",
        "heading": "Not eligible (D)",
        "thanks_line": "Thanks for your time!",
        "lead": "Experiences triggered by pain or emotions are excluded from this screening.",
        "bullets": None,
        "note": None,
    },
    "NONE": {
        "chip_label": "Exit: None",
        "heading": "No eligible types selected",
        "thanks_line": "Thanks for your time!",
        "lead": "You didn’t select Yes or Maybe for any supported types, so there isn’t a follow-up task to run.",
        "bullets": None,
        "note": None,
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
    """Sanitize metadata for Color Trials"""
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
# SPEED CONGRUENCY TEST API
# =====================================
@app.route("/speed-congruency/instructions")
def speed_congruency_instructions():
    return render_template("speedcongruencyinstruction.html")

@app.route("/speed-congruency")
def speed_congruency_test():
    return render_template("speedcongruency.html")

def _current_participant_id_string():
    """
    Map logged-in participant to the string id used by TestData.user_id.
    Your session stores 'user_id' (Participant.id, int). TestData.user_id is a string.
    """
    uid = session.get('user_id')
    role = session.get('user_role')
    if not uid or role != 'participant':
        return None
    return str(uid)

@app.get("/api/speed-congruency/next")
def speed_congruency_next():
    """
    Returns one trial built from the most recent TestData with cct_pass == True
    for the current participant. Supplies stimulus_id and expected RGB.
    """
    user_str = _current_participant_id_string()
    if not user_str:
        return jsonify(error="login as participant first"), 401

    td = (TestData.query
          .filter_by(user_id=user_str, cct_pass=True)
          .order_by(TestData.created_at.desc())
          .first())
    if not td:
        return jsonify(error="No passing TestData found for this participant"), 404

    stim = None
    if td.stimulus_id:
        stim = ColorStimulus.query.get(td.stimulus_id)

    expected = None
    if stim:
        expected = {"r": stim.r, "g": stim.g, "b": stim.b}

    if not expected:
        return jsonify(error="Stimulus missing or has no RGB"), 422

    payload = {
        "trial_index": 1,  # change if you run multiple trials
        "stimulus_id": td.stimulus_id,
        "expected": expected,
        "meta": {
            "testdata_id": td.id,
            "created_at": td.created_at.isoformat() if td.created_at else None,
        }
    }
    return jsonify(payload)

@app.post("/api/speed-congruency/submit")
def speed_congruency_submit():
    """
    Persists a single response into the SpeedCongruency table.
    Computes 'matched' on the server from expected vs chosen RGB.
    """
    user_str = _current_participant_id_string()
    if not user_str:
        return jsonify(error="login as participant first"), 401

    j = request.get_json(force=True) or {}
    trial_index = j.get("trial_index")
    stimulus_id = j.get("stimulus_id")

    exp = j.get("expected") or {}
    ch  = j.get("chosen") or {}
    try:
        exp_r, exp_g, exp_b = int(exp.get("r")), int(exp.get("g")), int(exp.get("b"))
        ch_r, ch_g, ch_b    = int(ch.get("r")),  int(ch.get("g")),  int(ch.get("b"))
    except Exception:
        return jsonify(error="expected/chosen must include r,g,b ints"), 400

    matched = (exp_r == ch_r and exp_g == ch_g and exp_b == ch_b)
    rt_ms = j.get("response_ms")
    try:
        rt_ms = int(rt_ms) if rt_ms is not None else None
    except Exception:
        rt_ms = None

    row = SpeedCongruency(
        participant_id=user_str,
        stimulus_id=stimulus_id,
        trial_index=trial_index,
        cue_word=None,       # you’re using a color chip as cue; leave None or set a label if you add words
        cue_type="color",
        expected_r=exp_r, expected_g=exp_g, expected_b=exp_b,
        chosen_r=ch_r, chosen_g=ch_g, chosen_b=ch_b,
        chosen_name=None,    # fill if you also label swatches by name
        matched=matched,
        response_ms=rt_ms,
        meta_json={"source": "speed_congruency_ui_v1"}
    )
    db.session.add(row)
    db.session.commit()
    return jsonify(ok=True, id=row.id, matched=matched)
# =====================================
# SPECIFIC COLOR TEST ROUTES (UI)
# =====================================

# TODO: rename these functions cause order of trigger-measured thing is confusing

@app.route('/color/number')
def number_color_test():
    """Number–Color Synesthesia Test"""
    if 'user_id' not in session or session.get('user_role') != 'participant':
        flash('Please login to access this page', 'error')
        return redirect(url_for('login'))
    return render_template('color_number_test.html')


@app.route('/color/letter')
def letter_color_test():
    """Letter–Color Synesthesia Test"""
    if 'user_id' not in session or session.get('user_role') != 'participant':
        flash('Please login to access this page', 'error')
        return redirect(url_for('login'))
    return render_template('color_letter_test.html')


@app.route('/color/word')
def word_color_test():
    """Word–Color Synesthesia Test"""
    if 'user_id' not in session or session.get('user_role') != 'participant':
        flash('Please login to access this page', 'error')
        return redirect(url_for('login'))
    return render_template('color_word_test.html')

@app.route('/color/sound')
def sound_color_test():
    """Sound–Color Synesthesia Test"""
    if 'user_id' not in session or session.get('user_role') != 'participant':
        flash('Please login to access this page', 'error')
        return redirect(url_for('login'))
    return render_template('color_sound_test.html')

# =====================================
# DASHBOARD PAGE ROUTES (UI)
# =====================================

@app.route('/dashboard')
def dashboard():
    """Redirect user to the correct dashboard based on their role."""
    if 'user_id' not in session:
        flash('Please login to access this page', 'error')
        return redirect(url_for('login'))

    role = session.get('user_role')
    if role == 'participant':
        return redirect(url_for('participant_dashboard'))
    elif role == 'researcher':
        return redirect(url_for('researcher_dashboard'))
    else:
        flash('Unknown role', 'error')
        return redirect(url_for('login'))

# =====================================
# RUN (dev)
# =====================================
if __name__ == '__main__':
    app.run(debug=True)
