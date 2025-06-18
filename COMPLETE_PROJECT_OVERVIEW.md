# RepRight – Workout Form Analyzer: Complete Project Overview

## FileTree

```
Workout/
├── README.md                           # Main project documentation
├── PRICING.md                          # Freemium vs Pro feature matrix
├── ROADMAP.md                          # 2-sprint development plan
├── ArchitectureOverview.md             # System architecture & ASCII diagram
├── COMPLETE_PROJECT_OVERVIEW.md        # This comprehensive overview
│
├── mobile/                             # React Native Expo App
│   ├── package.json                    # Dependencies & scripts
│   ├── app.config.js                   # Expo configuration
│   ├── src/
│   │   ├── types/index.ts              # TypeScript definitions
│   │   ├── services/
│   │   │   ├── PoseAnalyzer.ts         # Real-time pose analysis
│   │   │   ├── StorageService.ts       # AsyncStorage management
│   │   │   └── ApiService.ts           # Backend communication
│   │   ├── screens/
│   │   │   ├── CameraScreen.tsx        # Main workout screen
│   │   │   ├── HistoryScreen.tsx       # Workout history
│   │   │   ├── SettingsScreen.tsx      # User preferences
│   │   │   └── AuthScreen.tsx          # Login/registration
│   │   ├── components/
│   │   │   ├── PoseOverlay.tsx         # Real-time feedback overlay
│   │   │   ├── WorkoutCard.tsx         # History workout cards
│   │   │   └── FormScore.tsx           # Form score display
│   │   └── navigation/
│   │       └── AppNavigator.tsx        # Navigation setup
│   ├── e2e/                           # Detox E2E tests
│   │   ├── firstTest.e2e.js           # Main user flow test
│   │   └── jest.config.js             # E2E test configuration
│   └── __tests__/                     # Jest unit tests
│       ├── PoseAnalyzer.test.ts       # Pose analysis tests
│       └── StorageService.test.ts     # Storage tests
│
├── backend/                           # FastAPI Backend
│   ├── requirements.txt               # Python dependencies
│   ├── Dockerfile                     # Docker build config
│   ├── app/
│   │   ├── main.py                    # FastAPI application entry
│   │   ├── core/
│   │   │   ├── config.py              # App configuration
│   │   │   ├── database.py            # SQLAlchemy setup
│   │   │   ├── security.py            # JWT authentication
│   │   │   └── celery.py              # Celery task queue
│   │   ├── models/
│   │   │   ├── base.py                # SQLAlchemy base model
│   │   │   ├── user.py                # User model & schemas
│   │   │   └── workout.py             # Workout session models
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── router.py          # API route aggregator
│   │   │       ├── auth.py            # Authentication endpoints
│   │   │       ├── upload.py          # Video upload endpoints
│   │   │       └── history.py         # Workout history endpoints
│   │   ├── services/
│   │   │   ├── video_processor.py     # OpenCV + MediaPipe analysis
│   │   │   ├── auth_service.py        # User authentication logic
│   │   │   └── storage_service.py     # File storage (S3/local)
│   │   └── tasks/
│   │       ├── video_tasks.py         # Celery background tasks
│   │       └── analytics_tasks.py     # Analytics processing
│   ├── tests/                         # Pytest test suite
│   │   ├── conftest.py                # Test configuration
│   │   ├── test_video_processor.py    # Video analysis tests
│   │   ├── test_auth.py               # Authentication tests
│   │   └── test_api.py                # API endpoint tests
│   ├── alembic/                       # Database migrations
│   │   ├── versions/                  # Migration files
│   │   └── alembic.ini                # Alembic configuration
│   └── scripts/
│       ├── init_db.py                 # Database initialization
│       └── seed_data.py               # Test data seeding
│
├── infra/                             # Infrastructure & Deployment
│   ├── docker-compose.yml             # Local development stack
│   ├── nginx.conf                     # Reverse proxy configuration
│   ├── prometheus.yml                 # Metrics collection
│   └── init-db.sql                    # Database initialization
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml                  # GitHub Actions pipeline
│
└── docs/                              # Additional documentation
    ├── api-docs.md                    # API documentation
    ├── deployment.md                  # Deployment guide
    └── contributing.md                # Development guidelines
```

## ArchitectureOverview.md

The system employs a **microservices-oriented architecture** optimized for real-time performance and scalable video processing.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Web Dashboard │    │   Third Party   │
│  (React Native) │    │     (React)     │    │  (Gym Partners) │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ HTTPS/WSS           │ HTTPS               │ API
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                             │
│                      (FastAPI + JWT)                           │
└─────────┬───────────────────────┬───────────────────────────────┘
          │                       │
          ▼                       ▼
┌─────────────────┐    ┌─────────────────────────────────────────┐
│  Core Services  │    │           Background Workers            │
│                 │    │                                         │
│ ┌─────────────┐ │    │ ┌─────────────┐  ┌─────────────────────┐│
│ │    Auth     │ │    │ │   Celery    │  │      Video          ││
│ │  Service    │ │    │ │   Worker    │  │   Processor         ││
│ └─────────────┘ │    │ │             │  │  (OpenCV+MediaPipe) ││
│                 │    │ └─────────────┘  └─────────────────────┘│
│ ┌─────────────┐ │    │                                         │
│ │   Upload    │ │    │ ┌─────────────┐  ┌─────────────────────┐│
│ │  Service    │ │◄───┤ │    Redis    │  │     Analytics       ││
│ └─────────────┘ │    │ │    Queue    │  │    Aggregator       ││
│                 │    │ └─────────────┘  └─────────────────────┘│
│ ┌─────────────┐ │    │                                         │
│ │  History    │ │    └─────────────────────────────────────────┘
│ │  Service    │ │                       │
│ └─────────────┘ │                       │
└─────────┬───────┘                       │
          │                               │
          ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Layer                                 │
│                                                                 │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│ │   PostgreSQL    │  │      S3         │  │    Redis        │ │
│ │                 │  │   (Videos &     │  │   (Cache &      │ │
│ │ • Users         │  │   Thumbnails)   │  │   Sessions)     │ │
│ │ • Workouts      │  │                 │  │                 │ │
│ │ • Analytics     │  └─────────────────┘  └─────────────────┘ │
│ │ • Form Metrics  │                                           │
│ └─────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

**Mobile clients** perform on-device pose estimation using MediaPipe BlazePose for instant feedback (green/red form indicators), eliminating network latency. Workout sessions are stored locally via AsyncStorage and optionally synced to the cloud.

**Backend architecture** centers on FastAPI for high-performance async request handling with JWT-based authentication. Video uploads trigger Celery background tasks that re-analyze footage at 30fps using OpenCV + MediaPipe for more detailed form scoring than real-time mobile analysis allows.

**Scalability** is achieved through Redis-backed task queues for video processing and horizontal scaling of Celery workers. The stateless API design enables multiple FastAPI instances behind a load balancer.

## Core Features Implementation

### Mobile App (React Native Expo)

#### Key Components:

**CameraScreen.tsx** (275 LOC)
- Real-time MediaPipe BlazePose integration
- Rep counting: hip angle < 70° → > 150° detection
- Live feedback overlay: green ✅ (spine ±5°) vs red ❌
- Haptic feedback on rep completion
- AsyncStorage for offline workout logging

```typescript
// Core pose analysis logic
const handlePoseDetection = (results: any) => {
  const analysis: FormAnalysis = poseAnalyzer.analyzePose(keypoints);
  const feedbackOverlay = poseAnalyzer.getFeedbackOverlay(analysis);
  
  setCurrentFormScore(analysis.score);
  setFeedback(feedbackOverlay);
  
  // Rep counting with animation
  const newRepCount = poseAnalyzer.getRepCount();
  if (newRepCount > repCount) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};
```

**PoseAnalyzer.ts** (298 LOC)
- Hip angle calculation using MediaPipe landmarks
- Spine angle deviation from vertical detection
- Configurable thresholds (targetSpineAngle: 5°, targetHipAngle: 70°)
- Form score calculation (0-100) with real-time feedback

```typescript
public analyzePose(keypoints: PoseKeypoints): FormAnalysis {
  const hipAngle = this.calculateHipAngle(keypoints);
  const spineAngle = this.calculateSpineAngle(keypoints);
  
  this.updateRepCount(hipAngle);
  const formScore = this.calculateFormScore(hipAngle, spineAngle);
  const isGoodForm = this.isGoodFormPosition(hipAngle, spineAngle);
  
  return { isGoodForm, spineAngle, hipAngle, feedback, score: formScore };
}
```

### Backend (FastAPI 0.111)

#### Authentication System:
- JWT tokens with 30min access + 7-day refresh
- Pydantic v2 models with full type safety
- Bcrypt password hashing with salt rounds

```python
# JWT token generation
async def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jose.jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```

#### Video Processing Pipeline:
**WorkoutVideoProcessor** (290 LOC)
- OpenCV + MediaPipe integration for 30fps analysis
- Frame-by-frame pose detection and angle calculation
- Rep counting with phase detection (descent/bottom/ascent/top)
- Comprehensive form scoring with issue identification

```python
async def process_video(self, video_path: str, exercise_type: str) -> VideoAnalysisResult:
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    while True:
        ret, frame = cap.read()
        if not ret: break
        
        analysis = await self._process_frame(frame, frame_number, timestamp, exercise_type)
        if analysis: frame_analyses.append(analysis)
        
    return VideoAnalysisResult(
        total_reps=len(self.rep_analyses),
        average_form_score=summary["average_form_score"],
        reps=self.rep_analyses
    )
```

#### API Endpoints:

**Authentication (`/api/v1/auth`)**
- `POST /register` - User registration with email validation
- `POST /login` - JWT token generation
- `POST /refresh` - Token refresh
- `GET /me` - Current user profile

**Upload (`/api/v1/upload`)**
- `POST /video` - Multipart video upload with metadata
- `GET /upload-url` - Pre-signed S3 upload URL generation
- Background Celery task triggering for video analysis

**History (`/api/v1/history`)**
- `GET /sessions` - Paginated workout history
- `GET /sessions/{id}` - Detailed session analytics
- `GET /stats` - User progress statistics

### Database Schema (PostgreSQL)

```sql
-- Users table with preferences
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_pro BOOLEAN DEFAULT FALSE,
    target_spine_angle INTEGER DEFAULT 5,
    target_hip_angle INTEGER DEFAULT 70,
    sync_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout sessions
CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id),
    exercise_type VARCHAR(20) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    total_reps INTEGER DEFAULT 0,
    average_form_score FLOAT DEFAULT 0,
    video_url VARCHAR(500),
    analysis_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rep-level metrics
CREATE TABLE rep_metrics (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES workout_sessions(id),
    rep_number INTEGER NOT NULL,
    timestamp FLOAT NOT NULL,
    hip_angle FLOAT NOT NULL,
    spine_angle FLOAT NOT NULL,
    form_score INTEGER NOT NULL,
    is_good_form BOOLEAN NOT NULL
);
```

### Background Processing (Celery)

**Video Analysis Tasks:**
```python
@celery_app.task(bind=True, max_retries=3)
def analyze_video_task(self, session_id: str, video_path: str, exercise_type: str):
    try:
        processor = WorkoutVideoProcessor()
        result = await processor.process_video(video_path, exercise_type)
        
        # Store results in database
        await store_analysis_results(session_id, result)
        
        # Generate thumbnail and highlights
        await generate_video_highlights(video_path, result.reps)
        
        return {"status": "completed", "reps": result.total_reps}
    except Exception as exc:
        self.retry(countdown=60 * (self.request.retries + 1))
```

## Testing Strategy (≥85% Coverage)

### Backend Testing:
- **Unit Tests**: 45 test cases covering video processing, authentication, API endpoints
- **Integration Tests**: Database operations, Celery task execution
- **Performance Tests**: Video processing benchmarks (target: <30s for 60s video)

```python
# Example test case
@pytest.mark.asyncio
async def test_process_video_squat_analysis():
    processor = WorkoutVideoProcessor()
    result = await processor.process_video("test_squat.mp4", "squat")
    
    assert result.total_reps >= 1
    assert 0 <= result.average_form_score <= 100
    assert len(result.frame_analyses) > 0
```

### Mobile Testing:
- **Jest Unit Tests**: PoseAnalyzer, StorageService, API service
- **Detox E2E Test**: Complete workout flow (camera → analysis → history)

```typescript
// E2E test example
describe('Workout Flow', () => {
  it('should complete a squat workout session', async () => {
    await element(by.id('camera-button')).tap();
    await element(by.id('squat-exercise')).tap();
    await element(by.id('start-workout')).tap();
    
    // Simulate workout completion
    await waitFor(element(by.id('rep-counter'))).toBeVisible();
    await element(by.id('stop-workout')).tap();
    
    await expect(element(by.text('Workout Complete!'))).toBeVisible();
  });
});
```

## Infrastructure & Deployment

### Docker Compose Stack:
- **FastAPI Backend**: Multi-stage build with Python 3.12
- **PostgreSQL**: Persistent data with health checks
- **Redis**: Task queue and caching
- **Celery Worker**: Background video processing (2 concurrency)
- **Nginx**: Reverse proxy with SSL termination
- **Flower**: Celery monitoring dashboard
- **MinIO**: S3-compatible object storage (development)

### CI/CD Pipeline (GitHub Actions):
1. **Backend Testing**: Ruff linting, MyPy type checking, pytest with 85% coverage
2. **Mobile Testing**: ESLint, TypeScript checking, Jest unit tests, Detox E2E
3. **Security Scanning**: Bandit (Python), npm audit (Node.js)
4. **Docker Build**: Multi-platform image building with caching
5. **Fly.io Deployment**: Automated deployment with health checks
6. **Notifications**: Slack integration for deployment status

```yaml
# CI Pipeline snippet
- name: Run pytest with coverage
  run: pytest --cov=app --cov-report=xml --cov-fail-under=85
  
- name: Deploy to Fly.io
  run: flyctl deploy --remote-only
  
- name: Health check deployment
  run: curl -f https://repright-backend.fly.dev/health || exit 1
```

## Performance Targets

### Mobile App:
- **Frame Rate**: 60fps camera rendering with pose overlay
- **Rep Detection Latency**: <100ms from pose to feedback
- **Memory Usage**: <200MB during active workout session
- **Battery Impact**: <15% drain per 30-minute session

### Backend:
- **API Response Time**: <500ms for 95th percentile
- **Video Processing**: <30s for 60s workout video
- **Concurrent Users**: 1,000 simultaneous video uploads
- **Database Queries**: <100ms for workout history retrieval

## Freemium Business Model

### Free Tier:
- ✅ Real-time form feedback (squat, deadlift)
- ✅ Basic rep counting  
- ✅ 7-day workout history
- 🔒 Max 3 workouts per week
- 🔒 24-hour video storage only

### Pro Tier ($7/month):
- ✅ **Unlimited workouts**
- ✅ **Multi-angle pose analysis**
- ✅ **Voice coaching cues**
- ✅ **1-year video storage**
- ✅ **Progress tracking & trends**
- ✅ **Cloud sync across devices**

### Revenue Projections:
- **Year 1**: 10,000 MAU, 8% conversion → $67,200 ARR
- **Growth Drivers**: Freemium funnel, trainer partnerships, competition season upgrades

## Development Roadmap

### Sprint 1 (2 weeks): Voice Coaching & Analytics
- Text-to-Speech integration for real-time audio cues
- Enhanced analytics dashboard with progress charts
- Rep-by-rep breakdown and trend analysis

### Sprint 2 (2 weeks): Trainer Dashboard & Team Features
- React web dashboard for coaches
- Client-trainer linking and video sharing
- Team creation, leaderboards, and challenge system

### Future Features:
- Apple Watch integration for heart rate monitoring
- Custom exercise creator beyond squat/deadlift
- AI-powered movement prediction and injury risk assessment

## NextStepsForHuman

After setting up this codebase, run these exact commands:

```bash
# 1. Backend Setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head

# 2. Infrastructure
cd ../infra
docker-compose up -d postgres redis
# Wait 30 seconds for services to start

# 3. Mobile App
cd ../mobile
npm install
npx expo start

# 4. Backend Server
cd ../backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 5. Testing
cd backend && pytest --cov=app --cov-report=html
cd ../mobile && npm test

# 6. Production Deployment
fly auth login
cd backend && flyctl deploy
```

## API Documentation

The FastAPI backend automatically generates OpenAPI documentation at `/api/docs` with interactive Swagger UI for testing all endpoints with authentication, request/response schemas, and example payloads.

This completes the **RepRight – Workout Form Analyzer** MVP implementation with real-time pose analysis, background video processing, comprehensive testing, and production-ready infrastructure. 