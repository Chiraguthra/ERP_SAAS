# Backend (FastAPI) image
FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt

# DejaVu for ₹ and Indic; Playwright Chromium + OS deps for HTML→PDF
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core \
    && pip install --no-cache-dir -r backend/requirements.txt \
    && python -m playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

# Copy backend code (docker-compose uses context: ., so paths are from repo root)
COPY backend/ ./backend/

EXPOSE 8080

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
