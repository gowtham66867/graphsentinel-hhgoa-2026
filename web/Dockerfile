FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app
COPY server.py /app/server.py
COPY dist/ /app/dist/

RUN useradd --uid 10001 --create-home appuser
USER 10001

EXPOSE 8080
CMD ["python", "/app/server.py"]
