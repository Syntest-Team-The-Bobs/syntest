from datetime import datetime, timedelta
from flask import Blueprint, jsonify, session
from models import Participant, Researcher, TestResult, ColorStimulus


researcher_bp = Blueprint(
    "researcher_dashboard",
    __name__,
    url_prefix="/api/researcher",
)


@researcher_bp.route("/dashboard", methods=["GET"])
def get_researcher_dashboard():
    """
    Researcher dashboard endpoint used by the current frontend.

    Returns aggregate stats plus recent activity while keeping
    the shape backwards compatible with earlier minimal versions.
    """
    try:
        # Must be logged in as a researcher
        if "user_id" not in session or session.get("user_role") != "researcher":
            return jsonify({"error": "Not authenticated as researcher"}), 401

        user_id = session["user_id"]
        researcher = Researcher.query.get(user_id)

        if not researcher:
            return jsonify({"error": "Researcher not found"}), 404

        # Basic aggregate stats
        total_participants = Participant.query.count()
        completed_tests = TestResult.query.filter_by(status="completed").count()

        # Active participants within last 7 days
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        active_participants = (
            Participant.query.filter(Participant.last_login >= seven_days_ago).count()
        )

        # Total stimuli
        total_stimuli = ColorStimulus.query.count()

        # Recent participants (last 10)
        recent_participants = (
            Participant.query.order_by(Participant.created_at.desc()).limit(10).all()
        )
        recent_participants_data = [
            {
                "name": p.name,
                "email": p.email,
                "created_at": p.created_at.strftime("%Y-%m-%d %H:%M")
                if p.created_at
                else "N/A",
            }
            for p in recent_participants
        ]

        # Recent stimuli (last 10)
        recent_stimuli = (
            ColorStimulus.query.order_by(ColorStimulus.created_at.desc())
            .limit(10)
            .all()
        )
        recent_stimuli_data = [
            {
                "description": s.description or "N/A",
                "family": s.family or "N/A",
                "created_at": s.created_at.strftime("%Y-%m-%d %H:%M")
                if s.created_at
                else "N/A",
            }
            for s in recent_stimuli
        ]

        return jsonify(
            {
                "user": {
                    "name": researcher.name,
                    "institution": researcher.institution,
                },
                "total_participants": total_participants,
                "active_participants": active_participants,
                "total_stimuli": total_stimuli,
                "completed_tests": completed_tests,
                "recent_participants": recent_participants_data,
                "recent_stimuli": recent_stimuli_data,
            }
        )
    except Exception as e:
        # Keep error shape consistent with other endpoints
        print(f"Error in get_researcher_dashboard: {str(e)}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500


