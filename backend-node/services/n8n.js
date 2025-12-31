/**
 * n8n Workflow Service
 * 
 * Handles triggering n8n webhooks for:
 * - AI transcript analysis
 * - Video clipping with FFmpeg
 * 
 * n8n runs locally and processes jobs asynchronously.
 */

import dotenv from 'dotenv';
dotenv.config();

const ANALYZE_WEBHOOK = process.env.N8N_ANALYZE_WEBHOOK || 'http://localhost:5678/webhook/analyze';
const CLIP_WEBHOOK = process.env.N8N_CLIP_WEBHOOK || 'http://localhost:5678/webhook/clip';

/**
 * Trigger the AI analysis workflow in n8n
 * 
 * This workflow will:
 * 1. Use the transcript (fetched by backend)
 * 2. Send it to Groq AI for analysis
 * 3. Parse the response to extract highlights
 * 4. Call back to our API with results
 */
export async function triggerAnalysisWorkflow(jobId, videoId, youtubeUrl, callbackUrl, transcript = '', duration = 0) {
    try {
        console.log(`[n8n] Triggering analysis for job ${jobId}`);

        const response = await fetch(ANALYZE_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_id: jobId,
                video_id: videoId,
                youtube_url: youtubeUrl,
                callback_url: callbackUrl,
                transcript: transcript,
                duration: duration,
            }),
        });

        if (!response.ok) {
            throw new Error(`n8n returned ${response.status}`);
        }

        console.log(`[n8n] Analysis workflow triggered successfully`);
        return { success: true };
    } catch (error) {
        console.error(`[n8n] Failed to trigger analysis:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Trigger the video clipping workflow in n8n
 * 
 * This workflow will:
 * 1. Download the YouTube video using yt-dlp
 * 2. Cut the segment using FFmpeg
 * 3. Upload to Supabase Storage
 * 4. Call back to our API with the download URL
 */
export async function triggerClipWorkflow(clipId, videoId, youtubeUrl, startTime, endTime, callbackUrl) {
    try {
        console.log(`[n8n] Triggering clip workflow for clip ${clipId}`);

        const response = await fetch(CLIP_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clip_id: clipId,
                video_id: videoId,
                youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
                start_time: startTime,
                end_time: endTime,
                callback_url: callbackUrl,
            }),
        });

        if (!response.ok) {
            throw new Error(`n8n returned ${response.status}`);
        }

        console.log(`[n8n] Clip workflow triggered successfully`);
        return { success: true };
    } catch (error) {
        console.error(`[n8n] Failed to trigger clip workflow:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Check if n8n is running and accessible
 */
export async function checkN8nHealth() {
    try {
        // Try to reach n8n's health endpoint
        const response = await fetch('http://localhost:5678/healthz', {
            method: 'GET',
            signal: AbortSignal.timeout(2000),
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}
