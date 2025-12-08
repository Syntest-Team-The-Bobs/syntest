"""
Comprehensive route and functional testing for speedcongruency.py

- API route testing with various scenarios
- Helper function testing
- Edge case coverage
- Error handling
- Authentication scenarios
- Database persistence verification

Target: 95%+ coverage for speedcongruency.py
"""
import pytest

from models import db, Participant, TestData, SpeedCongruency, ColorStimulus


class TestSpeedCongruencyHelpers:
    """Test helper functions via endpoints"""

    def test_require_participant_success(self, client, app, sample_participant):
        """Valid session → auth passes; no color data returns 404"""
        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.get("/api/v1/speedcongruency/next")
        assert response.status_code == 404
        data = response.get_json()
        assert data["error"] == "no_color_data"

    def test_require_participant_no_session(self, client):
        """No session → 401"""
        response = client.get("/api/v1/speedcongruency/next")
        assert response.status_code == 401
        data = response.get_json()
        assert "Not authenticated" in data["error"]

    def test_require_participant_wrong_role(self, client, app, sample_researcher):
        """Wrong role → 401"""
        with client.session_transaction() as sess:
            sess["user_id"] = sample_researcher.id
            sess["user_role"] = "researcher"

        response = client.get("/api/v1/speedcongruency/next")
        assert response.status_code == 401

    def test_require_participant_not_found(self, client):
        """Non-existent participant id → 404"""
        with client.session_transaction() as sess:
            sess["user_id"] = 99999
            sess["user_role"] = "participant"

        response = client.get("/api/v1/speedcongruency/next")
        assert response.status_code == 404
        data = response.get_json()
        assert "Participant not found" in data["error"]

    def test_get_speed_congruency_pool_with_numeric_id(self, client, app, sample_participant):
        """Pool using str(participant.id) path"""
        with app.app_context():
            td = TestData(
                user_id=str(sample_participant.id),
                family="color",
                cct_valid=1,
                cct_pass=True,
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.get("/api/v1/speedcongruency/next?index=0")
        assert response.status_code == 500  # missing stimulus

    def test_get_speed_congruency_pool_with_participant_id(self, client, app, sample_participant):
        """Pool fallback using participant.participant_id"""
        with app.app_context():
            td = TestData(
                user_id=sample_participant.participant_id,
                family="color",
                cct_valid=1,
                cct_pass=True,
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.get("/api/v1/speedcongruency/next?index=0")
        assert response.status_code == 500  # missing stimulus

    def test_get_speed_congruency_pool_filters_color_family(self, client, app, sample_participant, sample_researcher):
        """Pool only includes color family tests"""
        with app.app_context():
            td1 = TestData(
                user_id=str(sample_participant.id),
                family="other",
                cct_valid=1,
                cct_pass=True,
            )
            db.session.add(td1)

            stimulus = ColorStimulus(
                description="A",
                r=100,
                g=150,
                b=200,
                trigger_type="letter",
                owner_researcher_id=sample_researcher.id,
            )
            db.session.add(stimulus)
            db.session.commit()

            td2 = TestData(
                user_id=str(sample_participant.id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td2)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.get("/api/v1/speedcongruency/next?index=0")
        assert response.status_code == 200
        data = response.get_json()
        assert data["totalTrials"] == 1

    def test_build_color_options_structure(self, client, app, sample_participant, sample_researcher):
        """Options structure includes required fields"""
        with app.app_context():
            stimulus = ColorStimulus(
                description="TEST",
                r=126,
                g=217,
                b=87,
                trigger_type="word",
                owner_researcher_id=sample_researcher.id,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(sample_participant.id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.get("/api/v1/speedcongruency/next?index=0")
        assert response.status_code == 200
        data = response.get_json()

        assert len(data["options"]) == 4
        for opt in data["options"]:
            assert "id" in opt
            assert "label" in opt
            assert "color" in opt
            assert "hex" in opt
            assert "r" in opt
            assert "g" in opt
            assert "b" in opt

        correct_options = [opt for opt in data["options"] if opt["id"] == "correct"]
        assert len(correct_options) == 1

    def test_build_color_options_excludes_expected_color(self, client, app, sample_participant, sample_researcher):
        """Distractors exclude expected color"""
        with app.app_context():
            stimulus = ColorStimulus(
                description="X",
                r=239,
                g=68,
                b=68,  # #EF4444
                trigger_type="letter",
                owner_researcher_id=sample_researcher.id,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(sample_participant.id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.get("/api/v1/speedcongruency/next?index=0")
        assert response.status_code == 200
        data = response.get_json()

        expected_hex = "#ef4444"
        color_counts = sum(1 for opt in data["options"] if opt["hex"].lower() == expected_hex)
        assert color_counts == 1


class TestSpeedCongruencyNextEndpoint:
    """Test GET /api/v1/speedcongruency/next"""

    def test_next_no_color_data(self, client, app, sample_participant):
        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.get("/api/v1/speedcongruency/next?index=0")
        assert response.status_code == 404
        data = response.get_json()
        assert data["error"] == "no_color_data"
        assert data["totalTrials"] == 0

    def test_next_first_trial(self, client, app, sample_participant, sample_researcher):
        with app.app_context():
            stimulus = ColorStimulus(
                description="BLUE",
                r=77,
                g=159,
                b=255,
                trigger_type="word",
                owner_researcher_id=sample_researcher.id,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(sample_participant.id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
                stimulus_type="word",
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.get("/api/v1/speedcongruency/next?index=0")
        assert response.status_code == 200
        data = response.get_json()
        assert data["trigger"] == "BLUE"
        assert data["index"] == 0
        assert data["totalTrials"] == 1
        assert "options" in data
        assert "expectedColor" in data
        assert data["expectedColor"]["r"] == 77

    def test_next_trial_index_parameter(self, client, app, sample_participant, sample_researcher):
        with app.app_context():
            for i, desc in enumerate(["ONE", "TWO"]):
                stimulus = ColorStimulus(
                    description=desc,
                    r=100 + i * 50,
                    g=150 + i * 50,
                    b=200,
                    trigger_type="number",
                    owner_researcher_id=sample_researcher.id,
                )
                db.session.add(stimulus)
                db.session.commit()

                td = TestData(
                    user_id=str(sample_participant.id),
                    family="color",
                    cct_valid=1,
                    cct_pass=True,
                    stimulus_id=stimulus.id,
                )
                db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.get("/api/v1/speedcongruency/next?trialIndex=1")
        assert response.status_code == 200
        data = response.get_json()
        assert data["index"] == 1
        assert data["trigger"] == "TWO"

    def test_next_invalid_index(self, client, app, sample_participant, sample_researcher):
        with app.app_context():
            stimulus = ColorStimulus(
                description="A",
                r=100,
                g=150,
                b=200,
                trigger_type="letter",
                owner_researcher_id=sample_researcher.id,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(sample_participant.id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.get("/api/v1/speedcongruency/next?index=invalid")
        assert response.status_code == 200
        data = response.get_json()
        assert data["index"] == 0

    def test_next_index_out_of_bounds(self, client, app, sample_participant, sample_researcher):
        with app.app_context():
            stimulus = ColorStimulus(
                description="B",
                r=100,
                g=150,
                b=200,
                trigger_type="letter",
                owner_researcher_id=sample_researcher.id,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(sample_participant.id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.get("/api/v1/speedcongruency/next?index=5")
        assert response.status_code == 200
        data = response.get_json()
        assert data["done"] is True
        assert data["totalTrials"] == 1

    def test_next_negative_index(self, client, app, sample_participant, sample_researcher):
        with app.app_context():
            stimulus = ColorStimulus(
                description="C",
                r=100,
                g=150,
                b=200,
                trigger_type="letter",
                owner_researcher_id=sample_researcher.id,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(sample_participant.id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.get("/api/v1/speedcongruency/next?index=-1")
        assert response.status_code == 200
        data = response.get_json()
        assert data["done"] is True

    def test_next_missing_stimulus(self, client, app, sample_participant):
        with app.app_context():
            td = TestData(
                user_id=str(sample_participant.id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=None,
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.get("/api/v1/speedcongruency/next?index=0")
        assert response.status_code == 500
        data = response.get_json()
        assert data["error"] == "missing_stimulus"

    def test_next_response_structure(self, client, app, sample_participant, sample_researcher):
        with app.app_context():
            stimulus = ColorStimulus(
                description="GREEN",
                r=102,
                g=187,
                b=106,
                trigger_type="word",
                owner_researcher_id=sample_researcher.id,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(sample_participant.id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
                stimulus_type="word",
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.get("/api/v1/speedcongruency/next?index=0")
        assert response.status_code == 200
        data = response.get_json()

        assert "id" in data
        assert "participantId" in data
        assert "trigger" in data
        assert "options" in data
        assert "totalTrials" in data
        assert "index" in data
        assert "stimulusId" in data
        assert "testDataId" in data
        assert "expectedColor" in data
        assert "cue_type" in data


class TestSpeedCongruencySubmitEndpoint:
    """Test POST /api/v1/speedcongruency/submit"""

    def test_submit_correct_answer(self, client, app, sample_participant, sample_researcher):
        with app.app_context():
            stimulus = ColorStimulus(
                description="RED",
                r=239,
                g=68,
                b=68,
                trigger_type="word",
                owner_researcher_id=sample_researcher.id,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(sample_participant.id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td)
            db.session.commit()
            test_data_id = td.id
            stimulus_id = stimulus.id

        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.post(
            "/api/v1/speedcongruency/submit",
            json={
                "trialIndex": 0,
                "trigger": "RED",
                "selectedOptionId": "correct",
                "reactionTimeMs": 842.3,
                "testDataId": test_data_id,
                "stimulusId": stimulus_id,
                "cue_type": "word",
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["ok"] is True
        assert data["matched"] is True

        with app.app_context():
            record = SpeedCongruency.query.filter_by(trial_index=0).first()
            assert record is not None
            assert record.matched is True
            assert record.response_ms == 842

    def test_submit_incorrect_answer(self, client, app, sample_participant, sample_researcher):
        with app.app_context():
            stimulus = ColorStimulus(
                description="BLUE",
                r=77,
                g=159,
                b=255,
                trigger_type="word",
                owner_researcher_id=sample_researcher.id,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(sample_participant.id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td)
            db.session.commit()
            test_data_id = td.id
            stimulus_id = stimulus.id

        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.post(
            "/api/v1/speedcongruency/submit",
            json={
                "trialIndex": 0,
                "trigger": "BLUE",
                "selectedOptionId": "opt1",
                "reactionTimeMs": 1250.7,
                "testDataId": test_data_id,
                "stimulusId": stimulus_id,
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["ok"] is True
        assert data["matched"] is False

    def test_submit_no_authentication(self, client):
        response = client.post(
            "/api/v1/speedcongruency/submit",
            json={
                "trialIndex": 0,
                "trigger": "TEST",
                "selectedOptionId": "correct",
                "reactionTimeMs": 800,
            },
        )
        assert response.status_code == 401

    def test_submit_no_reaction_time(self, client, app, sample_participant):
        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.post(
            "/api/v1/speedcongruency/submit",
            json={
                "trialIndex": 0,
                "trigger": "TEST",
                "selectedOptionId": "correct",
                "testDataId": 1,
                "stimulusId": 1,
            },
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["ok"] is True

        with app.app_context():
            record = SpeedCongruency.query.filter_by(participant_id=str(sample_participant.id)).first()
            assert record.response_ms is None

    def test_submit_with_meta_json(self, client, app, sample_participant, sample_researcher):
        with app.app_context():
            stimulus = ColorStimulus(
                description="Y",
                r=100,
                g=150,
                b=200,
                trigger_type="letter",
                owner_researcher_id=sample_researcher.id,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(sample_participant.id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td)
            db.session.commit()
            test_data_id = td.id

        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.post(
            "/api/v1/speedcongruency/submit",
            json={
                "trialIndex": 0,
                "trigger": "Y",
                "selectedOptionId": "correct",
                "reactionTimeMs": 900,
                "testDataId": test_data_id,
                "stimulusId": 1,
            },
        )
        assert response.status_code == 200

        with app.app_context():
            record = SpeedCongruency.query.filter_by(participant_id=str(sample_participant.id)).first()
            assert record.meta_json is not None
            assert record.meta_json["test_data_id"] == test_data_id

    def test_submit_multiple_trials(self, client, app, sample_participant):
        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        for i in range(3):
            response = client.post(
                "/api/v1/speedcongruency/submit",
                json={
                    "trialIndex": i,
                    "trigger": f"TRIGGER_{i}",
                    "selectedOptionId": "correct" if i % 2 == 0 else "opt1",
                    "reactionTimeMs": 800 + i * 100,
                    "testDataId": 1,
                    "stimulusId": 1,
                },
            )
            assert response.status_code == 200

        with app.app_context():
            records = SpeedCongruency.query.filter_by(participant_id=str(sample_participant.id)).all()
            assert len(records) == 3

    def test_submit_expected_color_from_stimulus(self, client, app, sample_participant, sample_researcher):
        with app.app_context():
            stimulus = ColorStimulus(
                description="ORANGE",
                r=255,
                g=179,
                b=71,
                trigger_type="word",
                owner_researcher_id=sample_researcher.id,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(sample_participant.id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td)
            db.session.commit()
            test_data_id = td.id

        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.post(
            "/api/v1/speedcongruency/submit",
            json={
                "trialIndex": 0,
                "trigger": "ORANGE",
                "selectedOptionId": "correct",
                "reactionTimeMs": 750,
                "testDataId": test_data_id,
                "stimulusId": 1,
            },
        )
        assert response.status_code == 200

        with app.app_context():
            record = SpeedCongruency.query.filter_by(participant_id=str(sample_participant.id)).first()
            assert record.expected_r == 255
            assert record.expected_g == 179
            assert record.expected_b == 71

    def test_submit_cue_type_default(self, client, app, sample_participant):
        with client.session_transaction() as sess:
            sess["user_id"] = sample_participant.id
            sess["user_role"] = "participant"

        response = client.post(
            "/api/v1/speedcongruency/submit",
            json={
                "trialIndex": 0,
                "trigger": "TEST",
                "selectedOptionId": "correct",
                "reactionTimeMs": 850,
                "testDataId": 1,
                "stimulusId": 1,
                # No cue_type provided
            },
        )
        assert response.status_code == 200

        with app.app_context():
            record = SpeedCongruency.query.filter_by(participant_id=str(sample_participant.id)).first()
            assert record.cue_type == "word"
