# Pothole Detection Dashboard

An AI-powered dashboard for analysing road potholes from video footage and CSV telemetry logs.

**Live demo: https://pothole-detection-pgsq.onrender.com**

> Hosted on Render's free plan. If the app has been idle, the first load can take about 50 seconds to wake up.

## Features

- **Video analysis:** upload a road video (MP4, MOV, AVI) or paste a direct video URL, and Gemini identifies and describes potholes in the footage.
- **CSV telemetry:** upload pothole logs (latitude, longitude, altitude, pothole counts, severity, confidence, processing time) and explore them in interactive charts.
- **Secure backend proxy:** the Gemini API key stays on the server and is never exposed to the browser.
- **Abuse protection:** per-IP rate limiting and a global daily cap on analysis requests.
- **Containerized:** multi-stage Docker build, runs as a non-root user, with a `/health` endpoint.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Recharts, PapaParse |
| Backend | Node.js, Express |
| AI | Google Gemini (`@google/genai`), default model `gemini-2.5-flash` |
| Deployment | Docker, Render |

## How It Works

```
Browser (React) ──► Express server ──► Google Gemini API
       ▲                 │
       └── static files ─┘   (one service serves both the UI and the API)
```

The Express server serves the built React app and exposes:

- `GET /health`: status check
- `POST /api/analyze`: receives a video, calls Gemini, returns detections

## Getting Started

### Prerequisites

- Node.js 20+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Run locally

```bash
git clone https://github.com/vanshiiii11/pothole-detection.git
cd pothole-detection
npm install
cp .env.example .env     # then add your GEMINI_API_KEY
npm run build            # builds client into dist/ and server into dist-server/
npm start                # starts full-stack server on http://localhost:8080
```

For frontend-only development with Vite hot reloading:
```bash
npm run dev
```

### Run with Docker

```bash
docker build -t pothole-detection .
docker run --rm -p 8080:8080 --env-file .env pothole-detection
```

Then open http://localhost:8080.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | none | Your Google AI Studio key |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model used for analysis |
| `PORT` | No | `8080` | Server port (Render sets this automatically) |
| `RATE_LIMIT_PER_MINUTE` | No | `5` | Max analyses per IP per minute |
| `GLOBAL_DAILY_CAP` | No | `200` | Max analyses per day across all users |

Never commit your `.env` file. It is gitignored.

## Deployment (Render)

1. Push the repo to GitHub.
2. On Render, choose **New → Blueprint** and select this repo. Render reads `render.yaml`.
3. Enter `GEMINI_API_KEY` in the dashboard when prompted.
4. Render builds the Docker image and deploys. Later pushes to `main` redeploy automatically.

Changing `GEMINI_MODEL` in Render's **Environment** tab restarts the service without a rebuild.

## Usage

1. Open the [live demo](https://pothole-detection-pgsq.onrender.com).
2. **CSV:** upload a pothole log file to see charts and severity breakdowns.
3. **Video:** upload a short road clip (up to 20 MB) or paste a CORS-enabled video URL and run the analysis.

## Known Limitations

- **Video size:** capped at 20 MB because of Gemini's inline request limit.
- **Video URLs:** the remote host must allow CORS.
- **Cold starts:** the free Render instance sleeps when idle, so the first request is slow.
- **Rate limits:** limits are in memory and reset when the server restarts. Gemini's own free-tier quota also applies.
- **Detection method:** results come from a multimodal LLM, not a custom-trained detection model, so accuracy varies with video quality.

## Project Structure

```
├── src/              React frontend (components, pages)
├── server/           Express backend (/health, /api/analyze)
├── Dockerfile        Multi-stage production build
├── render.yaml       Render Blueprint
└── .env.example      Environment variable template
```

## License

MIT
