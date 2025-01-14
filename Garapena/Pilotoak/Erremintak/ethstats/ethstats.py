import websocket
import json
import time
from datetime import datetime
import configparser
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# Load configuration
config = configparser.ConfigParser()
config_path = os.path.join(os.path.dirname(__file__), 'ethstats.ini')
config.read(config_path)

# Load node names mapping
node_names_path = os.path.join(os.path.dirname(__file__), 'node_names.json')
with open(node_names_path) as f:
    node_names = json.load(f)

# Get configuration values
OFFLINE_THRESHOLD = config.getint('report', 'offline_threshold')
REPORT_INTERVAL = config.getint('report', 'report_interval')
RECONNECT_TIME = config.getint('websocket', 'reconnect_time')
WS_URL = f"{config['websocket']['url']}:{config['websocket']['port']}/primus"

# Define hello_message from config
hello_message = {
    "id": config['auth']['client_id'],
    "secret": config['auth']['secret'],
    "info": {
        "name": config['auth']['client_name'],
        "node": config['auth']['node_name'],
        "port": config.getint('auth', 'node_port')
    }
}

node_last_seen = {}
nodes_data = []  # List to store node information
previous_nodes_data = []  # List to store previous node data

def update_node_data(node_id, peers, is_online):
    """
    Update the nodes_data array with the latest node information
    
    Args:
        node_id (str): ID of the node
        peers (int/str): Number of peers or 'unknown'
        is_online (bool): Whether the node is online
    """
    # Find if node already exists in the array
    node_entry = next((node for node in nodes_data if node['id'] == node_id), None)
    
    if node_entry:
        # Update existing node
        node_entry['peers'] = peers
        node_entry['status'] = "ONLINE" if is_online else "OFFLINE"
    else:
        # Add new node
        nodes_data.append({
            'id': node_id,
            'peers': peers,
            'status': "ONLINE" if is_online else "OFFLINE"
        })

def generate_status_report():
    """
    Generate a status report based on the nodes_data array
    
    Returns:
        str: Formatted status report message
    """
    global previous_nodes_data
    global nodes_data
    global node_last_seen

    current_time = time.time()
    status_message = "Node Status Report:\n"
    
    now = current_time * 1000
    # Generate report from nodes_data
    for node in nodes_data:
        is_online = (now - node_last_seen[node['id']]) < OFFLINE_THRESHOLD
        node['status'] = "ONLINE" if is_online else "OFFLINE"
        if node['status'] == "OFFLINE":
            node['peers'] = 0
        status_message += f"Node {node['id']}: {node['status']} (peers: {node['peers']})\n"
    
    return status_message

def on_message(ws, message):
    global previous_nodes_data
    global nodes_data
    global node_last_seen

    current_time = time.time()
    
    # Parse message
    data = json.loads(message)
    
    # Only process stats messages
    if not isinstance(data, dict) or data.get('action') != 'stats':
        return
    #print(f"Received message: {message[:200]}...")  # Print first 200 chars of message
    
    # Handle different message types
    if isinstance(data, dict):
        # Process node stats
        if 'action' in data and data['action'] == 'stats':
            # Get node name from static-nodes.json if available
            node_name = data['data']['id']
            # Get node name from node_names.json mapping
            if data['data']['id'] in node_names:
                node_name = node_names[data['data']['id']]
            
            node_id = node_name
            node_stats = data['data']['stats']
            
            # Update last seen timestamp for this node
            node_last_seen[node_id] = current_time * 1000  # Convert to milliseconds
            
            # Update node data in the array
            now = current_time * 1000
            node_last_seen[node_id] = now;
            peers = node_stats.get('peers', 'unknown')
            update_node_data(node_id, peers, True)
            
            # Store node stats for status report
            if not hasattr(ws, 'last_report_time'):
                ws.last_report_time = current_time
            
            # Generate and send status report
            if current_time - ws.last_report_time >= REPORT_INTERVAL:
                status_message = generate_status_report()
                
                # Send the status report and update last report time
                send_alert(status_message)
                
                # Initialize previous_nodes_data if empty
                if not previous_nodes_data:
                    previous_nodes_data.extend([node.copy() for node in nodes_data])
                    
                # Compare current data with previous data and send email if there are changes
                if len(previous_nodes_data) != len(nodes_data) or any(prev['peers'] != curr['peers'] or prev['status'] != curr['status'] 
                      for prev, curr in zip(previous_nodes_data, nodes_data)):
                    send_email(f"Ha cambiado el estado de los nodos:\nEstado anterior:\n {previous_nodes_data}\nEstado nuevo:\n {nodes_data}")
                
                # Update previous_nodes_data with current state
                previous_nodes_data = [node.copy() for node in nodes_data]
                
                # Reset all nodes to offline with zero peers
                for node in nodes_data:
                    node['peers'] = 0
                    node['status'] = 'OFFLINE'
                
                ws.last_report_time = current_time
            
            # If this specific node is active, log additional details
            #if node_stats.get('active'):
                #print(f"Active node {node_id}:")
                #print(f"- Peers: {node_stats.get('peers', 0)}")
                #print(f"- Block: {node_stats.get('block', {}).get('number', 'unknown')}")
                #print(f"- Mining: {node_stats.get('mining', False)}")

def on_error(ws, error):
    print(f"WebSocket error: {error}")

def on_close(ws, close_status_code, close_msg):
    print(f"WebSocket connection closed: {close_status_code} - {close_msg}")

def send_alert(message):
    print(message)

def send_email(message):
    # Email configuration
    sender_email = config['email']['sender_email']  # Replace with your Gmail address
    sender_password = config['email']['sender_password']   # Replace with your Gmail app password
    recipients = config['email']['recipients'].split(',')  # Replace with recipient emails
    
    # Create message
    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = ", ".join(recipients)
    msg['Subject'] = "Alerta de estado de nodos"
    msg.attach(MIMEText(message, 'plain'))

    try:
        # Create SMTP session
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        
        # Login
        server.login(sender_email, sender_password)
        
        # Send email
        server.send_message(msg)
        server.quit()
        print("Alerta de estado de nodos enviada correctamente por email")
    except Exception as e:
        print(f"Error al enviar la alerta de estado de nodos por email: {str(e)}")

def on_open(ws):
    print("Conexión WebSocket abierta")
    ws.send(json.dumps({"emit": ["hello", hello_message]}))

def test_connection(url, timeout=5):
    try:
        # Add the /api endpoint to the URL
        if not url.endswith('/api'):
            url = url + '/api'
            
        ws = websocket.create_connection(url, timeout=timeout)
        
        ws.send(json.dumps({"emit": ["hello", hello_message]}))
        
        # Wait for response
        result = ws.recv()
        # print(f"Respuesta del servidor: {result}")
        
        ws.close()
        print(f"✓ Conexión WebSocket establecida correctamente con {url}")
        return True
        
    except (websocket.WebSocketTimeoutException,
            websocket.WebSocketBadStatusException,
            websocket.WebSocketAddressException) as e:
        print(f"✗ Conexión WebSocket fallida con {url}")
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    while True:  # Reconnection loop
        try:
            if not test_connection(WS_URL):
                print("Saliendo debido a fallo de conexión")
                exit(1)
            
            ws = websocket.WebSocketApp(WS_URL,
                                      on_message=on_message,
                                      on_open=on_open,
                                      on_error=on_error,
                                      on_close=on_close)
            
            # Pass ping parameters to run_forever instead
            ws.run_forever(ping_interval=30,  # Send ping every 30 seconds
                         ping_timeout=10)     # Wait 10 seconds for pong
            
            print(f"Conexión perdida, reconectando en {RECONNECT_TIME} segundos...")
            time.sleep(RECONNECT_TIME)
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(RECONNECT_TIME)  # Wait before reconnecting