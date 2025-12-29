"""
Database Service
Handles saving and retrieving analysis results.
For now, uses a local JSON file. Can be upgraded to Supabase later.
"""

import os
import json
from datetime import datetime
from pathlib import Path

# Path to the local cache file
CACHE_FILE = Path(__file__).parent.parent / "cache.json"


def _load_cache() -> dict:
    """Load the cache from file."""
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r") as f:
                return json.load(f)
        except:
            return {}
    return {}


def _save_cache(cache: dict) -> None:
    """Save the cache to file."""
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(cache, f, indent=2)
    except Exception as e:
        print(f"Failed to save cache: {e}")


def save_analysis(video_id: str, video_title: str, timestamps: list) -> dict:
    """
    Save analysis results to local cache.
    
    Args:
        video_id: YouTube video ID
        video_title: Title of the video
        timestamps: List of timestamp objects from AI analysis
        
    Returns:
        Dictionary with success status
    """
    try:
        cache = _load_cache()
        
        cache[video_id] = {
            "video_id": video_id,
            "video_title": video_title,
            "timestamps": timestamps,
            "created_at": datetime.utcnow().isoformat(),
        }
        
        _save_cache(cache)
        return {"success": True}
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to save to cache: {str(e)}",
        }


def get_cached_analysis(video_id: str) -> dict:
    """
    Check if we already have analysis results for this video.
    
    Args:
        video_id: YouTube video ID
        
    Returns:
        Dictionary with cached data if found, or None
    """
    try:
        cache = _load_cache()
        
        if video_id in cache:
            return {
                "found": True,
                "data": cache[video_id],
            }
        
        return {"found": False}
        
    except Exception as e:
        return {"found": False}

