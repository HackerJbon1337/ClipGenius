/**
 * Video Clipping Service
 * Downloads YouTube videos and cuts clips using FFmpeg
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Paths (Windows)
const YTDLP_PATH = process.platform === 'win32'
    ? 'C:\\Users\\jeswa\\AppData\\Local\\Microsoft\\WinGet\\Links\\yt-dlp.exe'
    : 'yt-dlp';

const FFMPEG_PATH = process.platform === 'win32'
    ? 'C:\\Users\\jeswa\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe'
    : 'ffmpeg';

const CLIPS_DIR = path.join(process.cwd(), 'clips');

// Ensure clips directory exists
async function ensureClipsDir() {
    try {
        await fs.mkdir(CLIPS_DIR, { recursive: true });
    } catch (e) {
        // Directory already exists
    }
}

/**
 * Create a video clip from a YouTube video
 * @param {string} videoId - YouTube video ID
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @param {string} clipId - Unique clip ID
 * @returns {Promise<{success: boolean, filePath?: string, error?: string}>}
 */
export async function createClip(videoId, startTime, endTime, clipId) {
    await ensureClipsDir();

    const tempVideo = path.join(CLIPS_DIR, `${clipId}_temp.mp4`);
    const outputClip = path.join(CLIPS_DIR, `${clipId}.mp4`);
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        console.log(`[Clip] Downloading video ${videoId}...`);

        // Download video (limited quality for speed) - 5 min timeout for longer videos
        const downloadCmd = `"${YTDLP_PATH}" -f "best[height<=720]/best" --no-playlist -o "${tempVideo}" "${youtubeUrl}"`;
        await execAsync(downloadCmd, { timeout: 300000 });  // 5 minutes

        console.log(`[Clip] Cutting ${startTime}s to ${endTime}s...`);

        // Cut the clip using FFmpeg
        const duration = endTime - startTime;
        const ffmpegCmd = `"${FFMPEG_PATH}" -y -i "${tempVideo}" -ss ${startTime} -t ${duration} -c:v libx264 -c:a aac -movflags +faststart "${outputClip}"`;
        await execAsync(ffmpegCmd, { timeout: 120000 });  // 2 minutes

        // Cleanup temp video
        await fs.unlink(tempVideo).catch(() => { });

        console.log(`[Clip] Created: ${outputClip}`);

        return {
            success: true,
            filePath: outputClip,
            fileName: `${clipId}.mp4`
        };

    } catch (error) {
        console.error(`[Clip] Error:`, error.message);

        // Cleanup on error
        await fs.unlink(tempVideo).catch(() => { });
        await fs.unlink(outputClip).catch(() => { });

        return {
            success: false,
            error: error.message.includes('timeout')
                ? 'Clip creation timed out'
                : 'Failed to create clip: ' + error.message
        };
    }
}

/**
 * Get the download URL for a clip
 */
export function getClipPath(clipId) {
    return path.join(CLIPS_DIR, `${clipId}.mp4`);
}

/**
 * Check if a clip file exists
 */
export async function clipExists(clipId) {
    try {
        await fs.access(getClipPath(clipId));
        return true;
    } catch {
        return false;
    }
}

export default { createClip, getClipPath, clipExists };
