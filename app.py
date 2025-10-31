# app.py
from flask import Flask, render_template, jsonify, request
from models import db, ColorStimulus, ColorTrial
from datetime import datetime

app = Flask(__name__, static_folder='static', template_folder='templates')

# ---- DB config (Color Test only) ----
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///syntest.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

with app.app_context():
    db.create_all()


# ---- Pages ----
@app.route("/")
def participants():
    return render_template("index.html")

@app.route("/flavor")
def flavor():
    return render_template("flavor.html")

@app.route("/color")
def color():
    return render_template("color.html")

@app.route("/association")
def association():
    return render_template("association.html")


# ---- Helpers ----
def _clamp_255(x):
    try:
        x = int(x)
    except Exception:
        return None
    return max(0, min(255, x))


def _sanitize_meta(meta):
    """
    Keep ONLY these keys in meta_json:
      - phase (string)
      - repetition (int)
      - stimulus_label (string)
      - display_rgb: {r,g,b} (ints 0..255)
    Everything else is dropped.
    """
    if not isinstance(meta, dict):
        return None

    out = {}

    if "phase" in meta:
        # keep short known values like "CCT" / "SCT" but don't hard-enforce
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


# ---- Color API: stimuli ----
@app.get("/api/color/stimuli")
def get_color_stimuli():
    """Return all stimuli (or use ?set_id=1 to filter)."""
    q = ColorStimulus.query
    set_id = request.args.get("set_id", type=int)
    if set_id is not None:
        q = q.filter_by(set_id=set_id)
    rows = q.order_by(ColorStimulus.id.asc()).all()
    return jsonify([r.to_dict() for r in rows])


@app.post("/api/color/stimuli")
def create_color_stimulus():
    """Optional helper to add a stimulus from the UI/CLI."""
    data = request.get_json(force=True) or {}
    s = ColorStimulus(
        set_id=data.get("set_id"),
        description=data.get("description"),
        owner_researcher_id=data.get("owner_researcher_id"),
        r=int(data["r"]),
        g=int(data["g"]),
        b=int(data["b"]),
        trigger_type=data.get("trigger_type"),
    )
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201


@app.post("/api/color/seed")
def seed_color_stimuli():
    """
    Quick seeding for dev: 12 colors around the wheel.
    Safe to call multiple times (won't duplicate if already present).
    """
    if ColorStimulus.query.count() > 0:
        return jsonify({"message": "already seeded", "count": ColorStimulus.query.count()})

    basics = [
        (255, 0, 0),      # red
        (255, 128, 0),    # orange
        (255, 255, 0),    # yellow
        (128, 255, 0),    # yellow-green
        (0, 255, 0),      # green
        (0, 255, 128),    # spring green
        (0, 255, 255),    # cyan
        (0, 128, 255),    # sky
        (0, 0, 255),      # blue
        (128, 0, 255),    # purple
        (255, 0, 255),    # magenta
        (255, 0, 128),    # rose
    ]
    for i, (r, g, b) in enumerate(basics, start=1):
        db.session.add(ColorStimulus(set_id=1, description=f"wheel-{i}", r=r, g=g, b=b, trigger_type="swatch"))
    db.session.commit()
    return jsonify({"message": "seeded", "count": ColorStimulus.query.count()}), 201


# ---- Color API: trials ----
@app.post("/api/color/trials")
def save_color_trials():
    """
    Accepts either a single trial dict or a list of trial dicts.

    Expected keys (optional except selected rgb if you use them):
      participant_id, stimulus_id, trial_index, selected_r/g/b, response_ms, meta_json

    NEW: meta_json is sanitized to keep ONLY:
      - phase
      - repetition
      - stimulus_label
      - display_rgb {r,g,b}
    """
    payload = request.get_json(force=True)
    items = payload if isinstance(payload, list) else [payload]

    saved = []
    for t in items:
        # Clamp selected RGB if present
        sr = _clamp_255(t.get("selected_r")) if t.get("selected_r") is not None else None
        sg = _clamp_255(t.get("selected_g")) if t.get("selected_g") is not None else None
        sb = _clamp_255(t.get("selected_b")) if t.get("selected_b") is not None else None

        trial = ColorTrial(
            participant_id=t.get("participant_id"),
            stimulus_id=t.get("stimulus_id"),
            trial_index=t.get("trial_index"),
            selected_r=sr,
            selected_g=sg,
            selected_b=sb,
            response_ms=t.get("response_ms"),
            meta_json=_sanitize_meta(t.get("meta_json")),
        )
        db.session.add(trial)
        saved.append(trial)

    db.session.commit()
    return jsonify({"saved": len(saved), "ids": [tr.id for tr in saved]}), 201


@app.get("/api/color/trials")
def list_color_trials():
    """Simple dev endpoint: inspect what was saved (filter by participant_id if provided)."""
    pid = request.args.get("participant_id")
    q = ColorTrial.query
    if pid:
        q = q.filter_by(participant_id=pid)
    rows = q.order_by(ColorTrial.created_at.asc()).all()
    return jsonify([r.to_dict() for r in rows])


if __name__ == "__main__":
    app.run(debug=True)
