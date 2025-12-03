from flask import Blueprint, request, jsonify, session
from models import db, ColorTrial, ColorStimulus, Participant
from datetime import datetime

bp = Blueprint("colortest", __name__, url_prefix="/api/color-test")


@bp.route("/trial", methods=["POST"])
def save_color_trial():
    """Save a single color trial (works for letter, number, word, music tests)"""
    try:
        # Check authentication
        if "user_id" not in session:
            return jsonify({"error": "Not authenticated"}), 401

        data = request.json

        # Get participant info
        user_id = session["user_id"]
        participant = Participant.query.get(user_id)
        if not participant:
            return jsonify({"error": "Participant not found"}), 404

        # Create trial record
        trial = ColorTrial(
            participant_id=participant.participant_id,  # Use the string participant_id
            # stimulus_id removed - stimulus info is stored in meta_json
            trial_index=data.get("trial_index"),
            selected_r=data.get("selected_r"),
            selected_g=data.get("selected_g"),
            selected_b=data.get("selected_b"),
            response_ms=data.get("response_ms"),
            meta_json=data.get("meta_json", {}),
        )

        db.session.add(trial)
        db.session.commit()

        return (
            jsonify({"success": True, "trial_id": trial.id, "trial": trial.to_dict()}),
            201,
        )

    except Exception as e:
        db.session.rollback()
        print(f"Error saving color trial: {str(e)}")
        import traceback

        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/batch", methods=["POST"])
def save_color_trials_batch():
    """Save multiple trials at once"""
    try:
        # Check authentication
        if "user_id" not in session:
            return jsonify({"error": "Not authenticated"}), 401

        data = request.json
        trials_data = data.get("trials", [])

        # Get participant info
        user_id = session["user_id"]
        participant = Participant.query.get(user_id)
        if not participant:
            return jsonify({"error": "Participant not found"}), 404

        trials = []
        for trial_data in trials_data:
            trial = ColorTrial(
                participant_id=participant.participant_id,
                # stimulus_id removed - stimulus info is stored in meta_json
                trial_index=trial_data.get("trial_index"),
                selected_r=trial_data.get("selected_r"),
                selected_g=trial_data.get("selected_g"),
                selected_b=trial_data.get("selected_b"),
                response_ms=trial_data.get("response_ms"),
                meta_json=trial_data.get("meta_json", {}),
            )
            trials.append(trial)
            db.session.add(trial)

        db.session.commit()

        return (
            jsonify(
                {
                    "success": True,
                    "count": len(trials),
                    "trial_ids": [t.id for t in trials],
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        print(f"Error saving color trials batch: {str(e)}")
        import traceback

        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/session/start", methods=["POST"])
def start_test_session():
    """Start a new test session and get session metadata"""
    try:
        if "user_id" not in session:
            return jsonify({"error": "Not authenticated"}), 401

        user_id = session["user_id"]
        participant = Participant.query.get(user_id)
        if not participant:
            return jsonify({"error": "Participant not found"}), 404

        data = request.json
        test_type = data.get("test_type")  # 'letter', 'number', 'word', 'music'

        return (
            jsonify(
                {
                    "success": True,
                    "session": {
                        "participant_id": participant.participant_id,
                        "test_type": test_type,
                        "started_at": datetime.utcnow().isoformat(),
                    },
                }
            ),
            200,
        )

    except Exception as e:
        print(f"Error starting test session: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500