"""
Comprehensive route and functional testing for speedcongruency.py

Following teammate's pattern from test_colortest_routes.py:
- API route testing with various scenarios
- Helper function testing
- Edge case coverage
- Error handling
- Authentication scenarios
- Database persistence verification

Target: 95%+ coverage for speedcongruency.py
"""
import pytest
import sys
import os

# Add parent directories to path to access api modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))

from flask import Flask, session
from models import db, Participant, TestData, SpeedCongruency, ColorStimulus
from speedcongruency import bp


@pytest.fixture
def app():
    """Create Flask app for testing"""
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-secret-key"

    db.init_app(app)
    app.register_blueprint(bp, url_prefix="/speedcongruency/")

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Flask test client"""
    return app.test_client()


class TestSpeedCongruencyHelpers:
    """Test helper functions in speedcongruency module"""

    def test_require_participant_success(self, client, app):
        """Test _require_participant with valid session"""
        with app.app_context():
            p = Participant(
                name="Speed Test",
                email="speed@test.com",
                password_hash="hash",
                age=25,
                country="USA",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

        # Set session
        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        # This test validates the pattern - we'll test through endpoints
        response = client.get("/api/speed-congruency/next")
        # Should return 404 (no color data) not 401 (auth error)
        assert response.status_code == 404
        data = response.get_json()
        assert data["error"] == "no_color_data"

    def test_require_participant_no_session(self, client, app):
        """Test _require_participant without session"""
        response = client.get("/api/speed-congruency/next")
        assert response.status_code == 401
        data = response.get_json()
        assert "Not authenticated" in data["error"]

    def test_require_participant_wrong_role(self, client, app):
        """Test _require_participant with non-participant role"""
        with app.app_context():
            p = Participant(
                name="Researcher",
                email="researcher@test.com",
                password_hash="hash",
                age=30,
                country="UK",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "researcher"  # Wrong role

        response = client.get("/api/speed-congruency/next")
        assert response.status_code == 401

    def test_require_participant_not_found(self, client, app):
        """Test _require_participant with invalid user_id"""
        with client.session_transaction() as sess:
            sess["user_id"] = 99999  # Non-existent
            sess["user_role"] = "participant"

        response = client.get("/api/speed-congruency/next")
        assert response.status_code == 404
        data = response.get_json()
        assert "Participant not found" in data["error"]

    def test_get_speed_congruency_pool_with_numeric_id(self, client, app):
        """Test _get_speed_congruency_pool with str(participant.id)"""
        with app.app_context():
            p = Participant(
                name="Pool Test",
                email="pool@test.com",
                password_hash="hash",
                age=28,
                country="Canada",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

            # Create TestData with str(participant.id)
            td = TestData(
                user_id=str(user_id),
                family="color",
                cct_valid=1,
                cct_pass=True,
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        response = client.get("/api/speed-congruency/next?index=0")
        # Will fail due to missing stimulus, but auth passes
        assert response.status_code == 500

    def test_get_speed_congruency_pool_with_participant_id(self, client, app):
        """Test _get_speed_congruency_pool with participant.participant_id"""
        with app.app_context():
            p = Participant(
                name="PID Test",
                email="pid@test.com",
                password_hash="hash",
                age=32,
                country="Germany",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id
            participant_id = p.participant_id

            # Create TestData with participant_id (fallback path)
            td = TestData(
                user_id=participant_id,
                family="color",
                cct_valid=1,
                cct_pass=True,
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        response = client.get("/api/speed-congruency/next?index=0")
        # Will fail due to missing stimulus, but fallback works
        assert response.status_code == 500

    def test_get_speed_congruency_pool_filters_color_family(self, client, app):
        """Test pool only includes color family tests"""
        with app.app_context():
            p = Participant(
                name="Filter Test",
                email="filter@test.com",
                password_hash="hash",
                age=27,
                country="France",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

            # Create non-color TestData (should be excluded)
            td1 = TestData(
                user_id=str(user_id), family="other", cct_valid=1, cct_pass=True
            )
            db.session.add(td1)

            # Create color TestData (should be included)
            stimulus = ColorStimulus(
                description="A",
                r=100,
                g=150,
                b=200,
                trigger_type="letter",
                owner_researcher_id=1,
            )
            db.session.add(stimulus)
            db.session.commit()

            td2 = TestData(
                user_id=str(user_id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td2)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        response = client.get("/api/speed-congruency/next?index=0")
        # Should return the color test
        assert response.status_code == 200
        data = response.get_json()
        assert data["totalTrials"] == 1  # Only 1 color test

    def test_build_color_options_structure(self, client, app):
        """Test _build_color_options returns correct structure"""
        # This is tested through the /next endpoint
        with app.app_context():
            p = Participant(
                name="Options Test",
                email="options@test.com",
                password_hash="hash",
                age=29,
                country="Spain",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

            stimulus = ColorStimulus(
                description="TEST",
                r=126,
                g=217,
                b=87,
                trigger_type="word",
                owner_researcher_id=1,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(user_id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        response = client.get("/api/speed-congruency/next?index=0")
        assert response.status_code == 200
        data = response.get_json()

        # Verify options structure
        assert len(data["options"]) == 4
        for opt in data["options"]:
            assert "id" in opt
            assert "label" in opt
            assert "color" in opt
            assert "hex" in opt
            assert "r" in opt
            assert "g" in opt
            assert "b" in opt

        # Verify one option is "correct"
        correct_options = [opt for opt in data["options"] if opt["id"] == "correct"]
        assert len(correct_options) == 1

    def test_build_color_options_excludes_expected_color(self, client, app):
        """Test distractors don't include the expected color"""
        with app.app_context():
            p = Participant(
                name="Distractor Test",
                email="distractor@test.com",
                password_hash="hash",
                age=31,
                country="Italy",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

            # Use a color from the base palette
            stimulus = ColorStimulus(
                description="X",
                r=239,
                g=68,
                b=68,  # #EF4444 from base palette
                trigger_type="letter",
                owner_researcher_id=1,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(user_id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        response = client.get("/api/speed-congruency/next?index=0")
        assert response.status_code == 200
        data = response.get_json()

        # Verify expected color appears exactly once (as "correct")
        expected_hex = "#ef4444"
        color_counts = sum(
            1 for opt in data["options"] if opt["hex"].lower() == expected_hex
        )
        assert color_counts == 1


class TestSpeedCongruencyNextEndpoint:
    """Test GET /api/speed-congruency/next endpoint"""

    def test_next_no_color_data(self, client, app):
        """Test /next with participant who has no color tests"""
        with app.app_context():
            p = Participant(
                name="No Data",
                email="nodata@test.com",
                password_hash="hash",
                age=26,
                country="Japan",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        response = client.get("/api/speed-congruency/next?index=0")
        assert response.status_code == 404
        data = response.get_json()
        assert data["error"] == "no_color_data"
        assert data["totalTrials"] == 0

    def test_next_first_trial(self, client, app):
        """Test /next returns first trial correctly"""
        with app.app_context():
            p = Participant(
                name="First Trial",
                email="first@test.com",
                password_hash="hash",
                age=27,
                country="Australia",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

            stimulus = ColorStimulus(
                description="BLUE",
                r=77,
                g=159,
                b=255,
                trigger_type="word",
                owner_researcher_id=1,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(user_id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
                stimulus_type="word",
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        response = client.get("/api/speed-congruency/next?index=0")
        assert response.status_code == 200
        data = response.get_json()
        assert data["trigger"] == "BLUE"
        assert data["index"] == 0
        assert data["totalTrials"] == 1
        assert "options" in data
        assert "expectedColor" in data
        assert data["expectedColor"]["r"] == 77

    def test_next_trial_index_parameter(self, client, app):
        """Test /next with trialIndex parameter"""
        with app.app_context():
            p = Participant(
                name="Index Test",
                email="index@test.com",
                password_hash="hash",
                age=28,
                country="Brazil",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

            # Create 2 stimuli
            for i, desc in enumerate(["ONE", "TWO"]):
                stimulus = ColorStimulus(
                    description=desc,
                    r=100 + i * 50,
                    g=150 + i * 50,
                    b=200,
                    trigger_type="number",
                    owner_researcher_id=1,
                )
                db.session.add(stimulus)
                db.session.commit()

                td = TestData(
                    user_id=str(user_id),
                    family="color",
                    cct_valid=1,
                    cct_pass=True,
                    stimulus_id=stimulus.id,
                )
                db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        # Test with trialIndex parameter
        response = client.get("/api/speed-congruency/next?trialIndex=1")
        assert response.status_code == 200
        data = response.get_json()
        assert data["index"] == 1
        assert data["trigger"] == "TWO"

    def test_next_invalid_index(self, client, app):
        """Test /next with invalid index parameter"""
        with app.app_context():
            p = Participant(
                name="Invalid Index",
                email="invalid@test.com",
                password_hash="hash",
                age=29,
                country="Netherlands",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

            stimulus = ColorStimulus(
                description="A", r=100, g=150, b=200, trigger_type="letter", owner_researcher_id=1
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(user_id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        # Test with non-numeric index (should default to 0)
        response = client.get("/api/speed-congruency/next?index=invalid")
        assert response.status_code == 200
        data = response.get_json()
        assert data["index"] == 0

    def test_next_index_out_of_bounds(self, client, app):
        """Test /next with index beyond available trials"""
        with app.app_context():
            p = Participant(
                name="Out of Bounds",
                email="oob@test.com",
                password_hash="hash",
                age=30,
                country="Sweden",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

            stimulus = ColorStimulus(
                description="B", r=100, g=150, b=200, trigger_type="letter", owner_researcher_id=1
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(user_id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        # Request index 5 when only 1 trial exists
        response = client.get("/api/speed-congruency/next?index=5")
        assert response.status_code == 200
        data = response.get_json()
        assert data["done"] is True
        assert data["totalTrials"] == 1

    def test_next_negative_index(self, client, app):
        """Test /next with negative index"""
        with app.app_context():
            p = Participant(
                name="Negative Index",
                email="negative@test.com",
                password_hash="hash",
                age=31,
                country="Norway",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

            stimulus = ColorStimulus(
                description="C", r=100, g=150, b=200, trigger_type="letter", owner_researcher_id=1
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(user_id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        response = client.get("/api/speed-congruency/next?index=-1")
        assert response.status_code == 200
        data = response.get_json()
        assert data["done"] is True

    def test_next_missing_stimulus(self, client, app):
        """Test /next with TestData that has no linked stimulus"""
        with app.app_context():
            p = Participant(
                name="Missing Stim",
                email="missingstim@test.com",
                password_hash="hash",
                age=32,
                country="Denmark",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

            # Create TestData without stimulus_id
            td = TestData(
                user_id=str(user_id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=None,
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        response = client.get("/api/speed-congruency/next?index=0")
        assert response.status_code == 500
        data = response.get_json()
        assert data["error"] == "missing_stimulus"

    def test_next_response_structure(self, client, app):
        """Test /next returns all required fields"""
        with app.app_context():
            p = Participant(
                name="Structure Test",
                email="structure@test.com",
                password_hash="hash",
                age=33,
                country="Finland",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

            stimulus = ColorStimulus(
                description="GREEN",
                r=102,
                g=187,
                b=106,
                trigger_type="word",
                owner_researcher_id=1,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(user_id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
                stimulus_type="word",
            )
            db.session.add(td)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        response = client.get("/api/speed-congruency/next?index=0")
        assert response.status_code == 200
        data = response.get_json()

        # Verify all required fields
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
    """Test POST /api/speed-congruency/submit endpoint"""

    def test_submit_correct_answer(self, client, app):
        """Test submitting a correct answer"""
        with app.app_context():
            p = Participant(
                name="Submit Test",
                email="submit@test.com",
                password_hash="hash",
                age=34,
                country="Poland",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

            stimulus = ColorStimulus(
                description="RED",
                r=239,
                g=68,
                b=68,
                trigger_type="word",
                owner_researcher_id=1,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(user_id),
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
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        response = client.post(
            "/api/speed-congruency/submit",
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

        # Verify database record
        with app.app_context():
            record = SpeedCongruency.query.filter_by(trial_index=0).first()
            assert record is not None
            assert record.matched is True
            assert record.response_ms == 842

    def test_submit_incorrect_answer(self, client, app):
        """Test submitting an incorrect answer"""
        with app.app_context():
            p = Participant(
                name="Wrong Answer",
                email="wrong@test.com",
                password_hash="hash",
                age=35,
                country="Ireland",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

            stimulus = ColorStimulus(
                description="BLUE",
                r=77,
                g=159,
                b=255,
                trigger_type="word",
                owner_researcher_id=1,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(user_id),
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
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        response = client.post(
            "/api/speed-congruency/submit",
            json={
                "trialIndex": 0,
                "trigger": "BLUE",
                "selectedOptionId": "opt1",  # Wrong answer
                "reactionTimeMs": 1250.7,
                "testDataId": test_data_id,
                "stimulusId": stimulus_id,
            },
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["ok"] is True
        assert data["matched"] is False

    def test_submit_no_authentication(self, client, app):
        """Test submitting without authentication"""
        response = client.post(
            "/api/speed-congruency/submit",
            json={
                "trialIndex": 0,
                "trigger": "TEST",
                "selectedOptionId": "correct",
                "reactionTimeMs": 800,
            },
        )

        assert response.status_code == 401

    def test_submit_no_reaction_time(self, client, app):
        """Test submitting without reaction time"""
        with app.app_context():
            p = Participant(
                name="No RT",
                email="nort@test.com",
                password_hash="hash",
                age=36,
                country="Portugal",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        response = client.post(
            "/api/speed-congruency/submit",
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

        # Verify response_ms is None
        with app.app_context():
            record = SpeedCongruency.query.filter_by(
                participant_id=str(user_id)
            ).first()
            assert record.response_ms is None

    def test_submit_with_meta_json(self, client, app):
        """Test submit stores meta_json correctly"""
        with app.app_context():
            p = Participant(
                name="Meta Test",
                email="meta@test.com",
                password_hash="hash",
                age=37,
                country="Greece",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

            stimulus = ColorStimulus(
                description="Y", r=100, g=150, b=200, trigger_type="letter", owner_researcher_id=1
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(user_id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td)
            db.session.commit()
            test_data_id = td.id

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        response = client.post(
            "/api/speed-congruency/submit",
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

        # Verify meta_json
        with app.app_context():
            record = SpeedCongruency.query.filter_by(
                participant_id=str(user_id)
            ).first()
            assert record.meta_json is not None
            assert record.meta_json["test_data_id"] == test_data_id

    def test_submit_multiple_trials(self, client, app):
        """Test submitting multiple trials in sequence"""
        with app.app_context():
            p = Participant(
                name="Multi Submit",
                email="multisubmit@test.com",
                password_hash="hash",
                age=38,
                country="Belgium",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        # Submit 3 trials
        for i in range(3):
            response = client.post(
                "/api/speed-congruency/submit",
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

        # Verify all 3 records exist
        with app.app_context():
            records = SpeedCongruency.query.filter_by(
                participant_id=str(user_id)
            ).all()
            assert len(records) == 3

    def test_submit_expected_color_from_stimulus(self, client, app):
        """Test that expected color is extracted from TestData stimulus"""
        with app.app_context():
            p = Participant(
                name="Expected Color",
                email="expected@test.com",
                password_hash="hash",
                age=39,
                country="Austria",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

            stimulus = ColorStimulus(
                description="ORANGE",
                r=255,
                g=179,
                b=71,
                trigger_type="word",
                owner_researcher_id=1,
            )
            db.session.add(stimulus)
            db.session.commit()

            td = TestData(
                user_id=str(user_id),
                family="color",
                cct_valid=1,
                cct_pass=True,
                stimulus_id=stimulus.id,
            )
            db.session.add(td)
            db.session.commit()
            test_data_id = td.id

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        response = client.post(
            "/api/speed-congruency/submit",
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

        # Verify expected color is stored
        with app.app_context():
            record = SpeedCongruency.query.filter_by(
                participant_id=str(user_id)
            ).first()
            assert record.expected_r == 255
            assert record.expected_g == 179
            assert record.expected_b == 71

    def test_submit_cue_type_default(self, client, app):
        """Test submit uses default cue_type when not provided"""
        with app.app_context():
            p = Participant(
                name="Cue Type",
                email="cuetype@test.com",
                password_hash="hash",
                age=40,
                country="Czech Republic",
            )
            db.session.add(p)
            db.session.commit()
            user_id = p.id

        with client.session_transaction() as sess:
            sess["user_id"] = user_id
            sess["user_role"] = "participant"

        response = client.post(
            "/api/speed-congruency/submit",
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

        # Verify default cue_type is "word"
        with app.app_context():
            record = SpeedCongruency.query.filter_by(
                participant_id=str(user_id)
            ).first()
            assert record.cue_type == "word"
