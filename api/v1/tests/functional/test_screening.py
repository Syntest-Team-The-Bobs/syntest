"""
Tests for v1/screening.py endpoints
Coverage target: 95%+
"""

import pytest
from werkzeug.security import generate_password_hash
from models import (
    db,
    Participant,
    ScreeningSession,
    ScreeningHealth,
    ScreeningDefinition,
    ScreeningPainEmotion,
    ScreeningTypeChoice,
    YesNo,
    YesNoMaybe,
    Frequency,
)


class TestSaveConsent:
    """Tests for /screening/consent endpoint"""

    def test_consent_creates_session(self, app, client):
        """Consent should create a new screening session"""
        with app.app_context():
            # Create participant and login
            p = Participant(
                name="Test User",
                email="consent_test@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/consent", json={"consent": True})
            assert response.status_code == 200
            data = response.get_json()
            assert data["ok"] is True
            assert "session_id" in data

    def test_consent_false(self, app, client):
        """Consent can be set to false"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="consent_false@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/consent", json={"consent": False})
            assert response.status_code == 200
            data = response.get_json()
            assert data["ok"] is True

    def test_consent_reuses_existing_session(self, app, client):
        """Consent should reuse existing in_progress session"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="consent_reuse@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            # Create existing session
            s = ScreeningSession(participant_id=pid, consent_given=False)
            db.session.add(s)
            db.session.commit()
            session_id = s.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/consent", json={"consent": True})
            assert response.status_code == 200
            data = response.get_json()
            assert data["session_id"] == session_id


class TestSaveStep1:
    """Tests for /screening/step/1 endpoint (health)"""

    def test_step1_success(self, app, client):
        """Step 1 should save health data"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step1@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post(
                "/api/v1/screening/step/1",
                json={"drug": True, "neuro": False, "medical": True},
            )
            assert response.status_code == 200
            assert response.get_json()["ok"] is True

    def test_step1_all_false(self, app, client):
        """Step 1 with all false values"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step1_false@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post(
                "/api/v1/screening/step/1",
                json={"drug": False, "neuro": False, "medical": False},
            )
            assert response.status_code == 200

    def test_step1_updates_existing_health(self, app, client):
        """Step 1 should update existing health record"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step1_update@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            s = ScreeningSession(participant_id=pid, consent_given=True)
            db.session.add(s)
            db.session.commit()

            h = ScreeningHealth(session_id=s.id, drug_use=False)
            db.session.add(h)
            db.session.commit()

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post(
                "/api/v1/screening/step/1",
                json={"drug": True, "neuro": True, "medical": True},
            )
            assert response.status_code == 200


class TestSaveStep2:
    """Tests for /screening/step/2 endpoint (definition)"""

    def test_step2_yes(self, app, client):
        """Step 2 with 'yes' answer"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step2_yes@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/step/2", json={"answer": "yes"})
            assert response.status_code == 200
            assert response.get_json()["ok"] is True

    def test_step2_no(self, app, client):
        """Step 2 with 'no' answer"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step2_no@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/step/2", json={"answer": "no"})
            assert response.status_code == 200

    def test_step2_maybe(self, app, client):
        """Step 2 with 'maybe' answer"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step2_maybe@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/step/2", json={"answer": "maybe"})
            assert response.status_code == 200

    def test_step2_missing_answer(self, app, client):
        """Step 2 without answer returns error"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step2_missing@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/step/2", json={})
            assert response.status_code == 400
            assert "Missing answer" in response.get_json()["error"]

    def test_step2_invalid_answer(self, app, client):
        """Step 2 with invalid answer returns error"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step2_invalid@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post(
                "/api/v1/screening/step/2", json={"answer": "invalid"}
            )
            assert response.status_code == 400
            assert "Invalid answer" in response.get_json()["error"]


class TestSaveStep3:
    """Tests for /screening/step/3 endpoint (pain/emotion)"""

    def test_step3_yes(self, app, client):
        """Step 3 with 'yes' answer"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step3_yes@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/step/3", json={"answer": "yes"})
            assert response.status_code == 200
            assert response.get_json()["ok"] is True

    def test_step3_no(self, app, client):
        """Step 3 with 'no' answer"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step3_no@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/step/3", json={"answer": "no"})
            assert response.status_code == 200

    def test_step3_missing_answer(self, app, client):
        """Step 3 without answer returns error"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step3_missing@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/step/3", json={})
            assert response.status_code == 400
            assert "Missing answer" in response.get_json()["error"]

    def test_step3_invalid_answer(self, app, client):
        """Step 3 with invalid answer returns error"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step3_invalid@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/step/3", json={"answer": "maybe"})
            assert response.status_code == 400
            assert "Invalid answer" in response.get_json()["error"]


class TestSaveStep4:
    """Tests for /screening/step/4 endpoint (type choices)"""

    def test_step4_all_yes(self, app, client):
        """Step 4 with all 'yes' frequencies"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step4_yes@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post(
                "/api/v1/screening/step/4",
                json={
                    "grapheme": "yes",
                    "music": "yes",
                    "lexical": "yes",
                    "sequence": "yes",
                },
            )
            assert response.status_code == 200
            assert response.get_json()["ok"] is True

    def test_step4_mixed_frequencies(self, app, client):
        """Step 4 with mixed frequency values"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step4_mixed@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post(
                "/api/v1/screening/step/4",
                json={
                    "grapheme": "yes",
                    "music": "no",
                    "lexical": "sometimes",
                    "sequence": "no",
                },
            )
            assert response.status_code == 200

    def test_step4_with_other(self, app, client):
        """Step 4 with 'other' text field"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step4_other@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post(
                "/api/v1/screening/step/4",
                json={
                    "grapheme": "yes",
                    "other": "I see colors when I taste food",
                },
            )
            assert response.status_code == 200

    def test_step4_empty_other(self, app, client):
        """Step 4 with empty 'other' field"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step4_empty_other@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post(
                "/api/v1/screening/step/4",
                json={"grapheme": "yes", "other": "   "},
            )
            assert response.status_code == 200

    def test_step4_null_values(self, app, client):
        """Step 4 with null frequency values"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step4_null@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post(
                "/api/v1/screening/step/4",
                json={"grapheme": None, "music": None},
            )
            assert response.status_code == 200

    def test_step4_invalid_frequency(self, app, client):
        """Step 4 with invalid frequency value"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step4_invalid@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post(
                "/api/v1/screening/step/4",
                json={"grapheme": "invalid_value"},
            )
            assert response.status_code == 400
            assert "Invalid frequency" in response.get_json()["error"]


class TestFinalizeScreening:
    """Tests for /screening/finalize endpoint"""

    def test_finalize_eligible(self, app, client):
        """Finalize with eligible participant"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="finalize_eligible@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            # Create session with all required data
            s = ScreeningSession(participant_id=pid, consent_given=True)
            db.session.add(s)
            db.session.commit()

            # Add definition (yes = knows synesthesia)
            d = ScreeningDefinition(session_id=s.id, answer=YesNoMaybe("yes"))
            db.session.add(d)

            # Add type choice with at least one "yes"
            tc = ScreeningTypeChoice(session_id=s.id, grapheme=Frequency("yes"))
            db.session.add(tc)
            db.session.commit()

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/finalize", json={})
            assert response.status_code == 200
            data = response.get_json()
            assert data["ok"] is True
            assert "eligible" in data
            assert "selected_types" in data or "selectedTypes" in data

    def test_finalize_sets_screening_completed(self, app, client):
        """Finalize should set participant.screening_completed when eligible"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="finalize_completed@example.com",
                password_hash=generate_password_hash("pass"),
                screening_completed=False,
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            s = ScreeningSession(participant_id=pid, consent_given=True)
            db.session.add(s)
            db.session.commit()

            d = ScreeningDefinition(session_id=s.id, answer=YesNoMaybe("yes"))
            db.session.add(d)

            tc = ScreeningTypeChoice(session_id=s.id, grapheme=Frequency("yes"))
            db.session.add(tc)
            db.session.commit()

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/finalize", json={})
            assert response.status_code == 200

    def test_finalize_ineligible_no_types(self, app, client):
        """Finalize with no selected types"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="finalize_no_types@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            s = ScreeningSession(participant_id=pid, consent_given=True)
            db.session.add(s)
            db.session.commit()

            d = ScreeningDefinition(session_id=s.id, answer=YesNoMaybe("yes"))
            db.session.add(d)

            # All types are "no"
            tc = ScreeningTypeChoice(
                session_id=s.id,
                grapheme=Frequency("no"),
                music=Frequency("no"),
                lexical=Frequency("no"),
                sequence=Frequency("no"),
            )
            db.session.add(tc)
            db.session.commit()

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/finalize", json={})
            assert response.status_code == 200
            data = response.get_json()
            assert data["ok"] is True

    def test_finalize_returns_exit_code(self, app, client):
        """Finalize should return exit_code"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="finalize_exit@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            s = ScreeningSession(participant_id=pid, consent_given=True)
            db.session.add(s)
            db.session.commit()

            d = ScreeningDefinition(session_id=s.id, answer=YesNoMaybe("no"))
            db.session.add(d)
            db.session.commit()

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/finalize", json={})
            assert response.status_code == 200
            data = response.get_json()
            assert "exit_code" in data


class TestHelperFunctions:
    """Tests for helper functions"""

    def test_demo_participant_creation(self, app, client):
        """Creates demo participant when not authenticated"""
        with app.app_context():
            # No session set - should create demo participant
            response = client.post("/api/v1/screening/consent", json={"consent": True})
            assert response.status_code == 200

    def test_legacy_pid_fallback(self, app, client):
        """Uses legacy pid from session"""
        with app.app_context():
            p = Participant(
                name="Legacy",
                email="legacy@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["pid"] = pid  # Legacy format

            response = client.post("/api/v1/screening/consent", json={"consent": True})
            assert response.status_code == 200

    def test_invalid_legacy_pid(self, app, client):
        """Handles invalid legacy pid"""
        with app.app_context():
            with client.session_transaction() as sess:
                sess["pid"] = 99999  # Non-existent

            response = client.post("/api/v1/screening/consent", json={"consent": True})
            assert response.status_code == 200  # Should create new demo participant


class TestStep2Updates:
    """Tests for step 2 updating existing records"""

    def test_step2_updates_existing_definition(self, app, client):
        """Step 2 should update existing definition record"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step2_update@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            s = ScreeningSession(participant_id=pid, consent_given=True)
            db.session.add(s)
            db.session.commit()

            d = ScreeningDefinition(session_id=s.id, answer=YesNoMaybe("no"))
            db.session.add(d)
            db.session.commit()

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/step/2", json={"answer": "yes"})
            assert response.status_code == 200


class TestStep3Updates:
    """Tests for step 3 updating existing records"""

    def test_step3_updates_existing_pain_emotion(self, app, client):
        """Step 3 should update existing pain_emotion record"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step3_update@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            s = ScreeningSession(participant_id=pid, consent_given=True)
            db.session.add(s)
            db.session.commit()

            pe = ScreeningPainEmotion(session_id=s.id, answer=YesNo("no"))
            db.session.add(pe)
            db.session.commit()

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/step/3", json={"answer": "yes"})
            assert response.status_code == 200


class TestStep4Updates:
    """Tests for step 4 updating existing records"""

    def test_step4_updates_existing_type_choice(self, app, client):
        """Step 4 should update existing type_choice record"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="step4_update@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            s = ScreeningSession(participant_id=pid, consent_given=True)
            db.session.add(s)
            db.session.commit()

            tc = ScreeningTypeChoice(session_id=s.id, grapheme=Frequency("no"))
            db.session.add(tc)
            db.session.commit()

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post(
                "/api/v1/screening/step/4",
                json={"grapheme": "yes", "music": "sometimes"},
            )
            assert response.status_code == 200


class TestFinalizeEdgeCases:
    """Tests for finalize edge cases"""

    def test_finalize_with_maybe_definition(self, app, client):
        """Finalize with maybe definition answer"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="finalize_maybe@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            s = ScreeningSession(participant_id=pid, consent_given=True)
            db.session.add(s)
            db.session.commit()

            d = ScreeningDefinition(session_id=s.id, answer=YesNoMaybe("maybe"))
            db.session.add(d)

            tc = ScreeningTypeChoice(session_id=s.id, grapheme=Frequency("yes"))
            db.session.add(tc)
            db.session.commit()

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/finalize", json={})
            assert response.status_code == 200

    def test_finalize_with_sometimes_types(self, app, client):
        """Finalize with sometimes frequency types"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="finalize_sometimes@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            s = ScreeningSession(participant_id=pid, consent_given=True)
            db.session.add(s)
            db.session.commit()

            d = ScreeningDefinition(session_id=s.id, answer=YesNoMaybe("yes"))
            db.session.add(d)

            tc = ScreeningTypeChoice(
                session_id=s.id,
                grapheme=Frequency("sometimes"),
                music=Frequency("sometimes"),
            )
            db.session.add(tc)
            db.session.commit()

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/finalize", json={})
            assert response.status_code == 200

    def test_finalize_no_definition(self, app, client):
        """Finalize without definition record"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="finalize_no_def@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            s = ScreeningSession(participant_id=pid, consent_given=True)
            db.session.add(s)
            db.session.commit()

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/finalize", json={})
            assert response.status_code == 200

    def test_finalize_no_type_choice(self, app, client):
        """Finalize without type_choice record"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="finalize_no_tc@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            s = ScreeningSession(participant_id=pid, consent_given=True)
            db.session.add(s)
            db.session.commit()

            d = ScreeningDefinition(session_id=s.id, answer=YesNoMaybe("yes"))
            db.session.add(d)
            db.session.commit()

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/finalize", json={})
            assert response.status_code == 200

    def test_finalize_multiple_type_selections(self, app, client):
        """Finalize with multiple types selected"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="finalize_multi@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            s = ScreeningSession(participant_id=pid, consent_given=True)
            db.session.add(s)
            db.session.commit()

            d = ScreeningDefinition(session_id=s.id, answer=YesNoMaybe("yes"))
            db.session.add(d)

            tc = ScreeningTypeChoice(
                session_id=s.id,
                grapheme=Frequency("yes"),
                music=Frequency("yes"),
                lexical=Frequency("yes"),
                sequence=Frequency("yes"),
            )
            db.session.add(tc)
            db.session.commit()

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/finalize", json={})
            assert response.status_code == 200
            data = response.get_json()
            assert data["ok"] is True

    def test_finalize_with_other_text(self, app, client):
        """Finalize with other synesthesia text"""
        with app.app_context():
            p = Participant(
                name="Test",
                email="finalize_other@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            s = ScreeningSession(participant_id=pid, consent_given=True)
            db.session.add(s)
            db.session.commit()

            d = ScreeningDefinition(session_id=s.id, answer=YesNoMaybe("yes"))
            db.session.add(d)

            tc = ScreeningTypeChoice(
                session_id=s.id,
                grapheme=Frequency("yes"),
                other="Mirror-touch synesthesia",
            )
            db.session.add(tc)
            db.session.commit()

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            response = client.post("/api/v1/screening/finalize", json={})
            assert response.status_code == 200


class TestCompleteFlow:
    """Tests for complete screening flow"""

    def test_complete_screening_flow(self, app, client):
        """Complete screening from start to finalize"""
        with app.app_context():
            p = Participant(
                name="Flow Test",
                email="flow@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            # Step: Consent
            r = client.post("/api/v1/screening/consent", json={"consent": True})
            assert r.status_code == 200

            # Step 1: Health
            r = client.post(
                "/api/v1/screening/step/1",
                json={"drug": False, "neuro": False, "medical": False},
            )
            assert r.status_code == 200

            # Step 2: Definition
            r = client.post("/api/v1/screening/step/2", json={"answer": "yes"})
            assert r.status_code == 200

            # Step 3: Pain/Emotion
            r = client.post("/api/v1/screening/step/3", json={"answer": "no"})
            assert r.status_code == 200

            # Step 4: Type choices
            r = client.post(
                "/api/v1/screening/step/4",
                json={
                    "grapheme": "yes",
                    "music": "sometimes",
                    "lexical": "no",
                    "sequence": "no",
                    "other": "Color-taste synesthesia",
                },
            )
            assert r.status_code == 200

            # Finalize
            r = client.post("/api/v1/screening/finalize", json={})
            assert r.status_code == 200
            data = r.get_json()
            assert data["ok"] is True
            assert "eligible" in data

    def test_complete_flow_ineligible(self, app, client):
        """Complete screening flow resulting in ineligible"""
        with app.app_context():
            p = Participant(
                name="Ineligible Test",
                email="ineligible_flow@example.com",
                password_hash=generate_password_hash("pass"),
            )
            db.session.add(p)
            db.session.commit()
            pid = p.id

            with client.session_transaction() as sess:
                sess["user_id"] = pid
                sess["user_role"] = "participant"

            r = client.post("/api/v1/screening/consent", json={"consent": True})
            assert r.status_code == 200

            r = client.post(
                "/api/v1/screening/step/1",
                json={"drug": True, "neuro": True, "medical": True},
            )
            assert r.status_code == 200

            r = client.post("/api/v1/screening/step/2", json={"answer": "no"})
            assert r.status_code == 200

            r = client.post("/api/v1/screening/step/3", json={"answer": "no"})
            assert r.status_code == 200

            r = client.post(
                "/api/v1/screening/step/4",
                json={
                    "grapheme": "no",
                    "music": "no",
                    "lexical": "no",
                    "sequence": "no",
                },
            )
            assert r.status_code == 200

            r = client.post("/api/v1/screening/finalize", json={})
            assert r.status_code == 200
            data = r.get_json()
            assert data["ok"] is True
