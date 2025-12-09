from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify, session, request, Response
from sqlalchemy import func, case, or_
import csv
import io
import json
from models import (
    Participant,
    Researcher,
    TestResult,
    ColorStimulus,
    ScreeningSession,
    Test,
    TestData,
    ColorTrial,
)

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
        days = request.args.get("days", default=30, type=int)
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
            Participant.query.filter(Participant.created_at >= date_threshold)
            .order_by(Participant.created_at.desc())
            .limit(10)
            .all()
        )
        recent_participants_data = [
            {
                "id": p.id,
                "name": p.name,
                "email": p.email,
                "status": p.status or "active",
                "created_at": p.created_at.strftime("%Y-%m-%d %H:%M")
                if p.created_at
                else "N/A",
                "last_login": p.last_login.strftime("%Y-%m-%d %H:%M")
                if p.last_login
                else "Never",
            }
            for p in recent_participants
        ]

        # Recent stimuli (filtered by date range)
        recent_stimuli = (
            ColorStimulus.query.filter(ColorStimulus.created_at >= date_threshold)
            .order_by(ColorStimulus.created_at.desc())
            .limit(10)
            .all()
        )
        recent_stimuli_data = [
            {
                "description": s.description or "N/A",
                "family": s.family or "N/A",
                "trigger_type": s.trigger_type or "N/A",
                "created_at": s.created_at.strftime("%Y-%m-%d %H:%M")
                if s.created_at
                else "N/A",
            }
            for s in recent_stimuli
        ]

        # Recent tests completed (filtered by date range)
        recent_tests = (
            TestResult.query.filter(
                TestResult.status == "completed",
                TestResult.completed_at >= date_threshold,
            )
            .order_by(TestResult.completed_at.desc())
            .limit(10)
            .all()
        )
        recent_tests_data = []
        for tr in recent_tests:
            participant = Participant.query.get(tr.participant_id)
            test = Test.query.get(tr.test_id)
            recent_tests_data.append(
                {
                    "participant_name": participant.name if participant else "Unknown",
                    "test_name": test.name if test else "Unknown Test",
                    "consistency_score": round(tr.consistency_score, 2)
                    if tr.consistency_score
                    else "N/A",
                    "completed_at": tr.completed_at.strftime("%Y-%m-%d %H:%M")
                    if tr.completed_at
                    else "N/A",
                }
            )

        # Calculate real screening conversion rate
        total_screenings = ScreeningSession.query.count()
        eligible_screenings = ScreeningSession.query.filter_by(
            eligible=True, status="completed"
        ).count()
        screening_conversion = (
            round((eligible_screenings / total_screenings * 100), 1)
            if total_screenings > 0
            else 0
        )

        # Calculate real average consistency score
        consistency_scores = [
            tr.consistency_score
            for tr in TestResult.query.filter(
                TestResult.consistency_score.isnot(None)
            ).all()
        ]
        avg_consistency_score = (
            round(sum(consistency_scores) / len(consistency_scores), 3)
            if consistency_scores
            else None
        )

        # Participant growth chart data (daily counts for the date range)
        participant_growth = []
        for i in range(days):
            day_start = date_threshold + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            count = Participant.query.filter(
                Participant.created_at >= day_start, Participant.created_at < day_end
            ).count()
            participant_growth.append(
                {
                    "date": day_start.strftime("%Y-%m-%d"),
                    "count": count,
                }
            )

        # Test completion chart data
        test_completion = {
            "completed": TestResult.query.filter_by(status="completed").count(),
            "in_progress": TestResult.query.filter_by(status="in_progress").count(),
            "not_started": TestResult.query.filter_by(status="not_started").count(),
        }

        # Popular tests chart data
        popular_tests_query = (
            TestResult.query.filter_by(status="completed")
            .join(Test, TestResult.test_id == Test.id)
            .with_entities(Test.name, func.count(TestResult.id).label("count"))
            .group_by(Test.name)
            .order_by(func.count(TestResult.id).desc())
            .limit(10)
            .all()
        )
        popular_tests = [
            {"name": name, "count": count} for name, count in popular_tests_query
        ]

        # Stimulus breakdown chart data
        stimulus_breakdown_query = (
            ColorStimulus.query.with_entities(
                ColorStimulus.trigger_type,
                func.count(ColorStimulus.id).label("count"),
            )
            .group_by(ColorStimulus.trigger_type)
            .all()
        )
        stimulus_breakdown = [
            {"type": trigger_type or "Unknown", "count": count}
            for trigger_type, count in stimulus_breakdown_query
        ]

        # Consistency score trends over time (daily averages for the date range)
        consistency_trends = []
        for i in range(days):
            day_start = date_threshold + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            day_tests = TestResult.query.filter(
                TestResult.completed_at >= day_start,
                TestResult.completed_at < day_end,
                TestResult.consistency_score.isnot(None),
            ).all()
            if day_tests:
                avg_score = sum(t.consistency_score for t in day_tests) / len(day_tests)
                consistency_trends.append(
                    {
                        "date": day_start.strftime("%Y-%m-%d"),
                        "avg_consistency": round(avg_score, 3),
                        "test_count": len(day_tests),
                    }
                )
            else:
                consistency_trends.append(
                    {
                        "date": day_start.strftime("%Y-%m-%d"),
                        "avg_consistency": None,
                        "test_count": 0,
                    }
                )

        # Activity heatmap data (test completions per day for last 7 weeks)
        activity_heatmap = []
        seven_weeks_ago = datetime.now(timezone.utc) - timedelta(days=49)
        for i in range(49):  # 7 weeks * 7 days
            day_start = seven_weeks_ago + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            activity_count = TestResult.query.filter(
                TestResult.completed_at >= day_start,
                TestResult.completed_at < day_end,
                TestResult.status == "completed",
            ).count()
            activity_heatmap.append(activity_count)

        # Percentage trends (completion rate over time)
        completion_trends = []
        for i in range(days):
            day_start = date_threshold + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            day_completed = TestResult.query.filter(
                TestResult.completed_at >= day_start,
                TestResult.completed_at < day_end,
                TestResult.status == "completed",
            ).count()
            day_total = TestResult.query.filter(
                TestResult.started_at >= day_start,
                TestResult.started_at < day_end,
            ).count()
            completion_percentage = (
                round((day_completed / day_total * 100), 1) if day_total > 0 else 0
            )
            completion_trends.append(
                {
                    "date": day_start.strftime("%Y-%m-%d"),
                    "completion_rate": completion_percentage,
                    "completed": day_completed,
                    "total": day_total,
                }
            )

        # Calculate percentage changes for trends
        # Compare first half vs second half of the date range
        mid_point = days // 2
        first_half_avg_consistency = None
        second_half_avg_consistency = None
        
        first_half_scores = [
            item["avg_consistency"]
            for item in consistency_trends[:mid_point]
            if item["avg_consistency"] is not None
        ]
        second_half_scores = [
            item["avg_consistency"]
            for item in consistency_trends[mid_point:]
            if item["avg_consistency"] is not None
        ]
        
        if first_half_scores:
            first_half_avg_consistency = sum(first_half_scores) / len(first_half_scores)
        if second_half_scores:
            second_half_avg_consistency = sum(second_half_scores) / len(second_half_scores)
        
        consistency_trend_percentage = None
        if first_half_avg_consistency and second_half_avg_consistency and first_half_avg_consistency > 0:
            consistency_trend_percentage = round(
                ((second_half_avg_consistency - first_half_avg_consistency) / first_half_avg_consistency) * 100,
                1
            )

        # Calculate completion rate trend
        first_half_completion = [
            item["completion_rate"]
            for item in completion_trends[:mid_point]
            if item["total"] > 0
        ]
        second_half_completion = [
            item["completion_rate"]
            for item in completion_trends[mid_point:]
            if item["total"] > 0
        ]
        
        completion_rate_trend_percentage = None
        if first_half_completion and second_half_completion:
            first_avg = sum(first_half_completion) / len(first_half_completion)
            second_avg = sum(second_half_completion) / len(second_half_completion)
            if first_avg > 0:
                completion_rate_trend_percentage = round(
                    ((second_avg - first_avg) / first_avg) * 100,
                    1
                )

        return jsonify(
            {
                "user": {
                    "name": researcher.name,
                    "email": researcher.email,
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
                    "tests": recent_tests_data,
                },
                "insights": {
                    "completion_rate": round(
                        (completed_tests / total_participants * 100), 1
                    )
                    if total_participants > 0
                    else 0,
                    "screening_conversion": screening_conversion,
                    "new_participants_30d": Participant.query.filter(
                        Participant.created_at
                        >= datetime.now(timezone.utc) - timedelta(days=30)
                    ).count(),
                    "avg_consistency_score": avg_consistency_score,
                    "consistency_trend_percentage": consistency_trend_percentage,
                    "completion_trend_percentage": completion_rate_trend_percentage,
                },
                "charts": {
                    "participant_growth": {
                        "labels": [item["date"] for item in participant_growth],
                        "values": [item["count"] for item in participant_growth],
                    },
                    "test_completion": test_completion,
                    "popular_tests": popular_tests,
                    "stimulus_breakdown": stimulus_breakdown,
                    "consistency_trends": consistency_trends,
                    "activity_heatmap": activity_heatmap,
                    "completion_trends": completion_trends,
                },
            }
        )
    except Exception as e:
        print(f"Error in get_researcher_dashboard: {str(e)}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@bp.route("/participants", methods=["GET"])
def search_participants():
    """Search and filter participants"""
    try:
        if "user_id" not in session or session.get("user_role") != "researcher":
            return jsonify({"error": "Not authenticated as researcher"}), 401

        # Get query parameters
        search = request.args.get("search", "").strip()
        status = request.args.get("status", "").strip()
        limit = request.args.get("limit", default=50, type=int)
        offset = request.args.get("offset", default=0, type=int)

        # Build query
        query = Participant.query

        # Search by name or email
        if search:
            query = query.filter(
                or_(
                    Participant.name.ilike(f"%{search}%"),
                    Participant.email.ilike(f"%{search}%"),
                )
            )

        # Filter by status
        if status:
            query = query.filter(Participant.status == status)

        # Get total count before pagination
        total = query.count()

        # Apply pagination
        participants = query.order_by(Participant.created_at.desc()).limit(limit).offset(offset).all()

        # Build response
        participants_data = []
        for p in participants:
            # Count test results
            test_count = TestResult.query.filter_by(
                participant_id=p.id, status="completed"
            ).count()
            # Get latest test completion
            latest_test = (
                TestResult.query.filter_by(participant_id=p.id, status="completed")
                .order_by(TestResult.completed_at.desc())
                .first()
            )

            participants_data.append(
                {
                    "id": p.id,
                    "participant_id": p.participant_id,
                    "name": p.name,
                    "email": p.email,
                    "age": p.age,
                    "country": p.country,
                    "status": p.status,
                    "screening_completed": p.screening_completed,
                    "synesthesia_type": p.synesthesia_type,
                    "tests_completed": test_count,
                    "last_test_at": latest_test.completed_at.strftime("%Y-%m-%d %H:%M")
                    if latest_test and latest_test.completed_at
                    else None,
                    "created_at": p.created_at.strftime("%Y-%m-%d %H:%M")
                    if p.created_at
                    else None,
                    "last_login": p.last_login.strftime("%Y-%m-%d %H:%M")
                    if p.last_login
                    else None,
                }
            )

        return jsonify(
            {
                "participants": participants_data,
                "total": total,
                "limit": limit,
                "offset": offset,
            }
        )
    except Exception as e:
        print(f"Error in search_participants: {str(e)}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@bp.route("/participants/<int:participant_id>", methods=["GET"])
def get_participant_detail(participant_id):
    """Get detailed information about a specific participant"""
    try:
        if "user_id" not in session or session.get("user_role") != "researcher":
            return jsonify({"error": "Not authenticated as researcher"}), 401

        participant = Participant.query.get(participant_id)
        if not participant:
            return jsonify({"error": "Participant not found"}), 404

        # Get all test results
        test_results = (
            TestResult.query.filter_by(participant_id=participant_id)
            .order_by(TestResult.completed_at.desc())
            .all()
        )

        test_results_data = []
        for tr in test_results:
            test = Test.query.get(tr.test_id)
            test_results_data.append(
                {
                    "id": tr.id,
                    "test_id": tr.test_id,
                    "test_name": test.name if test else "Unknown",
                    "status": tr.status,
                    "consistency_score": tr.consistency_score,
                    "started_at": tr.started_at.strftime("%Y-%m-%d %H:%M")
                    if tr.started_at
                    else None,
                    "completed_at": tr.completed_at.strftime("%Y-%m-%d %H:%M")
                    if tr.completed_at
                    else None,
                }
            )

        # Get screening sessions
        screening_sessions = (
            ScreeningSession.query.filter_by(participant_id=participant_id)
            .order_by(ScreeningSession.completed_at.desc())
            .all()
        )

        screening_data = []
        for ss in screening_sessions:
            screening_data.append(
                {
                    "id": ss.id,
                    "status": ss.status,
                    "eligible": ss.eligible,
                    "exit_code": ss.exit_code,
                    "selected_types": ss.selected_types,
                    "started_at": ss.started_at.strftime("%Y-%m-%d %H:%M")
                    if ss.started_at
                    else None,
                    "completed_at": ss.completed_at.strftime("%Y-%m-%d %H:%M")
                    if ss.completed_at
                    else None,
                }
            )

        # Calculate statistics
        completed_tests = [
            tr for tr in test_results if tr.status == "completed"
        ]
        avg_consistency = (
            sum(tr.consistency_score for tr in completed_tests if tr.consistency_score)
            / len([tr for tr in completed_tests if tr.consistency_score])
            if completed_tests
            else None
        )

        return jsonify(
            {
                "participant": {
                    "id": participant.id,
                    "participant_id": participant.participant_id,
                    "name": participant.name,
                    "email": participant.email,
                    "age": participant.age,
                    "country": participant.country,
                    "status": participant.status,
                    "screening_completed": participant.screening_completed,
                    "synesthesia_type": participant.synesthesia_type,
                    "created_at": participant.created_at.strftime("%Y-%m-%d %H:%M")
                    if participant.created_at
                    else None,
                    "last_login": participant.last_login.strftime("%Y-%m-%d %H:%M")
                    if participant.last_login
                    else None,
                },
                "test_results": test_results_data,
                "screening_sessions": screening_data,
                "statistics": {
                    "total_tests": len(test_results),
                    "completed_tests": len(completed_tests),
                    "in_progress_tests": len(
                        [tr for tr in test_results if tr.status == "in_progress"]
                    ),
                    "not_started_tests": len(
                        [tr for tr in test_results if tr.status == "not_started"]
                    ),
                    "avg_consistency_score": round(avg_consistency, 3)
                    if avg_consistency
                    else None,
                },
            }
        )
    except Exception as e:
        print(f"Error in get_participant_detail: {str(e)}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@bp.route("/export", methods=["GET"])
def export_data():
    """Export dashboard data as CSV or JSON"""
    try:
        if "user_id" not in session or session.get("user_role") != "researcher":
            return jsonify({"error": "Not authenticated as researcher"}), 401

        export_format = request.args.get("format", "csv").lower()
        data_type = request.args.get("type", "participants").lower()

        if data_type == "participants":
            participants = Participant.query.all()
            if export_format == "csv":
                output = io.StringIO()
                writer = csv.writer(output)
                writer.writerow(
                    [
                        "ID",
                        "Participant ID",
                        "Name",
                        "Email",
                        "Age",
                        "Country",
                        "Status",
                        "Screening Completed",
                        "Synesthesia Type",
                        "Created At",
                        "Last Login",
                    ]
                )
                for p in participants:
                    writer.writerow(
                        [
                            p.id,
                            p.participant_id,
                            p.name,
                            p.email,
                            p.age or "",
                            p.country or "",
                            p.status,
                            p.screening_completed,
                            p.synesthesia_type or "",
                            p.created_at.strftime("%Y-%m-%d %H:%M")
                            if p.created_at
                            else "",
                            p.last_login.strftime("%Y-%m-%d %H:%M")
                            if p.last_login
                            else "",
                        ]
                    )
                output.seek(0)
                return Response(
                    output.getvalue(),
                    mimetype="text/csv",
                    headers={
                        "Content-Disposition": f"attachment; filename=participants_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
                    },
                )
            else:  # JSON
                data = [
                    {
                        "id": p.id,
                        "participant_id": p.participant_id,
                        "name": p.name,
                        "email": p.email,
                        "age": p.age,
                        "country": p.country,
                        "status": p.status,
                        "screening_completed": p.screening_completed,
                        "synesthesia_type": p.synesthesia_type,
                        "created_at": p.created_at.isoformat() if p.created_at else None,
                        "last_login": p.last_login.isoformat() if p.last_login else None,
                    }
                    for p in participants
                ]
                return Response(
                    json.dumps(data, indent=2),
                    mimetype="application/json",
                    headers={
                        "Content-Disposition": f"attachment; filename=participants_{datetime.now(timezone.utc).strftime('%Y%m%d')}.json"
                    },
                )

        elif data_type == "test_results":
            test_results = TestResult.query.filter_by(status="completed").all()
            if export_format == "csv":
                output = io.StringIO()
                writer = csv.writer(output)
                writer.writerow(
                    [
                        "ID",
                        "Participant ID",
                        "Participant Name",
                        "Test ID",
                        "Test Name",
                        "Consistency Score",
                        "Started At",
                        "Completed At",
                    ]
                )
                for tr in test_results:
                    participant = Participant.query.get(tr.participant_id)
                    test = Test.query.get(tr.test_id)
                    writer.writerow(
                        [
                            tr.id,
                            tr.participant_id,
                            participant.name if participant else "Unknown",
                            tr.test_id,
                            test.name if test else "Unknown",
                            tr.consistency_score or "",
                            tr.started_at.strftime("%Y-%m-%d %H:%M")
                            if tr.started_at
                            else "",
                            tr.completed_at.strftime("%Y-%m-%d %H:%M")
                            if tr.completed_at
                            else "",
                        ]
                    )
                output.seek(0)
                return Response(
                    output.getvalue(),
                    mimetype="text/csv",
                    headers={
                        "Content-Disposition": f"attachment; filename=test_results_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
                    },
                )
            else:  # JSON
                data = []
                for tr in test_results:
                    participant = Participant.query.get(tr.participant_id)
                    test = Test.query.get(tr.test_id)
                    data.append(
                        {
                            "id": tr.id,
                            "participant_id": tr.participant_id,
                            "participant_name": participant.name if participant else "Unknown",
                            "test_id": tr.test_id,
                            "test_name": test.name if test else "Unknown",
                            "consistency_score": tr.consistency_score,
                            "started_at": tr.started_at.isoformat() if tr.started_at else None,
                            "completed_at": tr.completed_at.isoformat()
                            if tr.completed_at
                            else None,
                        }
                    )
                return Response(
                    json.dumps(data, indent=2),
                    mimetype="application/json",
                    headers={
                        "Content-Disposition": f"attachment; filename=test_results_{datetime.now(timezone.utc).strftime('%Y%m%d')}.json"
                    },
                )

        return jsonify({"error": "Invalid data type"}), 400

    except Exception as e:
        print(f"Error in export_data: {str(e)}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500
