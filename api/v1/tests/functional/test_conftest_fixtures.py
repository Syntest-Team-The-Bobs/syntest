"""
Tests for conftest.py fixtures and helper functions.

These tests verify that all fixtures create valid objects and helper functions work correctly.
This ensures the test infrastructure is reliable for other tests.
"""


class TestAppFixture:
    """Test the app fixture."""

    def test_app_fixture_creates_app(self, app):
        """Test that app fixture creates a Flask app."""
        assert app is not None
        assert app.config["TESTING"] is True

    def test_app_has_test_database(self, app):
        """Test that app uses a test database."""
        uri = app.config["SQLALCHEMY_DATABASE_URI"]
        assert "sqlite" in uri or "postgresql" in uri

    def test_app_csrf_disabled(self, app):
        """Test that CSRF is disabled for testing."""
        assert app.config.get("WTF_CSRF_ENABLED", False) is False


class TestClientFixture:
    """Test the client fixture."""

    def test_client_fixture_creates_client(self, client):
        """Test that client fixture creates a test client."""
        assert client is not None

    def test_client_can_make_requests(self, client, app):
        """Test that client can make HTTP requests."""
        with app.app_context():
            # Use an API route that exists and returns a predictable response
            response = client.get("/api/v1/screening/consent")
            # Should get some response (200, 401, 404, or 405)
            assert response.status_code in [200, 401, 404, 405]


class TestRunnerFixture:
    """Test the runner fixture."""

    def test_runner_fixture_creates_runner(self, runner):
        """Test that runner fixture creates a CLI runner."""
        assert runner is not None


class TestDatabaseFixtures:
    """Test database-related fixtures."""

    def test_init_database_creates_tables(self, init_database, app):
        """Test that init_database creates all tables."""
        from models import Participant

        with app.app_context():
            # Should be able to query without error
            participants = Participant.query.all()
            assert isinstance(participants, list)

    def test_setup_database_auto_runs(self, app):
        """Test that setup_database fixture runs automatically."""
        from models import Participant

        with app.app_context():
            # Tables should exist due to autouse fixture
            participants = Participant.query.all()
            assert isinstance(participants, list)


class TestSampleParticipantFixture:
    """Test the sample_participant fixture."""

    def test_sample_participant_created(self, sample_participant, app):
        """Test that sample_participant creates a valid participant."""
        with app.app_context():
            assert sample_participant is not None
            assert sample_participant.id is not None
            assert sample_participant.participant_id == "P_TEST_001"
            assert sample_participant.name == "Test Participant"
            assert sample_participant.email == "test@example.com"

    def test_sample_participant_has_password_hash(self, sample_participant, app):
        """Test that sample_participant has a hashed password."""
        with app.app_context():
            assert sample_participant.password_hash is not None
            assert len(sample_participant.password_hash) > 0
            # Should be hashed, not plain text
            assert sample_participant.password_hash != "password123"

    def test_sample_participant_has_demographics(self, sample_participant, app):
        """Test that sample_participant has demographic info."""
        with app.app_context():
            assert sample_participant.age == 25
            assert sample_participant.country == "USA"

    def test_sample_participant_status(self, sample_participant, app):
        """Test that sample_participant has correct status."""
        with app.app_context():
            assert sample_participant.screening_completed is False
            assert sample_participant.status == "active"


class TestSampleResearcherFixture:
    """Test the sample_researcher fixture."""

    def test_sample_researcher_created(self, sample_researcher, app):
        """Test that sample_researcher creates a valid researcher."""
        with app.app_context():
            assert sample_researcher is not None
            assert sample_researcher.id is not None
            assert sample_researcher.name == "Dr. Test"
            assert sample_researcher.email == "researcher@example.com"

    def test_sample_researcher_has_institution(self, sample_researcher, app):
        """Test that sample_researcher has institution."""
        with app.app_context():
            assert sample_researcher.institution == "Test University"

    def test_sample_researcher_has_password_hash(self, sample_researcher, app):
        """Test that sample_researcher has a hashed password."""
        with app.app_context():
            assert sample_researcher.password_hash is not None
            assert sample_researcher.password_hash != "research123"


class TestSampleTestFixture:
    """Test the sample_test fixture."""

    def test_sample_test_created(self, sample_test, app):
        """Test that sample_test creates a valid test."""
        with app.app_context():
            assert sample_test is not None
            assert sample_test.id is not None
            assert sample_test.name == "Grapheme-Color Test"

    def test_sample_test_has_description(self, sample_test, app):
        """Test that sample_test has description."""
        with app.app_context():
            assert sample_test.description == "Tests grapheme-color synesthesia"

    def test_sample_test_has_type_and_duration(self, sample_test, app):
        """Test that sample_test has synesthesia type and duration."""
        with app.app_context():
            assert sample_test.synesthesia_type == "Grapheme-Color"
            assert sample_test.duration == 15


class TestSampleColorStimulusFixture:
    """Test the sample_color_stimulus fixture."""

    def test_sample_color_stimulus_created(self, sample_color_stimulus, app):
        """Test that sample_color_stimulus creates a valid stimulus."""
        with app.app_context():
            assert sample_color_stimulus is not None
            assert sample_color_stimulus.id is not None

    def test_sample_color_stimulus_has_color(self, sample_color_stimulus, app):
        """Test that sample_color_stimulus has RGB values."""
        with app.app_context():
            assert sample_color_stimulus.r == 255
            assert sample_color_stimulus.g == 0
            assert sample_color_stimulus.b == 0

    def test_sample_color_stimulus_has_metadata(self, sample_color_stimulus, app):
        """Test that sample_color_stimulus has metadata."""
        with app.app_context():
            assert sample_color_stimulus.set_id == 1
            assert sample_color_stimulus.description == "Red color"
            assert sample_color_stimulus.family == "color"
            assert sample_color_stimulus.trigger_type == "letter"

    def test_sample_color_stimulus_has_owner(
        self, sample_color_stimulus, sample_researcher, app
    ):
        """Test that sample_color_stimulus is linked to researcher."""
        with app.app_context():
            assert sample_color_stimulus.owner_researcher_id == sample_researcher.id


class TestMultipleStimuliFixture:
    """Test the multiple_stimuli fixture."""

    def test_multiple_stimuli_created(self, multiple_stimuli, app):
        """Test that multiple_stimuli creates 5 stimuli."""
        with app.app_context():
            assert multiple_stimuli is not None
            assert len(multiple_stimuli) == 5

    def test_multiple_stimuli_have_different_colors(self, multiple_stimuli, app):
        """Test that stimuli have different colors."""
        with app.app_context():
            colors = [(s.r, s.g, s.b) for s in multiple_stimuli]
            # All colors should be unique
            assert len(set(colors)) == 5

    def test_multiple_stimuli_have_different_triggers(self, multiple_stimuli, app):
        """Test that stimuli have different trigger types."""
        with app.app_context():
            triggers = [s.trigger_type for s in multiple_stimuli]
            expected = ["A", "B", "C", "D", "E"]
            assert triggers == expected


class TestSampleColorTrialFixture:
    """Test the sample_color_trial fixture."""

    def test_sample_color_trial_created(self, sample_color_trial, app):
        """Test that sample_color_trial creates a valid trial."""
        with app.app_context():
            assert sample_color_trial is not None
            assert sample_color_trial.id is not None

    def test_sample_color_trial_has_participant(
        self, sample_color_trial, sample_participant, app
    ):
        """Test that trial is linked to participant."""
        with app.app_context():
            assert (
                sample_color_trial.participant_id == sample_participant.participant_id
            )

    def test_sample_color_trial_has_stimulus(
        self, sample_color_trial, sample_color_stimulus, app
    ):
        """Test that trial is linked to stimulus."""
        with app.app_context():
            assert sample_color_trial.stimulus_id == sample_color_stimulus.id

    def test_sample_color_trial_has_response(self, sample_color_trial, app):
        """Test that trial has response data."""
        with app.app_context():
            assert sample_color_trial.selected_r == 255
            assert sample_color_trial.selected_g == 0
            assert sample_color_trial.selected_b == 0
            assert sample_color_trial.response_ms == 1200

    def test_sample_color_trial_has_meta(self, sample_color_trial, app):
        """Test that trial has meta JSON."""
        with app.app_context():
            assert sample_color_trial.meta_json is not None
            assert sample_color_trial.meta_json.get("test_type") == "letter"
            assert sample_color_trial.meta_json.get("stimulus") == "A"


class TestAuthParticipantFixture:
    """Test the auth_participant fixture."""

    def test_auth_participant_returns_participant(
        self, auth_participant, sample_participant, app
    ):
        """Test that auth_participant returns the participant."""
        with app.app_context():
            assert auth_participant is not None
            assert auth_participant.id == sample_participant.id

    def test_auth_participant_sets_session(self, client, auth_participant, app):
        """Test that auth_participant sets session variables."""
        with app.app_context():
            with client.session_transaction() as sess:
                assert sess.get("user_id") == auth_participant.id
                assert sess.get("user_role") == "participant"


class TestAuthResearcherFixture:
    """Test the auth_researcher fixture."""

    def test_auth_researcher_returns_researcher(
        self, auth_researcher, sample_researcher, app
    ):
        """Test that auth_researcher returns the researcher."""
        with app.app_context():
            assert auth_researcher is not None
            assert auth_researcher.id == sample_researcher.id

    def test_auth_researcher_sets_session(self, client, auth_researcher, app):
        """Test that auth_researcher sets session variables."""
        with app.app_context():
            with client.session_transaction() as sess:
                assert sess.get("user_id") == auth_researcher.id
                assert sess.get("user_role") == "researcher"


class TestClientLoggedOutFixture:
    """Test the client_logged_out fixture."""

    def test_client_logged_out_clears_session(self, client_logged_out, app):
        """Test that client_logged_out has empty session."""
        with app.app_context():
            with client_logged_out.session_transaction() as sess:
                assert sess.get("user_id") is None
                assert sess.get("user_role") is None


class TestClientLoggedInFixture:
    """Test the client_logged_in fixture."""

    def test_client_logged_in_returns_tuple(self, client_logged_in, app):
        """Test that client_logged_in returns (client, user) tuple."""
        with app.app_context():
            assert isinstance(client_logged_in, tuple)
            assert len(client_logged_in) == 2

    def test_client_logged_in_has_session(self, client_logged_in, app):
        """Test that client_logged_in has authenticated session."""
        with app.app_context():
            client, user = client_logged_in
            with client.session_transaction() as sess:
                assert sess.get("user_id") == user.id
                assert sess.get("user_role") == "participant"


class TestClientLoggedInScreenedFixture:
    """Test the client_logged_in_screened fixture."""

    def test_client_logged_in_screened_returns_tuple(
        self, client_logged_in_screened, app
    ):
        """Test that client_logged_in_screened returns (client, user) tuple."""
        with app.app_context():
            assert isinstance(client_logged_in_screened, tuple)
            assert len(client_logged_in_screened) == 2


class TestCompletedScreeningFixture:
    """Test the completed_screening fixture."""

    def test_completed_screening_created(self, completed_screening, app):
        """Test that completed_screening creates a session."""
        with app.app_context():
            assert completed_screening is not None
            assert completed_screening.id is not None

    def test_completed_screening_has_correct_status(self, completed_screening, app):
        """Test that screening session has completed status."""
        with app.app_context():
            assert completed_screening.status == "completed"
            assert completed_screening.consent_given is True
            assert completed_screening.eligible is True

    def test_completed_screening_has_selected_types(self, completed_screening, app):
        """Test that screening session has selected types."""
        with app.app_context():
            assert completed_screening.selected_types == ["Grapheme-Color"]

    def test_completed_screening_has_timestamps(self, completed_screening, app):
        """Test that screening session has timestamps."""
        with app.app_context():
            assert completed_screening.started_at is not None
            assert completed_screening.completed_at is not None


class TestSampleTrialsBatchFixture:
    """Test the sample_trials_batch fixture."""

    def test_sample_trials_batch_created(self, sample_trials_batch, app):
        """Test that sample_trials_batch creates 10 trials."""
        with app.app_context():
            assert sample_trials_batch is not None
            assert len(sample_trials_batch) == 10

    def test_sample_trials_batch_have_indices(self, sample_trials_batch, app):
        """Test that trials have sequential indices."""
        with app.app_context():
            indices = [t.trial_index for t in sample_trials_batch]
            assert indices == list(range(1, 11))

    def test_sample_trials_batch_have_varied_colors(self, sample_trials_batch, app):
        """Test that trials have varied color values."""
        with app.app_context():
            colors = [
                (t.selected_r, t.selected_g, t.selected_b) for t in sample_trials_batch
            ]
            # Colors should vary
            unique_colors = set(colors)
            assert len(unique_colors) > 1

    def test_sample_trials_batch_have_meta(self, sample_trials_batch, app):
        """Test that trials have meta JSON."""
        with app.app_context():
            for trial in sample_trials_batch:
                assert trial.meta_json is not None
                assert trial.meta_json.get("trial_set") == "batch_1"


class TestHelperFunctions:
    """Test helper functions in conftest."""

    def test_create_participant_helper(self, app):
        """Test create_participant helper function."""
        from v1.tests.conftest import create_participant

        with app.app_context():
            participant = create_participant(
                name="Helper Test", email="helper@test.com"
            )
            assert participant is not None
            assert participant.id is not None
            assert participant.name == "Helper Test"
            assert participant.email == "helper@test.com"

    def test_create_participant_default_values(self, app):
        """Test create_participant uses defaults."""
        from v1.tests.conftest import create_participant

        with app.app_context():
            participant = create_participant()
            assert participant.name == "Test User"
            assert participant.email == "test@test.com"
            assert participant.age == 25
            assert participant.country == "USA"

    def test_create_trial_helper(self, app, sample_participant):
        """Test create_trial helper function."""
        from v1.tests.conftest import create_trial

        with app.app_context():
            trial = create_trial(
                participant_id=sample_participant.participant_id,
                r=200,
                g=100,
                b=50,
                trial_index=5,
            )
            assert trial is not None
            assert trial.id is not None
            assert trial.selected_r == 200
            assert trial.selected_g == 100
            assert trial.selected_b == 50
            assert trial.trial_index == 5

    def test_create_trial_default_values(self, app, sample_participant):
        """Test create_trial uses defaults."""
        from v1.tests.conftest import create_trial

        with app.app_context():
            trial = create_trial(participant_id=sample_participant.participant_id)
            assert trial.selected_r == 128
            assert trial.selected_g == 128
            assert trial.selected_b == 128
            assert trial.trial_index == 1
            assert trial.response_ms == 1000
