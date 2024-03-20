import os

class Config:
    # Secret key for signing cookies
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
    # Database configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'mysql+pymysql://user:password@db:3306/appdb'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
