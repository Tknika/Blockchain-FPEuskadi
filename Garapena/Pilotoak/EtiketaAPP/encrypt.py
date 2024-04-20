from flask import Flask, jsonify, request, render_template_string
from flask_bcrypt import Bcrypt

app = Flask(__name__)
bcrypt = Bcrypt(app)

from cryptography.fernet import Fernet

@app.route('/', methods=['GET', 'POST'])
def home():
    # Generate 10 new Fernet symmetric encryption keys
    keys = [Fernet.generate_key().decode() for _ in range(10)]
    
    if request.method == 'POST':
        text = request.form.get('text')
        if not text:
            return jsonify({"error": "No text provided for hashing"}), 400
        hashed_password = bcrypt.generate_password_hash(text).decode('utf-8')
        return jsonify({"hashed_password": hashed_password})
    else:
        # Render the home page with a form for hashing and a section displaying new encryption keys
        return render_template_string('''
            <!DOCTYPE html>
            <html>
            <head>
                <title>Password Hashing API</title>
            </head>
            <body>
                <h2>Welcome to the password hashing API!</h2>
                <form action="/" method="post">
                    <input type="text" name="text" placeholder="Enter text to hash" required>
                    <input type="submit" value="Hash">
                </form>
                <h3>New Fernet Symmetric Encryption Keys</h3>
                <ul>
                    {% for key in keys %}
                        <li>{{ key }}</li>
                    {% endfor %}
                </ul>
            </body>
            </html>
        ''', keys=keys)

if __name__ == '__main__':
    app.run(debug=True)