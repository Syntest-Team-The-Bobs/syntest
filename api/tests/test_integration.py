import pytest
from flask import Flask
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models import db, ColorStimulus, ColorTrial, TestData, AnalyzedTestData
from sqlalchemy import inspect

def test_database_schema():
    """Test that all tables are created correctly"""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        # Verify all tables exist
        assert 'color_stimuli' in tables
        assert 'color_trials' in tables
        assert 'test_data' in tables
        assert 'analyzed_test_data' in tables
        
        # Check color_stimuli columns
        columns = [c['name'] for c in inspector.get_columns('color_stimuli')]
        assert 'id' in columns
        assert 'r' in columns
        assert 'g' in columns
        assert 'b' in columns
        assert 'owner_researcher_id' in columns
        
        # Check indexes
        indexes = inspector.get_indexes('color_stimuli')
        index_names = [idx['name'] for idx in indexes]
        assert any('set_owner' in name for name in index_names)

def test_query_performance():
    """Test query performance with multiple records"""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        
        # Create bulk data
        stimuli = []
        for i in range(100):
            stimulus = ColorStimulus(
                r=i * 2 % 256,
                g=i * 3 % 256,
                b=i * 5 % 256
            )
            stimuli.append(stimulus)
        
        db.session.bulk_save_objects(stimuli)
        db.session.commit()
        
        # Test query
        results = ColorStimulus.query.filter(ColorStimulus.r > 100).all()
        assert len(results) > 0