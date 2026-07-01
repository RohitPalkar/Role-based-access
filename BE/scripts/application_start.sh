#!/bin/bash

echo 'run application_start.sh: ' >> /opt/purvankara/puravankara-engine/deploy.log
# nodejs-app is the same name as stored in pm2 process
echo 'pm2 restart 0' >> /opt/purvankara/puravankara-engine/deploy.log
pm2 restart ecosystem.config.js >> /opt/purvankara/puravankara-engine/deploy.log
