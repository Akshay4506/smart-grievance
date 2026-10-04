# Frontend PWA - File Structure & Pipeline

This folder contains the Client-Side Rendered (CSR) Progressive Web App for the Smart Grievance Tracker.

```text
frontend/
├── api.js                  # Centralized API requests and JWT LocalStorage management
├── auth_citizen.html       # Citizen Login & Registration
├── auth_official.html      # Official Login & Registration (Requires Jurisdiction)
├── citizen_dashboard.html  # Citizen Portal (Tracks personal complaints)
├── citizen_submit.html     # HTML5 Geolocation Complaint Submission Form
├── department_dashboard.html # Official Portal (Geographic Hash-Routed Complaints & Reports)
├── index.html              # Marketing Landing Page
├── manifest.json           # PWA Configuration File (Mobile Installability)
├── map.html                # Leaflet.js Public Transparency Map
├── profile.html            # User Profile & Jurisdiction Viewer
├── pwa.js                  # PWA Bootloader & Service Worker Registration
├── styles.css              # Global Styling and CSS Variables
└── sw.js                   # Service Worker for Offline Caching & Interception
```
