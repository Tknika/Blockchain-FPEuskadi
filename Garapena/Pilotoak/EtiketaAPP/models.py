from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_login import UserMixin

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)  # Unique identifier for each user
    username = db.Column(db.String(80), unique=True, nullable=False)  # Username must be unique and not null
    password = db.Column(db.String(120), nullable=False)  # Stores the hashed password, not null
    encryption_key = db.Column(db.String(255), nullable=False)  # Stores the Fernet symmetric encryption key
    forms = db.relationship('Form', backref='author', lazy=True)  # Establishes a relationship with the Form model

    def __repr__(self):
        return f'<User {self.username}>'
class Form(db.Model):
    __tablename__ = 'forms'
    id = db.Column(db.Integer, primary_key=True)
    responsable = db.Column(db.String(200), nullable=False)
    lote = db.Column(db.Integer, nullable=False, unique=True)
    fecha_elaboracion = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def to_json(self):
        return {
            'lote': self.lote,
            'responsable': self.responsable,            
            'fecha_elaboracion': self.fecha_elaboracion.isoformat() # Use isoformat() for datetime object to make it JSON serializable
        }
    def __repr__(self):
        return f'<Form {self.id} by User {self.user_id}>'
