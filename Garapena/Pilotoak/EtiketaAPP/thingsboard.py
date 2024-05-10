# Thingsboard platform requests
import requests, time
from flask import flash  # Importing flash from Flask

thingsboard_host = 'thingsboard.tknika.eus'
# Function to refresh JWT token
def refresh_jwt_token():
    with open('refresh_JWT.txt', 'r') as file:
        refresh_token = file.read().strip()
    refresh_url = f"https://{thingsboard_host}/api/auth/token"
    refresh_headers = {
        "Content-Type": "application/json"
    }
    refresh_body = {
        "refreshToken": refresh_token
    }
    refresh_response = requests.post(refresh_url, headers=refresh_headers, json=refresh_body)
    if refresh_response.status_code == 200:
        return refresh_response.json()['token']
    else:
        flash('Error obteniendo token JWT.')
        return None

#@app.route('/thingsboard/<key>', methods=['GET'])
def get_devices_data():
    # Get a fresh JWT token
    JWT_token = refresh_jwt_token()
    if JWT_token is None:
        raise Exception('No se ha obtenido token JWT para la lectura de datos')

    # Create a dictionary to store private data
    private_data = {}

   # Configuration - IDEA: ¿almacenar toda la información de los dispositivos en una base de datos?
    # --------------- DS18B20_Frigorifico_PT ---------------
    device_token = '27219850-0196-11ef-b82d-172c57c297f6' # DS18B20_Frigorifico_PT
    device_name = 'DS18B20_Frigorifico_PT'
    device_key = 'temperature'
    nombre_campo = 't_frigorifico_pt'
    #key = 'temperature'  # The telemetry key you want to average
    #start_ts = 1713265235112  # Start timestamp in milliseconds
    #end_ts = 1713265295110 # End timestamp in milliseconds
    #start_dt = datetime.datetime.fromtimestamp(start_ts / 1000.0).strftime('%Y-%m-%d %H:%M:%S')
    #end_dt = datetime.datetime.fromtimestamp(end_ts / 1000.0).strftime('%Y-%m-%d %H:%M:%S')
    # POR AHORA COMÚN PARA TODAS LAS CONSULTAS, SE TOMA EL ÚLTIMO MINUTO
    current_ts = int(time.time() * 1000)  # Current timestamp in milliseconds
    interval_ts = 60000  # Interval in milliseconds
    start_ts = current_ts - interval_ts  # Start timestamp (60 seconds ago)
    end_ts = current_ts  # End timestamp (current time)
    
    private_data[nombre_campo] = get_data(JWT_token, device_token, device_name, device_key, start_ts, end_ts, interval_ts)

    # --------------- BÁSCULA ---------------
    device_token = '3fe8fa90-0196-11ef-b82d-172c57c297f6' # HX711_Bascula_MP
    device_name = 'HX711_Bascula_MP'
    device_key = 'weight'
    nombre_campo = 'peso_bascula'

    private_data[nombre_campo] = get_data(JWT_token, device_token, device_name, device_key, start_ts, end_ts, interval_ts)

    # --------------- TEMP FERMENTACIÓN ZUMOS ---------------
    device_token = '3ade8b00-0196-11ef-b82d-172c57c297f6' # DS18B20_Fermentacion_Zumos  ¿¿IGUAL AL ALTERIOR??
    device_name = 'DS18B20_Fermentacion_Zumos'
    device_key = 'temperature'
    nombre_campo = 't_fermentacion_zumos'

    private_data[nombre_campo] = get_data(JWT_token, device_token, device_name, device_key, start_ts, end_ts, interval_ts)

    # --------------- TEMP PASTEURIZACIÓN ZUMOS ---------------
    device_token = '35242c60-0196-11ef-b82d-172c57c297f6' # DS18B20_Pasteurizacion_Zumos
    device_name = 'DS18B20_Pasteurizacion_Zumos'
    device_key = 'temperature'
    nombre_campo = 't_pasteurizacion_zumos'

    private_data[nombre_campo] = get_data(JWT_token, device_token, device_name, device_key, start_ts, end_ts, interval_ts)

    # --------------- PRESIÓN DEL AGUA ---------------
    device_token = '2cbfe370-0196-11ef-b82d-172c57c297f6' # SEN0257_Prensa_Zumos
    device_name = 'SEN0257_Prensa_Zumos'
    device_key = 'pressure'
    nombre_campo = 'presion_agua'

    private_data[nombre_campo] = get_data(JWT_token, device_token, device_name, device_key, start_ts, end_ts, interval_ts)

    # --------------- DS18B20_Frigorifico_MP ---------------
    device_token = '2169f8d0-0196-11ef-b82d-172c57c297f6' # DS18B20_Frigorifico_MP
    device_name = 'DS18B20_Frigorifico_MP'
    device_key = 'temperature'
    nombre_campo = 't_frigorifico_mp'

    private_data[nombre_campo] = get_data(JWT_token, device_token, device_name, device_key, start_ts, end_ts, interval_ts)

    # --------------- TEMPERATURA PT ---------------
    device_token = '1c537b50-0196-11ef-b82d-172c57c297f6' # DHT22_Ambiente_PT
    device_name = 'DHT22_Ambiente_PT'
    device_key = 'temperature'
    nombre_campo = 't_ambiente_pt'

    private_data[nombre_campo] = get_data(JWT_token, device_token, device_name, device_key, start_ts, end_ts, interval_ts)

    # --------------- HUMEDAD PT ---------------
    device_token = '1c537b50-0196-11ef-b82d-172c57c297f6' # DHT22_Ambiente_PT
    device_name = 'DHT22_Ambiente_PT'
    device_key = 'humidity'
    nombre_campo = 'h_ambiente_pt'

    private_data[nombre_campo] = get_data(JWT_token, device_token, device_name, device_key, start_ts, end_ts, interval_ts)    

    # --------------- TEMPERATURA MP ---------------
    device_token = '15ecfe30-0196-11ef-b82d-172c57c297f6' # DHT22_Ambiente_MP
    device_name = 'DHT22_Ambiente_MP'
    device_key = 'temperature'
    nombre_campo = 't_ambiente_mp'

    private_data[nombre_campo] = get_data(JWT_token, device_token, device_name, device_key, start_ts, end_ts, interval_ts)

    # --------------- HUMEDAD MP ---------------
    device_token = '15ecfe30-0196-11ef-b82d-172c57c297f6' # DHT22_Ambiente_MP
    device_name = 'DHT22_Ambiente_MP'
    device_key = 'humidity'
    nombre_campo = 'h_ambiente_mp'

    private_data[nombre_campo] = get_data(JWT_token, device_token, device_name, device_key, start_ts, end_ts, interval_ts) 

    return private_data

def get_data(JWT_token, device_token, device_name, device_key, start_ts, end_ts, interval_ts):
    # Prepare the API endpoint and headers
    url = f"https://{thingsboard_host}/api/plugins/telemetry/DEVICE/{device_token}/values/timeseries"

    headers = {
        "Content-Type": "application/json",
        "X-Authorization": f"Bearer {JWT_token}"
    }
    params = {
        "keys": device_key,
        "startTs": start_ts,
        "endTs": end_ts,
        "agg": "AVG",
        "interval": interval_ts  # The interval over which to calculate the average
    }

    # Fetch the telemetry data
    response = requests.get(url, headers=headers, params=params)
    data = response.json()
    number = ''
    # print(f"data: {data}", file=sys.stderr)
    #returned_ts = data[key][0]['ts'] PARECE QUE HAY UN DESVÍO DE 2 HORAS
    #print(f"returned_ts: {datetime.datetime.fromtimestamp(returned_ts / 1000.0).strftime('%Y-%m-%d %H:%M:%S')}", file=sys.stderr)
    # Lo que se obtiene es: {'temperature': [{'ts': 1713265265111, 'value': '2.0516666666666667'}]}
    # Extract the average value from the response
    if device_key in data and data[device_key]:
        avg_value = data[device_key][0]['value']  # Assuming the first (and only) entry is the average
        number = f"{float(avg_value):.2f}"
    else:
        flash(f'Sin información para {device_name} con la clave {device_key} en el rango temporal dado.')

    return number
