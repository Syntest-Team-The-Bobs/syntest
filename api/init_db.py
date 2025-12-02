"""
Script to initialize/update the database with all tables.
Run this if you get errors about missing tables.
"""
from app import app, db
from models import (
    Participant, Researcher, Test, TestResult, ScreeningResponse,
    ColorStimulus, ColorTrial, SpeedCongruency, TestData,
    ScreeningSession, ScreeningHealth, ScreeningDefinition,
    ScreeningPainEmotion, ScreeningTypeChoice, ScreeningEvent,
    ScreeningRecommendedTest
)

with app.app_context():
    print("Creating all database tables...")
    db.create_all()
    print("✓ Database initialized successfully!")
    print("\nTables created:")
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    for table in sorted(tables):
        print(f"  - {table}")

