# RepRight Architecture Overview

## System Architecture Diagram

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

## Architecture Explanation

RepRight employs a **microservices-oriented architecture** optimized for real-time performance and scalable video processing. The system separates **real-time mobile interactions** from **compute-intensive background processing** to ensure smooth user experience.

**Mobile clients** perform on-device pose estimation using MediaPipe BlazePose for instant feedback (green/red form indicators), eliminating network latency. Workout sessions are stored locally via AsyncStorage and optionally synced to the cloud. The React Native app communicates with the FastAPI backend through RESTful endpoints for authentication, video uploads, and historical data retrieval.

**Backend architecture** centers on FastAPI for high-performance async request handling with JWT-based authentication. Video uploads trigger Celery background tasks that re-analyze footage at 30fps using OpenCV + MediaPipe for more detailed form scoring than real-time mobile analysis allows. PostgreSQL stores structured data (users, workouts, metrics) while S3 handles video files and thumbnails.

**Scalability** is achieved through Redis-backed task queues for video processing and horizontal scaling of Celery workers. The stateless API design enables multiple FastAPI instances behind a load balancer. **Data consistency** is maintained through Alembic database migrations and Pydantic v2 models ensuring type safety across the stack.

**Deployment strategy** leverages Docker containers orchestrated via docker-compose for local development and Fly.io for production hosting. GitHub Actions automates testing (pytest, mypy, ruff), building, and deployment workflows. This architecture supports the freemium model by enabling feature flags and usage tracking while maintaining ≥85% test coverage and sub-second API response times. 