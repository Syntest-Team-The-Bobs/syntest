# views.py
from datetime import datetime
from flask import Blueprint, request, jsonify, session
from models import (
    db, Participant,
    ScreeningSession, ScreeningHealth, ScreeningDefinition,
    ScreeningPainEmotion, ScreeningTypeChoice,
    YesNo, YesNoMaybe, Frequency
)

# Expose this Blueprint as `api_screening` for app.py to import
bp = Blueprint("api_screening", __name__, url_prefix="/api/screening")


# ---------------------------
# Helpers (dev-safe stubs)
# ---------------------------
def _current_participant_id():
    """
    Replace with your real auth. For dev, stash a demo participant in session.
    """
    pid = session.get("pid")
    if pid:
        return pid
    p = Participant(
        name="Demo User",
        email=f"demo{datetime.utcnow().timestamp()}@example.com",
        password_hash="dev",
        age=None,
        country=None,
    )
    db.session.add(p)
    db.session.commit()
    session["pid"] = p.id
    return p.id


def _get_or_create_session():
    pid = _current_participant_id()
    s = (
        ScreeningSession.query
        .filter_by(participant_id=pid, status="in_progress")
        .order_by(ScreeningSession.started_at.desc())
        .first()
    )
    if not s:
        s = ScreeningSession(participant_id=pid, consent_given=False)
        db.session.add(s)
        db.session.commit()
    return s


# ---------------------------
# API endpoints
# ---------------------------
@bp.post("/consent")
def save_consent():
    s = _get_or_create_session()
    data = request.get_json(force=True)
    s.consent_given = bool(data.get("consent"))
    s.record_event(0, "consent", {"value": s.consent_given})
    db.session.commit()
    return jsonify(ok=True, session_id=s.id)


@bp.post("/step/1")
def save_step1():
    s = _get_or_create_session()
    h = s.health or ScreeningHealth(session_id=s.id)
    payload = request.get_json(force=True)
    h.drug_use = bool(payload.get("drug"))
    h.neuro_condition = bool(payload.get("neuro"))
    h.medical_treatment = bool(payload.get("medical"))
    db.session.add(h)
    s.record_event(1, "save", payload)
    db.session.commit()
    return jsonify(ok=True)


@bp.post("/step/2")
def save_step2():
    s = _get_or_create_session()
    d = s.definition or ScreeningDefinition(session_id=s.id)
    payload = request.get_json(force=True)
    val = payload.get("answer", "yes")
    d.answer = YesNoMaybe(val)
    db.session.add(d)
    s.record_event(2, "save", payload)
    db.session.commit()
    return jsonify(ok=True)


@bp.post("/step/3")
def save_step3():
    s = _get_or_create_session()
    pe = s.pain_emotion or ScreeningPainEmotion(session_id=s.id)
    val = request.get_json(force=True).get("answer", "no")
    pe.answer = YesNo(val)
    db.session.add(pe)
    s.record_event(3, "save", {"answer": pe.answer.value})
    db.session.commit()
    return jsonify(ok=True)


@bp.post("/step/4")
def save_step4():
    s = _get_or_create_session()
    tc = s.type_choice or ScreeningTypeChoice(session_id=s.id)
    j = request.get_json(force=True)
    tc.grapheme = Frequency(j.get("grapheme")) if j.get("grapheme") else None
    tc.music    = Frequency(j.get("music"))    if j.get("music")    else None
    tc.lexical  = Frequency(j.get("lexical"))  if j.get("lexical")  else None
    tc.sequence = Frequency(j.get("sequence")) if j.get("sequence") else None
    tc.other    = (j.get("other") or "").strip() or None
    db.session.add(tc)
    s.record_event(4, "save", j)
    db.session.commit()
    return jsonify(ok=True)


@bp.post("/finalize")
def finalize_screening():
    s = _get_or_create_session()
    # Uses services through finalize() method
    s.finalize()
    db.session.commit()
    return jsonify(
        ok=True,
        eligible=s.eligible,
        exit_code=s.exit_code,
        selected_types=s.selected_types,
        recommended=s.recommended_tests,
    )
