from flask import Flask
app = Flask(__name__)

@app.route("/")
def hello():
    return "Kaixo"

@app.route('/data/<payload>', methods=['GET'])
def data(payload):
    return "Kontuz!! Payload= " + payload

if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True, port=5001)
