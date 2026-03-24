# Backend (FastAPI) image
FROM python:3.12-slim

WORKDIR /app

# Install system fonts so unicode symbols like ₹ render in PDFs
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code (docker-compose uses context: ., so paths are from repo root)
COPY backend/ ./backend/

EXPOSE 8080

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
