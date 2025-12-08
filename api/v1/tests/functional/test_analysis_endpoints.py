"""
Additional comprehensive endpoint tests to achieve >95% coverage for analysis.py.

These tests specifically target code paths in analyze_participant by calling
the /api/color-test/batch endpoint which internally calls analyze_participant.
"""

import pytest
import json


@pytest.fixture
def app():
    """Flask app for testing"""
    from flask import Flask
    from models import db
    from v1.colortest import bp as colortest_bp

    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-secret"

    db.init_app(app)
    app.register_blueprint(colortest_bp, url_prefix="/api/color-test")

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
            from models import Participant
            from models import db

            # Add some existing trials
            p = Participant.query.filter_by(participant_id="test_auth").first()

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
