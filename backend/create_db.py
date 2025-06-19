"""
Simple script to create database tables for MVP
"""

from app.db.session import engine, Base
from app.models.user import User  
from app.models.workout import WorkoutSession

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Database tables created successfully!")
print("Tables:", engine.table_names()) 