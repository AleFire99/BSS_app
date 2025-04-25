# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . .

# Install any needed dependencies specified in requirements.txt
RUN pip install -r app_requirements.txt

# Run bot.py when the container launches
CMD ["python", "telegram_bot.py"]
