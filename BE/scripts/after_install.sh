#!/bin/bash
echo 'run after_install.sh: ' >> /opt/purvankara/puravankara-engine/

echo 'cd /opt/layal-dev/usteps-mm-crm-portal' >> /opt/purvankara/puravankara-engine/deploy.log
cd /opt/purvankara/puravankara-engine >> /opt/purvankara/puravankara-engine/deploy.log

echo 'npm install' >> /opt/purvankara/puravankara-engine/deploy.log
npm install >> /opt/purvankara/puravankara-engine/deploy.log

echo 'npm run build' >> /opt/purvankara/puravankara-engine/deploy.log
npm run build >> /opt/purvankara/puravankara-engine/deploy.log
