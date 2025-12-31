---
description: How to start ClipGenius locally
---

# Starting ClipGenius

Run these commands in separate terminals:

## 1. Start Frontend (React)
```bash
cd c:\Users\jeswa\Downloads\ClipGenius
npm run dev
```
Opens at: http://localhost:5173

## 2. Start Backend (Node.js)
```bash
cd c:\Users\jeswa\Downloads\ClipGenius\backend-node
npm run dev
```
Runs at: http://localhost:8000

## 3. Start n8n (Optional - for AI analysis)
```bash
cd c:\Users\jeswa\Downloads\ClipGenius
npx n8n start
```
Opens at: http://localhost:5678

> **Note:** n8n requires login and Groq API credentials configured. 
> If n8n isn't set up, the app will use mock mode for analysis.

## Quick Start (All-in-one)
// turbo
```powershell
# Terminal 1 - Frontend
cd c:\Users\jeswa\Downloads\ClipGenius && npm run dev

# Terminal 2 - Backend  
cd c:\Users\jeswa\Downloads\ClipGenius\backend-node && npm run dev
```

## Requirements
- Node.js installed
- yt-dlp installed (for transcripts/clips)
- FFmpeg installed (for video clipping)
- Supabase credentials in backend-node/.env
