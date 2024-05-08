# syntax=docker/dockerfile:1
FROM python:3.7-alpine
RUN mkdir /usr/src/app
WORKDIR /usr/src/app
COPY requirements.txt /usr/src/app
RUN pip install --upgrade pip
RUN pip install -r requirements.txt
EXPOSE 8000
COPY . /usr/src/app
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000]
