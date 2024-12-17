import websocket
import json
import time
from datetime import datetime
import configparser
import os

# Load configuration
config = configparser.ConfigParser()
config_path = os.path.join(os.path.dirname(__file__), 'ethstats.ini')
config.read(config_path)

# Get configuration values
OFFLINE_THRESHOLD = config.getint('report', 'offline_threshold')
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
    status_message = "Node Status Report:\n"
    
    # Generate report from nodes_data
    for node in nodes_data:
        status_message += f"Node {node['id']}: {node['status']} (peers: {node['peers']})\n"
    
    return status_message

def on_message(ws, message):
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
            node_id = data['data']['id']
            node_stats = data['data']['stats']
            
            # Update last seen timestamp for this node
            node_last_seen[node_id] = current_time * 1000  # Convert to milliseconds
            
            # Update node data in the array
            now = current_time * 1000
            is_online = (now - node_last_seen[node_id]) < OFFLINE_THRESHOLD
            peers = node_stats.get('peers', 'unknown')
            update_node_data(node_id, peers, is_online)
            
            # Store node stats for status report
            if not hasattr(ws, 'last_report_time'):
                ws.last_report_time = current_time
            
            # Generate and send status report every 20 seconds
            if current_time - ws.last_report_time >= 20:
                status_message = generate_status_report()
                
                # Send the status report and update last report time
                send_alert(status_message)
                
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
    # Implement your preferred alerting method:
    # - Email
    # - Slack
    # - Discord
    # - SMS
    # - etc.
    pass

def on_open(ws):
    print("WebSocket connection opened")
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
        print(f"Server response: {result}")
        
        ws.close()
        print(f"✓ Successfully established WebSocket connection to {url}")
        return True
        
    except (websocket.WebSocketTimeoutException,
            websocket.WebSocketBadStatusException,
            websocket.WebSocketAddressException) as e:
        print(f"✗ WebSocket connection failed to {url}")
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    while True:  # Reconnection loop
        try:
            if not test_connection(WS_URL):
                print("Exiting due to connection failure")
                exit(1)
            
            ws = websocket.WebSocketApp(WS_URL,
                                      on_message=on_message,
                                      on_open=on_open,
                                      on_error=on_error,
                                      on_close=on_close)
            
            # Pass ping parameters to run_forever instead
            ws.run_forever(ping_interval=30,  # Send ping every 30 seconds
                         ping_timeout=10)     # Wait 10 seconds for pong
            
            print(f"Connection lost, reconnecting in {RECONNECT_TIME} seconds...")
            time.sleep(RECONNECT_TIME)
        except Exception as e:
            print(f"Error occurred: {e}")
            time.sleep(RECONNECT_TIME)  # Wait before reconnecting