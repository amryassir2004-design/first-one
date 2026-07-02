import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client to prevent crashing on boot if key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please add it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// API endpoint to analyze a song or URL
app.post("/api/analyze", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      res.status(400).json({ error: "Please provide a valid song name or link." });
      return;
    }

    const ai = getGeminiClient();

    const prompt = `You are an expert musicologist. Analyze the following song query: "${query}".
The query can be a song name, artist and song, or a link (e.g. Spotify, YouTube, SoundCloud, Apple Music).
If it is a link, first identify what song the link points to.
Use your extensive built-in musicological knowledge to retrieve accurate genre classifications, subgenres, release details, key, BPM, and fun facts for this song.

Return a JSON object matching this schema:
- songTitle: The official name of the song.
- artist: The primary artist or band.
- genres: List of primary genres (e.g., Pop, Rock, Electronic, R&B, Hip Hop, etc.).
- subgenres: List of specific subgenres (e.g., Synthpop, Indie Rock, Deep House, Dream Pop, etc.).
- releaseYear: The release year (e.g., "1975" or "2023").
- bpm: Estimate beats per minute (BPM) as an integer. Use 0 if completely unknown.
- key: Estimated musical key (e.g., "A minor", "C Major"). Use "Unknown" if unknown.
- moods: Primary emotional vibes or moods (e.g., Melancholic, Energetic, Chill, Uplifting).
- instruments: Dominant instruments used (e.g., Synthesizer, Electric Guitar, Acoustic Piano, Brass).
- summary: A detailed 2-3 sentence analysis of why this song belongs to these genres and its key musicological features.
- similarArtists: Array of 3-4 artists with similar styles.
- funFact: A short, interesting trivia fact about the song's creation, history, or meaning.
- relatedSongs: Array of 4-5 actual real songs that belong to the exact same genre or subgenre. Each item must have:
  * title: The title of the related song.
  * artist: The artist of the related song.
  * genres: An array of 1-3 primary genres or subgenres for that song.
  * whyRecommend: A 1-sentence description of why it fits perfectly next to "${query}" under the same genre/style.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            songTitle: { type: Type.STRING },
            artist: { type: Type.STRING },
            genres: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            subgenres: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            releaseYear: { type: Type.STRING },
            bpm: { type: Type.INTEGER },
            key: { type: Type.STRING },
            moods: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            instruments: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            summary: { type: Type.STRING },
            similarArtists: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            funFact: { type: Type.STRING },
            relatedSongs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  artist: { type: Type.STRING },
                  genres: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  whyRecommend: { type: Type.STRING }
                },
                required: ["title", "artist", "genres", "whyRecommend"]
              }
            }
          },
          required: [
            "songTitle",
            "artist",
            "genres",
            "subgenres",
            "releaseYear",
            "bpm",
            "key",
            "moods",
            "instruments",
            "summary",
            "similarArtists",
            "funFact",
            "relatedSongs"
          ]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Failed to generate a response from Gemini.");
    }

    const data = JSON.parse(resultText.trim());
    res.json(data);
  } catch (error: any) {
    console.error("Analysis Error:", error);
    res.status(500).json({
      error: error.message || "An unexpected error occurred while analyzing the song."
    });
  }
});

// API endpoint to discover popular songs by BPM and/or Theme
app.post("/api/discover", async (req, res) => {
  try {
    const { bpm, theme } = req.body;

    if (!bpm && !theme) {
      res.status(400).json({ error: "Please provide either a BPM value or a Theme/Mood to search by." });
      return;
    }

    const ai = getGeminiClient();

    let queryDescription = "";
    if (bpm && theme) {
      queryDescription = `around ${bpm} BPM with a theme/mood/genre of "${theme}"`;
    } else if (bpm) {
      queryDescription = `specifically around ${bpm} BPM`;
    } else {
      queryDescription = `with a theme/mood/genre of "${theme}"`;
    }

    const prompt = `You are an elite music curator and researcher.
Use your extensive musicological database to find 5-6 extremely popular, real, well-known songs that match this criteria: ${queryDescription}.
Make sure the selected songs are real and widely recognized. Double check that their actual BPM matches your search parameter if a BPM is provided, or matches the theme/mood.

Return a JSON array of objects representing these songs. The schema is:
An array where each element contains:
- title: The official song title.
- artist: The main performing artist/band.
- bpm: The actual estimated BPM (integer).
- key: The key of the song (e.g. "G Major", "E minor").
- genres: List of 1-3 primary genres.
- popularityInfo: 1 brief sentence explaining why it's famous, a chart achievement, or its status (e.g., "Grammy-nominated hit with over 1B streams").
- description: 1-2 sentences on how this song represents the requested BPM/theme (e.g., "An absolute club anthem that perfectly maintains a 128 BPM pulse with soaring progressive house synths").

Return ONLY a JSON array containing these song objects. Do not wrap in a top-level object, return a direct JSON array.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
              bpm: { type: Type.INTEGER },
              key: { type: Type.STRING },
              genres: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              popularityInfo: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["title", "artist", "bpm", "key", "genres", "popularityInfo", "description"]
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Failed to generate a discovery response from Gemini.");
    }

    const data = JSON.parse(resultText.trim());
    res.json({ songs: data });
  } catch (error: any) {
    console.error("Discovery Error:", error);
    res.status(500).json({
      error: error.message || "An unexpected error occurred while searching for songs."
    });
  }
});

// Setup Vite Dev Server / Static Hosting
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
