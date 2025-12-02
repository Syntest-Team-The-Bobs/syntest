from datetime import datetime, timedelta
from flask import Blueprint, jsonify, session
from models import (
    Participant, Researcher, TestResult, ColorStimulus, Test,
    ScreeningSession, ColorTrial, TestData
)
from sqlalchemy import func, desc

researcher_bp = Blueprint(
    "researcher_dashboard",
    __name__,
    url_prefix="/api/researcher",
)


@researcher_bp.route("/dashboard", methods=["GET"])
def get_researcher_dashboard():
    """
    Enhanced researcher dashboard with comprehensive stats, insights, and chart data.
    
    Returns:
    - user: researcher info
    - summary: key metrics (participants, tests, stimuli)
    - recent: recent activity (participants, stimuli, tests)
    - insights: computed analytics (completion rates, trends)
    - charts: data for visualizations
    """
    try:
        # Authentication check
        if "user_id" not in session or session.get("user_role") != "researcher":
            return jsonify({"error": "Not authenticated as researcher"}), 401

        user_id = session["user_id"]
        researcher = Researcher.query.get(user_id)

        if not researcher:
            return jsonify({"error": "Researcher not found"}), 404

        # ========== SUMMARY STATISTICS ==========
        
        # Total participants
        total_participants = Participant.query.count()
        
        # Active participants (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        active_participants = Participant.query.filter(
            Participant.last_login >= seven_days_ago
        ).count()
        
        # Total stimuli
        total_stimuli = ColorStimulus.query.count()
        
        # Test statistics
        total_test_results = TestResult.query.count()
        completed_tests = TestResult.query.filter_by(status="completed").count()
        in_progress_tests = TestResult.query.filter_by(status="in_progress").count()
        not_started_tests = TestResult.query.filter_by(status="not_started").count()
        
        # Screening statistics
        total_screenings = ScreeningSession.query.filter_by(status="completed").count()
        eligible_participants = ScreeningSession.query.filter_by(
            status="completed", 
            eligible=True
        ).count()
        
        # Color trials count
        total_color_trials = ColorTrial.query.count()

        # ========== RECENT ACTIVITY ==========
        
        # Recent participants (last 10)
        recent_participants = (
            Participant.query
            .order_by(Participant.created_at.desc())
            .limit(10)
            .all()
        )
        recent_participants_data = [
            {
                "id": p.id,
                "name": p.name,
                "email": p.email,
                "status": p.status,
                "screening_completed": p.screening_completed,
                "created_at": p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else "N/A",
                "last_login": p.last_login.strftime("%Y-%m-%d %H:%M") if p.last_login else "Never",
            }
            for p in recent_participants
        ]

        # Recent stimuli (last 10)
        recent_stimuli = (
            ColorStimulus.query
            .order_by(ColorStimulus.created_at.desc())
            .limit(10)
            .all()
        )
        recent_stimuli_data = [
            {
                "id": s.id,
                "description": s.description or "Untitled",
                "family": s.family or "color",
                "hex_color": s.hex_color,
                "trigger_type": s.trigger_type or "N/A",
                "created_at": s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else "N/A",
            }
            for s in recent_stimuli
        ]

        # Recent completed tests (last 10)
        recent_tests = (
            TestResult.query
            .filter_by(status="completed")
            .order_by(TestResult.completed_at.desc())
            .limit(10)
            .all()
        )
        recent_tests_data = [
            {
                "id": tr.id,
                "participant_name": tr.participant.name if tr.participant else "Unknown",
                "test_name": tr.test.name if tr.test else "Unknown Test",
                "consistency_score": round(tr.consistency_score, 2) if tr.consistency_score else "N/A",
                "completed_at": tr.completed_at.strftime("%Y-%m-%d %H:%M") if tr.completed_at else "N/A",
            }
            for tr in recent_tests
        ]

        # ========== INSIGHTS & ANALYTICS ==========
        
        # Completion rate
        completion_rate = round((completed_tests / total_test_results * 100), 1) if total_test_results > 0 else 0
        
        # Screening conversion rate
        screening_conversion = round((eligible_participants / total_screenings * 100), 1) if total_screenings > 0 else 0
        
        # Average tests per participant
        avg_tests_per_participant = round(total_test_results / total_participants, 1) if total_participants > 0 else 0
        
        # Participant growth (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        new_participants_30d = Participant.query.filter(
            Participant.created_at >= thirty_days_ago
        ).count()
        
        # Test activity (last 30 days)
        tests_completed_30d = TestResult.query.filter(
            TestResult.completed_at >= thirty_days_ago
        ).count()
        
        # Most active test types
        test_type_stats = (
            TestResult.query
            .join(Test)
            .with_entities(Test.name, func.count(TestResult.id).label('count'))
            .group_by(Test.name)
            .order_by(desc('count'))
            .limit(5)
            .all()
        )
        popular_tests = [
            {"name": name, "count": count} 
            for name, count in test_type_stats
        ]
        
        # Stimulus distribution by family
        stimulus_families = (
            ColorStimulus.query
            .with_entities(ColorStimulus.family, func.count(ColorStimulus.id).label('count'))
            .group_by(ColorStimulus.family)
            .all()
        )
        stimulus_breakdown = [
            {"family": family, "count": count}
            for family, count in stimulus_families
        ]

        # Average consistency scores
        avg_consistency = (
            TestResult.query
            .filter(TestResult.consistency_score.isnot(None))
            .with_entities(func.avg(TestResult.consistency_score))
            .scalar()
        )
        avg_consistency = round(avg_consistency, 2) if avg_consistency else None

        # ========== CHART DATA ==========
        
        # Participant growth over last 30 days (daily)
        growth_data = []
        for i in range(30, -1, -1):
            date = datetime.utcnow() - timedelta(days=i)
            date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
            date_end = date.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            count = Participant.query.filter(
                Participant.created_at >= date_start,
                Participant.created_at <= date_end
            ).count()
            
            growth_data.append({
                'date': date.strftime('%m/%d'),
                'count': count
            })

        # ========== RESPONSE PAYLOAD ==========
        
        return jsonify({
            # User info
            "user": {
                "name": researcher.name,
                "email": researcher.email,
                "institution": researcher.institution,
            },
            
            # Summary statistics
            "summary": {
                "total_participants": total_participants,
                "active_participants": active_participants,
                "total_stimuli": total_stimuli,
                "tests_completed": completed_tests,
                "tests_in_progress": in_progress_tests,
                "total_screenings": total_screenings,
                "eligible_participants": eligible_participants,
                "total_color_trials": total_color_trials,
            },
            
            # Recent activity
            "recent": {
                "participants": recent_participants_data,
                "stimuli": recent_stimuli_data,
                "tests": recent_tests_data,
            },
            
            # Insights and analytics
            "insights": {
                "completion_rate": completion_rate,
                "screening_conversion": screening_conversion,
                "avg_tests_per_participant": avg_tests_per_participant,
                "new_participants_30d": new_participants_30d,
                "tests_completed_30d": tests_completed_30d,
                "avg_consistency_score": avg_consistency,
                "popular_tests": popular_tests,
                "stimulus_breakdown": stimulus_breakdown,
            },
            
            # Chart data
            "charts": {
                "participant_growth": {
                    "labels": [d['date'] for d in growth_data],
                    "values": [d['count'] for d in growth_data]
                },
                "test_completion": {
                    "completed": completed_tests,
                    "in_progress": in_progress_tests,
                    "not_started": not_started_tests
                },
                "popular_tests": popular_tests,
                "stimulus_breakdown": stimulus_breakdown
            },
            
            # Backward compatibility (for older frontend versions)
            "total_participants": total_participants,
            "active_participants": active_participants,
            "total_stimuli": total_stimuli,
            "completed_tests": completed_tests,
            "recent_participants": recent_participants_data,
            "recent_stimuli": recent_stimuli_data,
        })

    except Exception as e:
        print(f"Error in get_researcher_dashboard: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500