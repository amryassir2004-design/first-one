import { useState, useEffect, useRef, FormEvent } from "react";
import { 
  Music, 
  Search, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  Copy, 
  Check, 
  Disc, 
  Volume2, 
  Gauge, 
  History, 
  Trash2, 
  Play, 
  HelpCircle, 
  Compass, 
  AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SongMetadata, SearchHistoryItem, DiscoveredSong } from "./types";

const LOADING_STEPS = [
  "Tuning the digital ears... 🎧",
  "Searching global music charts and databases... 🌐",
  "Analyzing frequency structures and metadata... 🎸",
  "Compiling subgenre breakdowns and trivia... 📝"
];

const QUICK_EXAMPLES = [
  { name: "Blinding Lights - The Weeknd", desc: "Modern Synthwave / Pop" },
  { name: "Bohemian Rhapsody - Queen", desc: "Classic Progressive Rock" },
  { name: "Get Lucky - Daft Punk", desc: "Funk / Nu-Disco" },
  { name: "Sandstorm - Darude", desc: "Classic EDM / Trance" },
  { name: "Billie Jean - Michael Jackson", desc: "80s Pop / Funk" }
];

export default function App() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SongMetadata | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [bpmPulse, setBpmPulse] = useState(false);

  // Active tab: "decode" (Single Track Decoder) or "discover" (BPM & Theme Explorer)
  const [activeTab, setActiveTab] = useState<"decode" | "discover">("decode");

  // BPM & Theme search state variables
  const [discoverBpm, setDiscoverBpm] = useState<string>("");
  const [discoverTheme, setDiscoverTheme] = useState<string>("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<DiscoveredSong[]>([]);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  // Interval ref for loading step rotation
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Interval ref for BPM pulse
  const bpmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load Search History on mount
  useEffect(() => {
    const saved = localStorage.getItem("song_genre_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Rotate loading steps
  useEffect(() => {
    if (isLoading) {
      setLoadingStep(0);
      loadingIntervalRef.current = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 1800);
    } else {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    }
    return () => {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    };
  }, [isLoading]);

  // Set up BPM pulsating animation
  useEffect(() => {
    if (bpmIntervalRef.current) clearInterval(bpmIntervalRef.current);

    if (result && result.bpm > 0) {
      const intervalMs = (60 / result.bpm) * 1000;
      bpmIntervalRef.current = setInterval(() => {
        setBpmPulse(true);
        setTimeout(() => setBpmPulse(false), 150);
      }, intervalMs);
    } else {
      setBpmPulse(false);
    }

    return () => {
      if (bpmIntervalRef.current) clearInterval(bpmIntervalRef.current);
    };
  }, [result]);

  const handleAnalyze = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze the song. Please try again.");
      }

      setResult(data);

      // Save to Search History
      const newHistoryItem: SearchHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        query: searchQuery,
        songTitle: data.songTitle,
        artist: data.artist,
        genres: data.genres,
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        const filtered = prev.filter(
          (item) => item.songTitle.toLowerCase() !== data.songTitle.toLowerCase()
        );
        const updated = [newHistoryItem, ...filtered].slice(0, 10); // Keep top 10
        localStorage.setItem("song_genre_history", JSON.stringify(updated));
        return updated;
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred. Please verify your internet connection or try a different song query.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscover = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!discoverBpm && !discoverTheme.trim()) {
      setDiscoverError("Please enter a BPM value or choose/type a Theme/Mood.");
      return;
    }

    setIsDiscovering(true);
    setDiscoverError(null);
    setDiscoverResult([]);

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bpm: discoverBpm ? parseInt(discoverBpm) : undefined,
          theme: discoverTheme.trim() || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to find popular songs. Please try again.");
      }

      setDiscoverResult(data.songs || []);
    } catch (err: any) {
      console.error(err);
      setDiscoverError(err.message || "An unexpected error occurred during song discovery.");
    } finally {
      setIsDiscovering(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setQuery(text);
      }
    } catch (err) {
      // Clipboard read failed or denied
      console.warn("Clipboard access denied or not supported in this frame environment.");
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("song_genre_history");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-zinc-950 flex flex-col antialiased">
      {/* Decorative ambient blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 flex flex-col z-10">
        
        {/* Brand Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-800 pb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-zinc-950 shadow-lg shadow-emerald-500/20">
              <Music className="w-6 h-6 stroke-[2.5]" id="header-music-icon" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                GENRE<span className="text-emerald-400 font-semibold text-xl tracking-widest bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">DECODER</span>
              </h1>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">V1.5 // LLM-POWERED MUSICOLOGY SEARCH</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>MUSIC ANALYSIS ENGINE READY</span>
          </div>
        </header>

        {/* Workspace Layout Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
          
          {/* Main Workspace Column */}
          <section className="lg:col-span-8 flex flex-col gap-6">

            {/* Elegant Mode Toggle Tabs */}
            <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => {
                  setActiveTab("decode");
                  setError(null);
                }}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "decode"
                    ? "bg-emerald-500 text-zinc-950 shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Music className="w-4 h-4" />
                Single Track Decoder
              </button>
              <button
                onClick={() => {
                  setActiveTab("discover");
                  setDiscoverError(null);
                }}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "discover"
                    ? "bg-emerald-500 text-zinc-950 shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Compass className="w-4 h-4" />
                BPM & Theme Explorer
              </button>
            </div>

            {activeTab === "decode" ? (
              <>
                {/* Analyzer Search Console */}
                <div className="bg-zinc-900/60 backdrop-blur-md rounded-2xl p-6 border border-zinc-800 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-purple-500"></div>
                  
                  <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    Analyze a Song or Music Link
                  </h2>
                  <p className="text-sm text-zinc-400 mb-5">
                    Paste any Spotify, YouTube, SoundCloud link or simply type a song title & artist.
                  </p>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAnalyze(query);
                    }}
                    className="space-y-4"
                  >
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-zinc-500 pointer-events-none">
                        <Search className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g., Starboy - The Weeknd or https://open.spotify.com/track/..."
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-3.5 pl-12 pr-28 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans text-sm"
                        disabled={isLoading}
                      />
                      <div className="absolute right-2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handlePaste}
                          className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-mono border border-zinc-800 transition-colors flex items-center gap-1"
                          title="Paste clipboard content"
                        >
                          Paste
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isLoading || !query.trim()}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                      >
                        {isLoading ? "Decoding..." : "Decode Genre"}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-red-950/40 border border-red-900/60 p-4 rounded-xl text-red-300 text-sm flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Analysis failed:</span> {error}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Dynamic Content Frame (Loading or Results) */}
                <div className="min-h-[400px] flex flex-col">
                  <AnimatePresence mode="wait">
                
                {/* 1. Loading State */}
                {isLoading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 bg-zinc-900/30 rounded-2xl border border-zinc-800/80 p-12 flex flex-col items-center justify-center text-center gap-6"
                  >
                    {/* Animated Equalizer */}
                    <div className="flex items-end gap-1.5 h-16 mb-2">
                      <div className="w-2 bg-emerald-500 rounded-full animate-eq-bar-1 origin-bottom"></div>
                      <div className="w-2 bg-emerald-400 rounded-full animate-eq-bar-2 origin-bottom"></div>
                      <div className="w-2 bg-teal-500 rounded-full animate-eq-bar-3 origin-bottom"></div>
                      <div className="w-2 bg-teal-400 rounded-full animate-eq-bar-4 origin-bottom"></div>
                      <div className="w-2 bg-purple-500 rounded-full animate-eq-bar-5 origin-bottom"></div>
                      <div className="w-2 bg-emerald-500 rounded-full animate-eq-bar-6 origin-bottom"></div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-white">Analyzing Song Genre</h3>
                      <p className="text-emerald-400 font-mono text-sm max-w-sm h-12 flex items-center justify-center">
                        {LOADING_STEPS[loadingStep]}
                      </p>
                    </div>

                    <p className="text-xs text-zinc-500 font-mono max-w-xs">
                      We check Spotify catalog mappings, audio waveforms descriptions, and lyric topics to return rich context.
                    </p>
                  </motion.div>
                )}

                {/* 2. Success Result State */}
                {result && !isLoading && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Primary Identity Card */}
                    <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-xl relative overflow-hidden">
                      <div className="absolute -right-16 -top-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                        
                        {/* Title & Artist & Release */}
                        <div className="flex gap-4 items-start">
                          <div className="p-4 bg-zinc-800 rounded-xl shrink-0 text-emerald-400 relative">
                            <Disc className="w-10 h-10 animate-spin" style={{ animationDuration: '6s' }} />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-zinc-950 rounded-full"></div>
                          </div>
                          
                          <div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                              {result.songTitle}
                            </h2>
                            <p className="text-emerald-400 font-medium text-lg mt-1">
                              {result.artist}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs font-mono text-zinc-400">
                              <span className="bg-zinc-800 px-2 py-1 rounded">Released: {result.releaseYear}</span>
                              {result.key && result.key !== "Unknown" && (
                                <span className="bg-zinc-800 px-2 py-1 rounded">Key: {result.key}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Primary Genre Badges */}
                        <div className="flex flex-wrap gap-2 sm:self-start">
                          {result.genres.map((g, i) => (
                            <span 
                              key={i} 
                              className="px-4 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full text-sm font-semibold tracking-wide uppercase"
                            >
                              {g}
                            </span>
                          ))}
                        </div>

                      </div>

                      {/* Subgenre Cloud */}
                      <div className="mt-6 pt-6 border-t border-zinc-800/80">
                        <h4 className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-3">Granular Subgenres Identified</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.subgenres.map((sub, i) => (
                            <span 
                              key={i} 
                              className="px-3 py-1 bg-zinc-800/80 text-zinc-300 hover:text-white rounded-lg text-xs font-medium border border-zinc-700/50 transition-colors"
                            >
                              #{sub}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bento Musicology Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      {/* Tempo/BPM Card with Live Pulsating Lamp */}
                      <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800/80 flex flex-col justify-between gap-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Tempo</span>
                          <Gauge className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-white">
                              {result.bpm > 0 ? result.bpm : "--"}
                            </span>
                            <span className="text-xs font-mono text-zinc-500">BPM</span>
                          </div>
                          
                          {result.bpm > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`w-2.5 h-2.5 rounded-full transition-all duration-75 ${
                                bpmPulse ? "bg-emerald-400 scale-125 shadow-lg shadow-emerald-400/50" : "bg-emerald-950 scale-100"
                              }`}></span>
                              <span className="text-[11px] text-zinc-400 font-mono">Live Tempo Pulse</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Moods Card */}
                      <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800/80 flex flex-col justify-between gap-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Vibe & Mood</span>
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex flex-wrap gap-1.5">
                            {result.moods.map((mood, idx) => (
                              <span key={idx} className="bg-purple-950/40 text-purple-300 px-2 py-0.5 rounded text-xs border border-purple-900/40">
                                {mood}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Key Instruments Card */}
                      <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800/80 flex flex-col justify-between gap-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Dominant Sounds</span>
                          <Music className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex flex-wrap gap-1.5">
                            {result.instruments.map((inst, idx) => (
                              <span key={idx} className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-xs">
                                {inst}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Detailed Analysis Narrative */}
                    <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800/80">
                      <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider text-emerald-400 font-mono">Musicological Analysis</h3>
                      <p className="text-zinc-300 text-sm leading-relaxed font-sans">
                        {result.summary}
                      </p>
                    </div>

                    {/* Trivia Fun Fact Card */}
                    <div className="bg-purple-950/20 rounded-xl p-6 border border-purple-900/30 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 text-purple-500">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h3 className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-2 font-semibold">Behind The Tracks / Trivia</h3>
                      <p className="text-zinc-300 text-sm italic leading-relaxed">
                        "{result.funFact}"
                      </p>
                    </div>

                    {/* Related Songs in the Same Genre */}
                    {result.relatedSongs && result.relatedSongs.length > 0 && (
                      <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800/80">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                          <h3 className="text-sm font-semibold text-white uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-2">
                            <Music className="w-4 h-4 text-emerald-400 animate-pulse" />
                            Related Songs in the Same Genre
                          </h3>
                          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-850">
                            💡 CLICK TO ANALYZE ANY TRACK
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {result.relatedSongs.map((song, idx) => (
                            <div 
                              key={idx}
                              onClick={() => {
                                const fullQuery = `${song.title} - ${song.artist}`;
                                setQuery(fullQuery);
                                handleAnalyze(fullQuery);
                              }}
                              className="bg-zinc-950/80 hover:bg-zinc-900 p-4 rounded-xl border border-zinc-850 hover:border-emerald-500/35 transition-all cursor-pointer flex flex-col justify-between gap-2.5 group relative"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">
                                    {song.title}
                                  </h4>
                                  <p className="text-[10px] text-zinc-400 font-semibold truncate">
                                    {song.artist}
                                  </p>
                                </div>
                                <div className="p-1.5 bg-zinc-900 rounded-lg text-zinc-500 group-hover:text-emerald-400 group-hover:bg-emerald-950/30 transition-all shrink-0">
                                  <Play className="w-3 h-3 fill-current opacity-80" />
                                </div>
                              </div>

                              <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                                {song.whyRecommend}
                              </p>

                              <div className="flex flex-wrap gap-1 mt-1">
                                {song.genres.map((g, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-zinc-900/50 text-[9px] font-mono text-zinc-500 rounded border border-zinc-850">
                                    {g}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Similar Artists Recommendations */}
                    <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800/80">
                      <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider text-emerald-400 font-mono">If you like this, explore:</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {result.similarArtists.map((artist, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => {
                              setQuery(artist);
                              handleAnalyze(artist);
                            }}
                            className="bg-zinc-950 hover:bg-zinc-900 p-4 rounded-lg border border-zinc-800/60 transition-colors cursor-pointer flex items-center justify-between group"
                          >
                            <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">{artist}</span>
                            <Play className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0" />
                          </div>
                        ))}
                      </div>
                    </div>

                  </motion.div>
                )}

                {/* 3. Empty State (Welcome Prompt) */}
                {!result && !isLoading && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 bg-zinc-900/20 rounded-2xl border border-zinc-850 p-8 sm:p-12 flex flex-col items-center justify-center text-center gap-6"
                  >
                    <div className="p-4 bg-zinc-900 rounded-full border border-zinc-800 text-zinc-400">
                      <Compass className="w-8 h-8" />
                    </div>
                    <div className="space-y-2 max-w-sm">
                      <h3 className="text-base font-semibold text-white">Ready for Input</h3>
                      <p className="text-sm text-zinc-400">
                        Paste a Spotify/YouTube link, or type in a song name to discover its exact musical DNA.
                      </p>
                    </div>

                    <div className="w-full max-w-md pt-4 border-t border-zinc-900">
                      <h4 className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-3">How it works</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                        <div className="space-y-1">
                          <div className="text-xs font-mono text-emerald-400">01 // IDENTIFY</div>
                          <p className="text-[11px] text-zinc-500 leading-normal">Our backend parses queries or crawls URL metadata immediately.</p>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-mono text-teal-400">02 // CLASSIFY</div>
                          <p className="text-[11px] text-zinc-500 leading-normal">Gemini runs musicology lookups to map detailed music genres.</p>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-mono text-purple-400">03 // VISUALIZE</div>
                          <p className="text-[11px] text-zinc-500 leading-normal">Extract tempos, chords, matching BPM pulses, and recommendations.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </>
        ) : (
          <>
            {/* BPM & Theme Discovery Console */}
            <div className="bg-zinc-900/60 backdrop-blur-md rounded-2xl p-6 border border-zinc-800 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-purple-500"></div>
              
              <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <Compass className="w-5 h-5 text-emerald-400 animate-pulse" />
                BPM & Theme Explorer
              </h2>
              <p className="text-sm text-zinc-400 mb-5">
                Discover popular and influential real-world tracks matching a specific tempo range or thematic vibe.
              </p>

              <form onSubmit={handleDiscover} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* BPM Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">Target Tempo (BPM)</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-zinc-500">
                        <Gauge className="w-4 h-4" />
                      </span>
                      <input
                        type="number"
                        value={discoverBpm}
                        onChange={(e) => setDiscoverBpm(e.target.value)}
                        placeholder="e.g., 128, 90, 174"
                        min="40"
                        max="250"
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm font-mono"
                      />
                    </div>
                  </div>

                  {/* Theme / Vibe Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block">Theme / Mood / Genre</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-zinc-500">
                        <Volume2 className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={discoverTheme}
                        onChange={(e) => setDiscoverTheme(e.target.value)}
                        placeholder="e.g., Chill Lo-Fi, Late Night Drive, Workout Energy"
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Pre-configured templates */}
                <div className="space-y-2">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Quick Preset Moods & Tempos</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: "💤 Chill Lo-Fi Study", bpm: "80", theme: "Lo-Fi Hip Hop / Relaxing Study Vibes" },
                      { name: "🚗 Late Night Synthwave", bpm: "115", theme: "80s Retro Synthwave / Driving Night Vibes" },
                      { name: "🕺 Melodic House Club", bpm: "124", theme: "Deep Melodic House / Uplifting Sunset Dance" },
                      { name: "⚡ High Energy Workout", bpm: "135", theme: "Aggressive Electro House / Fitness Gym Energy" },
                      { name: "🌌 Liquid Drum & Bass", bpm: "174", theme: "Ambient Liquid Drum and Bass / Fast Chill" },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setDiscoverBpm(preset.bpm);
                          setDiscoverTheme(preset.theme);
                        }}
                        className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 rounded-lg text-xs border border-zinc-850 hover:border-emerald-500/20 transition-all cursor-pointer"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isDiscovering || (!discoverBpm && !discoverTheme.trim())}
                    className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isDiscovering ? "Searching Popular Hits..." : "Explore Popular Hits"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* Discover Error Message */}
            <AnimatePresence>
              {discoverError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-950/40 border border-red-900/60 p-4 rounded-xl text-red-300 text-sm flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Discovery failed:</span> {discoverError}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Discovery Results Frame */}
            <div className="min-h-[400px] flex flex-col">
              <AnimatePresence mode="wait">
                {isDiscovering && (
                  <motion.div
                    key="discovering"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 bg-zinc-900/30 rounded-2xl border border-zinc-800/80 p-12 flex flex-col items-center justify-center text-center gap-6"
                  >
                    {/* Animated Equalizer */}
                    <div className="flex items-end gap-1.5 h-16 mb-2">
                      <div className="w-2 bg-purple-500 rounded-full animate-eq-bar-1 origin-bottom"></div>
                      <div className="w-2 bg-emerald-400 rounded-full animate-eq-bar-2 origin-bottom"></div>
                      <div className="w-2 bg-teal-500 rounded-full animate-eq-bar-3 origin-bottom"></div>
                      <div className="w-2 bg-teal-400 rounded-full animate-eq-bar-4 origin-bottom"></div>
                      <div className="w-2 bg-emerald-500 rounded-full animate-eq-bar-5 origin-bottom"></div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-white">Exploring Popular Musicology</h3>
                      <p className="text-emerald-400 font-mono text-sm max-w-sm h-12 flex items-center justify-center">
                        Scanning music databases, radio plays, and chart mappings for exact matches... 🔎
                      </p>
                    </div>
                  </motion.div>
                )}

                {!isDiscovering && discoverResult.length > 0 && (
                  <motion.div
                    key="discover-results"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white uppercase tracking-wider text-emerald-400 font-mono">
                        Top Popular Matches ({discoverResult.length})
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {discoverResult.map((song, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            // Transition to Decoder tab and trigger analysis
                            const fullQuery = `${song.title} - ${song.artist}`;
                            setActiveTab("decode");
                            setQuery(fullQuery);
                            handleAnalyze(fullQuery);
                          }}
                          className="bg-zinc-900/40 hover:bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800 hover:border-emerald-500/40 transition-all cursor-pointer flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center group animate-fade-in"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                                {song.title}
                              </h4>
                              <span className="text-xs text-emerald-400 font-semibold bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-900">
                                {song.artist}
                              </span>
                            </div>
                            
                            <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl">
                              {song.description}
                            </p>

                            <p className="text-[11px] text-purple-300 font-medium font-mono">
                              🏆 {song.popularityInfo}
                            </p>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {song.genres.map((g, i) => (
                                <span key={i} className="px-2 py-0.5 bg-zinc-850 text-[10px] font-medium text-zinc-400 rounded">
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-end gap-3 self-stretch sm:self-center justify-between sm:justify-end border-t sm:border-t-0 border-zinc-850 pt-3 sm:pt-0 shrink-0">
                            <div className="text-right">
                              <div className="text-lg font-black text-white font-mono flex items-baseline justify-end gap-1">
                                {song.bpm} <span className="text-[10px] text-zinc-500 font-normal">BPM</span>
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono">
                                Key: {song.key}
                              </div>
                            </div>

                            <button className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 font-semibold text-xs rounded-lg border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-zinc-950 group-hover:border-transparent transition-all flex items-center gap-1 cursor-pointer">
                              Decode DNA
                              <Play className="w-3 h-3 fill-current" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {!isDiscovering && discoverResult.length === 0 && (
                  <motion.div
                    key="discover-empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 bg-zinc-900/20 rounded-2xl border border-zinc-850 p-12 flex flex-col items-center justify-center text-center gap-6"
                  >
                    <div className="p-4 bg-zinc-900 rounded-full border border-zinc-800 text-zinc-400">
                      <Compass className="w-8 h-8" />
                    </div>
                    <div className="space-y-2 max-w-sm">
                      <h3 className="text-base font-semibold text-white">Explore Popular Hits</h3>
                      <p className="text-sm text-zinc-400">
                        Enter a target BPM (e.g., 120), or type a music mood (e.g. Lo-Fi) to discover highly popular real-world matching records.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

      </section>

          {/* Sidebar / Quick Actions Panel */}
          <section className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Quick Demo Examples */}
            <div className="bg-zinc-900/40 backdrop-blur-md rounded-2xl p-5 border border-zinc-800/80">
              <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest mb-4 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Quick Test Tracks
              </h3>

              <div className="space-y-2">
                {QUICK_EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(ex.name);
                      handleAnalyze(ex.name);
                    }}
                    disabled={isLoading}
                    className="w-full text-left bg-zinc-950 hover:bg-zinc-900 p-3 rounded-xl border border-zinc-800/60 transition-colors group flex items-center justify-between disabled:opacity-50"
                  >
                    <div className="truncate pr-2">
                      <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors truncate">{ex.name}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{ex.desc}</p>
                    </div>
                    <Play className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-400 shrink-0 transform group-hover:scale-110 transition-transform" />
                  </button>
                ))}
              </div>
            </div>

            {/* Local History Panel */}
            <div className="bg-zinc-900/40 backdrop-blur-md rounded-2xl p-5 border border-zinc-800/80 flex flex-col min-h-[250px]">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-850 pb-3">
                <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                  <History className="w-4 h-4 text-emerald-400" />
                  Recent Decodes
                </h3>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
                    title="Clear history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <Clock className="w-6 h-6 text-zinc-700 mb-2" />
                  <p className="text-xs text-zinc-500">No searches yet.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setQuery(item.query);
                        handleAnalyze(item.query);
                      }}
                      className="group cursor-pointer bg-zinc-950/60 hover:bg-zinc-900/80 p-3 rounded-lg border border-zinc-850/60 transition-all flex items-center justify-between"
                    >
                      <div className="truncate pr-2">
                        <div className="text-xs font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors truncate">
                          {item.songTitle}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate mt-0.5">{item.artist}</div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {item.genres.slice(0, 2).map((g, idx) => (
                            <span key={idx} className="bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-650 group-hover:text-emerald-400 shrink-0 transform group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </section>

        </main>

        {/* Informative footer footer */}
        <footer className="mt-12 border-t border-zinc-900 pt-6 text-center text-xs text-zinc-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 GENRE DECODER CO. POWERED BY GOOGLE GEMINI 3.5 FLASH AND SEARCH GROUNDING.</p>
          <p className="text-[10px] text-zinc-600">DECODES ANY VALID MUSIC STRING, SPOTIFY OR YOUTUBE URL INSTANTLY.</p>
        </footer>

      </div>
    </div>
  );
}
