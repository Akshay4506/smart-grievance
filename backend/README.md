# Backend REST API - File Structure & Pipeline

This folder contains the headless Express.js Node Server and MongoDB logic for the Smart Grievance Tracker.

```text
backend/
├── middleware/
│   └── auth.js             # Protects routes by verifying Bearer JWTs
├── models/
│   ├── Complaint.js        # Mongoose Schema (Includes Embedded Comments & GeoJSON)
│   ├── Notification.js     # Mongoose Schema (Used for Short-Polling)
│   └── User.js             # Mongoose Schema (Includes locationHash & Cadre)
├── routes/
│   ├── auth.js             # POST /login, POST /register, GET /profile
│   ├── complaints.js       # Core Geographic Hash Routing and Submission logic
│   └── notifications.js    # Fetch and Clear Notification queues
├── package.json            # Node Dependencies
└── server.js               # Express Server Setup, Global Middleware (CORS), & DB Connect
```
