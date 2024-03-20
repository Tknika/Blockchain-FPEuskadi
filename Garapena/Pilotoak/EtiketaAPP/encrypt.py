from flask import Flask, jsonify, request, render_template_string
from flask_bcrypt import Bcrypt

app = Flask(__name__)
bcrypt = Bcrypt(app)

@app.route('/', methods=['GET', 'POST'])
def home():
    if request.method == 'POST':
        text = request.form.get('text')
        if not text:
            return jsonify({"error": "No text provided for hashing"}), 400
        hashed_password = bcrypt.generate_password_hash(text).decode('utf-8')
        return jsonify({"hashed_password": hashed_password})
    else:
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
            </body>
            </html>
        ''')

if __name__ == '__main__':
    app.run(debug=True)