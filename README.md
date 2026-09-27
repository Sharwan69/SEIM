# SEIM — Security Information and Event Management

A Node.js SIEM for centralized log collection, threat detection, and alerting — with brute-force detection, suspicious IP monitoring, JWT auth, role-based access, and a configurable rules engine.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Running with Docker](#running-with-docker)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Events](#events)
  - [Alerts](#alerts)
  - [Suspicious IPs](#suspicious-ips)
  - [Detection Rules](#detection-rules)
  - [Dashboard](#dashboard)
- [Built-in Detection Rules](#built-in-detection-rules)
- [Security Features](#security-features)
- [Development](#development)
- [Roadmap](#roadmap)
- [License](#license)

## Features

| Feature | Description |
|---|---|
| **Event Ingestion API** | Collect logs and security events from multiple sources |
| **Brute Force Detection** | Flags 5+ failed logins from one source within 5 minutes |
| **Suspicious IP Monitoring** | Tracks IPs across failed logins / port scans and auto-blocks repeat offenders |
| **Port Scan Detection** | Flags 10+ port scan events from one source within 2 minutes |
| **Anomaly Detection** | Surfaces unusual event spikes and patterns |
| **JWT Authentication** | Secures admin and analyst access |
| **Detection Rules Engine** | Create, update, enable/disable custom rules via the API |
| **Real-time Alerts** | Socket.IO pushes new alerts to the dashboard as they happen |
| **Alert Dashboard** | Monitor live events, alerts, and incidents |
| **Role-Based Access** | Admin, Analyst, and Viewer roles |
| **MongoDB Integration** | Persistent storage for events, alerts, and audit logs |

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB + Mongoose
- **Real-time:** Socket.IO
- **Auth:** JWT + bcryptjs
- **Logging:** Winston
- **Frontend:** Vanilla JS, HTML/CSS

## Getting Started

### Prerequisites

- Node.js 14+
- MongoDB 4.4+
- npm or yarn

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Sharwan69/SEIM.git
cd SEIM

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# then edit .env — set MONGODB_URI and a strong JWT_SECRET

# 4. Start MongoDB (skip if already running)
mongod
# — or, with Docker —
docker run -d -p 27017:27017 --name mongodb mongo:latest

# 5. Start the server (auto-reload via nodemon)
npm run dev
```

Then open **http://localhost:5000**.

There's no seed data, so register your first user before logging in:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@seim.com","password":"secure123","role":"admin"}'
```

## Running with Docker

The included `docker-compose.yml` runs the app and MongoDB together:

```bash
docker-compose up
```

To also run a sample Linux log collector, enable the `collectors` profile:

```bash
docker-compose --profile collectors up
```

## API Reference

All authenticated routes require:

```
Authorization: Bearer <jwt_token>
```

### Authentication

```bash
# Register a new user
POST /api/auth/register
Body: { "username": "analyst", "email": "analyst@seim.com", "password": "secure123", "role": "analyst" }

# Login
POST /api/auth/login
Body: { "username": "analyst", "password": "secure123" }
Response: { "success": true, "token": "jwt_token_here" }

# Verify token
GET /api/auth/verify
```

### Events

```bash
# Get all events
GET /api/events

# Ingest a new event (runs it through the detection engine)
POST /api/events
Body: {
  "source": "auth-server-01",
  "sourceType": "Linux Server",
  "eventType": "login_failed",
  "severity": "high",
  "message": "Failed login for user admin"
}
```

### Alerts

```bash
# Get all alerts
GET /api/alerts

# Create a manual alert
POST /api/alerts
Body: {
  "title": "Manual Security Alert",
  "severity": "high",
  "source": "analyst",
  "description": "Manual alert created by analyst"
}
```

### Suspicious IPs

```bash
# Get suspicious IPs
GET /api/suspicious-ips

# Block an IP (admin only)
POST /api/suspicious-ips/block/192.168.1.100

# Unblock an IP (admin only)
POST /api/suspicious-ips/unblock/192.168.1.100
```

### Detection Rules

```bash
# Get all rules
GET /api/rules

# Create a new rule (admin only)
POST /api/rules
Body: {
  "name": "Custom Detection Rule",
  "description": "Detect specific threat pattern",
  "ruleType": "custom",
  "severity": "high",
  "enabled": true,
  "conditions": { "eventType": "suspicious_activity" },
  "actions": ["alert", "log"]
}

# Update a rule (admin only)
PUT /api/rules/:id

# Delete a rule (admin only)
DELETE /api/rules/:id
```

### Dashboard

```bash
GET /api/dashboard
Response: {
  "totalEvents": 1284,
  "criticalAlerts": 6,
  "openIncidents": 12,
  "resolvedToday": 34,
  "bySeverity": { "critical": 6, "high": 18, "medium": 42, "low": 37 }
}
```

## Built-in Detection Rules

| # | Rule | Trigger |
|---|---|---|
| 1 | Brute Force Attack | 5+ failed logins from one source in 5 minutes |
| 2 | Port Scanning | 10+ port scan attempts from one source in 2 minutes |
| 3 | Suspicious IP Activity | An IP accumulates repeated failed logins / scans (auto-escalates severity, auto-blocks at 10) |
| 4 | Malware Signatures | Known malware patterns in event data |
| 5 | Anomalies | Unusual spikes or patterns in event volume |

Admins can add their own rules through the `/api/rules` endpoints above.

## Security Features

- JWT-based authentication
- Role-based access control (Admin / Analyst / Viewer)
- Brute-force detection with automatic IP blocking
- Anomaly detection and real-time alerting
- Comprehensive audit logging
- Encrypted password storage (bcryptjs)
- Centralized error handling

## Development

```bash
npm run dev     # development mode, auto-reload (nodemon)
npm start       # production mode
npm test        # run tests
npm run lint    # lint code
```

## Roadmap

- Elasticsearch for high-volume event storage
- Syslog / Windows Event Forwarding / Linux audit integration
- React-based analytics dashboard
- Email / Slack notifications
- ML-based anomaly detection
- Threat intelligence feed integration (e.g. abuse.ch)
- Docker + Kubernetes deployment

## License

MIT

## Author

Sharwan69
