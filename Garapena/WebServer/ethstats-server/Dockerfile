FROM node:lts-alpine AS builder
ARG GRUNT_TASK=default
WORKDIR /ethstats-server
COPY ["package.json", "package-lock.json*", "./"]
RUN npm ci --only=production && npm install -g grunt-cli
COPY --chown=node:node . .
RUN grunt $GRUNT_TASK

FROM node:lts-alpine
RUN apk add dumb-init python3 py3-pip
WORKDIR /ethstats-server
COPY --chown=node:node --from=builder /ethstats-server .

# Create logs directory with proper permissions
RUN mkdir -p /app/alertak/logs && \
    chown -R node:node /app/alertak/logs
    
# Copy the Python script and its dependencies
COPY ./alertak/ethstats.py /app/alertak/
COPY ./alertak/ethstats.ini /app/alertak/
COPY ./alertak/node_names.json /app/alertak/

# Install Python dependencies
RUN pip3 install websocket-client

USER node
EXPOSE 3000

# Create a start script
COPY start.sh /app/
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
