"""
Script to populate the database with sample data for testing visualizations
Run this after creating your database: python populate_sample_data.py
"""

from app import app, db
from models import Participant, Researcher, Test, TestResult
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
import random

def populate_sample_data():
    with app.app_context():
        print("Starting to populate sample data...")
        
        # Clear ALL existing data to avoid conflicts
        print("Clearing existing data...")
        db.session.query(TestResult).delete()
        db.session.query(Participant).delete()
        db.session.commit()
        print("Database cleared successfully")
        
        # Get existing tests
        tests = Test.query.all()
        if not tests:
            print("No tests found. Please run the app first to create tests.")
            return
        
        print(f"Found {len(tests)} tests")
        
        # Sample data parameters
        num_participants = 50
        countries = ['Spain', 'Spain', 'Spain', 'Spain', 'Spain', 'Mexico', 'Argentina', 'Colombia', 'USA']
        synesthesia_types = ['trigger-color', 'trigger-gustatory', 'sequence-space', None]
        
        print(f"Creating {num_participants} participants...")
        
        # Create participants
        participants = []
        base_date = datetime.utcnow() - timedelta(days=90)
        
        for i in range(num_participants):
            # Spread participants over last 90 days
            days_offset = random.randint(0, 90)
            created_date = base_date + timedelta(days=days_offset)
            
            age = random.randint(18, 65)
            country = random.choice(countries)
            
            # 60% chance of having synesthesia
            has_synesthesia = random.random() < 0.6
            synesthesia_type = random.choice(synesthesia_types[:3]) if has_synesthesia else None
            
            # Generate unique participant ID with timestamp and random component
            timestamp = created_date.strftime('%Y%m%d%H%M%S')
            unique_id = f"P{timestamp}{i:04d}"  # Use participant number for uniqueness
            
            participant = Participant(
                participant_id=unique_id,  # Explicitly set participant_id
                name=f"Participant {i+1}",
                email=f"participant{i+1}@example.com",
                password_hash=generate_password_hash("password123"),
                age=age,
                country=country,
                screening_completed=has_synesthesia,
                synesthesia_type=synesthesia_type,
                created_at=created_date,
                status='active'
            )
            
            participants.append(participant)
            db.session.add(participant)
        
        db.session.commit()
        print(f"Created {len(participants)} participants")
        
        # Create test results
        print("Creating test results...")
        test_results = []
        
        for participant in participants:
            # Each participant has 70% chance to complete each test
            for test in tests:
                if random.random() < 0.7:
                    # Random date between participant creation and now
                    days_after_join = random.randint(0, (datetime.utcnow() - participant.created_at).days + 1)
                    test_date = participant.created_at + timedelta(days=days_after_join)
                    
                    # 80% completed, 15% in progress, 5% not started
                    status_choice = random.random()
                    if status_choice < 0.8:
                        status = 'completed'
                        completed_at = test_date
                        # Consistency score: synesthetes have higher scores
                        if participant.synesthesia_type == test.synesthesia_type:
                            consistency_score = random.uniform(70, 95)
                        elif participant.synesthesia_type:
                            consistency_score = random.uniform(40, 70)
                        else:
                            consistency_score = random.uniform(20, 50)
                    elif status_choice < 0.95:
                        status = 'in_progress'
                        completed_at = None
                        consistency_score = None
                    else:
                        status = 'not_started'
                        completed_at = None
                        consistency_score = None
                    
                    result = TestResult(
                        participant_id=participant.id,
                        test_id=test.id,
                        status=status,
                        consistency_score=consistency_score,
                        started_at=test_date if status != 'not_started' else None,
                        completed_at=completed_at,
                        result_data={'sample': True}
                    )
                    
                    test_results.append(result)
                    db.session.add(result)
        
        db.session.commit()
        print(f"Created {len(test_results)} test results")
        
        # Create a sample researcher account
        existing_researcher = Researcher.query.filter_by(email='demo@researcher.com').first()
        if not existing_researcher:
            researcher = Researcher(
                name='Demo Researcher',
                email='demo@researcher.com',
                password_hash=generate_password_hash('demo123'),
                institution='Demo University',
                created_at=datetime.utcnow()
            )
            db.session.add(researcher)
            db.session.commit()
            print("Created demo researcher account")
            print("  Email: demo@researcher.com")
            print("  Password: demo123")
        
        # Summary statistics
        print("\n" + "="*50)
        print("SAMPLE DATA SUMMARY")
        print("="*50)
        print(f"Total Participants: {num_participants}")
        print(f"Participants with Synesthesia: {len([p for p in participants if p.synesthesia_type])}")
        print(f"Total Test Results: {len(test_results)}")
        print(f"Completed Tests: {len([t for t in test_results if t.status == 'completed'])}")
        print(f"In Progress Tests: {len([t for t in test_results if t.status == 'in_progress'])}")
        print("\nDemo Researcher Login:")
        print("  Email: demo@researcher.com")
        print("  Password: demo123")
        print("\nSample Participant Login:")
        print("  Email: participant1@example.com")
        print("  Password: password123")
        print("="*50)
        print("\nSample data populated successfully!")
        print("Navigate to /researcher/analytics to see the visualizations")

if __name__ == '__main__':
    populate_sample_data()