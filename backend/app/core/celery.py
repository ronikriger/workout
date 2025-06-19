"""
Celery configuration for background tasks
"""

from celery import Celery
from app.core.config import CeleryConfig

# Create Celery instance
celery_app = Celery(
    "repright_worker",
    broker=CeleryConfig.CELERY_BROKER_URL,
    backend=CeleryConfig.CELERY_RESULT_BACKEND,
    include=['app.services.video_processor']
)

# Configure Celery
celery_app.config_from_object(CeleryConfig)

# Auto-discover tasks
celery_app.autodiscover_tasks(['app.services'])

if __name__ == '__main__':
    celery_app.start() 