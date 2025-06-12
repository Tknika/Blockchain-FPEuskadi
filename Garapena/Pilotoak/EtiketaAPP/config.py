import os

class Config:
    # Secret key for signing cookies
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
    # Database configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'mysql+pymysql://etiketa:etiketa@db:3306/etiketa'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Internationalization configuration
    LANGUAGES = ['es', 'eu']  # Spanish and Basque
    BABEL_DEFAULT_LOCALE = 'es'
    BABEL_DEFAULT_TIMEZONE = 'UTC'
