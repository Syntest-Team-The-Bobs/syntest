"""
Strategic model tests to reach 95%+ coverage
Targets missing lines in ScreeningTestData.to_dict() and ScreeningSession.finalize()
Replace your current test_color_models.py with this file
"""

import pytest
from models import (
    Participant, Researcher, Test, TestResult, ScreeningResponse,
    ScreeningSession, ScreeningHealth, ScreeningDefinition, 
    ScreeningPainEmotion, ScreeningTypeChoice, ScreeningEvent,
    ScreeningRecommendedTest, TestData, AnalyzedTestData, SpeedCongruency,
    ScreeningTestData,
    db, YesNo, YesNoMaybe, Frequency
)
from datetime import datetime, timezone
import sys
from unittest.mock import MagicMock


class TestParticipantModel:
    """Tests for Participant model coverage"""

    def test_participant_repr(self, app, sample_participant):
        """Test __repr__ method"""
        with app.app_context():
            repr_str = repr(sample_participant)
            assert '<Participant' in repr_str
            assert sample_participant.participant_id in repr_str

    def test_participant_auto_id_generation(self, app):
        """Test automatic participant_id generation"""
        with app.app_context():
            p = Participant(
                name="Test User",
                email="auto@test.com",
                password_hash="hash123"
            )
            db.session.add(p)
            db.session.commit()
            
            assert p.participant_id is not None
            assert p.participant_id.startswith('P')
            assert len(p.participant_id) == 13

    def test_participant_relationships(self, app, sample_participant):
        """Test participant relationships are accessible"""
        with app.app_context():
            assert hasattr(sample_participant, 'test_results')
            assert hasattr(sample_participant, 'screenings')
            assert hasattr(sample_participant, 'screening_sessions')


class TestResearcherModel:
    """Tests for Researcher model coverage"""

    def test_researcher_repr(self, app, sample_researcher):
        """Test __repr__ method"""
        with app.app_context():
            repr_str = repr(sample_researcher)
            assert '<Researcher' in repr_str
            assert sample_researcher.email in repr_str


class TestTestModel:
    """Tests for Test model coverage"""

    def test_test_repr(self, app):
        """Test __repr__ method"""
        with app.app_context():
            test = Test(
                name="Color Test",
                description="Test for color synesthesia",
                synesthesia_type="grapheme-color",
                duration=15
            )
            db.session.add(test)
            db.session.commit()
            
            repr_str = repr(test)
            assert '<Test' in repr_str
            assert 'Color Test' in repr_str


class TestTestResultModel:
    """Tests for TestResult model coverage"""

    def test_test_result_repr(self, app, sample_participant):
        """Test __repr__ method"""
        with app.app_context():
            test = Test(name="Sample Test")
            db.session.add(test)
            db.session.commit()
            
            result = TestResult(
                participant_id=sample_participant.id,
                test_id=test.id,
                status="completed"
            )
            db.session.add(result)
            db.session.commit()
            
            repr_str = repr(result)
            assert '<TestResult' in repr_str
            assert f'P:{sample_participant.id}' in repr_str


class TestScreeningResponseModel:
    """Tests for ScreeningResponse model coverage"""

    def test_screening_response_repr(self, app, sample_participant):
        """Test __repr__ method"""
        with app.app_context():
            response = ScreeningResponse(
                participant_id=sample_participant.id,
                responses={"q1": "yes"},
                eligible=True
            )
            db.session.add(response)
            db.session.commit()
            
            repr_str = repr(response)
            assert '<ScreeningResponse' in repr_str


class TestScreeningSessionModel:
    """Tests for ScreeningSession model - CRITICAL FOR COVERAGE"""

    def test_screening_session_repr(self, app, sample_participant):
        """Test __repr__ method"""
        with app.app_context():
            session = ScreeningSession(
                participant_id=sample_participant.id,
                status="in_progress",
                consent_given=True
            )
            db.session.add(session)
            db.session.commit()
            
            repr_str = repr(session)
            assert '<ScreeningSession' in repr_str
            assert f'P={sample_participant.id}' in repr_str

    def test_screening_session_record_event(self, app, sample_participant):
        """Test record_event convenience method"""
        with app.app_context():
            session = ScreeningSession(
                participant_id=sample_participant.id,
                consent_given=True
            )
            db.session.add(session)
            db.session.commit()
            
            session.record_event(
                step=1,
                event='consent_given',
                details={'timestamp': 'now'}
            )
            db.session.commit()
            
            assert len(session.events) == 1

    def test_screening_session_finalize_calls_services(self, app, sample_participant):
        """CRITICAL: Test finalize method to hit lines 448-465"""
        with app.app_context():
            # Create mock services
            eligibility_called = []
            recommendation_called = []
            
            class MockEligibilityService:
                @staticmethod
                def compute_eligibility_and_exit(session):
                    eligibility_called.append(True)
                    session.eligible = True
                    session.exit_code = None
            
            class MockRecommendationService:
                @staticmethod
                def compute_recommendations(session):
                    recommendation_called.append(True)
            
            class MockTypeSelectionService:
                pass
            
            # Mock the services module
            mock_services = MagicMock()
            mock_services.EligibilityService = MockEligibilityService
            mock_services.RecommendationService = MockRecommendationService
            mock_services.TypeSelectionService = MockTypeSelectionService
            
            # Inject into sys.modules BEFORE creating session
            sys.modules['services'] = mock_services
            
            try:
                session = ScreeningSession(
                    participant_id=sample_participant.id,
                    consent_given=True,
                    status="in_progress"
                )
                db.session.add(session)
                db.session.commit()
                
                # This should hit lines 448, 453, 458, 462, 465
                session.finalize()
                db.session.commit()
                
                # Verify the service methods were actually called
                assert len(eligibility_called) == 1, "EligibilityService not called"
                assert len(recommendation_called) == 1, "RecommendationService not called"
                assert session.status == "completed"
                assert session.completed_at is not None
            finally:
                if 'services' in sys.modules:
                    del sys.modules['services']

    def test_screening_session_finalize_ineligible_path(self, app, sample_participant):
        """Test finalize with ineligible result (exited status)"""
        with app.app_context():
            class MockEligibilityService:
                @staticmethod
                def compute_eligibility_and_exit(session):
                    session.eligible = False
                    session.exit_code = "BC"
            
            class MockRecommendationService:
                @staticmethod
                def compute_recommendations(session):
                    pass
            
            class MockTypeSelectionService:
                pass
            
            mock_services = MagicMock()
            mock_services.EligibilityService = MockEligibilityService
            mock_services.RecommendationService = MockRecommendationService
            mock_services.TypeSelectionService = MockTypeSelectionService
            
            sys.modules['services'] = mock_services
            
            try:
                session = ScreeningSession(
                    participant_id=sample_participant.id,
                    consent_given=True,
                    status="in_progress"
                )
                db.session.add(session)
                db.session.commit()
                
                session.finalize()
                
                assert session.status == "exited"
                assert session.eligible is False
            finally:
                if 'services' in sys.modules:
                    del sys.modules['services']


class TestScreeningHealthModel:
    """Tests for ScreeningHealth model"""

    def test_screening_health_repr(self, app, sample_participant):
        """Test __repr__ method"""
        with app.app_context():
            session = ScreeningSession(
                participant_id=sample_participant.id,
                consent_given=True
            )
            db.session.add(session)
            db.session.commit()
            
            health = ScreeningHealth(
                session_id=session.id,
                drug_use=False,
                neuro_condition=False,
                medical_treatment=False
            )
            db.session.add(health)
            db.session.commit()
            
            repr_str = repr(health)
            assert '<ScreeningHealth' in repr_str

    def test_screening_health_all_true(self, app, sample_participant):
        """Test ScreeningHealth with all conditions True"""
        with app.app_context():
            session = ScreeningSession(
                participant_id=sample_participant.id,
                consent_given=True
            )
            db.session.add(session)
            db.session.commit()
            
            health = ScreeningHealth(
                session_id=session.id,
                drug_use=True,
                neuro_condition=True,
                medical_treatment=True
            )
            db.session.add(health)
            db.session.commit()
            
            assert health.drug_use is True


class TestScreeningDefinitionModel:
    """Tests for ScreeningDefinition model"""

    def test_screening_definition_all_answers(self, app, sample_participant):
        """Test all possible answer values"""
        with app.app_context():
            session = ScreeningSession(
                participant_id=sample_participant.id,
                consent_given=True
            )
            db.session.add(session)
            db.session.commit()
            
            for answer in [YesNoMaybe.yes, YesNoMaybe.no, YesNoMaybe.maybe]:
                definition = ScreeningDefinition(
                    session_id=session.id,
                    answer=answer
                )
                db.session.add(definition)
            db.session.commit()


class TestScreeningPainEmotionModel:
    """Tests for ScreeningPainEmotion model"""

    def test_screening_pain_emotion_repr(self, app, sample_participant):
        """Test __repr__ method"""
        with app.app_context():
            session = ScreeningSession(
                participant_id=sample_participant.id,
                consent_given=True
            )
            db.session.add(session)
            db.session.commit()
            
            pain = ScreeningPainEmotion(
                session_id=session.id,
                answer=YesNo.no
            )
            db.session.add(pain)
            db.session.commit()
            
            repr_str = repr(pain)
            assert '<ScreeningPainEmotion' in repr_str


class TestScreeningTypeChoiceModel:
    """Tests for ScreeningTypeChoice model"""

    def test_screening_type_choice_all_frequencies(self, app, sample_participant):
        """Test all frequency values"""
        with app.app_context():
            session = ScreeningSession(
                participant_id=sample_participant.id,
                consent_given=True
            )
            db.session.add(session)
            db.session.commit()
            
            choice = ScreeningTypeChoice(
                session_id=session.id,
                grapheme=Frequency.yes,
                music=Frequency.sometimes,
                lexical=Frequency.no
            )
            db.session.add(choice)
            db.session.commit()
            
            assert choice.grapheme == Frequency.yes


class TestScreeningEventModel:
    """Tests for ScreeningEvent model"""

    def test_screening_event_repr(self, app, sample_participant):
        """Test __repr__ method"""
        with app.app_context():
            session = ScreeningSession(
                participant_id=sample_participant.id,
                consent_given=True
            )
            db.session.add(session)
            db.session.commit()
            
            event = ScreeningEvent(
                session_id=session.id,
                step=2,
                event='continue',
                details={}
            )
            db.session.add(event)
            db.session.commit()
            
            repr_str = repr(event)
            assert '<ScreeningEvent' in repr_str


class TestScreeningRecommendedTestModel:
    """Tests for ScreeningRecommendedTest model"""

    def test_screening_recommended_test_repr(self, app, sample_participant):
        """Test __repr__ method"""
        with app.app_context():
            session = ScreeningSession(
                participant_id=sample_participant.id,
                consent_given=True
            )
            db.session.add(session)
            db.session.commit()
            
            rec = ScreeningRecommendedTest(
                session_id=session.id,
                position=1,
                suggested_name='Grapheme-Color',
                reason='Based on responses'
            )
            db.session.add(rec)
            db.session.commit()
            
            repr_str = repr(rec)
            assert '<ScreeningRecommendedTest' in repr_str


class TestTestDataModel:
    """Tests for TestData model"""

    def test_test_data_repr(self, app):
        """Test __repr__ method"""
        with app.app_context():
            data = TestData(
                user_id='P_TEST',
                test_type='cct',
                family='color',
                cct_mean=50.0,
                cct_pass=True
            )
            db.session.add(data)
            db.session.commit()
            
            repr_str = repr(data)
            assert '<TestData' in repr_str

    def test_test_data_get_consistency_score(self, app):
        """Test get_consistency_score method"""
        with app.app_context():
            data1 = TestData(
                user_id='P_TEST',
                cct_mean=100.0,
                cct_std=10.0
            )
            score1 = data1.get_consistency_score()
            assert score1 == 0.9
    
    def test_test_data_get_consistency_score_none(self, app):
        """Test get_consistency_score when cct_mean is None - hits line 300"""
        with app.app_context():
            data = TestData(
                user_id='P_TEST',
                cct_mean=None,
                cct_std=10.0
            )
            score = data.get_consistency_score()
            assert score is None
    
    def test_test_data_get_consistency_score_zero_mean(self, app):
        """Test get_consistency_score when cct_mean is 0 - hits line 300"""
        with app.app_context():
            data = TestData(
                user_id='P_TEST',
                cct_mean=0.0,
                cct_std=10.0
            )
            score = data.get_consistency_score()
            assert score is None

    def test_test_data_to_dict(self, app):
        """Test to_dict method"""
        with app.app_context():
            data = TestData(
                user_id='P_TEST',
                test_type='cct',
                cct_mean=75.0,
                cct_pass=True
            )
            
            result = data.to_dict()
            assert result['user_id'] == 'P_TEST'


class TestColorStimulusModel:
    """Tests for ColorStimulus model to hit line 341"""
    
    def test_color_stimulus_distance_to(self, app, sample_researcher):
        """Test distance_to method - hits line 341"""
        with app.app_context():
            from models import ColorStimulus
            
            stimulus = ColorStimulus(
                r=255,
                g=0,
                b=0,
                owner_researcher_id=sample_researcher.id,
                trigger_type='letter_a'
            )
            db.session.add(stimulus)
            db.session.commit()
            
            # Test distance calculation
            distance = stimulus.distance_to(255, 255, 0)
            assert distance == 255.0  # Distance from red to yellow
    
    def test_color_stimulus_hex_color(self, app, sample_researcher):
        """Test hex_color property"""
        with app.app_context():
            from models import ColorStimulus
            
            stimulus = ColorStimulus(
                r=255,
                g=128,
                b=64,
                owner_researcher_id=sample_researcher.id
            )
            db.session.add(stimulus)
            db.session.commit()
            
            # Test hex color property
            assert stimulus.hex_color == "#ff8040"
    
    def test_color_stimulus_rgb_tuple(self, app, sample_researcher):
        """Test rgb_tuple property"""
        with app.app_context():
            from models import ColorStimulus
            
            stimulus = ColorStimulus(
                r=100,
                g=150,
                b=200,
                owner_researcher_id=sample_researcher.id
            )
            db.session.add(stimulus)
            db.session.commit()
            
            # Test rgb tuple property
            assert stimulus.rgb_tuple == (100, 150, 200)
    
    def test_color_stimulus_to_dict(self, app, sample_researcher):
        """Test to_dict method"""
        with app.app_context():
            from models import ColorStimulus
            
            stimulus = ColorStimulus(
                r=50,
                g=100,
                b=150,
                owner_researcher_id=sample_researcher.id,
                trigger_type='test'
            )
            db.session.add(stimulus)
            db.session.commit()
            
            result = stimulus.to_dict()
            assert result['r'] == 50
            assert result['g'] == 100
            assert result['b'] == 150
            assert result['hex'] == "#326496"


class TestScreeningTestDataModel:
    """CRITICAL: Tests for ScreeningTestData - targeting lines 530-578"""

    def test_screening_test_data_repr(self, app, sample_participant):
        """Test __repr__ method"""
        with app.app_context():
            test_data = ScreeningTestData(
                user_id=sample_participant.id,
                test_code='GC-SCT',
                status='completed'
            )
            db.session.add(test_data)
            db.session.commit()
            
            repr_str = repr(test_data)
            assert '<ScreeningTestData' in repr_str

    def test_screening_test_data_to_dict_all_none_timestamps(self, app, sample_participant):
        """CRITICAL: Test to_dict with ALL timestamps as None (hits lines 535, 544, 552, 562, 574)"""
        with app.app_context():
            test_data = ScreeningTestData(
                user_id=sample_participant.id,
                test_code='GC-SCT',
                version='1.0',
                started_at=None,
                completed_at=None,
                status='in_progress'
            )
            db.session.add(test_data)
            db.session.commit()
            
            result = test_data.to_dict()
            
            # These should all be None
            assert result['started_at'] is None
            assert result['completed_at'] is None
            assert result['user_id'] == sample_participant.id
            assert result['test_code'] == 'GC-SCT'

    def test_screening_test_data_to_dict_all_populated_timestamps(self, app, sample_participant):
        """CRITICAL: Test to_dict with ALL timestamps populated (hits lines 536-539, 545-548, 553-558, 563-570, 575)"""
        with app.app_context():
            now = datetime.now(timezone.utc)
            test_data = ScreeningTestData(
                user_id=sample_participant.id,
                test_code='GC-SCT',
                version='2.0',
                started_at=now,
                completed_at=now,
                status='completed',
                rt_mean_ms=500,
                accuracy=0.95,
                consistency_score=0.85,
                result_label='Likely synesthete',
                likelihood_score=0.9,
                recommendation='Continue testing'
            )
            db.session.add(test_data)
            db.session.commit()
            
            result = test_data.to_dict()
            
            # These should all be ISO format strings
            assert result['started_at'] is not None
            assert isinstance(result['started_at'], str)
            assert result['completed_at'] is not None
            assert isinstance(result['completed_at'], str)
            assert result['created_at'] is not None
            assert isinstance(result['created_at'], str)
            
            # Check all other fields
            assert result['user_id'] == sample_participant.id
            assert result['test_code'] == 'GC-SCT'
            assert result['version'] == '2.0'
            assert result['status'] == 'completed'
            assert result['rt_mean_ms'] == 500
            assert result['accuracy'] == 0.95
            assert result['consistency_score'] == 0.85
            assert result['result_label'] == 'Likely synesthete'
            assert result['likelihood_score'] == 0.9
            assert result['recommendation'] == 'Continue testing'

    def test_screening_test_data_to_dict_mixed_timestamps(self, app, sample_participant):
        """CRITICAL: Test to_dict with mixed timestamps (started populated, completed None)"""
        with app.app_context():
            now = datetime.now(timezone.utc)
            test_data = ScreeningTestData(
                user_id=sample_participant.id,
                test_code='GC-SCT',
                started_at=now,
                completed_at=None
            )
            db.session.add(test_data)
            db.session.commit()
            
            result = test_data.to_dict()
            
            assert result['started_at'] is not None
            assert result['completed_at'] is None

    def test_screening_test_data_to_dict_reverse_mixed_timestamps(self, app, sample_participant):
        """CRITICAL: Test to_dict with reverse mixed (started None, completed populated)"""
        with app.app_context():
            now = datetime.now(timezone.utc)
            test_data = ScreeningTestData(
                user_id=sample_participant.id,
                test_code='GC-SCT',
                started_at=None,
                completed_at=now
            )
            db.session.add(test_data)
            db.session.commit()
            
            result = test_data.to_dict()
            
            assert result['started_at'] is None
            assert result['completed_at'] is not None

    def test_screening_test_data_to_dict_minimal_fields(self, app, sample_participant):
        """Test to_dict with only required fields"""
        with app.app_context():
            test_data = ScreeningTestData(
                user_id=sample_participant.id,
                test_code='MINIMAL'
            )
            db.session.add(test_data)
            db.session.commit()
            
            result = test_data.to_dict()
            
            assert result['test_code'] == 'MINIMAL'
            assert result['version'] is None
            assert result['status'] is None


class TestSpeedCongruencyModel:
    """Tests for SpeedCongruency model"""

    def test_speed_congruency_to_dict(self, app):
        """Test to_dict method"""
        with app.app_context():
            speed = SpeedCongruency(
                participant_id='P_TEST',
                trial_index=1,
                cue_word='TEST',
                chosen_name='red',
                matched=True,
                response_ms=500
            )
            
            result = speed.to_dict()
            assert result['participant_id'] == 'P_TEST'


class TestAnalyzedTestDataModel:
    """Tests for AnalyzedTestData model"""

    def test_analyzed_test_data_repr(self, app, sample_participant):
        """Test __repr__ method"""
        with app.app_context():
            analyzed = AnalyzedTestData(
                user_id=sample_participant.id,
                test_type='color_consistency',
                family='color',
                diagnosis=True
            )
            db.session.add(analyzed)
            db.session.commit()
            
            repr_str = repr(analyzed)
            assert '<AnalyzedTestData' in repr_str

    def test_analyzed_test_data_to_dict(self, app, sample_participant):
        """Test to_dict method"""
        with app.app_context():
            analyzed = AnalyzedTestData(
                user_id=sample_participant.id,
                test_type='color_consistency',
                family='color',
                diagnosis=True
            )
            
            result = analyzed.to_dict()
            assert result['diagnosis'] is True


class TestMissingLinesCritical:
    """CRITICAL: Additional tests to push from 94% to 95%"""
    
    def test_consistency_score_edge_case_1(self, app):
        """Edge case: cct_std is None"""
        with app.app_context():
            data = TestData(user_id='P_TEST', cct_mean=50.0, cct_std=None)
            score = data.get_consistency_score()
            assert score is None
    
    def test_consistency_score_edge_case_2(self, app):
        """Edge case: cct_mean is negative"""  
        with app.app_context():
            data = TestData(user_id='P_TEST', cct_mean=-10.0, cct_std=5.0)
            score = data.get_consistency_score()
            assert score is None
    
    def test_consistency_score_edge_case_3(self, app):
        """Edge case: both None"""
        with app.app_context():
            data = TestData(user_id='P_TEST', cct_mean=None, cct_std=None)
            score = data.get_consistency_score()
            assert score is None
            
    def test_consistency_score_edge_case_4(self, app):
        """Edge case: std > mean"""
        with app.app_context():
            data = TestData(user_id='P_TEST', cct_mean=10.0, cct_std=50.0)
            score = data.get_consistency_score()
            # This should return a score (negative is clamped to 0 by min function)
            assert score is not None