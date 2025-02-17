#!/bin/sh
# Start the ethstats server
dumb-init node ./bin/www &

# Start the Python monitoring script
python3 /app/alertak/ethstats.py &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
