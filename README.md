# RepRight - AI-Powered Workout Form Analysis

RepRight is an AI-powered fitness application that analyzes workout form in real-time using computer vision and provides personalized feedback through voice coaching.

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+ 
- Expo CLI (`npm install -g @expo/cli`)
- Redis (for background tasks)
- PostgreSQL (for production) or SQLite (for development)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip3 install -r requirements.txt
```

3. Set environment variables:
```bash
export PYTHONPATH=/path/to/your/Workout/backend
export DATABASE_URL="sqlite:///./test.db"  # or your PostgreSQL URL
export CELERY_BROKER_URL="redis://localhost:6379/0"
export CELERY_RESULT_BACKEND="redis://localhost:6379/0"
```

4. Start the backend server:
```bash
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at `http://localhost:8000`

### Mobile App Setup

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
# or for iOS simulator
npm run ios
# or for Android emulator  
npm run android
```

### Docker Setup (Alternative)

You can also run the entire stack using Docker:

```bash
cd infra
docker-compose up --build
```

## 🔧 Configuration

### Environment Variables

Backend environment variables can be set in a `.env` file:

```env
DATABASE_URL=sqlite:///./test.db
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
SECRET_KEY=your-super-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
DEBUG=True
ENVIRONMENT=development
MAX_UPLOAD_SIZE_MB=100
UPLOAD_DIR=uploads
```

## 🏗 Architecture

- **Backend**: FastAPI with SQLAlchemy, MediaPipe for pose detection, Celery for background processing
- **Mobile**: React Native with Expo, TypeScript
- **Database**: PostgreSQL/SQLite
- **Cache/Queue**: Redis
- **File Storage**: Local filesystem (configurable to S3)

## 🔍 API Endpoints

- `GET /health` - Health check
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user
- `POST /workouts/upload` - Upload workout video
- `GET /workouts/` - Get user workout sessions
- `GET /cues/settings` - Get voice settings
- `PUT /cues/settings` - Update voice settings

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Mobile Tests
```bash
cd mobile
npm test
```

### Type Checking
```bash
cd mobile
npm run type-check
```

## 🛠 Development

### Code Quality
```bash
# Mobile linting
cd mobile
npm run lint

# Fix linting issues
npm run lint:fix
```

### Database Migrations

```bash
cd backend
alembic revision --autogenerate -m "Your migration message"
alembic upgrade head
```

## 🎯 Features

- ✅ Real-time workout form analysis using MediaPipe
- ✅ Voice coaching with customizable cues
- ✅ User authentication and profiles
- ✅ Workout history and analytics
- ✅ Gamification and leaderboards
- ✅ RESTful API with comprehensive documentation
- ✅ Mobile app with React Native/Expo
- ✅ Background video processing with Celery
- ✅ Docker containerization

## 📱 Mobile App Features

- Camera integration for real-time analysis
- Voice feedback and haptic responses
- Workout history and progress tracking
- Analytics and insights
- User settings and preferences
- Offline capability for core features

## 🐛 Troubleshooting

### Backend Issues

1. **Module import errors**: Ensure `PYTHONPATH` is set correctly
2. **Database connection errors**: Check `DATABASE_URL` and database is running
3. **Celery task errors**: Ensure Redis is running and accessible

### Mobile Issues

1. **Metro bundler issues**: Clear cache with `npx expo start --clear`
2. **Native module errors**: Run `npx expo install --fix`
3. **Type errors**: Run `npm run type-check` to identify issues

### Common Solutions

1. **Clear all caches**:
```bash
# Mobile
cd mobile && rm -rf node_modules && npm install
npx expo start --clear

# Backend
cd backend && pip3 install -r requirements.txt --force-reinstall
```

2. **Reset database**:
```bash
cd backend && rm -f test.db
python3 -c "from app.db.session import engine, Base; Base.metadata.create_all(bind=engine)"
```

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

For detailed contributing guidelines, see CONTRIBUTING.md. 