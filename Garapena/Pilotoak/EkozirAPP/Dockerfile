FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=Europe/Madrid

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libffi-dev \
        libssl-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only requirements.txt first to leverage Docker cache
# This layer will be cached unless requirements.txt changes
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
# This layer will be rebuilt when app code changes, but dependencies stay cached
COPY . /app

# Compile translation files (.po to .mo) for Flask-Babel
# This ensures all language translations are available at runtime
RUN pybabel compile -d app/translations || echo "Warning: Translation compilation failed, but continuing..."

#EXPOSE 5003

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5005", "wsgi:application"]

