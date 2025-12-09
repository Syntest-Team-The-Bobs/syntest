from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify, session, request
from models import Participant, Researcher, TestResult, ColorStimulus

bp = Blueprint(
    "researcher_dashboard",
    __name__,
)

@bp.route("", methods=["GET"])
def get_researcher_dashboard():
    """Researcher dashboard with date range filtering"""
    try:
        # Must be logged in as a researcher
        if "user_id" not in session or session.get("user_role") != "researcher":
            return jsonify({"error": "Not authenticated as researcher"}), 401

        user_id = session["user_id"]
        researcher = Researcher.query.get(user_id)

        if not researcher:
            return jsonify({"error": "Researcher not found"}), 404

        # Get date range parameter (default 30 days)
        days = request.args.get('days', default=30, type=int)
        date_threshold = datetime.now(timezone.utc) - timedelta(days=days)

        # Basic aggregate stats
        total_participants = Participant.query.count()
        completed_tests = TestResult.query.filter_by(status="completed").count()

        # Active participants within last 7 days
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        active_participants = Participant.query.filter(
            Participant.last_login >= seven_days_ago
        ).count()

        # Total stimuli
        total_stimuli = ColorStimulus.query.count()

        # Recent participants (filtered by date range)
        recent_participants = (
            Participant.query
            .filter(Participant.created_at >= date_threshold)
            .order_by(Participant.created_at.desc())
            .limit(10)
            .all()
        )
        recent_participants_data = [
            {
                "name": p.name,
                "email": p.email,
                "created_at": p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else "N/A",
            }
            for p in recent_participants
        ]

        # Recent stimuli (filtered by date range)
        recent_stimuli = (
            ColorStimulus.query
            .filter(ColorStimulus.created_at >= date_threshold)
            .order_by(ColorStimulus.created_at.desc())
            .limit(10)
            .all()
        )
        recent_stimuli_data = [
            {
                "description": s.description or "N/A",
                "family": s.family or "N/A",
                "created_at": s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else "N/A",
            }
            for s in recent_stimuli
        ]

        return jsonify({
            "user": {
                "name": researcher.name,
                "institution": researcher.institution,
            },
            "summary": {
                "total_participants": total_participants,
                "active_participants": active_participants,
                "total_stimuli": total_stimuli,
                "tests_completed": completed_tests,
            },
            "recent": {
                "participants": recent_participants_data,
                "stimuli": recent_stimuli_data,
            },
            "insights": {
                "completion_rate": round((completed_tests / total_participants * 100), 1) if total_participants > 0 else 0,
                "screening_conversion": 75,  # Placeholder
                "new_participants_30d": len(recent_participants_data),
                "avg_consistency_score": 0.85,  # Placeholder
            },
        })
    except Exception as e:
        print(f"Error in get_researcher_dashboard: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500