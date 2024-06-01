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
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    nombre_producto = db.Column(db.String(255))
    lote = db.Column(db.Integer, nullable=False, unique=True)    
    fecha_elaboracion = db.Column(db.Date)
    obrador_elaborador = db.Column(db.String(255))
    registro_sanitario = db.Column(db.String(255))
    modo_produccion = db.Column(db.String(255))
    modo_elaboracion = db.Column(db.String(255))
    ingredientes = db.Column(db.String(255))
    aditivos = db.Column(db.String(255))
    conservantes = db.Column(db.String(255))
    tratamiento_conservacion = db.Column(db.String(255))
    formato = db.Column(db.String(255))
    apto_celiaco = db.Column(db.String(255))
    producto_vegano = db.Column(db.String(255))
    tipo_envase = db.Column(db.String(255))
    fecha_caducidad = db.Column(db.Date)
    nombre_elaborador = db.Column(db.String(255))
    fecha_almacenamiento_mp = db.Column(db.Date)
    lugar_almacenamiento = db.Column(db.String(255))
    tratamiento_termico = db.Column(db.String(255))
    fecha_registro = db.Column(db.Date)

    # Crear json de la información PÚBLICA del formulario
    def to_json(self):
        return {
            'user_id': self.user_id,
            'nombre_producto': self.nombre_producto,
            'lote': self.lote,
            'fecha_elaboracion': self.fecha_elaboracion.isoformat(), # Use isoformat() for datetime object to make it JSON serializable
            'obrador_elaborador': self.obrador_elaborador,
            'registro_sanitario': self.registro_sanitario,
            'modo_produccion': self.modo_produccion,
            'modo_elaboracion': self.modo_elaboracion,
            'ingredientes': self.ingredientes,
            'aditivos': self.aditivos,
            'conservantes': self.conservantes,
            'tratamiento_conservacion': self.tratamiento_conservacion,
            'formato': self.formato,
            'apto_celiaco': self.apto_celiaco,
            'producto_vegano': self.producto_vegano,
            'tipo_envase': self.tipo_envase,
            'fecha_caducidad': self.fecha_caducidad.isoformat() # Use isoformat() for datetime object to make it JSON serializable
        }
    def __repr__(self):
        return f'<Form {self.id} by User {self.user_id}>'
