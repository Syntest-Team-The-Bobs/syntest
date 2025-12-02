import pytest
from datetime import datetime
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models import db, ColorStimulus, ColorTrial, TestData, AnalyzedTestData, Participant, Researcher, Test

@pytest.fixture
def app():
    """Create application for testing"""
    from flask import Flask
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['TESTING'] = True
    
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def db_session(app):
    with app.app_context():
        yield db.session

@pytest.fixture
def researcher(db_session):
    """Create a test researcher"""
    researcher = Researcher(
        name="Dr. Test",
        email="test@example.com",
        password_hash="hashed_password",
        institution="Test University"
    )
    db_session.add(researcher)
    db_session.commit()
    return researcher

@pytest.fixture
def participant(db_session):
    """Create a test participant"""
    participant = Participant(
        name="Test Participant",
        email="participant@example.com",
        password_hash="hashed_password",
        age=25,
        country="USA"
    )
    db_session.add(participant)
    db_session.commit()
    return participant

@pytest.fixture
def test_obj(db_session):
    """Create a test object"""
    test = Test(
        name="Grapheme-Color",
        description="Test for grapheme-color synesthesia",
        synesthesia_type="Grapheme-Color",
        duration=15
    )
    db_session.add(test)
    db_session.commit()
    return test


# ======================================================
# ColorStimulus Tests
# ======================================================

class TestColorStimulus:
    def test_create_color_stimulus(self, db_session, researcher):
        """Test creating a color stimulus"""
        stimulus = ColorStimulus(
            set_id=1,
            description="Red color",
            owner_researcher_id=researcher.id,
            family="color",
            r=255,
            g=0,
            b=0,
            trigger_type="letter"
        )
        db_session.add(stimulus)
        db_session.commit()
        
        assert stimulus.id is not None
        assert stimulus.r == 255
        assert stimulus.g == 0
        assert stimulus.b == 0
        assert stimulus.owner_researcher_id == researcher.id

    def test_hex_color_property(self, db_session):
        """Test hex color property"""
        stimulus = ColorStimulus(r=255, g=128, b=64)
        db_session.add(stimulus)
        db_session.commit()
        
        assert stimulus.hex_color == "#ff8040"

    def test_rgb_tuple_property(self, db_session):
        """Test RGB tuple property"""
        stimulus = ColorStimulus(r=100, g=150, b=200)
        db_session.add(stimulus)
        db_session.commit()
        
        assert stimulus.rgb_tuple == (100, 150, 200)

    def test_distance_to_method(self, db_session):
        """Test distance calculation"""
        stimulus = ColorStimulus(r=0, g=0, b=0)
        db_session.add(stimulus)
        db_session.commit()
        
        # Distance from black to white should be sqrt(255^2 * 3)
        distance = stimulus.distance_to(255, 255, 255)
        expected = (255**2 + 255**2 + 255**2) ** 0.5
        assert abs(distance - expected) < 0.001

    def test_rgb_constraints(self, db_session):
        """Test that RGB constraints are enforced"""
        # This test depends on database constraints being enforced
        stimulus = ColorStimulus(r=256, g=0, b=0)  # Invalid r value
        db_session.add(stimulus)
        
        with pytest.raises(Exception):  # Will raise IntegrityError or CheckViolation
            db_session.commit()
        db_session.rollback()

    def test_to_dict(self, db_session, researcher):
        """Test to_dict serialization"""
        stimulus = ColorStimulus(
            set_id=1,
            description="Test",
            owner_researcher_id=researcher.id,
            r=100,
            g=150,
            b=200,
            trigger_type="letter"
        )
        db_session.add(stimulus)
        db_session.commit()
        
        data = stimulus.to_dict()
        assert data['id'] == stimulus.id
        assert data['r'] == 100
        assert data['g'] == 150
        assert data['b'] == 200
        assert data['hex'] == "#6496c8"
        assert 'created_at' in data


# ======================================================
# ColorTrial Tests
# ======================================================

class TestColorTrial:
    def test_create_color_trial(self, db_session):
        """Test creating a color trial"""
        stimulus = ColorStimulus(r=255, g=0, b=0)
        db_session.add(stimulus)
        db_session.commit()
        
        trial = ColorTrial(
            participant_id="P123",
            stimulus_id=stimulus.id,
            trial_index=1,
            selected_r=250,
            selected_g=10,
            selected_b=5,
            response_ms=1500,
            meta_json={"device": "desktop"}
        )
        db_session.add(trial)
        db_session.commit()
        
        assert trial.id is not None
        assert trial.participant_id == "P123"
        assert trial.stimulus_id == stimulus.id
        assert trial.response_ms == 1500

    def test_selected_hex_color(self, db_session):
        """Test selected hex color property"""
        trial = ColorTrial(
            participant_id="P123",
            selected_r=255,
            selected_g=128,
            selected_b=64
        )
        db_session.add(trial)
        db_session.commit()
        
        assert trial.selected_hex_color == "#ff8040"

    def test_selected_hex_color_none(self, db_session):
        """Test hex color when values are None"""
        trial = ColorTrial(participant_id="P123")
        db_session.add(trial)
        db_session.commit()
        
        assert trial.selected_hex_color is None

    def test_color_distance(self, db_session):
        """Test color distance calculation"""
        stimulus = ColorStimulus(r=0, g=0, b=0)
        db_session.add(stimulus)
        db_session.commit()
        
        trial = ColorTrial(
            participant_id="P123",
            stimulus_id=stimulus.id,
            selected_r=100,
            selected_g=100,
            selected_b=100
        )
        db_session.add(trial)
        db_session.commit()
        
        distance = trial.color_distance()
        expected = (100**2 + 100**2 + 100**2) ** 0.5
        assert abs(distance - expected) < 0.001

    def test_is_exact_match_true(self, db_session):
        """Test exact match detection - positive case"""
        stimulus = ColorStimulus(r=100, g=150, b=200)
        db_session.add(stimulus)
        db_session.commit()
        
        trial = ColorTrial(
            participant_id="P123",
            stimulus_id=stimulus.id,
            selected_r=100,
            selected_g=150,
            selected_b=200
        )
        db_session.add(trial)
        db_session.commit()
        
        assert trial.is_exact_match() is True

    def test_is_exact_match_false(self, db_session):
        """Test exact match detection - negative case"""
        stimulus = ColorStimulus(r=100, g=150, b=200)
        db_session.add(stimulus)
        db_session.commit()
        
        trial = ColorTrial(
            participant_id="P123",
            stimulus_id=stimulus.id,
            selected_r=100,
            selected_g=150,
            selected_b=201  # Off by 1
        )
        db_session.add(trial)
        db_session.commit()
        
        assert trial.is_exact_match() is False

    def test_is_close_match(self, db_session):
        """Test close match with threshold"""
        stimulus = ColorStimulus(r=100, g=100, b=100)
        db_session.add(stimulus)
        db_session.commit()
        
        trial = ColorTrial(
            participant_id="P123",
            stimulus_id=stimulus.id,
            selected_r=110,
            selected_g=110,
            selected_b=110
        )
        db_session.add(trial)
        db_session.commit()
        
        # Distance is sqrt(10^2 + 10^2 + 10^2) = ~17.3
        assert trial.is_close_match(threshold=30) is True
        assert trial.is_close_match(threshold=10) is False

    def test_relationship_to_stimulus(self, db_session):
        """Test relationship between trial and stimulus"""
        stimulus = ColorStimulus(r=255, g=0, b=0)
        db_session.add(stimulus)
        db_session.commit()
        
        trial = ColorTrial(
            participant_id="P123",
            stimulus_id=stimulus.id,
            selected_r=250,
            selected_g=5,
            selected_b=5
        )
        db_session.add(trial)
        db_session.commit()
        
        assert trial.stimulus.r == 255
        assert trial.stimulus.g == 0
        assert trial.stimulus.b == 0


# ======================================================
# TestData Tests
# ======================================================

class TestTestData:
    def test_create_test_data(self, db_session, researcher, test_obj):
        """Test creating test data"""
        stimulus = ColorStimulus(r=255, g=0, b=0)
        db_session.add(stimulus)
        db_session.commit()
        
        test_data = TestData(
            user_id="P123",
            test_id=test_obj.id,
            owner_researcher_id=researcher.id,
            stimulus_id=stimulus.id,
            test_type="CCT",
            family="color",
            trial=1,
            cct_cutoff=0.5,
            cct_triggers=36,
            cct_trials_per_trigger=3,
            cct_valid=108,
            cct_mean=45.5,
            cct_std=12.3,
            cct_median=44.0,
            cct_rt_mean=2500,
            cct_pass=True
        )
        db_session.add(test_data)
        db_session.commit()
        
        assert test_data.id is not None
        assert test_data.user_id == "P123"
        assert test_data.test_type == "CCT"
        assert test_data.cct_pass is True

    def test_consistency_score_calculation(self, db_session):
        """Test consistency score calculation"""
        test_data = TestData(
            user_id="P123",
            test_type="CCT",
            cct_mean=100.0,
            cct_std=10.0
        )
        db_session.add(test_data)
        db_session.commit()
        
        # consistency = 1 - (std/mean) = 1 - 0.1 = 0.9
        consistency = test_data.get_consistency_score()
        assert abs(consistency - 0.9) < 0.001

    def test_consistency_score_high_variance(self, db_session):
        """Test consistency score with high variance"""
        test_data = TestData(
            user_id="P123",
            test_type="CCT",
            cct_mean=50.0,
            cct_std=100.0  # Higher than mean
        )
        db_session.add(test_data)
        db_session.commit()
        
        # Should be capped at 0
        consistency = test_data.get_consistency_score()
        assert consistency == 0.0

    def test_consistency_score_none(self, db_session):
        """Test consistency score when data is missing"""
        test_data = TestData(
            user_id="P123",
            test_type="CCT"
        )
        db_session.add(test_data)
        db_session.commit()
        
        assert test_data.get_consistency_score() is None

    def test_relationships(self, db_session, researcher, test_obj):
        """Test all relationships"""
        stimulus = ColorStimulus(r=100, g=150, b=200, owner_researcher_id=researcher.id)
        db_session.add(stimulus)
        db_session.commit()
        
        test_data = TestData(
            user_id="P123",
            test_id=test_obj.id,
            owner_researcher_id=researcher.id,
            stimulus_id=stimulus.id,
            test_type="CCT"
        )
        db_session.add(test_data)
        db_session.commit()
        
        assert test_data.test.name == "Grapheme-Color"
        assert test_data.owner.name == "Dr. Test"
        assert test_data.stimulus.r == 100


# ======================================================
# AnalyzedTestData Tests
# ======================================================

class TestAnalyzedTestData:
    def test_create_analyzed_data(self, db_session, participant, researcher, test_obj):
        """Test creating analyzed test data"""
        stimulus = ColorStimulus(r=255, g=0, b=0)
        db_session.add(stimulus)
        db_session.commit()
        
        analyzed = AnalyzedTestData(
            user_id=participant.id,
            test_id=test_obj.id,
            test_type="CCT",
            owner_researcher_id=researcher.id,
            stimulus_id=stimulus.id,
            stimulus_type="grapheme",
            trial_int=1,
            family="color",
            session_id=100,
            locale="en-US",
            diagnosis=True
        )
        db_session.add(analyzed)
        db_session.commit()
        
        assert analyzed.id is not None
        assert analyzed.user_id == participant.id
        assert analyzed.diagnosis is True
        assert analyzed.family == "color"

    def test_diagnosis_false(self, db_session, participant, test_obj):
        """Test negative diagnosis"""
        analyzed = AnalyzedTestData(
            user_id=participant.id,
            test_id=test_obj.id,
            test_type="CCT",
            family="color",
            diagnosis=False
        )
        db_session.add(analyzed)
        db_session.commit()
        
        assert analyzed.diagnosis is False

    def test_relationships(self, db_session, participant, researcher, test_obj):
        """Test all relationships"""
        stimulus = ColorStimulus(r=100, g=150, b=200, owner_researcher_id=researcher.id)
        db_session.add(stimulus)
        db_session.commit()
        
        analyzed = AnalyzedTestData(
            user_id=participant.id,
            test_id=test_obj.id,
            owner_researcher_id=researcher.id,
            stimulus_id=stimulus.id,
            test_type="CCT",
            family="color",
            diagnosis=True
        )
        db_session.add(analyzed)
        db_session.commit()
        
        assert analyzed.participant.name == "Test Participant"
        assert analyzed.test.name == "Grapheme-Color"
        assert analyzed.researcher.name == "Dr. Test"
        assert analyzed.stimulus.r == 100

    def test_to_dict(self, db_session, participant, test_obj):
        """Test to_dict serialization"""
        analyzed = AnalyzedTestData(
            user_id=participant.id,
            test_id=test_obj.id,
            test_type="CCT",
            family="color",
            diagnosis=True,
            locale="en-US"
        )
        db_session.add(analyzed)
        db_session.commit()
        
        data = analyzed.to_dict()
        assert data['user_id'] == participant.id
        assert data['test_type'] == "CCT"
        assert data['diagnosis'] is True
        assert data['family'] == "color"
        assert 'created_at' in data


# ======================================================
# Integration Tests
# ======================================================

class TestIntegration:
    def test_complete_color_test_workflow(self, db_session, researcher):
        """Test a complete workflow from stimulus to analysis"""
        # 1. Create stimulus
        stimulus = ColorStimulus(
            r=255, g=0, b=0,
            owner_researcher_id=researcher.id,
            trigger_type="letter",
            description="Letter A"
        )
        db_session.add(stimulus)
        db_session.commit()
        
        # 2. Create multiple trials
        participant_id = "P123"
        for i in range(3):
            trial = ColorTrial(
                participant_id=participant_id,
                stimulus_id=stimulus.id,
                trial_index=i + 1,
                selected_r=255,
                selected_g=0,
                selected_b=0,
                response_ms=2000 + i * 100
            )
            db_session.add(trial)
        db_session.commit()
        
        # 3. Verify trials are linked
        trials = ColorTrial.query.filter_by(participant_id=participant_id).all()
        assert len(trials) == 3
        assert all(t.stimulus.r == 255 for t in trials)
        
        # 4. Create aggregated test data
        test_data = TestData(
            user_id=participant_id,
            owner_researcher_id=researcher.id,
            stimulus_id=stimulus.id,
            test_type="CCT",
            family="color",
            cct_mean=5.2,
            cct_std=1.5,
            cct_pass=True
        )
        db_session.add(test_data)
        db_session.commit()
        
        # 5. Verify test data
        assert test_data.cct_pass is True
        assert test_data.stimulus.r == 255

    def test_cascade_delete(self, db_session, researcher):
        """Test cascade delete of stimulus and trials"""
        stimulus = ColorStimulus(r=100, g=150, b=200, owner_researcher_id=researcher.id)
        db_session.add(stimulus)
        db_session.commit()
        
        stimulus_id = stimulus.id
        
        # Create trials
        for i in range(3):
            trial = ColorTrial(
                participant_id="P123",
                stimulus_id=stimulus_id,
                trial_index=i + 1,
                selected_r=100,
                selected_g=150,
                selected_b=200
            )
            db_session.add(trial)
        db_session.commit()
        
        # Verify trials exist
        trials = ColorTrial.query.filter_by(stimulus_id=stimulus_id).all()
        assert len(trials) == 3
        
        # Delete stimulus
        db_session.delete(stimulus)
        db_session.commit()
        
        # Verify trials are deleted (cascade)
        trials = ColorTrial.query.filter_by(stimulus_id=stimulus_id).all()
        assert len(trials) == 0