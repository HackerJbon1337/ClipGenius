"""
AI Service
Handles communication with OpenRouter to analyze video transcripts.
"""

import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")


def analyze_transcript(transcript_text: str, transcript_segments: list) -> dict:
    """
    Send transcript to OpenRouter AI to find interesting moments.
    
    Args:
        transcript_text: The full transcript as plain text
        transcript_segments: List of segments with timing info
        
    Returns:
        Dictionary with success status and timestamps or error
    """
    if not OPENROUTER_API_KEY:
        return {
            "success": False,
            "error": "OpenRouter API key not configured. Please add OPENROUTER_API_KEY to your .env file.",
        }
    
    try:
        # Create the prompt
        prompt = f"""You are a video content analyst. Analyze this YouTube video transcript and find the most interesting, important, or notable moments.

TRANSCRIPT:
{transcript_text}

TIMESTAMP DATA (for reference):
The transcript has {len(transcript_segments)} segments. Each segment has a 'start' time in seconds.
First segment starts at: {transcript_segments[0]['start']:.1f} seconds
Last segment starts at: {transcript_segments[-1]['start']:.1f} seconds

YOUR TASK:
1. Identify 5-8 of the most interesting moments in this video
2. For each moment, provide the approximate timestamp and a brief explanation

RESPOND IN THIS EXACT JSON FORMAT (no other text):
{{
    "timestamps": [
        {{
            "seconds": 0,
            "time": "0:00",
            "reason": "Brief explanation of why this moment is interesting"
        }}
    ]
}}

RULES:
- Seconds must be a number (the timestamp in seconds)
- Time must be formatted as "M:SS" or "H:MM:SS"
- Reason should be 10-20 words explaining why this moment matters
- Order timestamps from earliest to latest
- Only return valid JSON, no markdown or other formatting"""

        # Call OpenRouter API
        url = "https://openrouter.ai/api/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "ClipGenius",
        }
        
        data = {
            "model": "google/gemini-2.0-flash-exp:free",  # Free model!
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 2048,
        }
        
        response = requests.post(url, headers=headers, json=data, timeout=60)
        
        if response.status_code != 200:
            error_detail = response.json().get("error", {}).get("message", response.text)
            return {
                "success": False,
                "error": f"OpenRouter API error: {error_detail}",
            }
        
        result = response.json()
        
        # Extract the text response
        response_text = result["choices"][0]["message"]["content"].strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()
        
        # Parse JSON
        parsed = json.loads(response_text)
        
        return {
            "success": True,
            "timestamps": parsed.get("timestamps", []),
        }
        
    except json.JSONDecodeError as e:
        return {
            "success": False,
            "error": f"Failed to parse AI response: {str(e)}",
        }
        
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": "AI request timed out. Please try again.",
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"AI analysis failed: {str(e)}",
        }


