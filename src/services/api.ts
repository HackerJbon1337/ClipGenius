/**
 * API Service
 * Handles communication with the ClipGenius backend
 */

const API_BASE_URL = "http://localhost:8000";

export interface TimestampItem {
    seconds: number;
    time: string;
    reason: string;
}

export interface AnalyzeResponse {
    success: boolean;
    video_id: string | null;
    video_title: string | null;
    timestamps: TimestampItem[];
    cached: boolean;
    error: string | null;
}

/**
 * Analyze a YouTube video to find interesting moments
 */
export async function analyzeVideo(youtubeUrl: string): Promise<AnalyzeResponse> {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ youtube_url: youtubeUrl }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to analyze video");
    }

    return response.json();
}

/**
 * Get cached results for a video
 */
export async function getCachedResults(videoId: string): Promise<AnalyzeResponse> {
    const response = await fetch(`${API_BASE_URL}/api/results/${videoId}`);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to get results");
    }

    return response.json();
}
