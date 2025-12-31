/**
 * ClipGenius Backend Server
 * 
 * A Node.js/Express API that:
 * - Receives YouTube URLs from the frontend
 * - Triggers n8n workflows for AI analysis
 * - Triggers n8n workflows for video clipping
 * - Stores data in Supabase (or in-memory for development)
 * 
 * Run with: npm run dev
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Import services
import * as db from './services/database.js';
import * as n8n from './services/n8n.js';
import { fetchTranscript } from './services/transcript.js';
import * as clipper from './services/clipper.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 8000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// IN-MEMORY STORAGE (Fallback when Supabase not configured)
// ============================================
const jobs = new Map();
const highlights = new Map();
const clips = new Map();

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// ============================================
// API ROUTES
// ============================================

/**
 * GET /
 * Health check endpoint
 */
app.get('/', async (req, res) => {
    const n8nRunning = await n8n.checkN8nHealth();

    res.json({
        message: 'ClipGenius API is running!',
        version: '2.0.0',
        services: {
            supabase: db.isSupabaseConfigured ? '✅ Connected' : '⚠️ Using in-memory',
            n8n: n8nRunning ? '✅ Running' : '⚠️ Not detected (using mock mode)',
        },
        endpoints: {
            analyze: 'POST /api/analyze',
            status: 'GET /api/status/:jobId',
            clip: 'POST /api/clip',
            download: 'GET /api/download/:clipId',
        },
    });
});

/**
 * POST /api/analyze
 * Start AI analysis for a YouTube video
 */
app.post('/api/analyze', async (req, res) => {
    const { youtube_url } = req.body;

    if (!youtube_url) {
        return res.status(400).json({
            success: false,
            error: 'Missing youtube_url in request body'
        });
    }

    const videoId = extractVideoId(youtube_url);
    if (!videoId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid YouTube URL'
        });
    }

    // Check cache first (Supabase or in-memory)
    if (db.isSupabaseConfigured) {
        const cached = await db.getCachedVideo(videoId);
        if (cached.found) {
            return res.json({
                success: true,
                job_id: cached.data.id,
                status: 'complete',
                cached: true,
                video_id: videoId,
                highlights: cached.data.highlights || [],
            });
        }
    } else {
        // Check in-memory cache
        for (const [jobId, job] of jobs.entries()) {
            if (job.videoId === videoId && job.status === 'complete') {
                return res.json({
                    success: true,
                    job_id: jobId,
                    status: 'complete',
                    cached: true,
                    video_id: videoId,
                    highlights: highlights.get(videoId) || [],
                });
            }
        }
    }

    // Create new job
    const jobId = uuidv4();

    if (db.isSupabaseConfigured) {
        await db.saveVideo(videoId, youtube_url, jobId);
    } else {
        jobs.set(jobId, {
            videoId,
            youtubeUrl: youtube_url,
            status: 'processing',
            createdAt: new Date().toISOString(),
        });
    }

    // Try to trigger n8n workflow
    const n8nRunning = await n8n.checkN8nHealth();

    if (n8nRunning) {
        // Fetch real transcript using yt-dlp
        console.log(`[Transcript] Fetching transcript for ${videoId}...`);
        const transcriptResult = await fetchTranscript(videoId);
        const transcript = transcriptResult.success ? transcriptResult.transcript : '';
        const duration = transcriptResult.duration || 0;

        if (transcriptResult.success) {
            console.log(`[Transcript] Got ${transcript.length} chars, duration ${duration}s`);
        } else {
            console.log(`[Transcript] Failed: ${transcriptResult.error} - using fallback`);
        }

        const callbackUrl = `${BASE_URL}/api/webhook/analysis-complete`;
        await n8n.triggerAnalysisWorkflow(jobId, videoId, youtube_url, callbackUrl, transcript, duration);
    } else {
        // Mock mode: simulate AI response after 3 seconds
        console.log(`[MOCK] Simulating AI analysis for ${videoId}`);
        setTimeout(async () => {
            const mockHighlights = [
                { id: uuidv4(), start_timestamp: 30, end_timestamp: 55, reason: 'Engaging introduction with hook' },
                { id: uuidv4(), start_timestamp: 120, end_timestamp: 150, reason: 'Key insight or main point' },
                { id: uuidv4(), start_timestamp: 240, end_timestamp: 280, reason: 'Entertaining moment - great for shorts' },
            ];

            if (db.isSupabaseConfigured) {
                await db.updateVideoStatus(jobId, 'complete');
                await db.saveHighlights(jobId, mockHighlights);
            } else {
                jobs.set(jobId, { ...jobs.get(jobId), status: 'complete' });
                highlights.set(videoId, mockHighlights);
            }

            console.log(`[MOCK] Analysis complete for ${jobId}`);
        }, 3000);
    }

    res.json({
        success: true,
        job_id: jobId,
        status: 'processing',
        message: 'Analysis started. Poll /api/status/:jobId for updates.',
    });
});

/**
 * GET /api/status/:jobId
 * Check the status of an analysis job
 */
app.get('/api/status/:jobId', async (req, res) => {
    const { jobId } = req.params;

    let job, jobHighlights;

    if (db.isSupabaseConfigured) {
        const result = await db.getVideo(jobId);
        if (!result.success) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }
        job = result.data;

        if (job.status === 'complete') {
            const hlResult = await db.getHighlights(jobId);
            jobHighlights = hlResult.data || [];
        }
    } else {
        job = jobs.get(jobId);
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }
        jobHighlights = highlights.get(job.videoId) || [];
    }

    if (job.status === 'complete') {
        return res.json({
            success: true,
            status: 'complete',
            video_id: job.youtube_id || job.videoId,
            highlights: jobHighlights,
        });
    }

    res.json({
        success: true,
        status: job.status,
        video_id: job.youtube_id || job.videoId,
    });
});

/**
 * POST /api/clip
 * Request a video clip for a specific highlight
 */
app.post('/api/clip', async (req, res) => {
    const { highlight_id, video_id, start_time, end_time } = req.body;

    if (!video_id) {
        return res.status(400).json({
            success: false,
            error: 'Missing video_id'
        });
    }

    // Use times from request body (sent by frontend) or fall back to lookup
    let startTime = start_time;
    let endTime = end_time;

    // If times not provided, try to find highlight
    if (startTime === undefined || endTime === undefined) {
        const videoHighlights = highlights.get(video_id) || [];
        const highlight = videoHighlights.find(h => h.id === highlight_id);

        if (highlight) {
            startTime = startTime ?? highlight.start_timestamp;
            endTime = endTime ?? highlight.end_timestamp;
        }
    }

    // Validate we have times
    if (startTime === undefined || endTime === undefined) {
        return res.status(400).json({
            success: false,
            error: 'Missing start_time or end_time'
        });
    }

    // Create clip job
    const clipId = uuidv4();

    // Always use in-memory for clips (they're stored on disk, not in Supabase)
    clips.set(clipId, {
        highlightId: highlight_id,
        videoId: video_id,
        startTime,
        endTime,
        status: 'processing',
        downloadUrl: null,
        createdAt: new Date().toISOString(),
    });

    // Create clip in the background using yt-dlp + FFmpeg
    console.log(`[Clip] Starting clip creation for ${clipId}...`);

    // Don't await - let it run in background
    (async () => {
        try {
            const result = await clipper.createClip(video_id, startTime, endTime, clipId);

            if (result.success) {
                const downloadUrl = `/api/clips/${clipId}.mp4`;
                clips.set(clipId, { ...clips.get(clipId), status: 'ready', downloadUrl });
                console.log(`[Clip] Ready: ${clipId}`);
            } else {
                clips.set(clipId, { ...clips.get(clipId), status: 'error', error: result.error });
                console.log(`[Clip] Failed: ${result.error}`);
            }
        } catch (error) {
            console.error(`[Clip] Error:`, error.message);
            clips.set(clipId, { ...clips.get(clipId), status: 'error', error: error.message });
        }
    })();

    res.json({
        success: true,
        clip_id: clipId,
        status: 'processing',
        message: 'Clip processing started. Poll /api/download/:clipId for updates.',
    });
});

/**
 * GET /api/download/:clipId
 * Check clip status and get download URL
 */
app.get('/api/download/:clipId', async (req, res) => {
    const { clipId } = req.params;

    // Always use in-memory for clips (matching where we store them)
    const clip = clips.get(clipId);
    if (!clip) {
        return res.status(404).json({ success: false, error: 'Clip not found' });
    }

    res.json({
        success: true,
        status: clip.status,
        download_url: clip.downloadUrl,
        start_time: clip.startTime,
        end_time: clip.endTime,
    });
});

/**
 * GET /api/clips/:filename
 * Serve clip files for download
 */
app.get('/api/clips/:filename', async (req, res) => {
    const { filename } = req.params;
    const clipId = filename.replace('.mp4', '');

    const filePath = clipper.getClipPath(clipId);
    const exists = await clipper.clipExists(clipId);

    if (!exists) {
        return res.status(404).json({ success: false, error: 'Clip file not found' });
    }

    res.download(filePath, filename);
});

/**
 * POST /api/webhook/analysis-complete
 * Callback endpoint for n8n to notify when analysis is done
 */
app.post('/api/webhook/analysis-complete', async (req, res) => {
    const { job_id, video_id, highlights: newHighlights, error } = req.body;

    if (!job_id) {
        return res.status(400).json({ success: false, error: 'Missing job_id' });
    }

    console.log(`[n8n Callback] Analysis complete for job ${job_id}`);

    if (db.isSupabaseConfigured) {
        if (error) {
            await db.updateVideoStatus(job_id, 'error');
        } else {
            await db.updateVideoStatus(job_id, 'complete');
            if (newHighlights && newHighlights.length > 0) {
                await db.saveHighlights(job_id, newHighlights);
            }
        }
    } else {
        const job = jobs.get(job_id);
        if (job) {
            if (error) {
                jobs.set(job_id, { ...job, status: 'error', error });
            } else {
                jobs.set(job_id, { ...job, status: 'complete' });
                highlights.set(video_id, newHighlights || []);
            }
        }
    }

    res.json({ success: true });
});

/**
 * POST /api/webhook/clip-complete
 * Callback endpoint for n8n to notify when clip is ready
 */
app.post('/api/webhook/clip-complete', async (req, res) => {
    const { clip_id, download_url, error } = req.body;

    if (!clip_id) {
        return res.status(400).json({ success: false, error: 'Missing clip_id' });
    }

    console.log(`[n8n Callback] Clip ready: ${clip_id}`);

    if (db.isSupabaseConfigured) {
        if (error) {
            await db.updateClip(clip_id, 'error');
        } else {
            await db.updateClip(clip_id, 'ready', download_url);
        }
    } else {
        const clip = clips.get(clip_id);
        if (clip) {
            if (error) {
                clips.set(clip_id, { ...clip, status: 'error', error });
            } else {
                clips.set(clip_id, { ...clip, status: 'ready', downloadUrl: download_url });
            }
        }
    }

    res.json({ success: true });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, async () => {
    const n8nRunning = await n8n.checkN8nHealth();

    console.log('');
    console.log('🎬 ClipGenius Backend v2.0');
    console.log('═══════════════════════════════════════');
    console.log(`🌐 Server:   http://localhost:${PORT}`);
    console.log('');
    console.log('📊 Service Status:');
    console.log(`   Supabase: ${db.isSupabaseConfigured ? '✅ Connected' : '⚠️  Not configured (using in-memory)'}`);
    console.log(`   n8n:      ${n8nRunning ? '✅ Running' : '⚠️  Not detected (using mock mode)'}`);
    console.log('');
    console.log('📡 Endpoints:');
    console.log('   POST /api/analyze      - Start video analysis');
    console.log('   GET  /api/status/:id   - Check analysis status');
    console.log('   POST /api/clip         - Request video clip');
    console.log('   GET  /api/download/:id - Get clip download URL');
    console.log('');

    if (!db.isSupabaseConfigured) {
        console.log('💡 To enable Supabase:');
        console.log('   1. Create account at https://supabase.com');
        console.log('   2. Run setup.sql in SQL Editor');
        console.log('   3. Add credentials to .env');
        console.log('');
    }

    if (!n8nRunning) {
        console.log('💡 To enable n8n workflows:');
        console.log('   1. Install: npm install -g n8n');
        console.log('   2. Run: n8n start');
        console.log('   3. See docs/n8n-setup.md for workflow config');
        console.log('');
    }
});
