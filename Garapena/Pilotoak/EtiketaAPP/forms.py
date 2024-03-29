from flask_wtf import FlaskForm
from wtforms import StringField, IntegerField, SubmitField, DateField, PasswordField
from wtforms.validators import DataRequired, NumberRange

class LoginForm(FlaskForm):
    username = StringField('Usuario', validators=[DataRequired()])
    password = PasswordField('Contraseña', validators=[DataRequired()])
    submit = SubmitField('Enviar')
class FormForm(FlaskForm):
    responsable = StringField('Responsable', validators=[DataRequired()])
    lote = IntegerField('Lote', validators=[DataRequired(), NumberRange(min=1, message='El número de lote debe ser un entero positivo')])
    fecha_elaboracion = DateField('Fecha', format='%Y-%m-%d', validators=[DataRequired()])
    submit = SubmitField('Crear/Modificar lote')
