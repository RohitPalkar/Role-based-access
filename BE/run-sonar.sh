#!/bin/bash

# Load environment variables from .env
if [ -f .env ]; then
  export $(cat .env | xargs)
else
  echo ".env file not found. Please create it with the required Sonar settings."
  exit 1
fi

# Run SonarScanner with env values
sonar-scanner \
  -Dsonar.projectKey="$SONAR_PROJECT_KEY" \
  -Dsonar.projectName="$SONAR_PROJECT_NAME" \
  -Dsonar.projectVersion="$SONAR_PROJECT_VERSION" \
  -Dsonar.token="$SONAR_TOKEN" \
  -Dsonar.host.url="$SONAR_HOST_URL"
