from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_login import UserMixin

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    forms = db.relationship('Form', backref='author', lazy=True)

    def __repr__(self):
        return f'<User {self.username}>'

class Form(db.Model):
    __tablename__ = 'forms'
    id = db.Column(db.Integer, primary_key=True)
    responsable = db.Column(db.String(200), nullable=False)
    lote = db.Column(db.Integer, nullable=False, unique=True)
    fecha_elaboracion = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def __repr__(self):
        return f'<Form {self.id} by User {self.user_id}>'
