#!/usr/bin/env python3
"""
Demo script to show language detection based on browser settings
"""

from flask import Flask, request, render_template_string
from flask_babel import Babel, _, get_locale
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

def get_locale():
    return request.accept_languages.best_match(app.config['LANGUAGES']) or app.config['BABEL_DEFAULT_LOCALE']

babel = Babel()
babel.init_app(app, locale_selector=get_locale)

# Simple template for demonstration
DEMO_TEMPLATE = '''
<!DOCTYPE html>
<html lang="{{ get_locale() }}">
<head>
    <meta charset="UTF-8">
    <title>{{ _('Iniciar sesión') }}</title>
</head>
<body>
    <h1>{{ _('Iniciar sesión') }}</h1>
    <p><strong>{{ _('Usuario') }}:</strong> {{ _('Usuario') }}</p>
    <p><strong>{{ _('Contraseña') }}:</strong> {{ _('Contraseña') }}</p>
    <p><strong>{{ _('Enviar') }}:</strong> {{ _('Enviar') }}</p>
    
    <hr>
    <p><strong>Detected locale:</strong> {{ get_locale() }}</p>
    <p><strong>Browser Accept-Language:</strong> {{ request.headers.get('Accept-Language', 'None') }}</p>
    
    <hr>
    <h3>Test different languages:</h3>
    <p>To test Basque: Set your browser to prefer Euskera (eu) or visit with Accept-Language: eu</p>
    <p>To test Spanish: Set your browser to prefer Español (es) or visit with Accept-Language: es</p>
    <p>Default fallback: Spanish (es)</p>
</body>
</html>
'''

@app.route('/')
def demo():
    return render_template_string(DEMO_TEMPLATE)

if __name__ == '__main__':
    print("Starting language demo server...")
    print("Visit http://localhost:5000 to see language detection in action")
    print("Change your browser language settings to see different translations")
    app.run(debug=True, port=5000) 