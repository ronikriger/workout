"""
Integration tests that test the full database flow
These would have caught the UUID/PostgreSQL compatibility issues
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import tempfile
import os

from app.main import app
from app.db.session import get_db, Base
from app.models.user import User
from app.models.workout import WorkoutSession

# Create test database
@pytest.fixture(scope="function")
def test_db():
    # Create temporary database file
    db_fd, db_path = tempfile.mkstemp()
    database_url = f"sqlite:///{db_path}"
    
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    
    yield TestingSessionLocal()
    
    # Cleanup
    os.close(db_fd)
    os.unlink(db_path)
    app.dependency_overrides.clear()

@pytest.fixture
def client():
    return TestClient(app)

def test_database_schema_creation(test_db):
    """Test that database tables can be created without errors"""
    # This would have caught the UUID issues
    assert test_db.bind.has_table("users")
    assert test_db.bind.has_table("workout_sessions")

def test_user_registration_full_flow(client, test_db):
    """Test full user registration flow including database insertion"""
    response = client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpass123",
            "first_name": "Test",
            "last_name": "User"
        }
    )
    
    # Check response
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    
    # Check database insertion
    user = test_db.query(User).filter(User.email == "test@example.com").first()
    assert user is not None
    assert user.first_name == "Test"
    assert user.is_active is True

def test_user_login_full_flow(client, test_db):
    """Test full login flow"""
    # First register
    client.post(
        "/auth/register",
        json={
            "email": "login@example.com",
            "password": "testpass123",
            "first_name": "Login",
            "last_name": "Test"
        }
    )
    
    # Then login
    response = client.post(
        "/auth/login",
        data={
            "username": "login@example.com",
            "password": "testpass123"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data

def test_workout_creation_full_flow(client, test_db):
    """Test creating workout sessions works with database"""
    # Register and get token
    reg_response = client.post(
        "/auth/register",
        json={
            "email": "workout@example.com",
            "password": "testpass123",
            "first_name": "Workout",
            "last_name": "User"
        }
    )
    token = reg_response.json()["access_token"]
    
    # Test getting workouts (should be empty)
    response = client.get(
        "/workouts/",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    assert response.json() == []

def test_duplicate_user_registration(client, test_db):
    """Test duplicate email registration is handled correctly"""
    # Register first user
    client.post(
        "/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "testpass123",
            "first_name": "First",
            "last_name": "User"
        }
    )
    
    # Try to register same email again
    response = client.post(
        "/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "different123",
            "first_name": "Second",
            "last_name": "User"
        }
    )
    
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

def test_invalid_login(client, test_db):
    """Test login with invalid credentials"""
    response = client.post(
        "/auth/login",
        data={
            "username": "nonexistent@example.com",
            "password": "wrongpass"
        }
    )
    
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]

def test_unauthorized_access_to_workouts(client, test_db):
    """Test accessing workouts without authentication"""
    response = client.get("/workouts/")
    assert response.status_code == 401

def test_invalid_token_access(client, test_db):
    """Test accessing with invalid token"""
    response = client.get(
        "/workouts/",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401 