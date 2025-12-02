from flask import Blueprint, jsonify, session
from models import Participant, Researcher, ScreeningSession, ScreeningRecommendedTest, TestResult, Test

bp = Blueprint('dashboard', __name__, url_prefix='/api/participant')

@bp.route('/dashboard', methods=['GET'])
def get_dashboard_data():
    try:
        # Fetch current user data directly
        if 'user_id' not in session:
            return jsonify({'error': 'Not authenticated'}), 401

        user_id = session['user_id']
        role = session.get('user_role')

        user = Participant.query.get(user_id) if role == 'participant' else Researcher.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        user_data = {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': role
        }

        # Get recommended tests from latest completed screening session
        recommended_tests = []
        if role == 'participant':
            # Find the latest completed screening session
            latest_screening = (
                ScreeningSession.query
                .filter_by(participant_id=user_id, eligible=True)
                .order_by(ScreeningSession.completed_at.desc())
                .first()
            )
            
            if latest_screening:
                # Get recommended tests from normalized table, ordered by position
                recs = (
                    ScreeningRecommendedTest.query
                    .filter_by(session_id=latest_screening.id)
                    .order_by(ScreeningRecommendedTest.position)
                    .all()
                )
                
                # Build recommended tests list with test details if available
                for rec in recs:
                    test_info = {
                        'name': rec.suggested_name,
                        'reason': rec.reason,
                        'test_id': rec.test_id
                    }
                    # If test_id exists, fetch test details
                    if rec.test_id:
                        test = Test.query.get(rec.test_id)
                        if test:
                            test_info.update({
                                'id': test.id,
                                'description': test.description,
                                'synesthesia_type': test.synesthesia_type,
                                'duration': test.duration
                            })
                    recommended_tests.append(test_info)

        # Count test results for participant
        tests_completed = 0
        tests_pending = 0
        if role == 'participant':
            test_results = TestResult.query.filter_by(participant_id=user_id).all()
            completed_results = [tr for tr in test_results if tr.status == 'completed']
            tests_completed = len(completed_results)
            tests_pending = len([tr for tr in test_results if tr.status in ['not_started', 'in_progress']])
            # Add pending tests from recommendations if not started
            if recommended_tests:
                for rec in recommended_tests:
                    if rec.get('test_id'):
                        existing = TestResult.query.filter_by(
                            participant_id=user_id,
                            test_id=rec.get('test_id')
                        ).first()
                        if not existing:
                            tests_pending += 1

        total_tests = tests_completed + tests_pending
        completion_percentage = int((tests_completed / total_tests * 100)) if total_tests > 0 else 0

        # Prepare dashboard data
        data = {
            "user": user_data,
            "tests_completed": tests_completed,
            "tests_pending": tests_pending,
            "completion_percentage": completion_percentage,
            "recommended_tests": recommended_tests
        }
        return jsonify(data)
    except Exception as e:
        print(f"Error in get_dashboard_data: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500
