import os

# Change SECRET_KEY on the server: export SECRET_KEY="long-random-text"
SECRET_KEY = os.getenv('SECRET_KEY', 'CHANGE_THIS_SECRET_KEY')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # one day

# Frontend addresses that may call the API
CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')

MEDIA_DIR = 'media'

# Allowed upload types: content type -> file extension
AUDIO_TYPES = {
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'audio/aac': '.aac',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
}
IMAGE_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
}
