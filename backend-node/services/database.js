/**
 * Supabase Database Service
 * 
 * Handles all database operations for ClipGenius.
 * Uses Supabase free tier for storage.
 * 
 * To set up Supabase:
 * 1. Go to https://supabase.com and create a free account
 * 2. Create a new project
 * 3. Go to Settings > API to get your URL and anon key
 * 4. Run the SQL in setup.sql to create tables
 * 5. Add your credentials to .env
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
const isConfigured = supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project');

let supabase = null;
if (isConfigured) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase connected');
} else {
    console.log('⚠️  Supabase not configured - using in-memory storage');
}

// ============================================
// VIDEO OPERATIONS
// ============================================

/**
 * Save a new video analysis job
 */
export async function saveVideo(videoId, youtubeUrl, jobId) {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    try {
        const { data, error } = await supabase
            .from('videos')
            .insert({
                id: jobId,
                youtube_id: videoId,
                youtube_url: youtubeUrl,
                status: 'processing',
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error saving video:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Update video status
 */
export async function updateVideoStatus(jobId, status) {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    try {
        const { error } = await supabase
            .from('videos')
            .update({ status })
            .eq('id', jobId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating video:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get video by job ID
 */
export async function getVideo(jobId) {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    try {
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .eq('id', jobId)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Check if video was already analyzed (by YouTube ID)
 */
export async function getCachedVideo(youtubeId) {
    if (!supabase) return { success: false, found: false };

    try {
        const { data, error } = await supabase
            .from('videos')
            .select(`
        *,
        highlights (*)
      `)
            .eq('youtube_id', youtubeId)
            .eq('status', 'complete')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) return { success: true, found: false };
        return { success: true, found: true, data };
    } catch (error) {
        return { success: false, found: false, error: error.message };
    }
}

// ============================================
// HIGHLIGHT OPERATIONS
// ============================================

/**
 * Save highlights for a video
 */
export async function saveHighlights(jobId, highlights) {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    try {
        // Add video_id reference to each highlight
        const highlightsWithVideoId = highlights.map(h => ({
            ...h,
            video_id: jobId,
        }));

        const { data, error } = await supabase
            .from('highlights')
            .insert(highlightsWithVideoId)
            .select();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error saving highlights:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get highlights for a video
 */
export async function getHighlights(jobId) {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    try {
        const { data, error } = await supabase
            .from('highlights')
            .select('*')
            .eq('video_id', jobId)
            .order('start_timestamp', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============================================
// CLIP OPERATIONS
// ============================================

/**
 * Save a clip request
 */
export async function saveClip(clipId, highlightId, videoId, startTime, endTime) {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    try {
        const { data, error } = await supabase
            .from('clips')
            .insert({
                id: clipId,
                highlight_id: highlightId,
                video_id: videoId,
                start_time: startTime,
                end_time: endTime,
                status: 'processing',
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error saving clip:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Update clip status and download URL
 */
export async function updateClip(clipId, status, downloadUrl = null) {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    try {
        const updateData = { status };
        if (downloadUrl) updateData.download_url = downloadUrl;

        const { error } = await supabase
            .from('clips')
            .update(updateData)
            .eq('id', clipId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating clip:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get clip by ID
 */
export async function getClip(clipId) {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    try {
        const { data, error } = await supabase
            .from('clips')
            .select('*')
            .eq('id', clipId)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============================================
// STORAGE OPERATIONS (for video clips)
// ============================================

/**
 * Upload a video clip to Supabase Storage
 */
export async function uploadClip(clipId, fileBuffer) {
    if (!supabase) return { success: false, error: 'Supabase not configured' };

    try {
        const fileName = `clips/${clipId}.mp4`;

        const { data, error } = await supabase.storage
            .from('clips')
            .upload(fileName, fileBuffer, {
                contentType: 'video/mp4',
                upsert: true,
            });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('clips')
            .getPublicUrl(fileName);

        return { success: true, url: urlData.publicUrl };
    } catch (error) {
        console.error('Error uploading clip:', error.message);
        return { success: false, error: error.message };
    }
}

// Export configuration status
export { isConfigured as isSupabaseConfigured };
