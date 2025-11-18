from flask import Blueprint, jsonify, session
from models import Participant, Researcher, TestResult


researcher_bp = Blueprint(
    "researcher_dashboard",
    __name__,
    url_prefix="/api/researcher",
)


@researcher_bp.route("/dashboard", methods=["GET"])
def get_researcher_dashboard():
    """
    Minimal researcher dashboard endpoint used by the current frontend.

    Returns:
    - user: { name, institution }
    - total_participants: int
    - completed_tests: int

    This is intentionally conservative so we don't risk breaking
    existing participant flows or Heroku behavior.
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

        return jsonify(
            {
                "user": {
                    "name": researcher.name,
                    "institution": researcher.institution,
                },
                "total_participants": total_participants,
                "completed_tests": completed_tests,
            }
        )
    except Exception as e:
        # Keep error shape consistent with other endpoints
        print(f"Error in get_researcher_dashboard: {str(e)}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500


