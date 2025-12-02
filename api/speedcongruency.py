from flask import Blueprint, request, jsonify, session
import random

from models import db, Participant, TestData, SpeedCongruency, ColorStimulus

bp = Blueprint("speed_congruency", __name__, url_prefix="/api/speed-congruency")


# =====================================
# AUTH / PARTICIPANT HELPER
# =====================================

def _require_participant():
    """
    Ensure the current session belongs to a logged-in participant.
    Returns (Participant, None) on success, or (None, (response, status)) on error.
    """
    if "user_id" not in session or session.get("user_role") != "participant":
        return None, (jsonify({"error": "Not authenticated as participant"}), 401)

    participant = Participant.query.get(session["user_id"])
    if not participant:
        return None, (jsonify({"error": "Participant not found"}), 404)

    return participant, None


# =====================================
# POOL BUILDER: which associations do we test?
# =====================================

def _get_speed_congruency_pool(participant: Participant):
    """
    Build the list of TestData rows to use as trials for this participant.

    This is where we decide:
      - only color-family tests
      - only 'passed' / 'valid' associations
    """

    # Color tests seem to store their user id as a string.
    # Often this will be str(participant.id) OR participant.participant_id.
    user_key = str(participant.id)

    q = (
        TestData.query
        .filter(TestData.user_id == user_key)
        .filter(TestData.family == "color")
    )

    # If you want to REQUIRE the participant to be a synesthete
    # (i.e., they passed some consistency threshold), keep this filter:
    q = q.filter(
        (TestData.cct_valid == 1) |
        (TestData.cct_pass.is_(True))
    )

    rows = q.order_by(TestData.created_at.asc()).all()

    # Fallback: if your color pipeline used participant.participant_id instead
    if not rows and participant.participant_id:
        rows = (
            TestData.query
            .filter(TestData.user_id == participant.participant_id)
            .filter(TestData.family == "color")
            .order_by(TestData.created_at.asc())
            .all()
        )

    return rows


# =====================================
# CHOICE BUILDER: create 4 color boxes
# =====================================

def _build_color_options(cue_label: str, expected_hex: str):
    """
    Given a trigger label and its expected color hex (#rrggbb),
    build 4 options: 1 correct + 3 distractors.
    """
    base_palette = [
        "#7ED957", "#FFB347", "#4D9FFF", "#FFB3E6",
        "#FDD835", "#AB47BC", "#29B6F6", "#66BB6A",
        "#EF4444", "#0EA5E9", "#F97316", "#22C55E",
    ]

    # Remove the correct colour from the distractor palette
    palette = [c for c in base_palette if c.lower() != expected_hex.lower()]
    random.shuffle(palette)
    distractors = palette[:3]

    def _hex_to_rgb(hex_code: str):
        h = hex_code.lstrip('#')
        if len(h) == 3:
            h = ''.join([c*2 for c in h])
        try:
            r = int(h[0:2], 16)
            g = int(h[2:4], 16)
            b = int(h[4:6], 16)
            return r, g, b
        except Exception:
            return 0, 0, 0

    # include r,g,b and hex in each option to match frontend expectations
    options = [
        {
            "id": "correct",          # we will use this to decide matched=True
            "label": cue_label,
            "color": expected_hex,
            "hex": expected_hex,
            "r": _hex_to_rgb(expected_hex)[0],
            "g": _hex_to_rgb(expected_hex)[1],
            "b": _hex_to_rgb(expected_hex)[2],
        }
    ]

    for i, hex_code in enumerate(distractors, start=1):
        r, g, b = _hex_to_rgb(hex_code)
        options.append({
            "id": f"opt{i}",
            "label": cue_label,
            "color": hex_code,
            "hex": hex_code,
            "r": r,
            "g": g,
            "b": b,
        })

    random.shuffle(options)
    return options


# =====================================
# GET /api/speed-congruency/next
# =====================================

@bp.get("/next")
def api_speed_congruency_next():
    """
    Serve ONE trial at a time for the current participant.

    Frontend calls:
      GET /api/speed-congruency/next?trialIndex=0
    or: GET /api/speed-congruency/next?index=0
    """

    participant, error = _require_participant()
    if error:
        return error  # (response, status)

    # Support both ?trialIndex and ?index for safety
    raw_index = request.args.get("trialIndex", request.args.get("index", 0))
    try:
        index = int(raw_index)
    except (TypeError, ValueError):
        index = 0

    pool = _get_speed_congruency_pool(participant)
    total = len(pool)

    if total == 0:
        # No strong associations → no speed test
        return jsonify({
            "error": "no_color_data",
            "message": "No valid color-test associations found for this participant.",
            "totalTrials": 0,
        }), 404

    if index < 0 or index >= total:
        # We ran out of trials
        return jsonify({
            "done": True,
            "totalTrials": total,
        }), 200

    td: TestData = pool[index]
    stim: ColorStimulus | None = td.stimulus

    if not stim:
        # Shouldn't usually happen; skip to next if needed.
        return jsonify({
            "error": "missing_stimulus",
            "message": "This association does not have a linked stimulus.",
            "totalTrials": total,
        }), 500

    # Trigger text: letter/number/word, etc.
    cue_word = stim.description or f"Stimulus {stim.id}"

    # Expected color from ColorStimulus
    expected_r, expected_g, expected_b = stim.r, stim.g, stim.b
    expected_hex = f"#{expected_r:02x}{expected_g:02x}{expected_b:02x}"

    options = _build_color_options(cue_word, expected_hex)

    # IMPORTANT: shape matches what your React expects:
    # - .trigger
    # - .options[]
    # - .totalTrials
    # - .index (or trialIndex)
    return jsonify({
        "id": index,                         # trial id (we use index)
        "participantId": str(participant.id),
        "trigger": cue_word,
        "options": options,
        "totalTrials": total,
        "index": index,
        # extra data to send back on submit:
        "stimulusId": stim.id,
        "testDataId": td.id,
        "expectedColor": {
            "r": expected_r,
            "g": expected_g,
            "b": expected_b,
            "hex": expected_hex,
        },
        "cue_type": td.stimulus_type or "word",
    }), 200


# =====================================
# POST /api/speed-congruency/submit
# =====================================

@bp.post("/submit")
def api_speed_congruency_submit():
    """
    Record the result of a single speed-congruency trial.

    Frontend sends:
      {
        "trialIndex": 0,
        "trigger": "MOTHER",
        "selectedOptionId": "correct" | "opt1" | ...,
        "reactionTimeMs": 842.3,
        "testDataId": <id from /next>,
        "stimulusId": <id from /next>
      }
    """

    participant, error = _require_participant()
    if error:
        return error

    data = request.get_json(force=True) or {}

    trial_index   = data.get("trialIndex")
    trigger       = data.get("trigger")
    test_data_id  = data.get("testDataId")
    stimulus_id   = data.get("stimulusId")
    reaction_ms   = data.get("reactionTimeMs")
    selected_id   = data.get("selectedOptionId")

    # Determine expected color from TestData / ColorStimulus (for logging)
    expected_r = expected_g = expected_b = None
    if test_data_id:
        td = TestData.query.get(test_data_id)
        if td and td.stimulus:
            expected_r, expected_g, expected_b = td.stimulus.r, td.stimulus.g, td.stimulus.b

    # Simple correctness rule: if they picked the option whose id == "correct"
    matched = (selected_id == "correct")

    row = SpeedCongruency(
        participant_id=str(participant.id),
        stimulus_id=stimulus_id,
        trial_index=trial_index,
        cue_word=trigger,
        cue_type=data.get("cue_type", "word"),
        expected_r=expected_r,
        expected_g=expected_g,
        expected_b=expected_b,
        chosen_name=selected_id,    # we are only storing which option they chose
        chosen_r=None,
        chosen_g=None,
        chosen_b=None,
        matched=matched,
        response_ms=int(reaction_ms) if reaction_ms is not None else None,
        meta_json={
            "test_data_id": test_data_id,
        },
    )

    db.session.add(row)
    db.session.commit()

    return jsonify({"ok": True, "matched": matched}), 200
