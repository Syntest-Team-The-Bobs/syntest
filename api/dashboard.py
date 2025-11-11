from flask import Blueprint, jsonify, session
from models import Participant, Researcher

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

        # Prepare dashboard data
        data = {
            "user": user_data,
            "tests_completed": 3,
            "tests_pending": 2,
            "completion_percentage": 60
        }
        return jsonify(data)
    except Exception as e:
        print(f"Error in get_dashboard_data: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500
