/**
 * API Service
 * Handles communication with the ClipGenius Node.js backend
 */

const API_BASE_URL = "http://localhost:8000";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Highlight {
    id: string;
    start_timestamp: number;  // in seconds
    end_timestamp: number;    // in seconds
    reason: string;
}

export interface AnalyzeResponse {
    success: boolean;
    job_id?: string;
    status: "processing" | "complete" | "error";
    video_id?: string;
    highlights?: Highlight[];
    cached?: boolean;
    error?: string;
    message?: string;
}

export interface ClipResponse {
    success: boolean;
    clip_id?: string;
    status: "processing" | "ready" | "error";
    download_url?: string;
    error?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Wait for a specified time
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format seconds to MM:SS display format
 */
export function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Start analyzing a YouTube video
 * Returns immediately with a job_id for polling
 */
export async function startAnalysis(youtubeUrl: string): Promise<AnalyzeResponse> {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtube_url: youtubeUrl }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to start analysis");
    }

    return response.json();
}

/**
 * Check the status of an analysis job
 */
export async function checkStatus(jobId: string): Promise<AnalyzeResponse> {
    const response = await fetch(`${API_BASE_URL}/api/status/${jobId}`);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to check status");
    }

    return response.json();
}

/**
 * Analyze a video and wait for results (with polling)
 * This is the main function the UI should call
 */
export async function analyzeVideo(youtubeUrl: string): Promise<AnalyzeResponse> {
    // Start the analysis
    const startResult = await startAnalysis(youtubeUrl);

    // If already complete (cached), return immediately
    if (startResult.status === "complete") {
        return startResult;
    }

    // Otherwise, poll for completion
    const jobId = startResult.job_id;
    if (!jobId) {
        throw new Error("No job ID received");
    }

    // Poll every 2 seconds, max 120 seconds (n8n + AI can take time)
    const maxAttempts = 60;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await sleep(2000);

        const status = await checkStatus(jobId);

        if (status.status === "complete") {
            return status;
        }

        if (status.status === "error") {
            throw new Error(status.error || "Analysis failed");
        }
    }

    throw new Error("Analysis timed out. Please try again.");
}

/**
 * Request a video clip for a specific highlight
 */
export async function requestClip(
    highlightId: string,
    videoId: string,
    startTime?: number,
    endTime?: number
): Promise<ClipResponse> {
    const response = await fetch(`${API_BASE_URL}/api/clip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            highlight_id: highlightId,
            video_id: videoId,
            start_time: startTime,
            end_time: endTime
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to request clip");
    }

    return response.json();
}

/**
 * Check if a clip is ready for download
 */
export async function checkClipStatus(clipId: string): Promise<ClipResponse> {
    const response = await fetch(`${API_BASE_URL}/api/download/${clipId}`);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to check clip status");
    }

    return response.json();
}

/**
 * Request a clip and wait for it to be ready (with polling)
 */
export async function downloadClip(
    highlightId: string,
    videoId: string,
    startTime?: number,
    endTime?: number
): Promise<string> {
    // Start clip processing
    const clipResult = await requestClip(highlightId, videoId, startTime, endTime);

    const clipId = clipResult.clip_id;
    if (!clipId) {
        throw new Error("No clip ID received");
    }

    // Poll every 3 seconds, max 5 minutes (longer videos take more time to download)
    const maxAttempts = 100;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await sleep(3000);

        const status = await checkClipStatus(clipId);

        if (status.status === "ready" && status.download_url) {
            // Return the full URL to download
            return `${API_BASE_URL}${status.download_url}`;
        }

        if (status.status === "error") {
            throw new Error(status.error || "Clip processing failed");
        }
    }

    throw new Error("Clip processing timed out. Please try again.");
}

// ============================================
// LEGACY SUPPORT (for backward compatibility)
// ============================================

// Old interface - kept for compatibility during transition
export interface TimestampItem {
    seconds: number;
    time: string;
    reason: string;
}

/**
 * Convert new highlight format to old timestamp format
 * (Use this if Results page still uses old format)
 */
export function highlightToTimestamp(highlight: Highlight): TimestampItem {
    return {
        seconds: highlight.start_timestamp,
        time: formatTime(highlight.start_timestamp),
        reason: highlight.reason,
    };
}
