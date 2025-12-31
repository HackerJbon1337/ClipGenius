# ClipGenius

AI-powered YouTube clip finder that identifies engaging moments in videos and creates downloadable clips.

## What is ClipGenius?

ClipGenius is a web application that helps content creators extract interesting moments from YouTube videos. Paste a YouTube URL, and the AI will:

1. Fetch and analyze the video transcript
2. Identify engaging, funny, or viral-worthy moments
3. Generate downloadable clips ready for TikTok, Reels, or Shorts

Built for content repurposing and highlight extraction.

## Features

- **AI-Powered Analysis** - Automatically finds the best moments in any video
- **Virality Scoring** - Each clip gets a score to help prioritize content
- **Direct Downloads** - Download clips straight to your device
- **Modern UI** - Clean, responsive interface

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL + Storage) |
| AI | Groq API |
| Automation | n8n |

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [n8n](https://n8n.io/) (self-hosted or cloud)
- [Supabase](https://supabase.com/) account
- [Groq](https://console.groq.com/) API key
- [FFmpeg](https://ffmpeg.org/) installed on your system

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/HackerJbon1337/ClipGenius.git
cd ClipGenius
```

### 2. Set Up the Frontend

```bash
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### 3. Set Up the Backend

```bash
cd backend-node
npm install
cp .env.example .env
```

### 4. Configure Environment Variables

Edit `backend-node/.env`:

```env
PORT=8000

# Supabase credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# n8n webhook URLs
N8N_ANALYZE_WEBHOOK=http://localhost:5678/webhook/analyze
N8N_CLIP_WEBHOOK=http://localhost:5678/webhook/clip

# Groq API
GROQ_API_KEY=your-groq-api-key
```

### 5. Set Up Database

Run the SQL commands from `backend-node/setup.sql` in your Supabase SQL editor.

### 6. Start the Backend

```bash
cd backend-node
npm start
```

Backend runs at `http://localhost:8000`

## n8n Workflow Setup

You need two n8n workflows:

**Analyze Workflow**
- Webhook trigger at `/analyze`
- Process transcript with Groq API
- Return analysis results with timestamps

**Clip Workflow**
- Webhook trigger at `/clip`
- Download video segment using FFmpeg
- Upload to Supabase Storage
- Return clip URL

## Usage

1. Start both frontend and backend servers
2. Open `http://localhost:5173`
3. Paste a YouTube URL
4. Click "Find Clips"
5. Wait for AI analysis
6. Download the clips you want

## Project Structure

```
ClipGenius/
├── src/                    # Frontend React app
│   ├── components/         # UI components
│   ├── pages/              # Page components
│   ├── services/           # API functions
│   └── lib/                # Utilities
├── backend-node/           # Node.js backend
│   ├── services/           # Business logic
│   │   ├── clipper.js      # Video clipping
│   │   ├── database.js     # Supabase operations
│   │   ├── transcript.js   # Transcript fetching
│   │   └── n8n.js          # Webhook integration
│   ├── server.js           # Express server
│   └── setup.sql           # Database schema
└── public/                 # Static assets
```

## Troubleshooting

**Transcript not found**
- Video must have captions enabled
- Try a video with auto-generated captions

**Analysis timed out**
- Verify n8n is running
- Check webhook configuration
- Confirm Groq API key is valid

**Clip download fails**
- Ensure FFmpeg is installed and in PATH
- Check Supabase storage bucket permissions

## License

MIT License

## Author

[HackerJbon1337](https://github.com/HackerJbon1337)

Project: [https://github.com/HackerJbon1337/ClipGenius](https://github.com/HackerJbon1337/ClipGenius)
