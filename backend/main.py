"""
ClipGenius Backend
A simple API for analyzing YouTube videos and finding interesting moments.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.youtube import extract_video_id, fetch_transcript
from services.ai import analyze_transcript
from services.database import save_analysis, get_cached_analysis

# Create FastAPI app
app = FastAPI(
    title="ClipGenius API",
    description="Analyze YouTube videos to find interesting moments",
    version="1.0.0",
)

# Allow frontend to connect (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class AnalyzeRequest(BaseModel):
    """Request body for /api/analyze endpoint"""
    youtube_url: str


class TimestampItem(BaseModel):
    """A single timestamp with explanation"""
    seconds: int
    time: str
    reason: str


class AnalyzeResponse(BaseModel):
    """Response from /api/analyze endpoint"""
    success: bool
    video_id: str | None = None
    video_title: str | None = None
    timestamps: list[TimestampItem] = []
    cached: bool = False
    error: str | None = None


# API Endpoints
@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "message": "ClipGenius API is running!",
        "docs": "/docs",
    }


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze_video(request: AnalyzeRequest):
    """
    Analyze a YouTube video and return interesting moments with timestamps.
    
    Steps:
    1. Extract video ID from URL
    2. Check if we have cached results
    3. Fetch transcript from YouTube
    4. Send to AI for analysis
    5. Save results to database
    6. Return results
    """
    
    # Step 1: Extract video ID
    video_id = extract_video_id(request.youtube_url)
    if not video_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid YouTube URL. Please provide a valid YouTube video link.",
        )
    
    # Step 2: Check for cached results
    cached = get_cached_analysis(video_id)
    if cached.get("found"):
        data = cached["data"]
        return AnalyzeResponse(
            success=True,
            video_id=video_id,
            video_title=data.get("video_title", "Unknown"),
            timestamps=data.get("timestamps", []),
            cached=True,
        )
    
    # Step 3: Fetch transcript
    transcript_result = fetch_transcript(video_id)
    if not transcript_result["success"]:
        raise HTTPException(
            status_code=400,
            detail=transcript_result["error"],
        )
    
    # Step 4: Analyze with AI
    ai_result = analyze_transcript(
        transcript_result["text"],
        transcript_result["transcript"],
    )
    if not ai_result["success"]:
        raise HTTPException(
            status_code=500,
            detail=ai_result["error"],
        )
    
    timestamps = ai_result["timestamps"]
    video_title = f"YouTube Video ({video_id})"  # We could fetch actual title if needed
    
    # Step 5: Save to database (don't fail if this doesn't work)
    save_analysis(video_id, video_title, timestamps)
    
    # Step 6: Return results
    return AnalyzeResponse(
        success=True,
        video_id=video_id,
        video_title=video_title,
        timestamps=timestamps,
        cached=False,
    )


@app.get("/api/results/{video_id}", response_model=AnalyzeResponse)
def get_results(video_id: str):
    """
    Get cached analysis results for a video.
    Returns 404 if not found.
    """
    cached = get_cached_analysis(video_id)
    
    if not cached.get("found"):
        raise HTTPException(
            status_code=404,
            detail="No analysis found for this video. Use /api/analyze to analyze it first.",
        )
    
    data = cached["data"]
    return AnalyzeResponse(
        success=True,
        video_id=video_id,
        video_title=data.get("video_title", "Unknown"),
        timestamps=data.get("timestamps", []),
        cached=True,
    )


# Run with: uvicorn main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
