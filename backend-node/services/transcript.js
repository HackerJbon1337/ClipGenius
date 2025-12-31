/**
 * Transcript Service
 * Fetches YouTube video transcripts using yt-dlp
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Fetch transcript for a YouTube video using yt-dlp
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<{success: boolean, transcript?: string, error?: string, duration?: number}>}
 */
export async function fetchTranscript(videoId) {
    const tempFile = path.join(process.cwd(), `${videoId}`);
    const vttFile = `${tempFile}.en.vtt`;

    // Get yt-dlp path
    const ytdlpPath = process.platform === 'win32'
        ? 'C:\\\\Users\\\\jeswa\\\\AppData\\\\Local\\\\Microsoft\\\\WinGet\\\\Links\\\\yt-dlp.exe'
        : 'yt-dlp';

    let videoDuration = 0;

    // Run duration fetch and caption download in PARALLEL to save time
    const durationPromise = (async () => {
        try {
            const durationCmd = `"${ytdlpPath}" --print duration "https://www.youtube.com/watch?v=${videoId}"`;
            const { stdout: durationOut } = await execAsync(durationCmd, { timeout: 15000 });
            const d = Math.floor(parseFloat(durationOut.trim()) || 0);
            console.log(`[Transcript] Video duration: ${d}s (${Math.floor(d / 60)}:${(d % 60).toString().padStart(2, '0')})`);
            return d;
        } catch (e) {
            console.log(`[Transcript] Could not get duration: ${e.message}`);
            return 0;
        }
    })();

    const downloadPromise = (async () => {
        const command = `"${ytdlpPath}" --write-auto-sub --sub-lang en --skip-download --sub-format vtt -o "${tempFile}" "https://www.youtube.com/watch?v=${videoId}"`;
        console.log(`[Transcript] Fetching captions for ${videoId}...`);
        await execAsync(command, { timeout: 30000 });
    })();

    try {
        // Wait for both to complete
        const [durationResult, _] = await Promise.all([durationPromise, downloadPromise]);
        videoDuration = durationResult;

        // Read the VTT file
        let vttContent;
        try {
            vttContent = await fs.readFile(vttFile, 'utf-8');
        } catch (e) {
            // Try alternative subtitle file names
            const altFile = `${tempFile}.en-orig.vtt`;
            try {
                vttContent = await fs.readFile(altFile, 'utf-8');
                await fs.unlink(altFile).catch(() => { });
            } catch (e2) {
                return { success: false, error: 'No captions available for this video', duration: videoDuration };
            }
        }

        // Parse VTT to extract text with timestamps
        const { transcript, maxTimestamp } = parseVTT(vttContent);

        // Use actual duration from yt-dlp, or fall back to max timestamp from captions
        const finalDuration = videoDuration > 0 ? videoDuration : maxTimestamp;

        // Cleanup
        await fs.unlink(vttFile).catch(() => { });

        console.log(`[Transcript] Got ${transcript.length} chars, duration ${finalDuration}s`);

        return { success: true, transcript, duration: finalDuration };

    } catch (error) {
        console.error(`[Transcript] Error:`, error.message);

        // Cleanup on error
        await fs.unlink(vttFile).catch(() => { });

        return {
            success: false,
            error: error.message.includes('timeout')
                ? 'Transcript fetch timed out'
                : 'Could not fetch transcript'
        };
    }
}

/**
 * Parse VTT subtitle format to extract text with timestamps
 * @param {string} vttContent - Raw VTT file content
 * @returns {{transcript: string, maxTimestamp: number}} - Formatted transcript with [Xs] markers and max timestamp
 */
function parseVTT(vttContent) {
    const lines = vttContent.split('\n');
    let transcript = '';
    let currentTime = 0;
    let maxTimestamp = 0;
    let lastText = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Match timestamp lines like "00:00:05.000 --> 00:00:10.000"
        const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.\d{3}\s*-->/);
        if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const mins = parseInt(timeMatch[2]);
            const secs = parseInt(timeMatch[3]);
            currentTime = hours * 3600 + mins * 60 + secs;
            if (currentTime > maxTimestamp) {
                maxTimestamp = currentTime;
            }
            continue;
        }

        // Skip metadata lines
        if (!line ||
            line.match(/^\d+$/) ||
            line.includes('-->') ||
            line.startsWith('WEBVTT') ||
            line.startsWith('Kind:') ||
            line.startsWith('Language:') ||
            line.startsWith('NOTE')) {
            continue;
        }

        // Clean up the text line
        let cleanText = line
            .replace(/<[^>]*>/g, '')  // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .trim();

        // Skip duplicate lines (VTT often repeats)
        if (cleanText && cleanText !== lastText) {
            transcript += `[${currentTime}s] ${cleanText} `;
            lastText = cleanText;
        }
    }

    // For longer videos, sample from beginning, middle, and end
    // This ensures AI sees content from entire video
    const MAX_LENGTH = 6000;

    if (transcript.length > MAX_LENGTH) {
        const third = Math.floor(transcript.length / 3);
        const startPart = transcript.substring(0, MAX_LENGTH * 0.4);  // First 40%
        const midStart = Math.floor(transcript.length * 0.4);
        const midPart = transcript.substring(midStart, midStart + MAX_LENGTH * 0.3);  // Middle 30%
        const endPart = transcript.substring(transcript.length - MAX_LENGTH * 0.3);  // Last 30%

        transcript = startPart + ' [...MIDDLE OF VIDEO...] ' + midPart + ' [...END OF VIDEO...] ' + endPart;
    }

    return { transcript: transcript.trim(), maxTimestamp };
}

export default { fetchTranscript };
