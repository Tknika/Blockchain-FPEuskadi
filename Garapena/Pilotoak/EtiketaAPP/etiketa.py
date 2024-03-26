from flask import Flask, render_template, redirect, url_for, flash, request
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from flask_bcrypt import Bcrypt
from models import db, User, Form
from forms import LoginForm, FormForm
from config import Config
from sqlalchemy.exc import IntegrityError

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
bcrypt = Bcrypt(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        #import sys
        #print(f"User Password Hash: {user.password}", file=sys.stderr)
        #print(f"Form Password Data: {form.password.data}", file=sys.stderr)
        try:
            password_check = bcrypt.check_password_hash(user.password, form.password.data) if user else False
        except ValueError:
            password_check = False

        if user and password_check:
            login_user(user)
            return redirect(url_for('manage_forms'))
        else:
            flash('Usuario o contraseña incorrectos. Inténtelo de nuevo.')
    return render_template('login.html', title='Iniciar sesión', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/manage_forms', methods=['GET', 'POST'])
@login_required
def manage_forms():
    form = FormForm()
    if form.validate_on_submit():
        new_form = Form(responsable=form.responsable.data, lote=form.lote.data, fecha_elaboracion=form.fecha_elaboracion.data, user_id=current_user.id)
        db.session.add(new_form)
        try:
            db.session.commit()
            flash('Proceso productivo creado correctamente.')
            return redirect(url_for('manage_forms'))  # Redirect to load an empty form
        except IntegrityError:
            db.session.rollback()  # Roll back the transaction
            flash('Error: Ese número de lote ya existe.')
    forms = Form.query.filter_by(user_id=current_user.id).all()
    return render_template('manage_forms.html', title='Procesos productivos', nuevo_editar='Nuevo lote', form=form, forms=forms)

@app.route('/edit_form/<int:form_id>', methods=['GET', 'POST'])
@login_required
def edit_form(form_id):
    form = FormForm()
    form_to_edit = Form.query.get_or_404(form_id)
    if form_to_edit.user_id != current_user.id:
        flash('No tiene permiso para editar este lote.')
        return redirect(url_for('manage_forms'))
    if form.validate_on_submit():
        form_to_edit.responsable = form.responsable.data
        form_to_edit.lote = form.lote.data
        form_to_edit.fecha_elaboracion = form.fecha_elaboracion.data
        try:
            db.session.commit()
            flash('Datos actualizados correctamente.')
        except IntegrityError:
            db.session.rollback()  # Roll back the transaction
            flash('Error: Ese número de lote ya existe.')
            forms = Form.query.filter_by(user_id=current_user.id).all()
            return render_template('manage_forms.html', title='Procesos productivos', nuevo_editar='Editar lote', form=form, forms=forms, current_user=current_user)
        return redirect(url_for('manage_forms'))
    elif request.method == 'GET':
        form.responsable.data = form_to_edit.responsable
        form.lote.data = form_to_edit.lote
        form.fecha_elaboracion.data = form_to_edit.fecha_elaboracion
        
    forms = Form.query.filter_by(user_id=current_user.id).all()
    return render_template('manage_forms.html', title='Procesos productivos', nuevo_editar='Editar lote', form=form, forms=forms, current_user=current_user)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
