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
import { AnalyzeResponse } from "@/services/api";

const Results = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<AnalyzeResponse | null>(null);

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

  if (!results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

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
                {results.video_title || `Video ID: ${results.video_id}`}
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

          {/* Timestamps Table */}
          <Card>
            <CardHeader>
              <CardTitle>Interesting Moments</CardTitle>
              <p className="text-sm text-muted-foreground">
                Click on a timestamp to open the video at that moment
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Timestamp</TableHead>
                    <TableHead>Why It's Interesting</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.timestamps.map((item, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openVideoAtTimestamp(item.seconds)}
                    >
                      <TableCell className="font-mono font-medium text-primary">
                        {item.time}
                      </TableCell>
                      <TableCell>{item.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Results;

