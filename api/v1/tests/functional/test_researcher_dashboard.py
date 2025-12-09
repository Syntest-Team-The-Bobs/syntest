"""
Tests for Researcher Dashboard API endpoints
Tests researcher dashboard functionality including:
- Dashboard data retrieval with date filtering
- Participant search and filtering
- Participant detail views
- Data export functionality
- Chart data generation
- Authentication and authorization
Target: Coverage of researcher_dashboard.py
"""

import pytest
from datetime import datetime, timezone, timedelta
from models import (
    db,
    Participant,
    Researcher,
    TestResult,
    Test,
    ColorStimulus,
    ScreeningSession,
    TestData,
)


def url(path=""):
    """Helper to build researcher dashboard API URLs"""
    base = "/api/v1/researcher/dashboard"
    if not path:
        return f"{base}/"  # Main endpoint with trailing slash
    # If path starts with query params, ensure trailing slash before query
    if path.startswith("?"):
        return f"{base}/{path}"
    # If path starts with /, it's a sub-path
    if path.startswith("/"):
        return f"{base}{path}"
    # Otherwise append to base with trailing slash
    return f"{base}/{path}"


class TestResearcherDashboardMain:
    """Test main researcher dashboard endpoint"""

    def test_dashboard_requires_authentication(self, client):
        """Test dashboard requires researcher authentication"""
        response = client.get(url(""))
        assert response.status_code == 401
        data = response.get_json()
        assert "error" in data
        assert "Not authenticated" in data["error"]

    def test_dashboard_requires_researcher_role(self, client, auth_participant):
        """Test dashboard rejects non-researcher users"""
        response = client.get(url(""))
        assert response.status_code == 401
        data = response.get_json()
        assert "Not authenticated as researcher" in data["error"]

    def test_dashboard_success_with_researcher(self, client, auth_researcher):
        """Test dashboard returns data for authenticated researcher"""
        response = client.get(url(""))
        assert response.status_code == 200
        data = response.get_json()

        assert "user" in data
        assert "summary" in data
        assert "recent" in data
        assert "insights" in data
        assert "charts" in data

        # Verify user info
        assert data["user"]["name"] == auth_researcher.name
        assert data["user"]["email"] == auth_researcher.email

    def test_dashboard_summary_stats(self, client, auth_researcher, app):
        """Test dashboard summary statistics"""
        with app.app_context():
            # Create test data
            for i in range(3):
                participant = Participant(
                    name=f"Participant {i}",
                    email=f"p{i}@test.com",
                    password_hash="hash",
                    status="active",
                )
                db.session.add(participant)
            db.session.commit()

        response = client.get(url(""))
        assert response.status_code == 200
        data = response.get_json()

        assert data["summary"]["total_participants"] >= 3
        assert "active_participants" in data["summary"]
        assert "total_stimuli" in data["summary"]
        assert "tests_completed" in data["summary"]

    def test_dashboard_date_range_filtering(self, client, auth_researcher, app):
        """Test dashboard respects date range parameter"""
        with app.app_context():
            # Create old participant
            old_participant = Participant(
                name="Old Participant",
                email="old@test.com",
                password_hash="hash",
                created_at=datetime.now(timezone.utc) - timedelta(days=60),
            )
            db.session.add(old_participant)

            # Create recent participant
            recent_participant = Participant(
                name="Recent Participant",
                email="recent@test.com",
                password_hash="hash",
                created_at=datetime.now(timezone.utc) - timedelta(days=5),
            )
            db.session.add(recent_participant)
            db.session.commit()

        # Test with 30 day range
        response = client.get(url("?days=30"))
        assert response.status_code == 200
        data = response.get_json()

        # Should include recent participant
        recent_names = [p["name"] for p in data["recent"]["participants"]]
        assert "Recent Participant" in recent_names

    def test_dashboard_default_date_range(self, client, auth_researcher):
        """Test dashboard uses default 30 day range when not specified"""
        response = client.get(url(""))
        assert response.status_code == 200
        data = response.get_json()

        # Should have chart data
        assert "participant_growth" in data["charts"]
        assert len(data["charts"]["participant_growth"]["labels"]) == 30

    def test_dashboard_custom_date_ranges(self, client, auth_researcher):
        """Test dashboard with various date ranges"""
        for days in [7, 30, 90, 180, 365]:
            response = client.get(url(f"?days={days}"))
            assert response.status_code == 200
            data = response.get_json()
            assert len(data["charts"]["participant_growth"]["labels"]) == days

    def test_dashboard_insights_calculation(self, client, auth_researcher, app):
        """Test dashboard calculates insights correctly"""
        with app.app_context():
            # Create participants
            for i in range(5):
                participant = Participant(
                    name=f"P{i}",
                    email=f"p{i}@test.com",
                    password_hash="hash",
                )
                db.session.add(participant)
            db.session.commit()

            # Create screening sessions
            participants = Participant.query.all()
            for i, p in enumerate(participants[:3]):
                session = ScreeningSession(
                    participant_id=p.id,
                    status="completed",
                    eligible=True,
                )
                db.session.add(session)
            db.session.commit()

        response = client.get(url(""))
        assert response.status_code == 200
        data = response.get_json()

        assert "screening_conversion" in data["insights"]
        assert "completion_rate" in data["insights"]
        assert "avg_consistency_score" in data["insights"]

    def test_dashboard_chart_data_structure(self, client, auth_researcher):
        """Test dashboard chart data structure"""
        response = client.get(url(""))
        assert response.status_code == 200
        data = response.get_json()

        charts = data["charts"]
        assert "participant_growth" in charts
        assert "test_completion" in charts
        assert "popular_tests" in charts
        assert "stimulus_breakdown" in charts
        assert "consistency_trends" in charts
        assert "activity_heatmap" in charts
        assert "completion_trends" in charts

        # Verify participant growth structure
        growth = charts["participant_growth"]
        assert "labels" in growth
        assert "values" in growth
        assert len(growth["labels"]) == len(growth["values"])

    def test_dashboard_recent_data(self, client, auth_researcher, app):
        """Test dashboard recent data sections"""
        with app.app_context():
            # Create recent participant
            participant = Participant(
                name="Recent Test",
                email="recent@test.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()

            # Create test result
            test = Test(name="Test", synesthesia_type="Color")
            db.session.add(test)
            db.session.commit()

            result = TestResult(
                participant_id=participant.id,
                test_id=test.id,
                status="completed",
                consistency_score=0.85,
                completed_at=datetime.now(timezone.utc),
            )
            db.session.add(result)
            db.session.commit()

        response = client.get(url(""))
        assert response.status_code == 200
        data = response.get_json()

        assert "participants" in data["recent"]
        assert "stimuli" in data["recent"]
        assert "tests" in data["recent"]

    def test_dashboard_researcher_not_found(self, client):
        """Test dashboard handles missing researcher gracefully"""
        with client.session_transaction() as sess:
            sess["user_id"] = 99999  # Non-existent researcher
            sess["user_role"] = "researcher"

        response = client.get(url(""))
        assert response.status_code == 404
        data = response.get_json()
        assert "Researcher not found" in data["error"]


class TestResearcherDashboardParticipantSearch:
    """Test participant search and filtering"""

    def test_search_requires_authentication(self, client):
        """Test search requires researcher authentication"""
        response = client.get(url("/participants"))
        assert response.status_code == 401

    def test_search_basic_functionality(self, client, auth_researcher, app):
        """Test basic participant search"""
        with app.app_context():
            # Create participants
            for i in range(5):
                participant = Participant(
                    name=f"Participant {i}",
                    email=f"p{i}@test.com",
                    password_hash="hash",
                )
                db.session.add(participant)
            db.session.commit()

        response = client.get(url("/participants"))
        assert response.status_code == 200
        data = response.get_json()

        assert "participants" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        assert len(data["participants"]) <= data["limit"]

    def test_search_by_name(self, client, auth_researcher, app):
        """Test searching participants by name"""
        with app.app_context():
            participant = Participant(
                name="John Doe",
                email="john@test.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()

        response = client.get(url("/participants?search=John"))
        assert response.status_code == 200
        data = response.get_json()

        assert len(data["participants"]) > 0
        assert any("John" in p["name"] for p in data["participants"])

    def test_search_by_email(self, client, auth_researcher, app):
        """Test searching participants by email"""
        with app.app_context():
            participant = Participant(
                name="Jane Smith",
                email="jane.smith@test.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()

        response = client.get(url("/participants?search=jane.smith"))
        assert response.status_code == 200
        data = response.get_json()

        assert len(data["participants"]) > 0
        assert any("jane.smith" in p["email"].lower() for p in data["participants"])

    def test_search_case_insensitive(self, client, auth_researcher, app):
        """Test search is case insensitive"""
        with app.app_context():
            participant = Participant(
                name="Test User",
                email="test@example.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()

        response = client.get(url("/participants?search=TEST"))
        assert response.status_code == 200
        data = response.get_json()

        assert len(data["participants"]) > 0

    def test_search_with_status_filter(self, client, auth_researcher, app):
        """Test filtering participants by status"""
        with app.app_context():
            active = Participant(
                name="Active User",
                email="active@test.com",
                password_hash="hash",
                status="active",
            )
            inactive = Participant(
                name="Inactive User",
                email="inactive@test.com",
                password_hash="hash",
                status="inactive",
            )
            db.session.add_all([active, inactive])
            db.session.commit()

        response = client.get(url("/participants?status=active"))
        assert response.status_code == 200
        data = response.get_json()

        assert all(p["status"] == "active" for p in data["participants"])

    def test_search_pagination(self, client, auth_researcher, app):
        """Test participant search pagination"""
        with app.app_context():
            # Create 15 participants
            for i in range(15):
                participant = Participant(
                    name=f"User {i}",
                    email=f"user{i}@test.com",
                    password_hash="hash",
                )
                db.session.add(participant)
            db.session.commit()

        # First page
        response = client.get(url("/participants?limit=10&offset=0"))
        assert response.status_code == 200
        data = response.get_json()
        assert len(data["participants"]) == 10
        assert data["total"] == 15

        # Second page
        response = client.get(url("/participants?limit=10&offset=10"))
        assert response.status_code == 200
        data = response.get_json()
        assert len(data["participants"]) == 5

    def test_search_empty_results(self, client, auth_researcher):
        """Test search with no matching results"""
        response = client.get(url("/participants?search=NonexistentUser12345"))
        assert response.status_code == 200
        data = response.get_json()

        assert len(data["participants"]) == 0
        assert data["total"] == 0


class TestResearcherDashboardParticipantDetail:
    """Test participant detail endpoint"""

    def test_detail_requires_authentication(self, client):
        """Test detail endpoint requires authentication"""
        response = client.get(url("/participants/1"))
        assert response.status_code == 401

    def test_detail_returns_participant_info(self, client, auth_researcher, app):
        """Test detail endpoint returns participant information"""
        participant_id = None
        with app.app_context():
            participant = Participant(
                name="Detail Test",
                email="detail@test.com",
                password_hash="hash",
                age=30,
                country="USA",
            )
            db.session.add(participant)
            db.session.commit()
            participant_id = participant.id  # Store ID before leaving context

        response = client.get(url(f"/participants/{participant_id}"))
        assert response.status_code == 200
        data = response.get_json()

        assert "participant" in data
        assert data["participant"]["name"] == "Detail Test"
        assert data["participant"]["email"] == "detail@test.com"
        assert data["participant"]["age"] == 30

    def test_detail_includes_test_results(self, client, auth_researcher, app):
        """Test detail includes participant test results"""
        with app.app_context():
            participant = Participant(
                name="Test User",
                email="test@test.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()
            participant_id = participant.id  # Store ID before leaving context

            test = Test(name="Color Test", synesthesia_type="Color")
            db.session.add(test)
            db.session.commit()

            result = TestResult(
                participant_id=participant_id,
                test_id=test.id,
                status="completed",
                consistency_score=0.90,
                completed_at=datetime.now(timezone.utc),
            )
            db.session.add(result)
            db.session.commit()

        response = client.get(url(f"/participants/{participant_id}"))
        assert response.status_code == 200
        data = response.get_json()

        assert "test_results" in data
        assert len(data["test_results"]) == 1
        assert data["test_results"][0]["test_name"] == "Color Test"
        assert data["test_results"][0]["consistency_score"] == 0.90

    def test_detail_includes_screening_sessions(self, client, auth_researcher, app):
        """Test detail includes screening session data"""
        with app.app_context():
            participant = Participant(
                name="Screening User",
                email="screening@test.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()
            participant_id = participant.id  # Store ID before leaving context

            session = ScreeningSession(
                participant_id=participant_id,
                status="completed",
                eligible=True,
                selected_types=["Grapheme-Color"],
                completed_at=datetime.now(timezone.utc),
            )
            db.session.add(session)
            db.session.commit()

        response = client.get(url(f"/participants/{participant_id}"))
        assert response.status_code == 200
        data = response.get_json()

        assert "screening_sessions" in data
        assert len(data["screening_sessions"]) == 1
        assert data["screening_sessions"][0]["eligible"] is True

    def test_detail_includes_statistics(self, client, auth_researcher, app):
        """Test detail includes participant statistics"""
        with app.app_context():
            participant = Participant(
                name="Stats User",
                email="stats@test.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()
            participant_id = participant.id  # Store ID before leaving context

            test = Test(name="Test", synesthesia_type="Color")
            db.session.add(test)
            db.session.commit()

            # Create completed test
            completed = TestResult(
                participant_id=participant_id,
                test_id=test.id,
                status="completed",
                consistency_score=0.85,
                completed_at=datetime.now(timezone.utc),
            )
            # Create in-progress test
            in_progress = TestResult(
                participant_id=participant_id,
                test_id=test.id,
                status="in_progress",
            )
            db.session.add_all([completed, in_progress])
            db.session.commit()

        response = client.get(url(f"/participants/{participant_id}"))
        assert response.status_code == 200
        data = response.get_json()

        assert "statistics" in data
        assert data["statistics"]["total_tests"] == 2
        assert data["statistics"]["completed_tests"] == 1
        assert data["statistics"]["in_progress_tests"] == 1
        assert data["statistics"]["avg_consistency_score"] is not None

    def test_detail_participant_not_found(self, client, auth_researcher):
        """Test detail handles missing participant"""
        response = client.get(url("/participants/99999"))
        assert response.status_code == 404
        data = response.get_json()
        assert "Participant not found" in data["error"]


class TestResearcherDashboardExport:
    """Test data export functionality"""

    def test_export_requires_authentication(self, client):
        """Test export requires authentication"""
        response = client.get(url("/export?format=csv&type=participants"))
        assert response.status_code == 401

    def test_export_participants_csv(self, client, auth_researcher, app):
        """Test exporting participants as CSV"""
        with app.app_context():
            for i in range(3):
                participant = Participant(
                    name=f"Export {i}",
                    email=f"export{i}@test.com",
                    password_hash="hash",
                )
                db.session.add(participant)
            db.session.commit()

        response = client.get(url("/export?format=csv&type=participants"))
        assert response.status_code == 200
        assert response.content_type == "text/csv; charset=utf-8"
        assert "attachment" in response.headers["Content-Disposition"]

        # Verify CSV content
        content = response.get_data(as_text=True)
        assert "Export 0" in content
        assert "Export 1" in content
        assert "Export 2" in content

    def test_export_participants_json(self, client, auth_researcher, app):
        """Test exporting participants as JSON"""
        with app.app_context():
            participant = Participant(
                name="JSON Export",
                email="json@test.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()

        response = client.get(url("/export?format=json&type=participants"))
        assert response.status_code == 200
        assert response.content_type == "application/json"
        assert "attachment" in response.headers["Content-Disposition"]

        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_export_test_results_csv(self, client, auth_researcher, app):
        """Test exporting test results as CSV"""
        with app.app_context():
            participant = Participant(
                name="Test Export",
                email="testexport@test.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()

            test = Test(name="Export Test", synesthesia_type="Color")
            db.session.add(test)
            db.session.commit()

            result = TestResult(
                participant_id=participant.id,
                test_id=test.id,
                status="completed",
                consistency_score=0.75,
                completed_at=datetime.now(timezone.utc),
            )
            db.session.add(result)
            db.session.commit()

        response = client.get(url("/export?format=csv&type=test_results"))
        assert response.status_code == 200
        assert response.content_type == "text/csv; charset=utf-8"

        content = response.get_data(as_text=True)
        assert "Export Test" in content

    def test_export_test_results_json(self, client, auth_researcher, app):
        """Test exporting test results as JSON"""
        with app.app_context():
            participant = Participant(
                name="JSON Test",
                email="jsontest@test.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()

            test = Test(name="JSON Test", synesthesia_type="Color")
            db.session.add(test)
            db.session.commit()

            result = TestResult(
                participant_id=participant.id,
                test_id=test.id,
                status="completed",
            )
            db.session.add(result)
            db.session.commit()

        response = client.get(url("/export?format=json&type=test_results"))
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)

    def test_export_invalid_type(self, client, auth_researcher):
        """Test export with invalid data type"""
        response = client.get(url("/export?format=csv&type=invalid"))
        assert response.status_code == 400
        data = response.get_json()
        assert "Invalid data type" in data["error"]


class TestResearcherDashboardChartData:
    """Test chart data generation"""

    def test_participant_growth_chart_data(self, client, auth_researcher, app):
        """Test participant growth chart data structure"""
        with app.app_context():
            # Create participants at different times
            for i in range(5):
                participant = Participant(
                    name=f"Growth {i}",
                    email=f"growth{i}@test.com",
                    password_hash="hash",
                    created_at=datetime.now(timezone.utc) - timedelta(days=i),
                )
                db.session.add(participant)
            db.session.commit()

        response = client.get(url("?days=7"))
        assert response.status_code == 200
        data = response.get_json()

        growth = data["charts"]["participant_growth"]
        assert len(growth["labels"]) == 7
        assert len(growth["values"]) == 7
        assert all(isinstance(v, int) for v in growth["values"])

    def test_test_completion_chart_data(self, client, auth_researcher, app):
        """Test test completion chart data"""
        with app.app_context():
            participant = Participant(
                name="Completion Test",
                email="completion@test.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()

            test = Test(name="Test", synesthesia_type="Color")
            db.session.add(test)
            db.session.commit()

            # Create different status tests
            results = [
                TestResult(
                    participant_id=participant.id,
                    test_id=test.id,
                    status=status,
                )
                for status in ["completed", "in_progress", "not_started"]
            ]
            db.session.add_all(results)
            db.session.commit()

        response = client.get(url(""))
        assert response.status_code == 200
        data = response.get_json()

        completion = data["charts"]["test_completion"]
        assert "completed" in completion
        assert "in_progress" in completion
        assert "not_started" in completion

    def test_popular_tests_chart_data(self, client, auth_researcher, app):
        """Test popular tests chart data"""
        with app.app_context():
            # Create multiple tests
            test1 = Test(name="Popular Test 1", synesthesia_type="Color")
            test2 = Test(name="Popular Test 2", synesthesia_type="Color")
            db.session.add_all([test1, test2])
            db.session.commit()

            participant = Participant(
                name="Popular User",
                email="popular@test.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()

            # Create more results for test1
            for _ in range(3):
                result = TestResult(
                    participant_id=participant.id,
                    test_id=test1.id,
                    status="completed",
                )
                db.session.add(result)
            # Create one result for test2
            result = TestResult(
                participant_id=participant.id,
                test_id=test2.id,
                status="completed",
            )
            db.session.add(result)
            db.session.commit()

        response = client.get(url(""))
        assert response.status_code == 200
        data = response.get_json()

        popular = data["charts"]["popular_tests"]
        assert len(popular) > 0
        # Test1 should be more popular
        test1_count = next((t["count"] for t in popular if t["name"] == "Popular Test 1"), 0)
        test2_count = next((t["count"] for t in popular if t["name"] == "Popular Test 2"), 0)
        assert test1_count >= test2_count

    def test_stimulus_breakdown_chart_data(self, client, auth_researcher, app):
        """Test stimulus breakdown chart data"""
        with app.app_context():
            # Create stimuli with different trigger types
            for trigger in ["letter", "number", "word"]:
                stimulus = ColorStimulus(
                    description=f"{trigger} stimulus",
                    owner_researcher_id=auth_researcher.id,
                    family="color",
                    r=255,
                    g=0,
                    b=0,
                    trigger_type=trigger,
                )
                db.session.add(stimulus)
            db.session.commit()

        response = client.get(url(""))
        assert response.status_code == 200
        data = response.get_json()

        breakdown = data["charts"]["stimulus_breakdown"]
        assert len(breakdown) >= 3
        trigger_types = [s["type"] for s in breakdown]
        assert "letter" in trigger_types or "Unknown" in trigger_types

    def test_consistency_trends_chart_data(self, client, auth_researcher, app):
        """Test consistency trends chart data"""
        with app.app_context():
            participant = Participant(
                name="Trend User",
                email="trend@test.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()

            test = Test(name="Trend Test", synesthesia_type="Color")
            db.session.add(test)
            db.session.commit()

            # Create test results with consistency scores at different times
            for i in range(3):
                result = TestResult(
                    participant_id=participant.id,
                    test_id=test.id,
                    status="completed",
                    consistency_score=0.8 + (i * 0.05),
                    completed_at=datetime.now(timezone.utc) - timedelta(days=i),
                )
                db.session.add(result)
            db.session.commit()

        response = client.get(url("?days=7"))
        assert response.status_code == 200
        data = response.get_json()

        trends = data["charts"]["consistency_trends"]
        assert len(trends) == 7
        assert all("date" in t for t in trends)
        assert all("avg_consistency" in t for t in trends)
        assert all("test_count" in t for t in trends)

    def test_activity_heatmap_data(self, client, auth_researcher, app):
        """Test activity heatmap data generation"""
        with app.app_context():
            participant = Participant(
                name="Activity User",
                email="activity@test.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()

            test = Test(name="Activity Test", synesthesia_type="Color")
            db.session.add(test)
            db.session.commit()

            # Create test results over time
            for i in range(10):
                result = TestResult(
                    participant_id=participant.id,
                    test_id=test.id,
                    status="completed",
                    completed_at=datetime.now(timezone.utc) - timedelta(days=i),
                )
                db.session.add(result)
            db.session.commit()

        response = client.get(url(""))
        assert response.status_code == 200
        data = response.get_json()

        heatmap = data["charts"]["activity_heatmap"]
        assert len(heatmap) == 49  # 7 weeks * 7 days
        assert all(isinstance(v, int) for v in heatmap)

    def test_completion_trends_chart_data(self, client, auth_researcher, app):
        """Test completion trends chart data"""
        with app.app_context():
            participant = Participant(
                name="Completion Trend",
                email="comptrend@test.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()

            test = Test(name="Trend Test", synesthesia_type="Color")
            db.session.add(test)
            db.session.commit()

            # Create test results
            for i in range(3):
                result = TestResult(
                    participant_id=participant.id,
                    test_id=test.id,
                    status="completed" if i < 2 else "in_progress",
                    started_at=datetime.now(timezone.utc) - timedelta(days=i),
                    completed_at=datetime.now(timezone.utc) - timedelta(days=i) if i < 2 else None,
                )
                db.session.add(result)
            db.session.commit()

        response = client.get(url("?days=7"))
        assert response.status_code == 200
        data = response.get_json()

        trends = data["charts"]["completion_trends"]
        assert len(trends) == 7
        assert all("date" in t for t in trends)
        assert all("completion_rate" in t for t in trends)
        assert all("completed" in t for t in trends)
        assert all("total" in t for t in trends)


class TestResearcherDashboardEdgeCases:
    """Test edge cases and error handling"""

    def test_dashboard_with_no_data(self, client, auth_researcher):
        """Test dashboard handles empty database gracefully"""
        response = client.get(url(""))
        assert response.status_code == 200
        data = response.get_json()

        assert data["summary"]["total_participants"] == 0
        assert data["insights"]["completion_rate"] == 0

    def test_dashboard_with_zero_consistency_scores(self, client, auth_researcher, app):
        """Test dashboard handles participants with no consistency scores"""
        with app.app_context():
            participant = Participant(
                name="No Score",
                email="noscore@test.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()

        response = client.get(url(""))
        assert response.status_code == 200
        data = response.get_json()

        # Should not crash, avg_consistency_score should be None or 0
        assert "avg_consistency_score" in data["insights"]

    def test_dashboard_trend_calculation_with_insufficient_data(self, client, auth_researcher):
        """Test trend calculations with minimal data"""
        response = client.get(url("?days=1"))
        assert response.status_code == 200
        data = response.get_json()

        # Should handle single day gracefully
        assert "consistency_trend_percentage" in data["insights"]
        assert "completion_trend_percentage" in data["insights"]

    def test_search_with_special_characters(self, client, auth_researcher, app):
        """Test search handles special characters"""
        with app.app_context():
            participant = Participant(
                name="Test & User",
                email="test&user@example.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()

        response = client.get(url("/participants?search=Test"))
        assert response.status_code == 200
        data = response.get_json()
        # Should not crash

    def test_export_with_no_data(self, client, auth_researcher):
        """Test export handles empty data"""
        response = client.get(url("/export?format=csv&type=participants"))
        assert response.status_code == 200
        # Should return empty CSV with headers

    def test_detail_with_no_test_results(self, client, auth_researcher, app):
        """Test detail with participant having no test results"""
        with app.app_context():
            participant = Participant(
                name="No Tests",
                email="notests@test.com",
                password_hash="hash",
            )
            db.session.add(participant)
            db.session.commit()
            participant_id = participant.id  # Store ID before leaving context

        response = client.get(url(f"/participants/{participant_id}"))
        assert response.status_code == 200
        data = response.get_json()

        assert len(data["test_results"]) == 0
        assert data["statistics"]["total_tests"] == 0

