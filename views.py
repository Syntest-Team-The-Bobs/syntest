from flask import render_template, request, redirect, url_for, flash, session
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from models import User, Participant, Researcher, Test, TestResult
from app import db

# Landing Page
def index():
    """Render the landing page"""
    return render_template('index.html')


# Authentication Routes
def login():
    """Handle login for both participants and researchers"""
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        role = request.form.get('role')  # 'participant' or 'researcher'
        
        # Query user based on role
        if role == 'participant':
            user = Participant.query.filter_by(email=email).first()
        else:
            user = Researcher.query.filter_by(email=email).first()
        
        if user and check_password_hash(user.password_hash, password):
            session['user_id'] = user.id
            session['user_role'] = role
            session['user_name'] = user.name
            
            # Redirect based on role
            if role == 'participant':
                return redirect(url_for('participant_dashboard'))
            else:
                return redirect(url_for('researcher_dashboard'))
        else:
            flash('Invalid email or password', 'error')
    
    return render_template('login.html')


def signup():
    """Handle signup for both participants and researchers"""
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        role = request.form.get('role')
        
        # Validate passwords match
        if password != confirm_password:
            flash('Passwords do not match', 'error')
            return render_template('signup.html', error='Passwords do not match')
        
        # Check if user already exists
        if role == 'participant':
            existing_user = Participant.query.filter_by(email=email).first()
        else:
            existing_user = Researcher.query.filter_by(email=email).first()
        
        if existing_user:
            flash('Email already registered', 'error')
            return render_template('signup.html', error='Email already registered')
        
        # Create new user based on role
        password_hash = generate_password_hash(password)
        
        if role == 'participant':
            age = request.form.get('age')
            country = request.form.get('country')
            
            new_user = Participant(
                name=name,
                email=email,
                password_hash=password_hash,
                age=age,
                country=country,
                created_at=datetime.utcnow()
            )
        else:
            institution = request.form.get('institution')
            access_code = request.form.get('access_code')
            
            # Validate researcher access code
            if access_code != 'RESEARCH2025':  # Replace with actual validation
                flash('Invalid access code', 'error')
                return render_template('signup.html', error='Invalid access code')
            
            new_user = Researcher(
                name=name,
                email=email,
                password_hash=password_hash,
                institution=institution,
                created_at=datetime.utcnow()
            )
        
        db.session.add(new_user)
        db.session.commit()
        
        flash('Account created successfully! Please login.', 'success')
        return redirect(url_for('login'))
    
    return render_template('signup.html')


def logout():
    """Handle logout for all users"""
    session.clear()
    flash('You have been logged out', 'info')
    return redirect(url_for('index'))


# Participant Routes
def participant_dashboard():
    """Render participant dashboard with personalized data"""
    if 'user_id' not in session or session.get('user_role') != 'participant':
        return redirect(url_for('login'))
    
    user_id = session['user_id']
    user = Participant.query.get(user_id)
    
    # Get participant's test data
    completed_tests = TestResult.query.filter_by(
        participant_id=user_id, 
        status='completed'
    ).all()
    
    pending_tests = Test.query.filter(
        ~Test.id.in_([t.test_id for t in completed_tests])
    ).all()
    
    # Calculate statistics
    tests_completed = len(completed_tests)
    tests_pending = len(pending_tests)
    total_tests = tests_completed + tests_pending
    completion_percentage = int((tests_completed / total_tests * 100)) if total_tests > 0 else 0
    
    # Get recommended tests based on screening
    recommended_tests = []
    if user.screening_completed:
        # Logic to recommend tests based on screening results
        recommended_tests = Test.query.filter_by(
            synesthesia_type=user.synesthesia_type
        ).all()
    
    # Build synesthesia profile
    synesthesia_profile = None
    if completed_tests:
        synesthesia_profile = {
            'types': list(set([t.synesthesia_type for t in completed_tests])),
            'consistency_score': calculate_consistency_score(completed_tests)
        }
    
    return render_template(
        'participant_dashboard.html',
        user=user,
        tests_completed=tests_completed,
        tests_pending=tests_pending,
        completion_percentage=completion_percentage,
        screening_completed=user.screening_completed,
        recommended_tests=recommended_tests,
        completed_tests=completed_tests,
        synesthesia_profile=synesthesia_profile
    )


# Researcher Routes
def researcher_dashboard():
    """Render researcher dashboard with study data"""
    if 'user_id' not in session or session.get('user_role') != 'researcher':
        return redirect(url_for('login'))
    
    user_id = session['user_id']
    user = Researcher.query.get(user_id)
    
    # Get study statistics
    total_participants = Participant.query.count()
    active_participants = Participant.query.filter_by(status='active').count()
    completed_tests = TestResult.query.filter_by(status='completed').count()
    
    # Count synesthetes identified
    synesthetes_identified = Participant.query.filter(
        Participant.synesthesia_type.isnot(None)
    ).count()
    
    # Get recent activity
    recent_activity = TestResult.query.order_by(
        TestResult.completed_at.desc()
    ).limit(10).all()
    
    # Format recent activity for display
    recent_activity_formatted = []
    for result in recent_activity:
        participant = Participant.query.get(result.participant_id)
        test = Test.query.get(result.test_id)
        recent_activity_formatted.append({
            'participant_id': participant.participant_id,
            'test_name': test.name,
            'status': result.status,
            'date': result.completed_at.strftime('%Y-%m-%d %H:%M')
        })
    
    # Get synesthesia distribution
    synesthesia_distribution = {}
    synesthesia_types = db.session.query(
        Participant.synesthesia_type,
        db.func.count(Participant.id)
    ).group_by(Participant.synesthesia_type).all()
    
    for syn_type, count in synesthesia_types:
        if syn_type:
            synesthesia_distribution[syn_type] = count
    
    return render_template(
        'researcher_dashboard.html',
        user=user,
        total_participants=total_participants,
        active_participants=active_participants,
        completed_tests=completed_tests,
        synesthetes_identified=synesthetes_identified,
        recent_activity=recent_activity_formatted,
        synesthesia_distribution=synesthesia_distribution
    )


# Helper Functions
def calculate_consistency_score(test_results):
    """Calculate consistency score for participant's test results"""
    # Implement logic to calculate consistency based on test results
    # This is a placeholder implementation
    if not test_results:
        return 0
    
    total_score = sum([r.consistency_score for r in test_results if r.consistency_score])
    return int(total_score / len(test_results)) if test_results else 0


# Route Registration (to be added to your main Flask app)
"""
app.add_url_rule('/', 'index', index)
app.add_url_rule('/login', 'login', login, methods=['GET', 'POST'])
app.add_url_rule('/signup', 'signup', signup, methods=['GET', 'POST'])
app.add_url_rule('/logout', 'logout', logout)
app.add_url_rule('/participant/dashboard', 'participant_dashboard', participant_dashboard)
app.add_url_rule('/researcher/dashboard', 'researcher_dashboard', researcher_dashboard)
"""