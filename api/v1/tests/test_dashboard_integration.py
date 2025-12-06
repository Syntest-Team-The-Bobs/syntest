"""
Tests for Dashboard API integration with Color Tests
Tests how color test data appears in participant dashboards
Target: Coverage of dashboard.py color test integration
"""

import pytest
from models import (
    db,
    Participant,
    TestResult,
    Test,
    ScreeningSession,
    ScreeningRecommendedTest,
    ColorTrial
)
from datetime import datetime, timezone


class TestDashboardColorTestIntegration:
    """Test dashboard endpoints with color test data"""

    def test_dashboard_with_no_tests(self, client, auth_participant):
        """Test dashboard for participant with no test results"""
        response = client.get('/api/v1/participant/dashboard/')
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert data['tests_completed'] == 0
        assert data['tests_pending'] == 0
        assert data['completion_percentage'] == 0

    def test_dashboard_with_completed_color_tests(self, client, auth_participant, sample_test, app):
        """Test dashboard shows completed color tests"""
        with app.app_context():
            # Create completed test result
            result = TestResult(
                participant_id=auth_participant.id,
                test_id=sample_test.id,
                status='completed',
                consistency_score=0.85,
                completed_at=datetime.now(timezone.utc)
            )
            db.session.add(result)
            db.session.commit()

        response = client.get('/api/v1/participant/dashboard/')
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert data['tests_completed'] == 1
        assert data['completion_percentage'] > 0

    def test_dashboard_with_pending_tests(self, client, auth_participant, sample_test, app):
        """Test dashboard shows pending color tests"""
        with app.app_context():
            # Create not_started test result
            result = TestResult(
                participant_id=auth_participant.id,
                test_id=sample_test.id,
                status='not_started'
            )
            db.session.add(result)
            db.session.commit()

        response = client.get('/api/v1/participant/dashboard/')
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert data['tests_pending'] >= 1
        assert data['tests_completed'] == 0

    def test_dashboard_with_in_progress_tests(self, client, auth_participant, sample_test, app):
        """Test dashboard counts in_progress tests as pending"""
        with app.app_context():
            result = TestResult(
                participant_id=auth_participant.id,
                test_id=sample_test.id,
                status='in_progress',
                started_at=datetime.now(timezone.utc)
            )
            db.session.add(result)
            db.session.commit()

        response = client.get('/api/v1/participant/dashboard/')
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert data['tests_pending'] >= 1

    def test_dashboard_completion_percentage_calculation(self, client, auth_participant, app):
        """Test completion percentage calculation"""
        with app.app_context():
            # Create multiple tests
            tests = []
            for i in range(4):
                test = Test(
                    name=f'Color Test {i}',
                    synesthesia_type='Grapheme-Color',
                    duration=10
                )
                tests.append(test)
                db.session.add(test)
            db.session.commit()

            # 2 completed, 2 not started
            for i, test in enumerate(tests):
                status = 'completed' if i < 2 else 'not_started'
                result = TestResult(
                    participant_id=auth_participant.id,
                    test_id=test.id,
                    status=status
                )
                db.session.add(result)
            db.session.commit()

        response = client.get('/api/v1/participant/dashboard/')
        data = response.get_json()
        
        # 2/4 = 50%
        assert data['completion_percentage'] == 50

    def test_dashboard_unauthenticated(self, client):
        """Test dashboard requires authentication"""
        response = client.get('/api/v1/participant/dashboard/')
        
        assert response.status_code == 401
        data = response.get_json()
        assert 'error' in data

    def test_dashboard_recommended_tests_from_screening(self, client, auth_participant, sample_test, app):
        """Test dashboard shows recommended tests from screening"""
        with app.app_context():
            # Create completed screening session
            screening = ScreeningSession(
                participant_id=auth_participant.id,
                status='completed',
                eligible=True,
                consent_given=True,
                completed_at=datetime.now(timezone.utc)
            )
            db.session.add(screening)
            db.session.commit()

            # Add recommended test
            rec = ScreeningRecommendedTest(
                session_id=screening.id,
                position=1,
                suggested_name='Grapheme-Color Test',
                reason='You indicated grapheme-color experiences',
                test_id=sample_test.id
            )
            db.session.add(rec)
            db.session.commit()

        response = client.get('/api/v1/participant/dashboard/')
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert len(data['recommended_tests']) == 1
        assert data['recommended_tests'][0]['name'] == 'Grapheme-Color Test'
        assert data['recommended_tests'][0]['test_id'] == sample_test.id

    def test_dashboard_multiple_recommended_tests_ordered(self, client, auth_participant, app):
        """Test recommended tests are returned in position order"""
        with app.app_context():
            # Create screening
            screening = ScreeningSession(
                participant_id=auth_participant.id,
                status='completed',
                eligible=True
            )
            db.session.add(screening)
            db.session.commit()

            # Create tests
            test1 = Test(name='Test 1', synesthesia_type='Type 1')
            test2 = Test(name='Test 2', synesthesia_type='Type 2')
            test3 = Test(name='Test 3', synesthesia_type='Type 3')
            db.session.add_all([test1, test2, test3])
            db.session.commit()

            # Add recommendations in specific order
            rec2 = ScreeningRecommendedTest(
                session_id=screening.id,
                position=2,
                suggested_name='Test 2',
                test_id=test2.id
            )
            rec1 = ScreeningRecommendedTest(
                session_id=screening.id,
                position=1,
                suggested_name='Test 1',
                test_id=test1.id
            )
            rec3 = ScreeningRecommendedTest(
                session_id=screening.id,
                position=3,
                suggested_name='Test 3',
                test_id=test3.id
            )
            db.session.add_all([rec2, rec1, rec3])
            db.session.commit()

        response = client.get('/api/v1/participant/dashboard/')
        data = response.get_json()
        
        recs = data['recommended_tests']
        assert len(recs) == 3
        assert recs[0]['name'] == 'Test 1'
        assert recs[1]['name'] == 'Test 2'
        assert recs[2]['name'] == 'Test 3'

    def test_dashboard_pending_tests_from_recommendations(self, client, auth_participant, sample_test, app):
        """Test pending tests count includes unstarted recommended tests"""
        with app.app_context():
            # Create screening with recommendation
            screening = ScreeningSession(
                participant_id=auth_participant.id,
                status='completed',
                eligible=True
            )
            db.session.add(screening)
            db.session.commit()

            rec = ScreeningRecommendedTest(
                session_id=screening.id,
                position=1,
                suggested_name='Color Test',
                test_id=sample_test.id
            )
            db.session.add(rec)
            db.session.commit()

        response = client.get('/api/v1/participant/dashboard/')
        data = response.get_json()
        
        # Should have 1 pending test from recommendation
        assert data['tests_pending'] >= 1

    def test_dashboard_user_info(self, client, auth_participant, sample_participant):
        """Test dashboard returns user information"""
        response = client.get('/api/v1/participant/dashboard/')
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'user' in data
        assert data['user']['name'] == sample_participant.name
        assert data['user']['email'] == sample_participant.email
        assert data['user']['role'] == 'participant'

    def test_dashboard_researcher_role(self, client, auth_researcher, sample_researcher):
        """Test dashboard for researcher role"""
        response = client.get('/api/v1/participant/dashboard/')
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert data['user']['role'] == 'researcher'
        # Researchers don't have test counts
        assert data['tests_completed'] == 0
        assert data['tests_pending'] == 0


class TestDashboardEdgeCases:
    """Test edge cases and error conditions"""

    def test_dashboard_with_deleted_test_reference(self, client, auth_participant, app):
        """Test dashboard handles deleted test references gracefully"""
        with app.app_context():
            # Create test result with non-existent test_id
            result = TestResult(
                participant_id=auth_participant.id,
                test_id=99999,  # Non-existent
                status='completed'
            )
            db.session.add(result)
            db.session.commit()

        response = client.get('/api/v1/participant/dashboard/')
        
        # Should not crash
        assert response.status_code == 200

    def test_dashboard_with_multiple_screenings(self, client, auth_participant, app):
        """Test dashboard uses latest completed screening"""
        with app.app_context():
            # Create older screening
            old_screening = ScreeningSession(
                participant_id=auth_participant.id,
                status='completed',
                eligible=True,
                completed_at=datetime(2024, 1, 1, tzinfo=timezone.utc)
            )
            db.session.add(old_screening)
            
            # Create newer screening
            new_screening = ScreeningSession(
                participant_id=auth_participant.id,
                status='completed',
                eligible=True,
                completed_at=datetime(2024, 12, 1, tzinfo=timezone.utc)
            )
            db.session.add(new_screening)
            db.session.commit()

            # Add recommendation only to new screening
            test = Test(name='Latest Test', synesthesia_type='Color')
            db.session.add(test)
            db.session.commit()

            rec = ScreeningRecommendedTest(
                session_id=new_screening.id,
                position=1,
                suggested_name='Latest Test',
                test_id=test.id
            )
            db.session.add(rec)
            db.session.commit()

        response = client.get('/api/v1/participant/dashboard/')
        data = response.get_json()
        
        # Should show recommendation from latest screening
        assert len(data['recommended_tests']) == 1
        assert data['recommended_tests'][0]['name'] == 'Latest Test'

    def test_dashboard_zero_division_protection(self, client, auth_participant):
        """Test dashboard handles zero total tests correctly"""
        response = client.get('/api/v1/participant/dashboard/')
        data = response.get_json()
        
        # Should not crash with division by zero
        assert data['completion_percentage'] == 0

    def test_dashboard_invalid_user(self, client):
        """Test dashboard with invalid user_id in session"""
        with client.session_transaction() as sess:
            sess['user_id'] = 99999  # Non-existent user
            sess['user_role'] = 'participant'
        
        response = client.get('/api/v1/participant/dashboard/')
        
        # Should return 404
        assert response.status_code == 404
        data = response.get_json()
        assert data['error'] == 'User not found'

    def test_dashboard_invalid_researcher(self, client):
        """Test dashboard with invalid researcher user_id"""
        with client.session_transaction() as sess:
            sess['user_id'] = 99999  # Non-existent researcher
            sess['user_role'] = 'researcher'
        
        response = client.get('/api/v1/participant/dashboard/')
        
        # Should return 404
        assert response.status_code == 404
        data = response.get_json()
        assert data['error'] == 'User not found'

    def test_dashboard_database_error_on_participant(self, client, monkeypatch):
        """Test dashboard handles participant query errors"""
        from models import Participant as P
        
        # Set up session first
        with client.session_transaction() as sess:
            sess['user_id'] = 1
            sess['user_role'] = 'participant'
        
        class BrokenQuery:
            def get(self, user_id):
                raise Exception("Cannot connect to database")
        
        monkeypatch.setattr(P, 'query', BrokenQuery())
        
        response = client.get('/api/v1/participant/dashboard/')
        
        assert response.status_code == 500
        data = response.get_json()
        assert 'error' in data
        assert 'Server error' in data['error']