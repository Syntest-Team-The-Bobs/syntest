import sys
import os
from datetime import datetime

# Add parent directory to path so we can import from api
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app, db
from models import (
    ColorStimulus, ColorTrial, TestData, AnalyzedTestData,
    Participant, Researcher, Test
)

def test_manual():
    """Manual testing script"""
    with app.app_context():
        print("🧪 Testing Color Test Models...")
        
        # Test 1: Create Researcher
        print("\n1. Creating researcher...")
        researcher = Researcher(
            name="Dr. Smith",
            email=f"smith_{datetime.utcnow().timestamp()}@test.com",
            password_hash="hashed",
            institution="Test University"
        )
        db.session.add(researcher)
        db.session.commit()
        print(f"   ✓ Created: {researcher}")
        
        # Test 2: Create ColorStimulus
        print("\n2. Creating color stimulus...")
        stimulus = ColorStimulus(
            r=255, g=100, b=50,
            owner_researcher_id=researcher.id,
            description="Test red color",
            trigger_type="letter"
        )
        db.session.add(stimulus)
        db.session.commit()
        print(f"   ✓ Created: {stimulus}")
        print(f"   ✓ Hex: {stimulus.hex_color}")
        print(f"   ✓ RGB Tuple: {stimulus.rgb_tuple}")
        
        # Test 3: Create ColorTrial
        print("\n3. Creating color trial...")
        trial = ColorTrial(
            participant_id="P_TEST_123",
            stimulus_id=stimulus.id,
            trial_index=1,
            selected_r=250,
            selected_g=105,
            selected_b=55,
            response_ms=1500
        )
        db.session.add(trial)
        db.session.commit()
        print(f"   ✓ Created: {trial}")
        print(f"   ✓ Selected Hex: {trial.selected_hex_color}")
        print(f"   ✓ Color Distance: {trial.color_distance():.2f}")
        print(f"   ✓ Is Exact Match: {trial.is_exact_match()}")
        print(f"   ✓ Is Close Match (30): {trial.is_close_match(30)}")
        
        # Test 4: Create TestData
        print("\n4. Creating test data...")
        test_data = TestData(
            user_id="P_TEST_123",
            test_type="CCT",
            owner_researcher_id=researcher.id,
            stimulus_id=stimulus.id,
            family="color",
            cct_mean=45.5,
            cct_std=10.2,
            cct_pass=True
        )
        db.session.add(test_data)
        db.session.commit()
        print(f"   ✓ Created: {test_data}")
        print(f"   ✓ Consistency Score: {test_data.get_consistency_score():.3f}")
        
        # Test 5: Create Participant for AnalyzedTestData
        print("\n5. Creating participant...")
        participant = Participant(
            name="Test User",
            email=f"testuser_{datetime.utcnow().timestamp()}@test.com",
            password_hash="hashed"
        )
        db.session.add(participant)
        db.session.commit()
        print(f"   ✓ Created: {participant}")
        
        # Test 6: Create AnalyzedTestData
        print("\n6. Creating analyzed test data...")
        analyzed = AnalyzedTestData(
            user_id=participant.id,
            test_type="CCT",
            owner_researcher_id=researcher.id,
            stimulus_id=stimulus.id,
            family="color",
            diagnosis=True
        )
        db.session.add(analyzed)
        db.session.commit()
        print(f"   ✓ Created: {analyzed}")
        
        # Test 7: Query relationships
        print("\n7. Testing relationships...")
        retrieved_stimulus = ColorStimulus.query.get(stimulus.id)
        print(f"   ✓ Stimulus has {retrieved_stimulus.trials.count()} trial(s)")
        print(f"   ✓ Stimulus has {retrieved_stimulus.test_data_entries.count()} test data entry(ies)")
        print(f"   ✓ Stimulus has {retrieved_stimulus.analyzed_data_entries.count()} analyzed data entry(ies)")
        
        # Test 8: Test to_dict
        print("\n8. Testing serialization...")
        stimulus_dict = stimulus.to_dict()
        trial_dict = trial.to_dict()
        test_data_dict = test_data.to_dict()
        analyzed_dict = analyzed.to_dict()
        print("   ✓ All to_dict() methods work")
        
        print("\n✅ All tests passed!")

if __name__ == "__main__":
    from datetime import datetime
    test_manual()