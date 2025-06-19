import json
from fastapi.testclient import TestClient

def test_register_user(client: TestClient):
    response = client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpassword",
            "first_name": "Test",
            "last_name": "User",
            "fitness_level": "beginner",
            "goals": ["general_fitness"]
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data
    assert "hashed_password" not in data

def test_register_existing_user(client: TestClient):
    # First registration
    client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpassword",
            "first_name": "Test",
            "last_name": "User",
            "fitness_level": "beginner",
            "goals": ["general_fitness"]
        },
    )
    # Second registration with same email
    response = client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "password": "anotherpassword",
            "first_name": "Another",
            "last_name": "User",
            "fitness_level": "intermediate",
            "goals": ["strength_training"]
        },
    )
    assert response.status_code == 400
    data = response.json()
    assert data["detail"] == "Email already registered"

def test_login_for_access_token(client: TestClient):
    # First, register a user
    client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpassword",
            "first_name": "Test",
            "last_name": "User",
            "fitness_level": "beginner",
            "goals": ["general_fitness"]
        },
    )
    # Then, log in
    response = client.post(
        "/auth/login",
        data={"username": "test@example.com", "password": "testpassword"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_with_incorrect_password(client: TestClient):
    # First, register a user
    client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpassword",
            "first_name": "Test",
            "last_name": "User",
            "fitness_level": "beginner",
            "goals": ["general_fitness"]
        },
    )
    # Then, log in with incorrect password
    response = client.post(
        "/auth/login",
        data={"username": "test@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    data = response.json()
    assert data["detail"] == "Incorrect email or password" 