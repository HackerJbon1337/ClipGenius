"""
YouTube Service
Handles extracting video ID and fetching transcripts from YouTube videos.
"""

import re
from youtube_transcript_api import YouTubeTranscriptApi


def extract_video_id(youtube_url: str) -> str | None:
    """
    Extract the video ID from a YouTube URL.
    
    Supports formats like:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID
    
    Returns None if no valid video ID is found.
    """
    # Pattern to match YouTube video IDs
    patterns = [
        r'(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})',
        r'(?:youtu\.be\/)([a-zA-Z0-9_-]{11})',
        r'(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, youtube_url)
        if match:
            return match.group(1)
    
    return None


def fetch_transcript(video_id: str) -> dict:
    """
    Fetch the transcript for a YouTube video.
    
    Returns a dictionary with:
    - success: True/False
    - transcript: List of transcript segments (if successful)
    - text: Full transcript as plain text (if successful)
    - error: Error message (if failed)
    """
    try:
        # Fetch the transcript using the new v1.x API
        ytt_api = YouTubeTranscriptApi()
        transcript_data = ytt_api.fetch(video_id)
        
        # Convert to list of dicts with text, start, duration
        transcript_list = []
        for snippet in transcript_data.snippets:
            transcript_list.append({
                "text": snippet.text,
                "start": snippet.start,
                "duration": snippet.duration,
            })
        
        # Combine all text segments into full transcript
        full_text = " ".join([segment["text"] for segment in transcript_list])
        
        return {
            "success": True,
            "transcript": transcript_list,
            "text": full_text,
        }
        
    except Exception as e:
        error_msg = str(e).lower()
        
        if "disabled" in error_msg:
            return {
                "success": False,
                "error": "Transcripts are disabled for this video.",
            }
        elif "no transcript" in error_msg or "not found" in error_msg:
            return {
                "success": False,
                "error": "No transcript found for this video. It might not have captions.",
            }
        elif "unavailable" in error_msg or "private" in error_msg:
            return {
                "success": False,
                "error": "Video is unavailable. It might be private or deleted.",
            }
        else:
            return {
                "success": False,
                "error": f"Failed to fetch transcript: {str(e)}",
            }
