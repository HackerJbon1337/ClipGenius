import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Highlight, formatTime, downloadClip } from "@/services/api";

// Updated interface for new API response
interface ResultsData {
  success: boolean;
  video_id?: string;
  highlights?: Highlight[];
  cached?: boolean;
}

const Results = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<ResultsData | null>(null);
  const [downloadingClip, setDownloadingClip] = useState<string | null>(null);
  const [clipError, setClipError] = useState<string | null>(null);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    const storedResults = localStorage.getItem("analysisResults");
    if (!storedResults) {
      navigate("/");
      return;
    }

    try {
      const parsed = JSON.parse(storedResults);
      setResults(parsed);
    } catch {
      navigate("/");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

  const handleNewAnalysis = () => {
    localStorage.removeItem("analysisResults");
    navigate("/");
  };

  const openVideoAtTimestamp = (seconds: number) => {
    if (results?.video_id) {
      window.open(
        `https://www.youtube.com/watch?v=${results.video_id}&t=${Math.floor(seconds)}s`,
        "_blank"
      );
    }
  };

  const handleDownloadClip = async (highlight: Highlight) => {
    if (!results?.video_id) return;

    setDownloadingClip(highlight.id);
    setClipError(null);

    try {
      const downloadUrl = await downloadClip(
        highlight.id,
        results.video_id,
        highlight.start_timestamp,
        highlight.end_timestamp
      );

      // Open download URL in new tab
      window.open(downloadUrl, "_blank");
    } catch (error) {
      setClipError(error instanceof Error ? error.message : "Failed to download clip");
    } finally {
      setDownloadingClip(null);
    }
  };

  if (!results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const highlights = results.highlights || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">ClipGenius</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Analysis Results</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Video ID: {results.video_id}
              </p>
              {results.cached && (
                <Badge variant="secondary" className="mt-2">
                  Cached Result
                </Badge>
              )}
            </div>
            <Button variant="outline" onClick={handleNewAnalysis}>
              New Analysis
            </Button>
          </div>

          {/* Video Embed */}
          {results.video_id && (
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${results.video_id}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg"
                  ></iframe>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {clipError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
              {clipError}
            </div>
          )}

          {/* Highlights Table */}
          <Card>
            <CardHeader>
              <CardTitle>🎬 Best Moments for Shorts</CardTitle>
              <p className="text-sm text-muted-foreground">
                Click a timestamp to preview, or download the clip directly
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Time Range</TableHead>
                    <TableHead className="w-24">Duration</TableHead>
                    <TableHead>Why It's Great</TableHead>
                    <TableHead className="w-32 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {highlights.map((highlight) => {
                    const duration = highlight.end_timestamp - highlight.start_timestamp;
                    const isDownloading = downloadingClip === highlight.id;

                    return (
                      <TableRow key={highlight.id}>
                        <TableCell
                          className="font-mono font-medium text-primary cursor-pointer hover:underline"
                          onClick={() => openVideoAtTimestamp(highlight.start_timestamp)}
                        >
                          {formatTime(highlight.start_timestamp)} - {formatTime(highlight.end_timestamp)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {duration}s
                        </TableCell>
                        <TableCell>{highlight.reason}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="default"
                            disabled={isDownloading}
                            onClick={() => handleDownloadClip(highlight)}
                          >
                            {isDownloading ? "Processing..." : "📥 Download"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {highlights.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No highlights found for this video.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <h3 className="font-medium mb-2">💡 Tips</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Clips are optimized for Instagram Reels & YouTube Shorts (15-60 seconds)</li>
                <li>• Click on the time range to preview that moment in the video</li>
                <li>• Downloaded clips are in MP4 format, ready to upload</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Results;
