    # Thingsboard platform details
import requests, time, datetime
from flask import flash, url_for, redirect  # Importing flash from Flask
 
#@app.route('/thingsboard/<key>', methods=['GET'])
def get_device_data(key):
   # Configuration
    device_token = '27219850-0196-11ef-b82d-172c57c297f6' # DS18B20_Frigorifico_PT
    with open('refresh_JWT.txt', 'r') as file:
        refresh_token = file.read().strip()
    thingsboard_host = 'thingsboard.tknika.eus'
    #key = 'temperature'  # The telemetry key you want to average
    #start_ts = 1713265235112  # Start timestamp in milliseconds
    #end_ts = 1713265295110 # End timestamp in milliseconds
    current_ts = int(time.time() * 1000)  # Current timestamp in milliseconds
    interval_ts = 60000  # Interval in milliseconds
    start_ts = current_ts - interval_ts  # Start timestamp (60 seconds ago)
    end_ts = current_ts  # End timestamp (current time)
    
    # Function to refresh JWT token
    def refresh_jwt_token():
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

    # Get a fresh JWT token
    JWT_token = refresh_jwt_token()
    if JWT_token is None:
        return redirect(url_for('manage_forms'))
    #import sys
    #print(f"JWT_token: {JWT_token}", file=sys.stderr)
    # Prepare the API endpoint and headers
    url = f"https://{thingsboard_host}/api/plugins/telemetry/DEVICE/{device_token}/values/timeseries"
    headers = {
        "Content-Type": "application/json",
        "X-Authorization": f"Bearer {JWT_token}"
    }
    params = {
        "keys": key,
        "startTs": start_ts,
        "endTs": end_ts,
        "agg": "AVG",
        "interval": interval_ts  # The interval over which to calculate the average
    }

    # Fetch the telemetry data
    response = requests.get(url, headers=headers, params=params)
    data = response.json()
    # print(f"data: {data}", file=sys.stderr)
    #returned_ts = data[key][0]['ts'] PARECE QUE HAY UN DESVÍO DE 2 HORAS
    #print(f"returned_ts: {datetime.datetime.fromtimestamp(returned_ts / 1000.0).strftime('%Y-%m-%d %H:%M:%S')}", file=sys.stderr)
    # Lo que se obtiene es: {'temperature': [{'ts': 1713265265111, 'value': '2.0516666666666667'}]}
    # Extract the average value from the response
    '''
    if key in data and data[key]:
        avg_value = data[key][0]['value']  # Assuming the first (and only) entry is the average
        start_dt = datetime.datetime.fromtimestamp(start_ts / 1000.0).strftime('%Y-%m-%d %H:%M:%S')
        end_dt = datetime.datetime.fromtimestamp(end_ts / 1000.0).strftime('%Y-%m-%d %H:%M:%S')
        message = f'La media de \'{key}\' desde {start_dt} hasta {end_dt}: {float(avg_value):.2f}'
        return render_template('informacion.html', message=message)
    else:
        message = f'No se ha encontrado información para la clave {key} en el rango temporal dado.'
        return render_template('informacion.html', message=message)
    '''
    if key in data and data[key]:
        avg_value = data[key][0]['value']  # Assuming the first (and only) entry is the average
        return f"{float(avg_value):.2f}"
    else:
        # If no data is found for the given key and time range, raise an exception
        raise Exception(f'No se ha encontrado información para la clave {key} en el rango temporal dado.')
    