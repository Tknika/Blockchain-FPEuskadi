from flask_wtf import FlaskForm
from wtforms import StringField, IntegerField, SubmitField, DateField, PasswordField
from wtforms.validators import DataRequired, NumberRange, ValidationError
from datetime import date
from flask_babel import lazy_gettext as _l

def validate_fecha_elaboracion(form, field):
    if field.data > date.today():
        raise ValidationError(_l("La fecha de elaboración debe ser anterior o igual a la fecha actual"))

def validate_fecha_almacenamiento_mp(form, field):
    if field.data >= form.fecha_elaboracion.data:
        raise ValidationError("La fecha de almacenamiento de la materia prima debe ser anterior a la fecha de elaboración")

class LoginForm(FlaskForm):
    username = StringField(_l('Usuario'), validators=[DataRequired()])
    password = PasswordField(_l('Contraseña'), validators=[DataRequired()])
    submit = SubmitField(_l('Enviar'))

class FormForm(FlaskForm):
    nombre_producto = StringField('Nombre del producto', validators=[DataRequired()])
    lote = IntegerField('Número de lote', validators=[DataRequired(), NumberRange(min=1, message='El número de lote debe ser un entero positivo')])
    fecha_elaboracion = DateField('Fecha de elaboración', format='%Y-%m-%d', validators=[DataRequired(), validate_fecha_elaboracion])
    nombre_elaborador = StringField('Nombre del elaborador', validators=[DataRequired()])
    obrador_elaborador = StringField('Obrador elaborador', validators=[DataRequired()])
    registro_sanitario = StringField('Registro sanitario', validators=[DataRequired()])
    modo_produccion = StringField('Modo de producción', validators=[DataRequired()])
    modo_elaboracion = StringField('Modo de elaboración', validators=[DataRequired()])
    ingredientes = StringField('Ingredientes', validators=[DataRequired()])
    aditivos = StringField('Aditivos', validators=[DataRequired()])
    conservantes = StringField('Conservantes', validators=[DataRequired()])
    tratamiento_conservacion = StringField('Tratamiento de conservación', validators=[DataRequired()])
    formato = StringField('Formato', validators=[DataRequired()])
    apto_celiaco = StringField('Apto para celiacos', validators=[DataRequired()])
    producto_vegano = StringField('Producto vegano', validators=[DataRequired()])
    tipo_envase = StringField('Tipo de envase', validators=[DataRequired()])
    fecha_caducidad = DateField('Fecha de caducidad', format='%Y-%m-%d', validators=[DataRequired()])
    fecha_almacenamiento_mp = DateField('Fecha de almacenamiento de la materia prima', format='%Y-%m-%d', validators=[DataRequired(), validate_fecha_almacenamiento_mp])
    lugar_almacenamiento = StringField('Lugar de almacenamiento', validators=[DataRequired()])
    tratamiento_termico = StringField('Tratamiento térmico', validators=[DataRequired()])
    submit = SubmitField('Crear/Modificar lote')
