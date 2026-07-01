<p align="center">
  <a href="https://www.puravankara.com/" target="_blank">
    <img src="https://sales.puravankaraprojects.com/assets/login-logo-BLNdzsA9.svg" width="420" alt="Puravankara Logo" />
  </a>
</p>

<h1 align="center">Puravankara Booking Form And Incentive dashboard Backend Project Setup Guide</h1>

## 🧩 Project Overview

Puravankara Booking Form:

> A React + NestJS application that to manage a booking form to help the customer to buy the Puravankara  Flats and villas. Also this Application do the incentive calculation for the RMs.

>In the Sales portal of this application RMs/TLs,RSHs and Admin can login and monitor the process.

### ✨ Key Features

- Manage Customer Booking Form
- Referrer Form
- Sales Panel for RM,TL,CRM,ADMIN
- Auth via Azure AD
- Incentive Dashboard
- CRM Agreement Generation

## 🔐 Environment Variables

You’ll need to set the following environment variables:
  - NODE_ENV='dev'
  - PORT=3001
  - WS_PORT=3002
  - DB_PORT=3306
  - DB_HOST='Host IP'
  - DB_USERNAME='DB Username'
  - DB_PASSWORD='DB Password'
  - DB_DATABASE='DB Name'
  - DB='DB Type'
  And So on

---

## 🛠️ Prerequisites

### Install Node.js, npm, and NestJS CLI

```bash
# Install Node.js (includes npm)
brew install node

# Verify Node.js and npm versions
node -v
npm -v

# Install NestJS CLI globally
npm install -g @nestjs/cli

# Verify NestJS CLI version
nest --version
```


- **Node.js**: `>= 22.14.0`
- **npm**: `>= 11.3.0`
- **NestJS CLI**: `>= 10.4.5`
- **MySQL Server**: Required for TypeORM and core database functionality.
- **Redis Server**: Required for background jobs (BullMQ), caching, and WebSockets.

---

## 📦 Install Dependencies

```bash
npm install
```

---

## 🔍 SonarQube Setup (Code Quality and Coverage)

```bash
# 1. Install Java (required for SonarQube)

# 2. Download and unzip the SonarQube server from:
#    https://www.sonarsource.com/products/sonarqube/downloads/

# 3. Navigate to the bin directory based on your OS
cd ./sonarqube/bin/macosx-universal-64
# ⚠️ Change the path according to your operating system

# 4. Start the SonarQube server
sh sonar.sh start

# 5. Install sonar-scanner
brew install sonar-scanner

# 6. Run Sonar Scanner to check code quality and coverage
sonar-scanner
```

---
## 🔒 Request & Response Encryption

This project supports AES-256-GCM encryption for API requests and responses.
# Purpose:
Encrypt payloads sent from the client (React app) to the server.
Decrypt payloads on the server.
Encrypt responses from the server before sending to the client.

# How it works:
Client encrypts request payload using AES-GCM.
Server decrypts the request before processing.
Server encrypts the response if encryption is enabled.
Client decrypts the response to read the data.

# 📝 Usage
To enable encryption:
```
ENABLE_ENCRYPTION=true
ENCRYPTION_KEY=<your-32-byte-hex-key>
```
To disable encryption (default):
```
ENABLE_ENCRYPTION=false
```

Client and server must use the same ENCRYPTION_KEY to encrypt/decrypt data.
---

## 🗄️ Database Migrations

We use TypeORM migrations to manage database schema changes.

# 📌 Create a New Migration
npm run migration:create -- src/migrations/<MigrationName>


# Example:
npm run migration:create -- src/migrations/CreatePaymentTransactions
This generates a new file in src/migrations with empty up and down methods.

# 🚀 Run Pending Migrations
npm run migration:run

# ⏪ Revert the Last Migration
npm run migration:revert

# 🔑 Notes
Always commit migration files so the team stays in sync.
Don’t edit applied migrations; create a new one for changes.
Ensure your .env database configs (host, port, username, password, database) are correct before running migrations.

---

## 🤝 Contribution Guidelines
 1. Fork the repo
 2. Create a new branch: feature/your-feature-name
 3. Follow our code style (Prettier, ESLint, etc.)
 4. Submit a Pull Request

```bash
# Create a new branch from develop using your JIRA ticket number
git checkout develop
git pull origin develop
git checkout -b <Type>/<Feature Name>
```
# Example
 git checkout -b feature/create-booking
 git checkout -b BugFix/Pdf-issue

---

## 🧱 Development Guide

### 📁 File Naming Convention

Follow the dot-separated naming pattern:
# Example
- `bookings.module.ts`
- `bookings.controller.ts`
- `bookings.service.ts`
- `bookings.entity.ts`
- `bookings.dto.ts`
- `bookings.controller.spec.ts` (for controller test)

### 🏗️ Directory Structure

```
src/
│
|   ├── config/
|   ├── constants/
|   ├── enums/
    ├── entities/
|   │   │   └── user.entity.ts
├── modules/
|   ├── user/
|   │   ├── dto/
|   │   │   └── user.dto.ts
|   │   ├── user.controller.ts
|   │   ├── user.service.ts
|   │   ├── user.module.ts
|   │   ├── user.controller.spec.ts

```
### ⚙️ Generate Components Using Nest CLI

```bash
# Generate a new module
nest g module modules/module_name

# Generate a new controller
nest g controller modules/module_name

# Generate a new service
nest g service modules/module_name

# Generate a new resource (module + controller + service)
nest g resource modules/module_name

# Generate a test file (if not auto-created)
nest g service modules/module_name --spec
nest g controller user --spec
```

> ✅ Always follow the folder and file naming conventions to maintain consistency across the project.

---

## 🚀 Compile and Run the Project

```bash
# Development mode
npm run start

# Watch mode (auto-restarts on code changes)
npm run start:dev

# Production mode
npm run start:prod
```

---

## ✅ Testing

```bash
# Run Unit Tests
npm run test

# Run Test Coverage
npm run test:cov

# Run End-to-End Tests
npm run test:e2e
```

---

## 🧹 Commit Your Changes

```bash
# Stage only necessary files
git add file1 file2 file3

# Commit using the proper message format
git commit -m "JIRA-ISSUE-NUMBER: Commit message"

# Push your changes
git push origin <jira-ticket-number>
```

---

## 📡 Real-time Events (WebSockets)

This application uses `@nestjs/websockets` and `@socket.io/redis-adapter` for real-time capabilities.
- **WebSocket Port**: `3002` (configurable via `WS_PORT` in `.env`)
- **Redis Requirement**: The Redis adapter is used to sync WebSocket events across multiple instances, so a running Redis server is mandatory.

---

## 📤 Deployment Workflow

- Raise a **Pull Request** against the `develop` branch.
- Tag the respective team members for code review.


## License
Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
