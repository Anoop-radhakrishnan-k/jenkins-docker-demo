
FROM python:3.12-slim

WORKDIR /app

COPY app.py .

ENV APP_VERSION=1.0

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)"

CMD ["python", "app.py"]
