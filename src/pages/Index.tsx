import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzeVideo } from "@/services/api";

const Index = () => {
  const navigate = useNavigate();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!youtubeUrl) {
      setError("Please enter a YouTube URL");
      return;
    }

    // Basic YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeUrl)) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    setIsLoading(true);

    try {
      // Call the real backend API
      const result = await analyzeVideo(youtubeUrl);

      if (result.success) {
        // Store the results for the results page
        localStorage.setItem("analysisResults", JSON.stringify(result));
        navigate("/results");
      } else {
        setError(result.error || "Failed to analyze video");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze video. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

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
        <div className="max-w-xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Analyze YouTube Video</CardTitle>
              <p className="text-sm text-muted-foreground">
                Paste a YouTube URL to find the most interesting moments
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="youtube-url">YouTube URL</Label>
                  <Input
                    id="youtube-url"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Analyzing..." : "Analyze Video"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;

