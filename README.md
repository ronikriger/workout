# RepRight – Workout Form Analyzer

A real-time workout form analysis app that provides instant feedback on squat and deadlift technique using computer vision.

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+
- Python 3.12+
- Docker & Docker Compose
- Expo CLI (`npm install -g @expo/cli`)

### 1. Clone & Setup
```bash
git clone <repo-url>
cd Workout
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
```

### 3. Infrastructure
```bash
cd ../infra
docker-compose up -d  # Postgres, Redis, Celery worker
```

### 4. Mobile App
```bash
cd ../mobile
npm install
npx expo start
```

### 5. Backend Server
```bash
cd ../backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 🏗️ Architecture

- **Mobile**: React Native Expo with real-time pose estimation
- **Backend**: FastAPI with Celery background processing  
- **Database**: PostgreSQL with Alembic migrations
- **Cache**: Redis for Celery task queue
- **Deployment**: Fly.io with GitHub Actions CI/CD

## 📱 Features

### Mobile App
- Real-time camera-based pose analysis
- Instant form feedback (green ✅ / red ❌)
- Automatic rep counting
- Offline workout logging
- Cloud sync toggle

### Backend
- JWT authentication
- Video upload & analysis
- Workout history tracking
- Background video processing
- RESTful API with OpenAPI docs

## 🧪 Testing

```bash
# Backend tests
cd backend && pytest --cov=app --cov-report=html

# Mobile E2E tests  
cd mobile && detox test
```

## 📊 Coverage Goals
- Backend: ≥85% unit test coverage
- Mobile: E2E test coverage for critical flows

## 🚢 Deployment

```bash
# Deploy to Fly.io
fly deploy
```

See `PRICING.md` for feature tiers and `ROADMAP.md` for upcoming features. 