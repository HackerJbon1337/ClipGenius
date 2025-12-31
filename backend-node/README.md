# ClipGenius Backend (Node.js)

A simple, beginner-friendly backend for ClipGenius that finds interesting moments in YouTube videos using AI.

## 🎯 Features

- **AI-Powered Analysis**: Uses Groq (free tier) to analyze video transcripts
- **Video Clipping**: Downloads and cuts videos using yt-dlp and FFmpeg
- **Async Processing**: Background jobs via n8n workflows
- **Persistent Storage**: Supabase database (free tier)
- **Zero Cost**: Everything runs on free tiers

## 📁 Project Structure

```
backend-node/
├── server.js           # Main Express server
├── package.json        # Dependencies
├── .env               # Your configuration (not in git)
├── .env.example       # Template for .env
├── setup.sql          # Supabase database setup
├── services/
│   ├── database.js    # Supabase operations
│   └── n8n.js         # n8n webhook triggers
└── docs/
    └── n8n-setup.md   # n8n workflow guide
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend-node
npm install
```

### 2. Start the Server

```bash
npm run dev
```

The server will start at http://localhost:8000

### 3. Test It

```bash
# Check health
curl http://localhost:8000

# Analyze a video (mock mode)
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

## 🔧 Configuration

### Development Mode (No Setup Required)

By default, the backend runs in **mock mode**:
- Uses in-memory storage (no database needed)
- Returns simulated AI responses
- Perfect for testing the frontend

### Production Mode (Optional Setup)

#### 1. Supabase (Database)

1. Create a free account at https://supabase.com
2. Create a new project
3. Go to SQL Editor and run `setup.sql`
4. Go to Settings > API
5. Copy your values to `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

#### 2. n8n (Background Processing)

1. Install n8n: `npm install -g n8n`
2. Start n8n: `n8n start`
3. Create workflows (see `docs/n8n-setup.md`)
4. Update `.env`:

```env
N8N_ANALYZE_WEBHOOK=http://localhost:5678/webhook/analyze
N8N_CLIP_WEBHOOK=http://localhost:5678/webhook/clip
```

#### 3. Groq (AI - for n8n)

1. Create account at https://console.groq.com
2. Get your API key
3. Add to n8n HTTP Request node

## 📡 API Endpoints

### `GET /`
Health check - shows service status

### `POST /api/analyze`
Start analyzing a YouTube video

**Request:**
```json
{
  "youtube_url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "success": true,
  "job_id": "uuid",
  "status": "processing"
}
```

### `GET /api/status/:jobId`
Check analysis status

**Response (processing):**
```json
{
  "success": true,
  "status": "processing"
}
```

**Response (complete):**
```json
{
  "success": true,
  "status": "complete",
  "video_id": "VIDEO_ID",
  "highlights": [
    {
      "id": "uuid",
      "start_timestamp": 30,
      "end_timestamp": 55,
      "reason": "Engaging introduction"
    }
  ]
}
```

### `POST /api/clip`
Request a video clip

**Request:**
```json
{
  "highlight_id": "uuid",
  "video_id": "VIDEO_ID"
}
```

**Response:**
```json
{
  "success": true,
  "clip_id": "uuid",
  "status": "processing"
}
```

### `GET /api/download/:clipId`
Get clip download URL

**Response:**
```json
{
  "success": true,
  "status": "ready",
  "download_url": "https://..."
}
```

## 🔄 How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│     n8n     │
│  (React)    │     │  (Express)  │     │ (Workflows) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Supabase   │     │  Groq AI    │
                    │ (Database)  │     │  (Free)     │
                    └─────────────┘     └─────────────┘
```

1. **User submits YouTube URL** → Frontend calls `/api/analyze`
2. **Backend creates job** → Triggers n8n webhook
3. **n8n fetches transcript** → Sends to Groq AI
4. **AI finds highlights** → n8n calls back to backend
5. **Backend stores results** → Frontend polls and displays

## 💰 Free Tier Limits

| Service | Free Limit |
|---------|------------|
| Supabase | 500MB database, 1GB storage |
| Groq | 14,400 requests/day |
| n8n | Unlimited (self-hosted) |

## 🐛 Troubleshooting

### "Supabase not configured"
- This is fine for development
- Add your credentials to `.env` for production

### "n8n not detected"
- Install and start n8n: `npm i -g n8n && n8n start`
- Or continue with mock mode for testing

### CORS errors
- Make sure you're accessing from http://localhost:5173
- Check the `cors()` middleware in server.js

## 📝 License

MIT

## 👤 Author

HackerJbon1337
