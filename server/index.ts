import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = '0.0.0.0';

// Enable trust proxy for Render / reverse proxies to obtain real client IP
app.set('trust proxy', 1);

// Match 20MB video cap plus json payload overhead (up to ~30MB base64)
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Rate limiting configuration
interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '5', 10); // 5 req/min per IP

// Global daily cap to protect API quota
const GLOBAL_DAILY_CAP = parseInt(process.env.GLOBAL_DAILY_CAP || '200', 10);
let globalDailyCount = 0;
let globalDailyResetTime = Date.now() + 24 * 60 * 60 * 1000;

const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const now = Date.now();

  // Reset global daily counter if 24 hours elapsed
  if (now > globalDailyResetTime) {
    globalDailyCount = 0;
    globalDailyResetTime = now + 24 * 60 * 60 * 1000;
  }

  // Check global daily cap
  if (globalDailyCount >= GLOBAL_DAILY_CAP) {
    const hoursRemaining = Math.ceil((globalDailyResetTime - now) / (1000 * 60 * 60));
    res.set('Retry-After', Math.ceil((globalDailyResetTime - now) / 1000).toString());
    return res.status(429).json({
      error: 'Daily Quota Exceeded',
      message: `Global daily analysis quota (${GLOBAL_DAILY_CAP} requests) has been reached. Please try again in approximately ${hoursRemaining} hours.`
    });
  }

  // Check per-IP rate limit
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || req.ip || 'unknown';
  const entry = rateLimitMap.get(clientIp);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    globalDailyCount += 1;
    return next();
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
    res.set('Retry-After', retryAfterSeconds.toString());
    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_WINDOW} requests per minute allowed. Please retry in ${retryAfterSeconds} seconds.`
    });
  }

  entry.count += 1;
  globalDailyCount += 1;
  next();
};

// Periodic cleanup of stale rate-limit records
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

// GET /health endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

// POST /api/analyze
app.post('/api/analyze', rateLimiter, async (req, res) => {
  try {
    const { base64Data, mimeType } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: 'Missing base64Data in request body' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Gemini API key is not configured on the server. Please set GEMINI_API_KEY.'
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    // Configurable model with fallback to gemini-2.5-flash (or gemini-3.1-flash-lite-preview)
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const prompt = `
      ULTRA-FAST SCAN: Analyze this video for road potholes. 
      Provide a concise JSON array of key detection points.
      Focus only on significant detections to minimize processing time.
      
      Fields required for each object:
      - altitude: number (1.0 to 5.0)
      - latitude: number (e.g. 34.0522)
      - longitude: number (e.g. -118.2437)
      - gps_status: string ("Fixed" or "Searching")
      - pothole_count: number (count visible)
      - severity: number (1-5)
      - average_confidence: number (0.0-1.0)
      - frames_with_detection: number (0-60)
      - time_processing: number (10-50)
      - timestamp: string (ISO format)

      Return ONLY the JSON array.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'video/mp4',
            data: base64Data
          }
        },
        { text: prompt }
      ],
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              altitude: { type: Type.NUMBER },
              latitude: { type: Type.NUMBER },
              longitude: { type: Type.NUMBER },
              gps_status: { type: Type.STRING },
              pothole_count: { type: Type.NUMBER },
              severity: { type: Type.NUMBER },
              average_confidence: { type: Type.NUMBER },
              frames_with_detection: { type: Type.NUMBER },
              time_processing: { type: Type.NUMBER },
              timestamp: { type: Type.STRING }
            },
            required: [
              'altitude',
              'latitude',
              'longitude',
              'gps_status',
              'pothole_count',
              'severity',
              'average_confidence',
              'frames_with_detection',
              'time_processing',
              'timestamp'
            ]
          }
        }
      }
    });

    if (!response.text) {
      return res.status(502).json({ error: 'Empty response received from Gemini AI model.' });
    }

    const detections = JSON.parse(response.text);
    return res.status(200).json({ data: detections });
  } catch (error: any) {
    console.error('Error during video analysis:', error);
    return res.status(500).json({
      error: error.message || 'Failed to analyze video via Gemini AI'
    });
  }
});

// Serve static files from built dist directory
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// SPA Fallback: send index.html for all non-API GET requests
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server is running at http://${HOST}:${PORT}`);
});
