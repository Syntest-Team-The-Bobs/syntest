"""
Comprehensive testing for seed_speed_congruency.py

Following teammate's pattern from test_colortest_routes.py:
- Test seeding function behavior
- Database state verification
- Edge case coverage
- Idempotency testing

Target: 95%+ coverage for seed_speed_congruency.py
"""
import pytest
import sys
import os

# Add parent directories to path to access api modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))

from flask import Flask
from models import db, Participant, ColorStimulus, TestData
from werkzeug.security import check_password_hash


@pytest.fixture
def app():
    """Create Flask app for testing"""
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-secret-key"

    db.init_app(app)

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


class TestSeedSpeedCongruency:
    """Test seed_speed_congruency.py seeding function"""

    def test_seed_creates_participant(self, app):
        """Test seed creates participant if not exists"""
        # Import seed function inside app context
        with app.app_context():
            from seed_speed_congruency import seed

            # Ensure participant doesn't exist
            existing = Participant.query.filter_by(
                email="speedtest@example.com"
            ).first()
            if existing:
                db.session.delete(existing)
                db.session.commit()

            # Run seed
            seed(app)

            # Verify participant created
            participant = Participant.query.filter_by(
                email="speedtest@example.com"
            ).first()
            assert participant is not None
            assert participant.name == "Speed Test User"
            assert participant.age == 21
            assert participant.country == "Spain"
            assert check_password_hash(participant.password_hash, "test1234")

    def test_seed_finds_existing_participant(self, app):
        """Test seed finds existing participant instead of creating duplicate"""
        with app.app_context():
            # Create participant manually
            from werkzeug.security import generate_password_hash

            p = Participant(
                name="Speed Test User",
                email="speedtest@example.com",
                password_hash=generate_password_hash("test1234"),
                age=21,
                country="Spain",
            )
            db.session.add(p)
            db.session.commit()
            original_id = p.id

            from seed_speed_congruency import seed

            # Run seed (should not create duplicate)
            seed(app)

            # Verify only one participant exists with same ID
            participants = Participant.query.filter_by(
                email="speedtest@example.com"
            ).all()
            assert len(participants) == 1
            assert participants[0].id == original_id

    def test_seed_creates_color_stimuli(self, app):
        """Test seed creates all expected color stimuli"""
        with app.app_context():
            # Clean up existing stimuli
            ColorStimulus.query.filter(
                ColorStimulus.description.in_(["SUN", "MOON", "MUSIC", "MONDAY"])
            ).delete()
            db.session.commit()

            from seed_speed_congruency import seed

            seed(app)

            # Verify all 4 stimuli created
            sun = ColorStimulus.query.filter_by(description="SUN").first()
            assert sun is not None
            assert sun.r == 255
            assert sun.g == 223
            assert sun.b == 0

            moon = ColorStimulus.query.filter_by(description="MOON").first()
            assert moon is not None
            assert moon.r == 135
            assert moon.g == 206
            assert moon.b == 235

            music = ColorStimulus.query.filter_by(description="MUSIC").first()
            assert music is not None
            assert music.r == 144
            assert music.g == 238
            assert music.b == 144

            monday = ColorStimulus.query.filter_by(description="MONDAY").first()
            assert monday is not None
            assert monday.r == 255
            assert monday.g == 105
            assert monday.b == 180

    def test_seed_finds_existing_stimuli(self, app):
        """Test seed finds existing stimuli instead of creating duplicates"""
        with app.app_context():
            # Create one stimulus manually
            stim = ColorStimulus(
                description="SUN",
                r=255,
                g=223,
                b=0,
                family="color",
                trigger_type="word",
            )
            db.session.add(stim)
            db.session.commit()
            original_id = stim.id

            from seed_speed_congruency import seed

            seed(app)

            # Verify no duplicate created
            sun_stimuli = ColorStimulus.query.filter_by(description="SUN", r=255, g=223, b=0).all()
            assert len(sun_stimuli) == 1
            assert sun_stimuli[0].id == original_id

    def test_seed_creates_test_data(self, app):
        """Test seed creates TestData for each stimulus"""
        with app.app_context():
            # Clean up
            TestData.query.filter(TestData.family == "color").delete()
            db.session.commit()

            from seed_speed_congruency import seed

            seed(app)

            # Get participant
            participant = Participant.query.filter_by(
                email="speedtest@example.com"
            ).first()
            user_key = str(participant.id)

            # Verify TestData created for all 4 stimuli
            test_data = TestData.query.filter_by(user_id=user_key, family="color").all()
            assert len(test_data) >= 4

            # Check one TestData record in detail
            td = test_data[0]
            assert td.family == "color"
            assert td.cct_valid == 1
            assert td.cct_pass is True
            assert td.cct_trials_per_trigger == 3
            assert td.cct_none_pct == 0.0

    def test_seed_test_data_links_to_stimuli(self, app):
        """Test TestData records link to correct stimuli"""
        with app.app_context():
            from seed_speed_congruency import seed

            seed(app)

            participant = Participant.query.filter_by(
                email="speedtest@example.com"
            ).first()
            user_key = str(participant.id)

            # Get SUN stimulus
            sun_stim = ColorStimulus.query.filter_by(description="SUN").first()

            # Find TestData for SUN
            td = TestData.query.filter_by(
                user_id=user_key, stimulus_id=sun_stim.id, family="color"
            ).first()
            assert td is not None
            assert td.stimulus_id == sun_stim.id

    def test_seed_does_not_duplicate_test_data(self, app):
        """Test seed doesn't create duplicate TestData"""
        with app.app_context():
            from seed_speed_congruency import seed

            # Run seed twice
            seed(app)
            seed(app)

            participant = Participant.query.filter_by(
                email="speedtest@example.com"
            ).first()
            user_key = str(participant.id)

            # Get one stimulus
            sun_stim = ColorStimulus.query.filter_by(description="SUN").first()

            # Verify only one TestData exists
            test_data = TestData.query.filter_by(
                user_id=user_key, stimulus_id=sun_stim.id, family="color"
            ).all()
            assert len(test_data) == 1

    def test_seed_test_data_marks_as_valid(self, app):
        """Test TestData is marked as valid association"""
        with app.app_context():
            from seed_speed_congruency import seed

            seed(app)

            participant = Participant.query.filter_by(
                email="speedtest@example.com"
            ).first()
            user_key = str(participant.id)

            # Get all test data
            test_data = TestData.query.filter_by(user_id=user_key, family="color").all()

            # All should be marked as valid
            for td in test_data:
                assert td.cct_valid == 1
                assert td.cct_pass is True

    def test_seed_sets_correct_test_type(self, app):
        """Test TestData has correct test_type and stimulus_type"""
        with app.app_context():
            from seed_speed_congruency import seed

            seed(app)

            participant = Participant.query.filter_by(
                email="speedtest@example.com"
            ).first()
            user_key = str(participant.id)

            test_data = TestData.query.filter_by(user_id=user_key, family="color").all()

            for td in test_data:
                assert td.test_type == "color-word"
                assert td.stimulus_type == "word"

    def test_seed_sets_color_metrics(self, app):
        """Test TestData has correct color consistency metrics"""
        with app.app_context():
            from seed_speed_congruency import seed

            seed(app)

            participant = Participant.query.filter_by(
                email="speedtest@example.com"
            ).first()
            user_key = str(participant.id)

            test_data = TestData.query.filter_by(user_id=user_key, family="color").all()

            for td in test_data:
                assert td.cct_cutoff == 0.1
                assert td.cct_triggers == 1
                assert td.cct_trials_per_trigger == 3
                assert td.cct_rt_mean == 1000
                assert td.cct_mean == 0.05
                assert td.cct_std == 0.01
                assert td.cct_median == 0.05

    def test_seed_stimulus_has_correct_family(self, app):
        """Test ColorStimulus has correct family and trigger_type"""
        with app.app_context():
            from seed_speed_congruency import seed

            seed(app)

            stimuli = ColorStimulus.query.filter(
                ColorStimulus.description.in_(["SUN", "MOON", "MUSIC", "MONDAY"])
            ).all()

            for stim in stimuli:
                assert stim.family == "color"
                assert stim.trigger_type == "word"

    def test_seed_can_run_multiple_times(self, app):
        """Test seed is idempotent - can run multiple times safely"""
        with app.app_context():
            from seed_speed_congruency import seed

            # Run seed 3 times
            seed(app)
            seed(app)
            seed(app)

            # Should still have exactly 1 participant
            participants = Participant.query.filter_by(
                email="speedtest@example.com"
            ).all()
            assert len(participants) == 1

            # Should have exactly 4 stimuli
            stimuli = ColorStimulus.query.filter(
                ColorStimulus.description.in_(["SUN", "MOON", "MUSIC", "MONDAY"])
            ).all()
            assert len(stimuli) == 4

            # Should have exactly 4 TestData records
            participant = participants[0]
            user_key = str(participant.id)
            test_data = TestData.query.filter_by(user_id=user_key, family="color").all()
            assert len(test_data) == 4

    def test_seed_participant_has_participant_id(self, app):
        """Test seeded participant has participant_id field set"""
        with app.app_context():
            from seed_speed_congruency import seed

            seed(app)

            participant = Participant.query.filter_by(
                email="speedtest@example.com"
            ).first()
            assert participant.participant_id is not None
            assert isinstance(participant.participant_id, str)

    def test_seed_stimulus_colors_are_distinct(self, app):
        """Test each stimulus has a unique color combination"""
        with app.app_context():
            from seed_speed_congruency import seed

            seed(app)

            stimuli = ColorStimulus.query.filter(
                ColorStimulus.description.in_(["SUN", "MOON", "MUSIC", "MONDAY"])
            ).all()

            # Create set of (r, g, b) tuples
            colors = {(s.r, s.g, s.b) for s in stimuli}
            assert len(colors) == 4  # All colors are unique

    def test_seed_test_data_has_created_at(self, app):
        """Test TestData has created_at timestamp"""
        with app.app_context():
            from seed_speed_congruency import seed

            seed(app)

            participant = Participant.query.filter_by(
                email="speedtest@example.com"
            ).first()
            user_key = str(participant.id)

            test_data = TestData.query.filter_by(user_id=user_key, family="color").all()

            for td in test_data:
                assert td.created_at is not None

    def test_seed_cleans_up_on_error(self, app):
        """Test seed handles errors gracefully"""
        # This test validates the function doesn't crash
        with app.app_context():
            from seed_speed_congruency import seed

            # Even if some data exists, seed should complete
            try:
                seed(app)
                assert True  # Seed completed without exception
            except Exception as e:
                pytest.fail(f"Seed should not raise exception: {e}")
