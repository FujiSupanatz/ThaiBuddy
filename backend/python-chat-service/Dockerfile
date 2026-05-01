# syntax=docker/dockerfile:1

FROM python:3.12-slim
WORKDIR /app

COPY app.py /app/app.py

ENV PYTHONUNBUFFERED=1
ENV PYTHON_CHAT_SERVICE_HOST=0.0.0.0
ENV PYTHON_CHAT_SERVICE_PORT=8001

EXPOSE 8001

CMD ["python", "app.py"]
