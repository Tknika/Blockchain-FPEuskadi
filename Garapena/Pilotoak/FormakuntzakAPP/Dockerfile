# Use an official Python runtime as a parent image
FROM python:3.10-slim

ENV TZ=Europe/Madrid

RUN apt-get update && apt-get install -y default-libmysqlclient-dev build-essential pkg-config

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed packages specified in requirements.txt 
# ADD --no-cache-dir
RUN pip install --no-cache-dir -r requirements.txt

# Make port 5002 available to the world outside this container
#EXPOSE 5002

# Run etiketa app using gunicorn when the container launches
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5002", "server:app"]
