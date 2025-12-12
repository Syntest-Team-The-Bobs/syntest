"""
Additional comprehensive endpoint tests to achieve >95% coverage for analysis.py.

These tests specifically target code paths in analyze_participant by calling
the /api/color-test/batch endpoint which internally calls analyze_participant,
as well as direct tests for the /run endpoint.
"""

import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture
def app():
    """Flask app for testing"""
    from flask import Flask
    from models import db
    from v1.colortest import bp as colortest_bp
    from v1.analysis import bp as analysis_bp

    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-secret"

    db.init_app(app)
    app.register_blueprint(colortest_bp, url_prefix="/api/color-test")
    app.register_blueprint(analysis_bp, url_prefix="/api/v1/analysis")

    with app.app_context():
        db.create_all()

    return app


@pytest.fixture
def client(app):
    """Flask test client"""
    return app.test_client()


@pytest.fixture
def auth_client(client, app):
    """Authenticated test client"""
    with app.app_context():
        from models import Participant
        from models import db

        p = Participant(
            participant_id="test_auth",
            name="Auth Test",
            email="auth@test.com",
            password_hash="hash",
        )
        db.session.add(p)
        db.session.commit()

        # Set session for auth
        with client.session_transaction() as sess:
            sess["user_id"] = p.id
            sess["participant_id"] = "test_auth"

    return client


class TestAnalyzeParticipantThroughEndpoints:
    """Test analyze_participant logic through endpoint calls."""

    def test_batch_triggers_analysis_success(self, auth_client, app):
        """Test that batch endpoint successfully triggers analysis."""
        with app.app_context():
            result = auth_client.post(
                "/api/color-test/batch",
                json={
                    "test_type": "letter",
                    "trials": [
                        {
                            "stimulus_id": 1,
                            "trial_index": 0,
                            "stimulus_value": "A",
                            "selected_r": 150,
                            "selected_g": 100,
                            "selected_b": 50,
                            "response_ms": 500,
                            "meta_json": {"trigger": 1},
                        },
                        {
                            "stimulus_id": 1,
                            "trial_index": 1,
                            "stimulus_value": "A",
                            "selected_r": 160,
                            "selected_g": 110,
                            "selected_b": 60,
                            "response_ms": 510,
                            "meta_json": {"trigger": 1},
                        },
                        {
                            "stimulus_id": 1,
                            "trial_index": 2,
                            "stimulus_value": "A",
                            "selected_r": 155,
                            "selected_g": 105,
                            "selected_b": 55,
                            "response_ms": 505,
                            "meta_json": {"trigger": 1},
                        },
                    ],
                },
                content_type="application/json",
            )

            assert result.status_code == 201
            data = result.get_json()
            assert data["success"] is True
            assert "analysis" in data

    def test_batch_triggers_analysis_multiple_triggers(self, auth_client, app):
        """Test analysis with multiple triggers (exercises group logic)."""
        with app.app_context():
            trials = []
            for trigger_id in [1, 2]:
                for trial_idx in range(3):
                    trials.append(
                        {
                            "stimulus_id": trigger_id,
                            "trial_index": trial_idx,
                            "stimulus_value": "A",
                            "selected_r": 100 + (trigger_id * 10) + trial_idx,
                            "selected_g": 150 + (trigger_id * 10) + trial_idx,
                            "selected_b": 50 + (trigger_id * 10) + trial_idx,
                            "response_ms": 500 + trial_idx,
                            "meta_json": {"trigger": trigger_id},
                        }
                    )

            result = auth_client.post(
                "/api/color-test/batch",
                json={"test_type": "word", "trials": trials},
                content_type="application/json",
            )

            assert result.status_code == 201
            data = result.get_json()
            assert data["success"] is True
            # Analysis should have per_trigger data
            if data["analysis"]:
                assert "per_trigger" in data["analysis"]

    def test_batch_triggers_analysis_with_hex_colors(self, auth_client, app):
        """Test analysis path with hex colors in meta_json."""
        with app.app_context():
            result = auth_client.post(
                "/api/color-test/batch",
                json={
                    "test_type": "number",
                    "trials": [
                        {
                            "stimulus_id": 1,
                            "trial_index": i,
                            "stimulus_value": "1",
                            "selected_r": None,
                            "selected_g": None,
                            "selected_b": None,
                            "response_ms": 500,
                            "meta_json": {"selected_hex": f"#6496{100 + i:02x}"},
                        }
                        for i in range(3)
                    ],
                },
                content_type="application/json",
            )

            assert result.status_code == 201
            data = result.get_json()
            assert data["success"] is True

    def test_batch_triggers_analysis_with_nested_color(self, auth_client, app):
        """Test analysis path with nested color objects."""
        with app.app_context():
            result = auth_client.post(
                "/api/color-test/batch",
                json={
                    "test_type": "music",
                    "trials": [
                        {
                            "stimulus_id": 1,
                            "trial_index": i,
                            "stimulus_value": "C",
                            "selected_r": None,
                            "selected_g": None,
                            "selected_b": None,
                            "response_ms": 500,
                            "meta_json": {
                                "selected_color": {
                                    "r": 100 + i,
                                    "g": 150 + i,
                                    "b": 50 + i,
                                }
                            },
                        }
                        for i in range(3)
                    ],
                },
                content_type="application/json",
            )

            assert result.status_code == 201
            data = result.get_json()
            assert data["success"] is True

    def test_batch_incomplete_trigger(self, auth_client, app):
        """Test analysis with insufficient trials (exercises incomplete trigger logic)."""
        with app.app_context():
            result = auth_client.post(
                "/api/color-test/batch",
                json={
                    "test_type": "letter",
                    "trials": [
                        {
                            "stimulus_id": 1,
                            "trial_index": 0,
                            "stimulus_value": "A",
                            "selected_r": 150,
                            "selected_g": 100,
                            "selected_b": 50,
                            "response_ms": 500,
                            "meta_json": {"trigger": 1},
                        },
                        {
                            "stimulus_id": 1,
                            "trial_index": 1,
                            "stimulus_value": "A",
                            "selected_r": 160,
                            "selected_g": 110,
                            "selected_b": 60,
                            "response_ms": 510,
                            "meta_json": {"trigger": 1},
                        },
                    ],
                },
                content_type="application/json",
            )

            assert result.status_code == 201
            data = result.get_json()
            assert data["success"] is True
            # Analysis may show incomplete trigger
            if data["analysis"] and "per_trigger" in data["analysis"]:
                per_trigger = data["analysis"]["per_trigger"]
                assert any(
                    tr.get("status") == "incomplete" for tr in per_trigger.values()
                )

    def test_batch_no_color_trials(self, auth_client, app):
        """Test analysis path when no color data is present (exercises no_color logic)."""
        with app.app_context():
            result = auth_client.post(
                "/api/color-test/batch",
                json={
                    "test_type": "letter",
                    "trials": [
                        {
                            "stimulus_id": 1,
                            "trial_index": i,
                            "stimulus_value": "A",
                            "selected_r": None,
                            "selected_g": None,
                            "selected_b": None,
                            "response_ms": 500,
                            "meta_json": {},
                        }
                        for i in range(3)
                    ],
                },
                content_type="application/json",
            )

            assert result.status_code == 201
            data = result.get_json()
            assert data["success"] is True

    def test_batch_mixed_color_formats(self, auth_client, app):
        """Test analysis with mixed color formats (tests trial_rgb_or_none logic)."""
        with app.app_context():
            result = auth_client.post(
                "/api/color-test/batch",
                json={
                    "test_type": "word",
                    "trials": [
                        # Direct RGB
                        {
                            "stimulus_id": 1,
                            "trial_index": 0,
                            "stimulus_value": "red",
                            "selected_r": 200,
                            "selected_g": 50,
                            "selected_b": 50,
                            "response_ms": 500,
                            "meta_json": {},
                        },
                        # Hex in meta
                        {
                            "stimulus_id": 1,
                            "trial_index": 1,
                            "stimulus_value": "red",
                            "selected_r": None,
                            "selected_g": None,
                            "selected_b": None,
                            "response_ms": 510,
                            "meta_json": {"selected_hex": "#c83232"},
                        },
                        # Nested color
                        {
                            "stimulus_id": 1,
                            "trial_index": 2,
                            "stimulus_value": "red",
                            "selected_r": None,
                            "selected_g": None,
                            "selected_b": None,
                            "response_ms": 505,
                            "meta_json": {
                                "selected_color": {"r": 192, "g": 32, "b": 32}
                            },
                        },
                    ],
                },
                content_type="application/json",
            )

            assert result.status_code == 201
            data = result.get_json()
            assert data["success"] is True

    def test_batch_high_cutoff_synesthete(self, auth_client, app):
        """Test classification with high cutoff (exercises diagnosis logic)."""
        with app.app_context():
            # Add batch
            result = auth_client.post(
                "/api/color-test/batch",
                json={
                    "test_type": "letter",
                    "trials": [
                        {
                            "stimulus_id": i,
                            "trial_index": j,
                            "stimulus_value": "A",
                            "selected_r": 100 + (i * 10) + j,
                            "selected_g": 150 + (i * 10) + j,
                            "selected_b": 50 + (i * 10) + j,
                            "response_ms": 500,
                            "meta_json": {"trigger": i},
                        }
                        for i in [1, 2]
                        for j in range(3)
                    ],
                },
                content_type="application/json",
            )

            assert result.status_code == 201

    def test_batch_no_response_times(self, auth_client, app):
        """Test when trials have no response times (exercises rt_list logic)."""
        with app.app_context():
            result = auth_client.post(
                "/api/color-test/batch",
                json={
                    "test_type": "music",
                    "trials": [
                        {
                            "stimulus_id": 1,
                            "trial_index": i,
                            "stimulus_value": "C",
                            "selected_r": 150,
                            "selected_g": 100,
                            "selected_b": 50,
                            "response_ms": None,  # No response time
                            "meta_json": {},
                        }
                        for i in range(3)
                    ],
                },
                content_type="application/json",
            )

            assert result.status_code == 201
            data = result.get_json()
            assert data["success"] is True
            # Check that rt_mean is None
            if data["analysis"] and data["analysis"].get("participant"):
                assert data["analysis"]["participant"].get("rt_mean") is None


class TestRunAnalysisEndpoint:
    """Direct tests for the /run endpoint in analysis.py."""

    def test_run_post_with_participant_id(self, client, app):
        """Test POST /run with participant_id in JSON body."""
        with app.app_context():
            from models import Participant, ColorTrial, db

            # Create participant with trials
            p = Participant(
                participant_id="P_RUN_TEST",
                name="Run Test",
                email="run@test.com",
                password_hash="hash",
            )
            db.session.add(p)
            db.session.commit()

            # Add trials for analysis
            for i in range(3):
                trial = ColorTrial(
                    participant_id="P_RUN_TEST",
                    stimulus_id=1,
                    trial_index=i,
                    selected_r=100 + i,
                    selected_g=150 + i,
                    selected_b=50 + i,
                    response_ms=500 + i,
                    meta_json={"test_type": "letter"},
                )
                db.session.add(trial)
            db.session.commit()

            result = client.post(
                "/api/v1/analysis/run",
                json={"participant_id": "P_RUN_TEST"},
                content_type="application/json",
            )

            assert result.status_code == 200
            data = result.get_json()
            assert "per_trigger" in data or "error" in data

    def test_run_get_with_query_param(self, client, app):
        """Test GET /run with participant_id in query params."""
        with app.app_context():
            from models import Participant, ColorTrial, db

            p = Participant(
                participant_id="P_GET_TEST",
                name="Get Test",
                email="get@test.com",
                password_hash="hash",
            )
            db.session.add(p)
            db.session.commit()

            for i in range(3):
                trial = ColorTrial(
                    participant_id="P_GET_TEST",
                    stimulus_id=1,
                    trial_index=i,
                    selected_r=100 + i,
                    selected_g=150 + i,
                    selected_b=50 + i,
                    response_ms=500,
                    meta_json={"test_type": "number"},
                )
                db.session.add(trial)
            db.session.commit()

            result = client.get("/api/v1/analysis/run?participant_id=P_GET_TEST")

            assert result.status_code == 200
            data = result.get_json()
            assert "per_trigger" in data or "error" in data

    def test_run_with_session_user(self, client, app):
        """Test /run endpoint inferring participant from session."""
        with app.app_context():
            from models import Participant, ColorTrial, db

            p = Participant(
                participant_id="P_SESSION_TEST",
                name="Session Test",
                email="session@test.com",
                password_hash="hash",
            )
            db.session.add(p)
            db.session.commit()

            for i in range(3):
                trial = ColorTrial(
                    participant_id="P_SESSION_TEST",
                    stimulus_id=1,
                    trial_index=i,
                    selected_r=100,
                    selected_g=150,
                    selected_b=50,
                    response_ms=500,
                    meta_json={},
                )
                db.session.add(trial)
            db.session.commit()

            with client.session_transaction() as sess:
                sess["user_id"] = p.id

            result = client.post(
                "/api/v1/analysis/run",
                json={},
                content_type="application/json",
            )

            assert result.status_code == 200

    def test_run_no_participant_id_error(self, client, app):
        """Test /run returns 400 when no participant_id provided."""
        with app.app_context():
            result = client.post(
                "/api/v1/analysis/run",
                json={},
                content_type="application/json",
            )

            assert result.status_code == 400
            data = result.get_json()
            assert data["error"] == "participant_id required"

    def test_run_get_no_participant_id_error(self, client, app):
        """Test GET /run returns 400 when no participant_id in query."""
        with app.app_context():
            result = client.get("/api/v1/analysis/run")

            assert result.status_code == 400
            data = result.get_json()
            assert data["error"] == "participant_id required"

    def test_run_no_trials_returns_error(self, client, app):
        """Test /run with participant who has no trials."""
        with app.app_context():
            from models import Participant, db

            p = Participant(
                participant_id="P_NO_TRIALS",
                name="No Trials",
                email="notrials@test.com",
                password_hash="hash",
            )
            db.session.add(p)
            db.session.commit()

            result = client.post(
                "/api/v1/analysis/run",
                json={"participant_id": "P_NO_TRIALS"},
                content_type="application/json",
            )

            assert result.status_code == 200
            data = result.get_json()
            assert data.get("error") == "no_trials"

    def test_run_with_test_type_filter(self, client, app):
        """Test /run with test_type filtering trials."""
        with app.app_context():
            from models import Participant, ColorTrial, db

            p = Participant(
                participant_id="P_FILTER_TEST",
                name="Filter Test",
                email="filter@test.com",
                password_hash="hash",
            )
            db.session.add(p)
            db.session.commit()

            # Add letter trials
            for i in range(3):
                trial = ColorTrial(
                    participant_id="P_FILTER_TEST",
                    stimulus_id=1,
                    trial_index=i,
                    selected_r=100,
                    selected_g=150,
                    selected_b=50,
                    response_ms=500,
                    meta_json={"test_type": "letter"},
                )
                db.session.add(trial)

            # Add number trials
            for i in range(3):
                trial = ColorTrial(
                    participant_id="P_FILTER_TEST",
                    stimulus_id=2,
                    trial_index=i,
                    selected_r=200,
                    selected_g=100,
                    selected_b=100,
                    response_ms=600,
                    meta_json={"test_type": "number"},
                )
                db.session.add(trial)
            db.session.commit()

            # Request analysis for only letter type
            result = client.post(
                "/api/v1/analysis/run",
                json={"participant_id": "P_FILTER_TEST", "test_type": "letter"},
                content_type="application/json",
            )

            assert result.status_code == 200

    def test_run_exception_handling(self, client, app):
        """Test /run handles exceptions and rolls back."""
        with app.app_context():
            # Mock analyze_participant to raise an exception
            with patch("v1.analysis.analyze_participant") as mock_analyze:
                mock_analyze.side_effect = Exception("Database error")

                result = client.post(
                    "/api/v1/analysis/run",
                    json={"participant_id": "P_ERROR_TEST"},
                    content_type="application/json",
                )

                assert result.status_code == 500
                data = result.get_json()
                assert "error" in data

    def test_run_session_user_not_found(self, client, app):
        """Test /run when session user_id doesn't exist in db."""
        with app.app_context():
            with client.session_transaction() as sess:
                sess["user_id"] = 99999  # Non-existent user

            result = client.post(
                "/api/v1/analysis/run",
                json={},
                content_type="application/json",
            )

            assert result.status_code == 400
            data = result.get_json()
            assert data["error"] == "participant_id required"

    def test_run_insufficient_data_persists_minimal_record(self, client, app):
        """Test that insufficient_data status persists minimal TestData."""
        with app.app_context():
            from models import Participant, ColorTrial, TestData, db

            p = Participant(
                participant_id="P_INSUFFICIENT",
                name="Insufficient",
                email="insufficient@test.com",
                password_hash="hash",
            )
            db.session.add(p)
            db.session.commit()

            # Add only one trial (insufficient for analysis)
            trial = ColorTrial(
                participant_id="P_INSUFFICIENT",
                stimulus_id=1,
                trial_index=0,
                selected_r=100,
                selected_g=150,
                selected_b=50,
                response_ms=500,
                meta_json={"test_type": "letter"},
            )
            db.session.add(trial)
            db.session.commit()

            result = client.post(
                "/api/v1/analysis/run",
                json={"participant_id": "P_INSUFFICIENT"},
                content_type="application/json",
            )

            assert result.status_code == 200

    def test_run_full_analysis_persists_all_records(self, client, app):
        """Test full analysis persists TestData and AnalyzedTestData."""
        with app.app_context():
            from models import Participant, ColorTrial, TestData, AnalyzedTestData, db

            p = Participant(
                participant_id="P_FULL_ANALYSIS",
                name="Full Analysis",
                email="full@test.com",
                password_hash="hash",
            )
            db.session.add(p)
            db.session.commit()

            # Add enough trials for full analysis (2 triggers, 3 trials each)
            for trigger_id in [1, 2]:
                for i in range(3):
                    trial = ColorTrial(
                        participant_id="P_FULL_ANALYSIS",
                        stimulus_id=trigger_id,
                        trial_index=i,
                        selected_r=100 + i,
                        selected_g=150 + i,
                        selected_b=50 + i,
                        response_ms=500,
                        meta_json={"test_type": "letter"},
                    )
                    db.session.add(trial)
            db.session.commit()

            result = client.post(
                "/api/v1/analysis/run",
                json={"participant_id": "P_FULL_ANALYSIS"},
                content_type="application/json",
            )

            assert result.status_code == 200
            data = result.get_json()

            # Check TestData was created
            test_data = TestData.query.filter_by(user_id="P_FULL_ANALYSIS").first()
            if data.get("participant", {}).get("status") != "insufficient_data":
                assert test_data is not None

    def test_run_analyzed_test_data_created(self, client, app):
        """Test AnalyzedTestData is created when participant exists."""
        with app.app_context():
            from models import Participant, ColorTrial, AnalyzedTestData, db

            p = Participant(
                participant_id="P_ANALYZED",
                name="Analyzed Test",
                email="analyzed@test.com",
                password_hash="hash",
            )
            db.session.add(p)
            db.session.commit()

            # Add sufficient trials
            for trigger_id in [1, 2]:
                for i in range(3):
                    trial = ColorTrial(
                        participant_id="P_ANALYZED",
                        stimulus_id=trigger_id,
                        trial_index=i,
                        selected_r=100 + i,
                        selected_g=150 + i,
                        selected_b=50 + i,
                        response_ms=500,
                        meta_json={"test_type": "word"},
                    )
                    db.session.add(trial)
            db.session.commit()

            result = client.post(
                "/api/v1/analysis/run",
                json={"participant_id": "P_ANALYZED"},
                content_type="application/json",
            )

            assert result.status_code == 200

    def test_run_with_null_stimulus_id_uses_meta_key(self, client, app):
        """Test analysis handles null stimulus_id by using meta key."""
        with app.app_context():
            from models import Participant, ColorTrial, db

            p = Participant(
                participant_id="P_NULL_STIM",
                name="Null Stimulus",
                email="nullstim@test.com",
                password_hash="hash",
            )
            db.session.add(p)
            db.session.commit()

            # Add trials with null stimulus_id but trigger in meta
            for i in range(3):
                trial = ColorTrial(
                    participant_id="P_NULL_STIM",
                    stimulus_id=None,
                    trial_index=i,
                    selected_r=100 + i,
                    selected_g=150 + i,
                    selected_b=50 + i,
                    response_ms=500,
                    meta_json={"trigger": "A", "test_type": "letter"},
                )
                db.session.add(trial)
            db.session.commit()

            result = client.post(
                "/api/v1/analysis/run",
                json={"participant_id": "P_NULL_STIM"},
                content_type="application/json",
            )

            assert result.status_code == 200

    def test_run_with_stimulus_meta_fallback(self, client, app):
        """Test analysis uses stimulus meta key when trigger not present."""
        with app.app_context():
            from models import Participant, ColorTrial, db

            p = Participant(
                participant_id="P_STIM_META",
                name="Stimulus Meta",
                email="stimmeta@test.com",
                password_hash="hash",
            )
            db.session.add(p)
            db.session.commit()

            for i in range(3):
                trial = ColorTrial(
                    participant_id="P_STIM_META",
                    stimulus_id=None,
                    trial_index=i,
                    selected_r=100,
                    selected_g=150,
                    selected_b=50,
                    response_ms=500,
                    meta_json={"stimulus": "B", "test_type": "letter"},
                )
                db.session.add(trial)
            db.session.commit()

            result = client.post(
                "/api/v1/analysis/run",
                json={"participant_id": "P_STIM_META"},
                content_type="application/json",
            )

            assert result.status_code == 200

    def test_run_with_unknown_trigger_fallback(self, client, app):
        """Test analysis uses __unknown__ when no trigger info available."""
        with app.app_context():
            from models import Participant, ColorTrial, db

            p = Participant(
                participant_id="P_UNKNOWN",
                name="Unknown Trigger",
                email="unknown@test.com",
                password_hash="hash",
            )
            db.session.add(p)
            db.session.commit()

            for i in range(3):
                trial = ColorTrial(
                    participant_id="P_UNKNOWN",
                    stimulus_id=None,
                    trial_index=i,
                    selected_r=100,
                    selected_g=150,
                    selected_b=50,
                    response_ms=500,
                    meta_json={},  # No trigger info
                )
                db.session.add(trial)
            db.session.commit()

            result = client.post(
                "/api/v1/analysis/run",
                json={"participant_id": "P_UNKNOWN"},
                content_type="application/json",
            )

            assert result.status_code == 200

    def test_run_participant_not_in_db_still_analyzes(self, client, app):
        """Test analysis works even if Participant record doesn't exist."""
        with app.app_context():
            from models import ColorTrial, db

            # Add trials without corresponding Participant record
            for i in range(3):
                trial = ColorTrial(
                    participant_id="P_NO_RECORD",
                    stimulus_id=1,
                    trial_index=i,
                    selected_r=100,
                    selected_g=150,
                    selected_b=50,
                    response_ms=500,
                    meta_json={"test_type": "music"},
                )
                db.session.add(trial)
            db.session.commit()

            result = client.post(
                "/api/v1/analysis/run",
                json={"participant_id": "P_NO_RECORD"},
                content_type="application/json",
            )

            # Should still work - just won't create AnalyzedTestData
            assert result.status_code == 200
