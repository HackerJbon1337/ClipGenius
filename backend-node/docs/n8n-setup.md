# n8n Setup Guide for ClipGenius

This guide explains how to set up n8n to handle background processing for ClipGenius.

## What is n8n?

n8n is a free, open-source workflow automation tool. We use it to:
1. **Analyze transcripts** - Fetch YouTube transcripts and send them to AI
2. **Create clips** - Download videos and cut them with FFmpeg

## Installation (Windows)

### Option 1: Using npm (Recommended for development)

```bash
# Install n8n globally
npm install -g n8n

# Run n8n
n8n start
```

n8n will be available at: http://localhost:5678

### Option 2: Using Docker

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n
```

## Required Tools for Video Clipping

For the video clipping workflow to work, you need:

### 1. yt-dlp (YouTube downloader)
```bash
# Windows (using winget)
winget install yt-dlp

# Or download from: https://github.com/yt-dlp/yt-dlp/releases
```

### 2. FFmpeg (Video processor)
```bash
# Windows (using winget)
winget install FFmpeg

# Or download from: https://ffmpeg.org/download.html
```

Make sure both are in your PATH (you can run `yt-dlp --version` and `ffmpeg -version` in terminal).

---

## Workflow 1: AI Analysis

### Create this workflow in n8n:

1. Go to http://localhost:5678
2. Click "Add Workflow"
3. Add these nodes:

```
[Webhook] → [HTTP Request: Get Transcript] → [HTTP Request: AI Analysis] → [Code: Parse Response] → [HTTP Request: Callback]
```

### Node Configuration:

#### 1. Webhook (Trigger)
- **HTTP Method**: POST
- **Path**: `/analyze`
- **Response Mode**: Immediately

#### 2. HTTP Request: Get Transcript
- **Method**: GET
- **URL**: `https://yt.lemnoslife.com/noKey/captions?videoId={{ $json.video_id }}&lang=en`
- This is a free API that fetches YouTube transcripts

#### 3. HTTP Request: AI Analysis
- **Method**: POST
- **URL**: `https://api.groq.com/openai/v1/chat/completions`
- **Headers**:
  - `Authorization`: `Bearer YOUR_GROQ_API_KEY`
  - `Content-Type`: `application/json`
- **Body** (JSON):
```json
{
  "model": "llama-3.1-8b-instant",
  "messages": [
    {
      "role": "system",
      "content": "You analyze YouTube video transcripts and find the most interesting moments for short-form content (Instagram Reels, YouTube Shorts). Return a JSON array of highlights."
    },
    {
      "role": "user",
      "content": "Analyze this transcript and find 3-5 interesting moments. For each, provide start_timestamp (seconds), end_timestamp (seconds, 15-60 seconds after start), and reason (why it's interesting). Return ONLY valid JSON array.\n\nTranscript:\n{{ $json.transcript }}"
    }
  ],
  "response_format": { "type": "json_object" }
}
```

#### 4. Code: Parse Response
```javascript
const response = $input.first().json;
const content = response.choices[0].message.content;
const parsed = JSON.parse(content);

return {
  job_id: $('Webhook').first().json.job_id,
  video_id: $('Webhook').first().json.video_id,
  highlights: parsed.highlights || parsed
};
```

#### 5. HTTP Request: Callback
- **Method**: POST
- **URL**: `{{ $('Webhook').first().json.callback_url }}`
- **Body** (JSON):
```json
{
  "job_id": "{{ $json.job_id }}",
  "video_id": "{{ $json.video_id }}",
  "highlights": {{ $json.highlights }}
}
```

---

## Workflow 2: Video Clipping

### Create this workflow in n8n:

```
[Webhook] → [Execute Command: yt-dlp] → [Execute Command: FFmpeg] → [HTTP Request: Upload to Supabase] → [HTTP Request: Callback]
```

### Node Configuration:

#### 1. Webhook (Trigger)
- **HTTP Method**: POST
- **Path**: `/clip`
- **Response Mode**: Immediately

#### 2. Execute Command: Download Video
- **Command**:
```bash
yt-dlp -f "best[height<=720]" -o "temp_{{ $json.clip_id }}.mp4" "{{ $json.youtube_url }}"
```

#### 3. Execute Command: Cut Clip
- **Command**:
```bash
ffmpeg -i "temp_{{ $json.clip_id }}.mp4" -ss {{ $json.start_time }} -to {{ $json.end_time }} -c copy "clip_{{ $json.clip_id }}.mp4"
```

#### 4. Read Binary File
- **File Path**: `clip_{{ $json.clip_id }}.mp4`

#### 5. HTTP Request: Upload to Supabase Storage
- **Method**: POST
- **URL**: `{{ YOUR_SUPABASE_URL }}/storage/v1/object/clips/{{ $json.clip_id }}.mp4`
- **Headers**:
  - `Authorization`: `Bearer YOUR_SUPABASE_KEY`
  - `Content-Type`: `video/mp4`
- **Body**: Binary (from previous node)

#### 6. HTTP Request: Callback
- **Method**: POST
- **URL**: `{{ $json.callback_url }}`
- **Body**:
```json
{
  "clip_id": "{{ $json.clip_id }}",
  "download_url": "{{ YOUR_SUPABASE_URL }}/storage/v1/object/public/clips/{{ $json.clip_id }}.mp4"
}
```

#### 7. Execute Command: Cleanup
- **Command**:
```bash
del temp_{{ $json.clip_id }}.mp4 clip_{{ $json.clip_id }}.mp4
```

---

## Environment Variables

After setting up workflows, update your `.env` file:

```env
N8N_ANALYZE_WEBHOOK=http://localhost:5678/webhook/analyze
N8N_CLIP_WEBHOOK=http://localhost:5678/webhook/clip
```

---

## Testing

### Test Analysis Workflow:
```bash
curl -X POST http://localhost:5678/webhook/analyze \
  -H "Content-Type: application/json" \
  -d '{"job_id": "test-123", "video_id": "dQw4w9WgXcQ", "callback_url": "http://localhost:8000/api/webhook/analysis-complete"}'
```

### Test Clip Workflow:
```bash
curl -X POST http://localhost:5678/webhook/clip \
  -H "Content-Type: application/json" \
  -d '{"clip_id": "test-clip", "video_id": "dQw4w9WgXcQ", "start_time": 30, "end_time": 60, "callback_url": "http://localhost:8000/api/webhook/clip-complete"}'
```

---

## Troubleshooting

### n8n won't start
- Make sure port 5678 is free
- Try running with `n8n start --tunnel` for external access

### yt-dlp fails
- Update yt-dlp: `yt-dlp -U`
- Some videos may be restricted

### FFmpeg errors
- Make sure FFmpeg is in your PATH
- Check that the video downloaded successfully

### Workflow not triggering
- Make sure the workflow is "Active" (toggle in top right)
- Check the webhook URL matches your .env
