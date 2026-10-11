# Pothole Detection & Analytics Dashboard 🚧

An interactive, AI-powered web application and dashboard for pothole detection analysis. Supports automated video detection via Gemini AI vision, telemetry dataset imports (CSV), interactive analytics, and road quality charts.

---

## 🌟 Architecture & Features

- **Full-Stack Application**: React 19 + TypeScript + Tailwind CSS frontend served by an Express backend.
- **Secure Server-Side AI Detection**: The client communicates exclusively with the server endpoint (`POST /api/analyze`), ensuring your `GEMINI_API_KEY` is kept safe and never bundled into frontend assets.
- **Multimodal Video Analysis**: Uses Google's Gemini Vision (`gemini-3.1-flash-lite-preview`) to detect potholes, assess severity (Levels 1–5), measure confidence, and log geolocation coordinates.
- **Interactive Analytics Dashboard**: Visualizations with Recharts for severity breakdown, confidence trends, altitude profiles, and inspection frames.
- **CSV Telemetry Upload**: Parse and visualize multi-variable drone and mobile road telemetry logs.
- **Production Container Ready**: Slim Alpine Node runtime (`node:20-alpine`), unprivileged non-root user (`node`), in-memory rate limiting, and standard `/health` check.

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **Gemini API Key**: Obtain one from [Google AI Studio](https://aistudio.google.com/)

### 2. Environment Variables
Create a `.env` file in the project root:
```bash
cp .env.example .env
```
Populate `.env` with your API key:
```ini
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=8080
```

### 3. Install & Run
```bash
# Install dependencies
npm install

# Build client and server
npm run build

# Start the full-stack server
npm start
```
The application will be live at `http://localhost:8080`.

For frontend development with Vite HMR:
```bash
npm run dev
```

---

## 🐳 Containerization & Local Docker Run

### 1. Build the Docker Image
```bash
# Ensure pre-requisite build artifacts are up-to-date
npm run build

# Build container image
docker build -t pothole-detection:latest .
```

### 2. Run the Container
```bash
docker run -d \
  --name pothole-dashboard \
  -p 8080:8080 \
  -e PORT=8080 \
  -e GEMINI_API_KEY="your_actual_gemini_api_key_here" \
  pothole-detection:latest
```

### 3. Verify Local Health
```bash
curl -i http://localhost:8080/health
```
Response:
```json
{
  "status": "ok",
  "uptime": 12.4,
  "timestamp": "2026-10-11T17:00:00.000Z",
  "geminiConfigured": true
}
```

To stop and remove the test container:
```bash
docker stop pothole-dashboard && docker rm pothole-dashboard
```

---

## ☁️ Cloud Deployment Guide

We recommend **Google Cloud Run** or **Render** for zero-maintenance container hosting.

### Option A: Google Cloud Run (Recommended for Scalability)

Google Cloud Run provides automated HTTPS, zero-to-one scaling, and native Secret Manager integration.

1. **Authenticate and set project**:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_GCP_PROJECT_ID
   ```
2. **Build and push image to Google Artifact Registry**:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_GCP_PROJECT_ID/pothole-detection:latest
   ```
3. **Deploy with secret injection**:
   ```bash
   gcloud run deploy pothole-detection \
     --image gcr.io/YOUR_GCP_PROJECT_ID/pothole-detection:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080 \
     --set-env-vars "PORT=8080" \
     --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest"
   ```

### Option B: Render (Simplest Setup)

1. Push your repository to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New + Web Service**.
3. Connect your repository `pothole-detection`.
4. Configure service:
   - **Environment**: Docker
   - **Branch**: main
   - **Plan**: Free
5. In **Environment Variables / Secrets**, add:
   - `GEMINI_API_KEY` = `your_gemini_api_key_here`
   - `PORT` = `8080`
6. Click **Create Web Service**. Render will build and deploy the container on a public `.onrender.com` URL with free HTTPS.

---

## ⚠️ Known Limitations & Operational Considerations

1. **Video Size Limit**:
   - The file upload and base64 transmission limit is capped at **20 MB** (~35 MB JSON payload). Larger video clips should be trimmed or downsampled before uploading.
2. **CORS on Direct Video URLs**:
   - If analyzing a video via external URL, the hosting server must allow cross-origin requests (`Access-Control-Allow-Origin`). Direct uploads from disk always bypass this issue.
3. **Cold Starts**:
   - On free hosting tiers (Cloud Run scale-to-zero or Render free tier), the first request after idle can take 15–40 seconds to spin up.
4. **Gemini API Quota & Rate Limits**:
   - The server enforces rate limiting of 15 video analysis requests per IP per minute. Ensure your Google AI Studio quota aligns with usage demands.
