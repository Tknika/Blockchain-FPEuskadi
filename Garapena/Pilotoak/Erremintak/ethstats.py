import websocket
import json
import time
from datetime import datetime


OFFLINE_THRESHOLD = 10000  # 10 seconds
node_last_seen = {}

def on_message(ws, message):
    print(f"Received message: {message[:200]}...")  # Print first 200 chars of message
    data = json.loads(message)
    
    # Handle different message types
    if isinstance(data, dict):
        # Example: Only process node stats
        if 'action' in data and data['action'] == 'stats':
            node_id = data['data']['id']
            node_stats = data['data']['stats']
            
            # Example: Only log if node is active
            if node_stats.get('active'):
                print(f"Active node {node_id}:")
                print(f"- Peers: {node_stats.get('peers', 0)}")
                #print(f"- Block: {node_stats.get('block', {}).get('number', 'unknown')}")
                #print(f"- Mining: {node_stats.get('mining', False)}")

def on_error(ws, error):
    print(f"WebSocket error: {error}")

def on_close(ws, close_status_code, close_msg):
    print(f"WebSocket connection closed: {close_status_code} - {close_msg}")

def check_nodes():
    print("Checking nodes...")
    now = time.time() * 1000
    offline_nodes = []
    for node_id, last_seen in node_last_seen.items():
        if now - last_seen > OFFLINE_THRESHOLD:
            offline_nodes.append(node_id)
            send_alert(f"Node {node_id} appears to be offline!")
    
    # Send alert with list of all nodes and their status
    status_message = "Node Status Report:\n"
    for node_id, last_seen in node_last_seen.items():
        status = "OFFLINE" if node_id in offline_nodes else "ONLINE"
        status_message += f"Node {node_id}: {status}\n"
    send_alert(status_message)

def send_alert(message):
    print(message)
    # Implement your preferred alerting method:
    # - Email
    # - Slack
    # - Discord
    # - SMS
    # - etc.
    pass

def run_periodic_check():
    print("running periodic check")
    while True:
        check_nodes()
        time.sleep(10)  # Check every minute

def on_open(ws):
    print("WebSocket connection opened")
    # For the client connection, we don't need to send a hello message
    # The server will start sending updates automatically

def test_connection(url, timeout=5):
    try:
        # Add the /api endpoint to the URL
        if not url.endswith('/api'):
            url = url + '/api'
            
        ws = websocket.create_connection(url, timeout=timeout)
        
        # Send hello message with required data
        hello_message = {
            "id": "test-client",
            "secret": "asdf",
            "info": {
                "name": "Test Client",
                "node": "TestNode",
                "port": 0
            }
        }
        
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
    ws_url = "ws://192.168.100.5:3000/primus"  # Using the client endpoint instead of API
    
    # Test connection before starting WebSocket
    if not test_connection(ws_url):
        print("Exiting due to connection failure")
        exit(1)
        
    # Create persistent WebSocket connection
    ws = websocket.WebSocketApp(ws_url,
                              on_message=on_message,
                              on_open=on_open,
                              on_error=on_error,
                              on_close=on_close)
    
    # Start WebSocket connection (this will block)
    ws.run_forever()