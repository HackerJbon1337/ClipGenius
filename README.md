# 🎬 ClipGenius

> AI-powered YouTube clip finder that automatically identifies the most engaging moments in any video and creates shareable clips.

![ClipGenius](https://img.shields.io/badge/ClipGenius-AI%20Powered-blueviolet?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square)
![React](https://img.shields.io/badge/React-18+-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

---

## ✨ What is ClipGenius?

ClipGenius is an AI-powered web application that helps content creators find the most interesting moments in YouTube videos. Simply paste a YouTube URL, and our AI will:

1. 📝 **Analyze** the video's transcript
2. 🎯 **Identify** the most engaging, funny, or viral-worthy moments
3. ✂️ **Create** downloadable clips ready for TikTok, Reels, or Shorts

Perfect for content repurposing, highlight extraction, and finding those golden moments!

---

## 🚀 Features

- 🔍 **Smart Analysis** - AI identifies the most engaging moments automatically
- 📊 **Virality Scores** - Each clip gets a virality score to help you pick winners
- ⬇️ **One-Click Downloads** - Download clips directly to your device
- 🎨 **Beautiful UI** - Modern, responsive interface with dark mode
- ⚡ **Fast Processing** - Powered by n8n workflows for quick results

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | Node.js, Express |
| **Database** | Supabase (PostgreSQL + Storage) |
| **AI** | Groq API (free tier) |
| **Automation** | n8n (workflow automation) |

---

## 📋 Prerequisites

Before you begin, make sure you have:

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [n8n](https://n8n.io/) (self-hosted or cloud)
- [Supabase](https://supabase.com/) account (free tier works!)
- [Groq](https://console.groq.com/) API key (free tier available)
- [FFmpeg](https://ffmpeg.org/) installed on your system

---

## ⚙️ Installation

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/HackerJbon1337/ClipGenius.git
cd ClipGenius
```

### 2️⃣ Set Up the Frontend

```bash
# Install frontend dependencies
npm install

# Start the frontend development server
npm run dev
```

The frontend will be running at `http://localhost:5173`

### 3️⃣ Set Up the Backend

```bash
# Navigate to backend folder
cd backend-node

# Install backend dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials (see Configuration section)
```

### 4️⃣ Configure Environment Variables

Edit `backend-node/.env` with your credentials:

```env
# Server Config
PORT=8000

# Supabase (from your Supabase project settings)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# n8n Webhook URLs (after setting up n8n workflows)
N8N_ANALYZE_WEBHOOK=http://localhost:5678/webhook/analyze
N8N_CLIP_WEBHOOK=http://localhost:5678/webhook/clip

# AI Provider (Groq free tier)
GROQ_API_KEY=your-groq-api-key-here
```

### 5️⃣ Set Up Supabase Database

Run the SQL from `backend-node/setup.sql` in your Supabase SQL editor to create the required tables.

### 6️⃣ Start the Backend

```bash
cd backend-node
npm start
```

The backend will be running at `http://localhost:8000`

---

## 🔧 n8n Workflow Setup

ClipGenius uses n8n for video processing workflows. You'll need to set up two webhooks:

### Analyze Workflow
1. Create a new workflow in n8n
2. Add a **Webhook** node (trigger)
3. Set path to `/analyze`
4. Add nodes to process the transcript and call Groq API
5. Return the analysis results

### Clip Workflow
1. Create a new workflow in n8n
2. Add a **Webhook** node (trigger)
3. Set path to `/clip`
4. Add nodes to download video segment using FFmpeg
5. Upload to Supabase Storage
6. Return the clip URL

---

## 🎮 How to Use

1. **Start both servers** (frontend and backend)
2. **Open the app** at `http://localhost:5173`
3. **Paste a YouTube URL** in the input field
4. **Click "Find Clips"** and wait for the AI analysis
5. **Browse the results** - each clip shows the timestamp and virality score
6. **Download your favorites** with one click!

---

## 📁 Project Structure

```
ClipGenius/
├── src/                    # Frontend React app
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page components
│   ├── services/           # API service functions
│   └── lib/                # Utilities
├── backend-node/           # Node.js backend
│   ├── services/           # Business logic
│   │   ├── clipper.js      # Video clipping service
│   │   ├── database.js     # Supabase operations
│   │   ├── transcript.js   # YouTube transcript fetching
│   │   └── n8n.js          # n8n webhook integration
│   ├── server.js           # Express server
│   └── setup.sql           # Database schema
├── public/                 # Static assets
└── README.md               # You are here!
```

---

## 🐛 Troubleshooting

### "Transcript not found"
- Make sure the YouTube video has captions/subtitles enabled
- Try a different video with auto-generated captions

### "Analysis timed out"
- Check if n8n is running and webhooks are configured
- Verify your Groq API key is valid

### "Clip not found"
- Ensure FFmpeg is installed and accessible in PATH
- Check Supabase storage bucket permissions

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Groq](https://groq.com/) for the blazing-fast AI inference
- [Supabase](https://supabase.com/) for the database and storage
- [n8n](https://n8n.io/) for workflow automation
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components

---

## 📬 Contact

**HackerJbon1337** - [GitHub Profile](https://github.com/HackerJbon1337)

Project Link: [https://github.com/HackerJbon1337/ClipGenius](https://github.com/HackerJbon1337/ClipGenius)

---

<p align="center">
  Made with ❤️ by HackerJbon1337
</p>
