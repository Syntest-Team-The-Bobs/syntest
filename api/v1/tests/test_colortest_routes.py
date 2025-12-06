"""
Tests for Color Test API endpoints
Tests cover: authentication, trial saving, batch operations, error handling
Target: 95%+ branch coverage for colortest.py
"""

from models import db, ColorTrial
from datetime import datetime, timezone


class TestSaveColorTrial:
    """Test suite for POST /api/v1/color-test/trial endpoint"""

    def test_save_trial_success(self, client, auth_participant):
        """Test successful trial save with all required fields"""
        trial_data = {
            "trial_index": 1,
            "selected_r": 255,
            "selected_g": 100,
            "selected_b": 50,
            "response_ms": 1200,
            "meta_json": {"test_type": "letter", "stimulus": "A", "device": "desktop"},
        }

        response = client.post("/api/v1/color-test/trial", json=trial_data)

        assert response.status_code == 201
        data = response.get_json()
        assert data["success"] is True
        assert "trial_id" in data
        assert data["trial"]["trial_index"] == 1
        assert data["trial"]["selected_r"] == 255

        # Verify database record - using db.session.get instead of query.get
        trial = db.session.get(ColorTrial, data["trial_id"])
        assert trial is not None
        assert trial.selected_r == 255
        assert trial.response_ms == 1200

    def test_save_trial_minimal_data(self, client, auth_participant):
        """Test trial save with only required fields"""
        trial_data = {"selected_r": 128, "selected_g": 64, "selected_b": 32}

        response = client.post("/api/v1/color-test/trial", json=trial_data)

        assert response.status_code == 201
        data = response.get_json()
        assert data["success"] is True

        # Verify optional fields are None
        trial = db.session.get(ColorTrial, data["trial_id"])
        assert trial.trial_index is None
        assert trial.response_ms is None

    def test_save_trial_with_meta_json(self, client, auth_participant):
        """Test trial save with complex meta_json"""
        trial_data = {
            "trial_index": 5,
            "selected_r": 200,
            "selected_g": 150,
            "selected_b": 100,
            "response_ms": 950,
            "meta_json": {
                "test_type": "music",
                "stimulus_type": "note",
                "stimulus": "C#",
                "browser": "Chrome",
                "screen_width": 1920,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        }

        response = client.post("/api/v1/color-test/trial", json=trial_data)

        assert response.status_code == 201
        data = response.get_json()
        trial = db.session.get(ColorTrial, data["trial_id"])
        assert trial.meta_json["test_type"] == "music"
        assert trial.meta_json["stimulus"] == "C#"

    def test_save_trial_unauthenticated(self, client):
        """Test trial save fails without authentication"""
        trial_data = {"selected_r": 100, "selected_g": 100, "selected_b": 100}

        response = client.post("/api/v1/color-test/trial", json=trial_data)

        assert response.status_code == 401
        data = response.get_json()
        assert "error" in data
        assert data["error"] == "Not authenticated"

    def test_save_trial_invalid_participant(self, client, app):
        """Test trial save with invalid participant ID in session"""
        with client.session_transaction() as sess:
            sess["user_id"] = 99999  # Non-existent participant
            sess["user_role"] = "participant"

        trial_data = {"selected_r": 100, "selected_g": 100, "selected_b": 100}

        response = client.post("/api/v1/color-test/trial", json=trial_data)

        assert response.status_code == 404
        data = response.get_json()
        assert data["error"] == "Participant not found"

    def test_save_trial_empty_json(self, client, auth_participant):
        """Test trial save with empty JSON body"""
        response = client.post("/api/v1/color-test/trial", json={})

        assert response.status_code == 201  # Should succeed with None values
        data = response.get_json()
        trial = db.session.get(ColorTrial, data["trial_id"])
        assert trial.selected_r is None

    def test_save_trial_invalid_json(self, client, auth_participant):
        """Test trial save with malformed JSON"""
        response = client.post(
            "/api/v1/color-test/trial",
            data="invalid json",
            content_type="application/json",
        )

        assert response.status_code == 400 or response.status_code == 500

    def test_save_trial_boundary_rgb_values(self, client, auth_participant):
        """Test trial save with boundary RGB values (0 and 255)"""
        trial_data = {"selected_r": 0, "selected_g": 255, "selected_b": 128}

        response = client.post("/api/v1/color-test/trial", json=trial_data)

        assert response.status_code == 201
        data = response.get_json()
        trial = db.session.get(ColorTrial, data["trial_id"])
        assert trial.selected_r == 0
        assert trial.selected_g == 255


class TestSaveColorTrialsBatch:
    """Test suite for POST /api/v1/color-test/batch endpoint"""

    def test_batch_save_multiple_trials(self, client, auth_participant):
        """Test saving multiple trials in one request"""
        batch_data = {
            "trials": [
                {
                    "trial_index": 1,
                    "selected_r": 255,
                    "selected_g": 0,
                    "selected_b": 0,
                    "response_ms": 1100,
                    "meta_json": {"stimulus": "A"},
                },
                {
                    "trial_index": 2,
                    "selected_r": 0,
                    "selected_g": 255,
                    "selected_b": 0,
                    "response_ms": 950,
                    "meta_json": {"stimulus": "B"},
                },
                {
                    "trial_index": 3,
                    "selected_r": 0,
                    "selected_g": 0,
                    "selected_b": 255,
                    "response_ms": 1250,
                    "meta_json": {"stimulus": "C"},
                },
            ]
        }

        response = client.post("/api/v1/color-test/batch", json=batch_data)

        assert response.status_code == 201
        data = response.get_json()
        assert data["success"] is True
        assert data["count"] == 3
        assert len(data["trial_ids"]) == 3

        # Verify all trials in database
        trials = ColorTrial.query.filter(ColorTrial.id.in_(data["trial_ids"])).all()
        assert len(trials) == 3

    def test_batch_save_empty_list(self, client, auth_participant):
        """Test batch save with empty trials list"""
        batch_data = {"trials": []}

        response = client.post("/api/v1/color-test/batch", json=batch_data)

        assert response.status_code == 201
        data = response.get_json()
        assert data["count"] == 0
        assert len(data["trial_ids"]) == 0

    def test_batch_save_single_trial(self, client, auth_participant):
        """Test batch endpoint with single trial"""
        batch_data = {
            "trials": [{"selected_r": 128, "selected_g": 128, "selected_b": 128}]
        }

        response = client.post("/api/v1/color-test/batch", json=batch_data)

        assert response.status_code == 201
        data = response.get_json()
        assert data["count"] == 1

    def test_batch_save_unauthenticated(self, client):
        """Test batch save fails without authentication"""
        batch_data = {
            "trials": [{"selected_r": 100, "selected_g": 100, "selected_b": 100}]
        }

        response = client.post("/api/v1/color-test/batch", json=batch_data)

        assert response.status_code == 401
        assert "error" in response.get_json()

    def test_batch_save_large_batch(self, client, auth_participant):
        """Test batch save with many trials (stress test)"""
        trials = [
            {
                "trial_index": i,
                "selected_r": (i * 10) % 256,
                "selected_g": (i * 20) % 256,
                "selected_b": (i * 30) % 256,
                "response_ms": 800 + (i * 50),
            }
            for i in range(50)  # 50 trials
        ]
        batch_data = {"trials": trials}

        response = client.post("/api/v1/color-test/batch", json=batch_data)

        assert response.status_code == 201
        data = response.get_json()
        assert data["count"] == 50

    def test_batch_save_invalid_participant(self, client):
        """Test batch save with invalid participant ID"""
        with client.session_transaction() as sess:
            sess["user_id"] = 99999  # Non-existent participant
            sess["user_role"] = "participant"

        batch_data = {
            "trials": [{"selected_r": 100, "selected_g": 100, "selected_b": 100}]
        }

        response = client.post("/api/v1/color-test/batch", json=batch_data)

        assert response.status_code == 404
        data = response.get_json()
        assert data["error"] == "Participant not found"


class TestStartTestSession:
    """Test suite for POST /api/v1/color-test/session/start endpoint"""

    def test_start_session_success(self, client, auth_participant, sample_participant):
        """Test successful test session start"""
        session_data = {"test_type": "letter"}

        response = client.post("/api/v1/color-test/session/start", json=session_data)

        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "session" in data
        assert data["session"]["test_type"] == "letter"
        assert data["session"]["participant_id"] == sample_participant.participant_id
        assert "started_at" in data["session"]

    def test_start_session_different_test_types(self, client, auth_participant):
        """Test starting sessions for different test types"""
        test_types = ["letter", "number", "word", "music"]

        for test_type in test_types:
            session_data = {"test_type": test_type}
            response = client.post(
                "/api/v1/color-test/session/start", json=session_data
            )

            assert response.status_code == 200
            data = response.get_json()
            assert data["session"]["test_type"] == test_type

    def test_start_session_no_test_type(self, client, auth_participant):
        """Test session start without test_type"""
        response = client.post("/api/v1/color-test/session/start", json={})

        assert response.status_code == 200
        data = response.get_json()
        assert data["session"]["test_type"] is None

    def test_start_session_unauthenticated(self, client):
        """Test session start fails without authentication"""
        session_data = {"test_type": "letter"}

        response = client.post("/api/v1/color-test/session/start", json=session_data)

        assert response.status_code == 401
        data = response.get_json()
        assert "error" in data

    def test_start_session_invalid_participant(self, client):
        """Test session start with invalid participant"""
        with client.session_transaction() as sess:
            sess["user_id"] = 99999
            sess["user_role"] = "participant"

        session_data = {"test_type": "letter"}

        response = client.post("/api/v1/color-test/session/start", json=session_data)

        assert response.status_code == 404
        data = response.get_json()
        assert data["error"] == "Participant not found"


class TestColorTestIntegration:
    """Integration tests for complete color test workflows"""

    def test_complete_letter_test_workflow(self, client, auth_participant):
        """Test complete workflow: start session -> save trials -> verify data"""
        # 1. Start session
        session_response = client.post(
            "/api/v1/color-test/session/start", json={"test_type": "letter"}
        )
        assert session_response.status_code == 200

        # 2. Save individual trials
        letters = ["A", "B", "C", "D", "E"]
        colors = [
            (255, 0, 0),  # Red for A
            (0, 255, 0),  # Green for B
            (0, 0, 255),  # Blue for C
            (255, 255, 0),  # Yellow for D
            (255, 0, 255),  # Magenta for E
        ]

        trial_ids = []
        for idx, (letter, (r, g, b)) in enumerate(zip(letters, colors), 1):
            trial_data = {
                "trial_index": idx,
                "selected_r": r,
                "selected_g": g,
                "selected_b": b,
                "response_ms": 1000 + (idx * 100),
                "meta_json": {"test_type": "letter", "stimulus": letter},
            }
            response = client.post("/api/v1/color-test/trial", json=trial_data)
            assert response.status_code == 201
            trial_ids.append(response.get_json()["trial_id"])

        # 3. Verify all trials saved
        assert len(trial_ids) == 5
        trials = ColorTrial.query.filter(ColorTrial.id.in_(trial_ids)).all()
        assert len(trials) == 5

    def test_music_test_batch_workflow(self, client, auth_participant):
        """Test music test using batch endpoint"""
        # Start session
        client.post("/api/v1/color-test/session/start", json={"test_type": "music"})

        # Create batch of music note trials
        notes = ["C", "D", "E", "F", "G", "A", "B"]
        trials = []
        for idx, note in enumerate(notes, 1):
            trials.append(
                {
                    "trial_index": idx,
                    "selected_r": (idx * 35) % 256,
                    "selected_g": (idx * 70) % 256,
                    "selected_b": (idx * 105) % 256,
                    "response_ms": 800 + (idx * 75),
                    "meta_json": {"test_type": "music", "stimulus": note, "octave": 4},
                }
            )

        response = client.post("/api/v1/color-test/batch", json={"trials": trials})
        assert response.status_code == 201
        assert response.get_json()["count"] == 7


class TestErrorHandling:
    """Test error handling and edge cases"""

    def test_database_rollback_on_error(self, client, auth_participant, monkeypatch):
        """Test database rollback on error"""
        # This would require mocking db.session.commit to raise an exception
        # Simplified version - test that invalid data doesn't persist
        initial_count = ColorTrial.query.count()

        # Try to save with potentially problematic data
        trial_data = {
            "selected_r": "invalid",  # Wrong type
            "selected_g": 100,
            "selected_b": 100,
        }

        response = client.post("/api/v1/color-test/trial", json=trial_data)

        # Should handle error gracefully
        assert response.status_code >= 400

        # Verify no partial data saved
        final_count = ColorTrial.query.count()
        assert final_count == initial_count

    def test_concurrent_trial_saves(self, client, auth_participant):
        """Test multiple trials can be saved concurrently (sequential test)"""
        trial_data = {
            "trial_index": 1,
            "selected_r": 100,
            "selected_g": 150,
            "selected_b": 200,
        }

        # Save same trial data multiple times
        responses = []
        for _ in range(3):
            response = client.post("/api/v1/color-test/trial", json=trial_data)
            responses.append(response)

        # All should succeed and create separate records
        assert all(r.status_code == 201 for r in responses)
        trial_ids = [r.get_json()["trial_id"] for r in responses]
        assert len(set(trial_ids)) == 3  # All unique IDs

    def test_save_trial_exception_handling(self, client, auth_participant, monkeypatch):
        """Test that exceptions in save_color_trial are handled properly"""
        import models

        # Mock db.session.commit to raise an exception
        def mock_commit():
            raise Exception("Database error")

        monkeypatch.setattr(models.db.session, "commit", mock_commit)

        trial_data = {"selected_r": 100, "selected_g": 100, "selected_b": 100}

        response = client.post("/api/v1/color-test/trial", json=trial_data)

        # Should return 500 error
        assert response.status_code == 500
        data = response.get_json()
        assert data["success"] is False

    def test_batch_save_exception_handling(self, client, auth_participant, monkeypatch):
        """Test that exceptions in batch save are handled properly"""
        import models

        # Mock db.session.commit to raise an exception
        def mock_commit():
            raise Exception("Database error")

        monkeypatch.setattr(models.db.session, "commit", mock_commit)

        batch_data = {
            "trials": [{"selected_r": 100, "selected_g": 100, "selected_b": 100}]
        }

        response = client.post("/api/v1/color-test/batch", json=batch_data)

        # Should return 500 error
        assert response.status_code == 500
        data = response.get_json()
        assert data["success"] is False

    def test_start_session_exception_handling(
        self, client, auth_participant, monkeypatch
    ):
        """Test that exceptions in start_test_session are handled properly"""
        import models

        # Mock db.session.get to raise an exception
        def mock_get(model_class, id):
            raise Exception("Database error")

        monkeypatch.setattr(models.db.session, "get", mock_get)

        session_data = {"test_type": "letter"}

        response = client.post("/api/v1/color-test/session/start", json=session_data)

        # Should return 500 error
        assert response.status_code == 500
        data = response.get_json()
        assert data["success"] is False
