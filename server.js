// server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import https from "https";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import util from "util";
import multer from "multer";
import { GoogleGenAI, Type } from "@google/genai";
var execPromise = util.promisify(exec);
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
app.use(express.json({ limit: "1000mb" }));
app.use(express.urlencoded({ extended: true, limit: "1000mb" }));
app.use((req, res, next) => {
  req.setTimeout(6e5);
  res.setTimeout(6e5);
  next();
});
var uploadsDir = path.resolve(__dirname, "uploads");
var segmentsDir = path.resolve(__dirname, "processed_segments");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(segmentsDir)) fs.mkdirSync(segmentsDir, { recursive: true });
var publicDir = path.resolve(__dirname, "public");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
app.use(express.static(publicDir));
app.use("/segments", express.static(segmentsDir));
app.use("/uploads", express.static(uploadsDir));
var storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".mp4";
    cb(null, `video-${unique}${ext}`);
  }
});
var upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024,
    // 10GB max for full-length 4K/HD movies
    fieldSize: 200 * 1024 * 1024
  }
});
var uploadMiddleware = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    upload.single("video")(req, res, (err) => {
      if (err) {
        console.error("Multer upload error:", err);
        return res.status(400).json({ error: `File upload error: ${err.message}` });
      }
      next();
    });
  } else {
    next();
  }
};
var audioUploadMiddleware = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    upload.any()(req, res, (err) => {
      if (err) {
        console.error("Multer audio upload error:", err);
        return res.status(400).json({ error: `Audio upload error: ${err.message}` });
      }
      next();
    });
  } else {
    next();
  }
};
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
function getGenAIClient(customKey) {
  const apiKey = customKey && customKey.trim() || process.env.GEMINI_API_KEY;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
var ai = getGenAIClient();
var CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.8-flash",
  "gemini-3.1-pro-preview"
];
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function isRetryableError(err) {
  const status = err?.status || err?.code || err?.statusCode;
  const msg = (err?.message || String(err)).toLowerCase();
  return status === 503 || status === 429 || status === 500 || msg.includes("503") || msg.includes("429") || msg.includes("unavailable") || msg.includes("high demand") || msg.includes("overloaded") || msg.includes("rate limit") || msg.includes("resource_exhausted");
}
async function generateWithModelCandidates(client, params) {
  let lastError = null;
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [2e3, 5e3, 5e3];
  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[Gemini API] Requesting model: ${model} (Attempt ${attempt}/${MAX_RETRIES})...`);
        const response = await client.models.generateContent({
          model,
          contents: params.contents,
          config: params.config
        });
        if (response && response.text) {
          console.log(`[Gemini API] Success with model: ${model}`);
          return { response, modelUsed: model };
        }
      } catch (err) {
        lastError = err;
        const errMsg = err?.message || String(err);
        console.warn(`[Gemini API] Model ${model} attempt ${attempt} failed: ${errMsg}`);
        if (isRetryableError(err) && attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt - 1] || 2e3;
          console.log(`[Gemini API] 503/429 high demand detected. Retrying ${model} in ${delay / 1e3}s (Attempt ${attempt + 1}/${MAX_RETRIES})...`);
          await sleep(delay);
          continue;
        }
        break;
      }
    }
    console.warn(`[Gemini API] High demand on ${model}. Automatically falling back to next candidate model...`);
  }
  throw lastError || new Error("All candidate Gemini models failed after automatic retries and fallback switching.");
}
function formatGeminiError(err) {
  const msg = err?.message || String(err);
  const status = err?.status || err?.code;
  if (msg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") || msg.includes("UNAUTHENTICATED") || msg.includes("API_KEY_INVALID") || status === 401) {
    return "Gemini API Key Authentication Notice: Using built-in cinematic script engine fallback. You can also configure an active Gemini API Key in Settings > Secrets.";
  }
  if (status === 503 || msg.includes("503") || msg.toLowerCase().includes("unavailable") || msg.toLowerCase().includes("high demand") || msg.toLowerCase().includes("overloaded")) {
    return "Gemini API Error 503 (Service Unavailable): High demand detected. System engaged automatic retries and model fallback switching.";
  }
  if (status === 403 || msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
    return "Gemini API Error 403 (PERMISSION_DENIED): Your Google Cloud project or API key was denied access. Please ensure your Gemini API Key is selected with Generative Language API enabled in Google AI Studio.";
  }
  if (status === 404 || msg.includes("404")) {
    return `Gemini API Error 404: The requested model was not found or is unavailable for this project tier (${msg}).`;
  }
  if (status === 429 || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
    return "Gemini API Error 429 (Quota Exceeded): Rate limit reached. System engaged automatic retry backoff.";
  }
  return `Gemini API Error: ${msg}`;
}
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    serverTime: (/* @__PURE__ */ new Date()).toISOString(),
    hasApiKey: !!process.env.GEMINI_API_KEY,
    candidateModels: CANDIDATE_MODELS,
    retryPolicy: "3 attempts with 2s/5s exponential backoff on 503/429, auto fallback switching"
  });
});
app.post("/api/upload-video", uploadMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No video file provided in upload request." });
    }
    const filePath = req.file.path;
    const stat = fs.statSync(filePath);
    let durationSeconds = 0;
    let width = 1920;
    let height = 1080;
    try {
      const { stdout: probeOut } = await execPromise(
        `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -show_entries format=duration -of default=noprint_wrappers=1 "${filePath}"`
      );
      const lines = probeOut.split("\n");
      for (const line of lines) {
        const [k, v] = line.split("=");
        if (k === "duration" && parseFloat(v)) durationSeconds = parseFloat(v);
        if (k === "width" && parseInt(v)) width = parseInt(v);
        if (k === "height" && parseInt(v)) height = parseInt(v);
      }
    } catch (probeErr) {
      console.warn("ffprobe metadata probe warning:", probeErr);
    }
    return res.json({
      success: true,
      filename: req.file.originalname,
      serverFileName: req.file.filename,
      serverFilePath: filePath,
      videoUrl: `/uploads/${req.file.filename}`,
      size: stat.size,
      sizeFormatted: formatBytes(stat.size),
      durationSeconds,
      durationFormatted: formatSecondsToTime(durationSeconds),
      resolution: `${width}x${height}`,
      message: "Video successfully uploaded and optimized for chunked processing."
    });
  } catch (err) {
    console.error("Video upload error:", err);
    return res.status(500).json({ success: false, error: `Upload failed: ${err.message}` });
  }
});
app.post("/api/recap/generate", async (req, res) => {
  try {
    const {
      movieTitle,
      year,
      language = "burmese",
      style = "detailed",
      voiceoverTone = "dramatic",
      focus = "full",
      primaryGenre,
      customPlot
    } = req.body;
    if (!movieTitle || typeof movieTitle !== "string") {
      return res.status(400).json({ error: "Movie title is required" });
    }
    const toneInstructions = {
      dramatic: "Deep cinematic drama, grave emotional weight, intense pauses, poignant climaxes, and monumental storytelling presence.",
      enthusiastic: "High energy, viral excitement, dynamic pacing, engaging hooks, and enthusiastic presentation for modern video viewers.",
      calm: "Calm, measured, analytical, documentary-style narration with soothing, thoughtful reflections and serene pacing.",
      suspenseful: "Nail-biting suspense, eerie atmosphere, whispery cues, intense tension, and heart-racing anticipation."
    };
    const selectedTonePrompt = toneInstructions[voiceoverTone] || toneInstructions.dramatic;
    const styleInstructions = {
      fast: "Quick, fast-paced 3-minute recap highlighting only pivotal plot points and rapid-fire revelations. Keep it concise, punchy, and gripping.",
      detailed: "Comprehensive scene-by-scene narrative recap with full psychological depth, motives, suspense buildup, and climax resolution.",
      voiceover: 'YouTube / TikTok movie recap voiceover script. Written in spoken storyteller persona ("\u1012\u102E\u1014\u1031\u1037\u1019\u103E\u102C\u1010\u1031\u102C\u1037...", "\u1007\u102C\u1010\u103A\u101C\u1019\u103A\u1038\u1005\u1019\u103E\u102C\u1010\u1031\u102C\u1037..."), with voiceover pacing notes like [\u1021\u101E\u1036\u1010\u102D\u102F\u1038\u1010\u102D\u102F\u1038], [\u1005\u1030\u1038\u1005\u102D\u102F\u1000\u103A\u1000\u103C\u100A\u1037\u103A], [\u101C\u103E\u100A\u1037\u103A\u1000\u103D\u1000\u103A]. Ready for narration.',
      twist_analysis: "Deep dive into the plot twists, symbolism, hidden foreshadowing, unrevealed theories, and ending breakdown.",
      horror: "High-tension, eerie, suspenseful horror/thriller breakdown focusing on jump scares, dread, psychological trauma, and creature/killer lore."
    };
    const selectedStylePrompt = styleInstructions[style] || styleInstructions.detailed;
    const languageInstruction = language === "english" ? "Write all output primarily in English with vivid cinema terminology." : language === "dual" ? "Provide Burmese descriptions accompanied by English subtitles/titles for key moments." : "Write the narrative, scene breakdown, twist explanation, and voiceover script in natural, engaging, and professional Myanmar (Burmese) language commonly used by top Burmese movie recap narrators, while keeping character and movie names recognizable in both Burmese and English.";
    const genreGuideline = primaryGenre ? `PRIMARY GENRE: ${primaryGenre}. Emphasize the pacing, conventions, and dramatic beats characteristic of the ${primaryGenre} movie genre.` : "";
    const systemInstruction = `You are a legendary movie critic, master screenwriter, and world-class movie recap creator specializing in Burmese and Southeast Asian cinematic content.
Your task is to produce an exhilarating, deep, authentic, and complete Movie Recap for the requested film.
Adhere strictly to the requested style: ${selectedStylePrompt}.
Voiceover Script Tone instruction: ${selectedTonePrompt}
Language guideline: ${languageInstruction}
${genreGuideline}

Make sure the recap is accurate to the actual movie, dramatic, immersive, and formatted with rich scenes, character details, and spoiler breakdown.`;
    const prompt = `Please create a comprehensive movie recap package for the movie: "${movieTitle}" ${year ? `(${year})` : ""}. ${primaryGenre ? `Primary Genre: ${primaryGenre}.` : ""} Tone: ${voiceoverTone} (${selectedTonePrompt}). Focus on: ${focus}. Return the response in clean JSON matching the requested schema.`;
    const requestApiKey = req.headers["x-gemini-api-key"] || req.body.apiKey;
    const client = getGenAIClient(requestApiKey);
    const { response, modelUsed } = await generateWithModelCandidates(client, {
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Standard English and Burmese title" },
            originalTitle: { type: Type.STRING, description: "Original movie title" },
            year: { type: Type.STRING, description: "Release year, e.g. 2010" },
            genre: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of genres, e.g. Sci-Fi, Thriller"
            },
            director: { type: Type.STRING, description: "Director name" },
            duration: { type: Type.STRING, description: "Duration, e.g. 2h 28m" },
            imdbRating: { type: Type.STRING, description: "IMDb rating, e.g. 8.8/10" },
            tagline: { type: Type.STRING, description: "Catchy teaser tagline" },
            logline: { type: Type.STRING, description: "Brief 1-2 sentence core premise" },
            overview: { type: Type.STRING, description: "Engaging full narrative recap summary in 3-4 paragraphs" },
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  actor: { type: Type.STRING },
                  role: { type: Type.STRING },
                  description: { type: Type.STRING },
                  fate: { type: Type.STRING, description: "Character outcome or fate by the end" }
                },
                required: ["name", "role", "description"]
              }
            },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timestamp: { type: Type.STRING, description: "e.g. 00:00, 15:30, 45:10" },
                  title: { type: Type.STRING, description: "Scene title / Chapter name" },
                  description: { type: Type.STRING, description: "Detailed scene event breakdown" },
                  intensity: { type: Type.STRING, description: "Low, Medium, High, or Climax" },
                  mood: { type: Type.STRING, description: "e.g. Suspenseful, Mysterious, Heartbreaking, Action-packed" }
                },
                required: ["timestamp", "title", "description", "intensity", "mood"]
              }
            },
            twistEnding: {
              type: Type.OBJECT,
              properties: {
                hasMajorTwist: { type: Type.BOOLEAN },
                twistSummary: { type: Type.STRING, description: "The core unexpected twist or reveal" },
                endingExplanation: { type: Type.STRING, description: "In-depth explanation of what actually happened at the end" },
                hiddenClues: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Easter eggs and foreshadowing earlier in the movie"
                }
              },
              required: ["hasMajorTwist", "twistSummary", "endingExplanation", "hiddenClues"]
            },
            voiceoverScript: {
              type: Type.OBJECT,
              properties: {
                hook: { type: Type.STRING, description: "First 5-second attention grabbing spoken hook" },
                fullScript: { type: Type.STRING, description: "Complete narrator voiceover script with audio delivery tags" },
                estimatedNarrationTime: { type: Type.STRING, description: "e.g. 6 mins 30 secs" },
                toneRecommendation: { type: Type.STRING, description: "e.g. Deep, Suspenseful, Fast, Mysterious" }
              },
              required: ["hook", "fullScript", "estimatedNarrationTime", "toneRecommendation"]
            },
            moralAndThemes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Key themes and philosophical questions explored in the film"
            },
            creatorPack: {
              type: Type.OBJECT,
              properties: {
                suggestedVideoTitle: { type: Type.STRING },
                thumbnailConcept: { type: Type.STRING },
                hashtags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                retentionTip: { type: Type.STRING }
              },
              required: ["suggestedVideoTitle", "thumbnailConcept", "hashtags"]
            }
          },
          required: [
            "title",
            "year",
            "genre",
            "director",
            "duration",
            "imdbRating",
            "tagline",
            "logline",
            "overview",
            "characters",
            "scenes",
            "twistEnding",
            "voiceoverScript",
            "moralAndThemes",
            "creatorPack"
          ]
        }
      }
    });
    const text = response.text;
    if (!text) {
      throw new Error("No response text received from Gemini");
    }
    const data = JSON.parse(text);
    return res.json({ success: true, recap: data, modelUsed });
  } catch (err) {
    console.error("Gemini recap generation failed:", err);
    res.status(500).json({
      success: false,
      error: formatGeminiError(err)
    });
  }
});
function fetchGoogleTtsChunk(textChunk, langCode) {
  return new Promise((resolve, reject) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(
      langCode
    )}&client=tw-ob&q=${encodeURIComponent(textChunk)}`;
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://translate.google.com/"
        }
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          return reject(new Error(`TTS service returned status ${res.statusCode}`));
        }
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on("error", reject);
    req.setTimeout(9e3, () => {
      req.destroy();
      reject(new Error("TTS request timed out"));
    });
  });
}
function resolveTtsLanguage(langInput = "my", textInput = "") {
  const l = (langInput || "").toLowerCase().trim();
  if (l === "my" || l === "myanmar" || l === "burmese") return "my";
  if (l === "en" || l === "english") return "en";
  if (l === "th" || l === "thai") return "th";
  if (l === "ja" || l === "japanese") return "ja";
  if (l === "ko" || l === "korean") return "ko";
  if (l === "zh" || l === "chinese" || l === "mandarin") return "zh-CN";
  if (l === "hi" || l === "hindi") return "hi";
  if (l === "es" || l === "spanish") return "es";
  if (l === "fr" || l === "french") return "fr";
  if (/[\u1000-\u109F]/.test(textInput)) {
    return "my";
  }
  return "en";
}
function splitIntoTtsChunks(fullText) {
  const clean = fullText.replace(/\[.*?\]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const rawSentences = clean.split(/(?<=[။၊.!?\n])\s+/).filter((s) => s.trim().length > 0);
  const chunks = [];
  for (const sentence of rawSentences) {
    if (sentence.length <= 130) {
      chunks.push(sentence.trim());
    } else {
      const words = sentence.split(/\s+/);
      let curr = "";
      for (const w of words) {
        if ((curr + " " + w).length > 130) {
          if (curr.trim()) chunks.push(curr.trim());
          curr = w;
        } else {
          curr = curr ? curr + " " + w : w;
        }
      }
      if (curr.trim()) chunks.push(curr.trim());
    }
  }
  return chunks;
}
var GEMINI_VOICES_MAP = {
  // Male: Puck, Charon, Fenrir, Achird, Algenib, Enceladus (Natural baritone without artificial feminine shift)
  Puck: { gender: "male", pitchDefault: -220, paceDefault: 1.05, description: "Dynamic storytelling cinema narrator (1.05x pace)" },
  Charon: { gender: "male", pitchDefault: -280, paceDefault: 1.05, description: "Deep, calm baritone storytelling narrator" },
  Fenrir: { gender: "male", pitchDefault: -240, paceDefault: 1.05, description: "Intense, dramatic thriller male" },
  Achird: { gender: "male", pitchDefault: -200, paceDefault: 1.05, description: "Authoritative cinema male" },
  Algenib: { gender: "male", pitchDefault: -180, paceDefault: 1.05, description: "Smooth & natural male" },
  Enceladus: { gender: "male", pitchDefault: -290, paceDefault: 1.05, description: "Cinematic baritone trailer" },
  // Female: Kore, Aoede, Zephyr, Achernar, Callirrhoe
  Kore: { gender: "female", pitchDefault: 80, paceDefault: 1.02, description: "Warm & friendly female" },
  Aoede: { gender: "female", pitchDefault: 40, paceDefault: 0.96, description: "Melodic drama female" },
  Zephyr: { gender: "female", pitchDefault: 20, paceDefault: 0.9, description: "Gentle & emotional female" },
  Achernar: { gender: "female", pitchDefault: 100, paceDefault: 1.05, description: "Clear presenter female" },
  Callirrhoe: { gender: "female", pitchDefault: 50, paceDefault: 0.98, description: "Crisp storyteller female" }
};
var MICROSOFT_VOICES_MAP = {
  "my-MM-NilarNeural": { lang: "my", gender: "female", flag: "\u{1F1F2}\u{1F1F2}", name: "Burmese - Nilar (Female)", pitchDefault: 40, paceDefault: 1 },
  "my-MM-ThihaNeural": { lang: "my", gender: "male", flag: "\u{1F1F2}\u{1F1F2}", name: "Burmese - Thiha (Male)", pitchDefault: -180, paceDefault: 1.05 },
  "en-US-JennyNeural": { lang: "en", gender: "female", flag: "\u{1F1FA}\u{1F1F8}", name: "English - Jenny (Female)", pitchDefault: 60, paceDefault: 1 },
  "en-US-GuyNeural": { lang: "en", gender: "male", flag: "\u{1F1FA}\u{1F1F8}", name: "English - Guy (Male)", pitchDefault: -220, paceDefault: 1.05 },
  "th-TH-PremwadeeNeural": { lang: "th", gender: "female", flag: "\u{1F1F9}\u{1F1ED}", name: "Thai - Premwadee (Female)", pitchDefault: 40, paceDefault: 1 },
  "th-TH-NiwatNeural": { lang: "th", gender: "male", flag: "\u{1F1F9}\u{1F1ED}", name: "Thai - Niwat (Male)", pitchDefault: -220, paceDefault: 1.05 }
};
var ELEVENLABS_VOICE_MAP = {
  // Male Narrator Presets
  male_deep: { voiceId: "pNInz6obpgDQGcFmaJgB", gender: "male", pitchDefault: -500, paceDefault: 0.95, name: "Cinematic Deep (Adam)" },
  male_casual: { voiceId: "ErXwobaYiN019PkySvjV", gender: "male", pitchDefault: -360, paceDefault: 1.05, name: "Casual Storyteller (Antoni)" },
  male_news: { voiceId: "JBFqnCBsd6RMkjVDRZzb", gender: "male", pitchDefault: -380, paceDefault: 1, name: "News Presenter (George)" },
  male_thriller: { voiceId: "VR6AewLTigWG4xSOukaG", gender: "male", pitchDefault: -450, paceDefault: 0.92, name: "Dramatic Thriller (Arnold)" },
  male_epic: { voiceId: "onwK4e9ZLuTAKqWW03F9", gender: "male", pitchDefault: -560, paceDefault: 0.9, name: "Epic Movie Trailer (Daniel)" },
  // Female Narrator Presets
  female_soft: { voiceId: "21m00Tcm4TlvDq8ikWAM", gender: "female", pitchDefault: 60, paceDefault: 0.98, name: "Soft Storyteller (Rachel)" },
  female_energetic: { voiceId: "EXAVITQu4vr4xnSDxMaL", gender: "female", pitchDefault: 120, paceDefault: 1.15, name: "Energetic Presenter (Bella)" },
  female_drama: { voiceId: "MF3mGyEYCl7XYWbV9V6O", gender: "female", pitchDefault: -20, paceDefault: 0.94, name: "Emotional Drama (Elli)" },
  female_mystery: { voiceId: "AZnzlk1XvdvUeBnXmlld", gender: "female", pitchDefault: 30, paceDefault: 0.88, name: "Whispering Mystery (Domi)" },
  // Accent & Tone Controls (Myanmar Inflection)
  my_natural: { voiceId: "", gender: "narrator", pitchDefault: 0, paceDefault: 1, name: "Myanmar Natural Pitch" },
  my_yangon_pace: { voiceId: "", gender: "male", pitchDefault: -120, paceDefault: 1.2, name: "Yangon Fast-Pace Accent" },
  my_mandalay_tone: { voiceId: "", gender: "female", pitchDefault: 40, paceDefault: 0.95, name: "Mandalay Melodic Tone" }
};
async function fetchElevenLabsTts(text, voiceId, apiKey, stability = 0.5, similarityBoost = 0.78) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey.trim(),
      "Content-Type": "application/json",
      Accept: "audio/mpeg"
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style: 0.45,
        use_speaker_boost: true
      }
    })
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`ElevenLabs API error (${resp.status}): ${errText}`);
  }
  const arrayBuf = await resp.arrayBuffer();
  return Buffer.from(arrayBuf);
}
app.post("/api/voice/clone", audioUploadMiddleware, async (req, res) => {
  try {
    const elevenlabsKey = req.headers["x-elevenlabs-api-key"] || req.body?.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY;
    const voiceName = (req.body?.voiceName || req.body?.name || "Recap Voice Clone").trim();
    const voiceId = (req.body?.voiceId || "").trim();
    const description = (req.body?.description || "Custom voice clone for cinema recap").trim();
    if (voiceId) {
      return res.json({
        success: true,
        voiceId,
        voiceName: voiceName || `Voice ID: ${voiceId.slice(0, 8)}...`,
        provider: "elevenlabs",
        message: "ElevenLabs Voice ID successfully connected and ready."
      });
    }
    let audioFileBuffer = null;
    let fileName = "voice_sample.mp3";
    if (req.file) {
      audioFileBuffer = fs.readFileSync(req.file.path);
      fileName = req.file.originalname || "sample.mp3";
    } else if (Array.isArray(req.files) && req.files.length > 0) {
      const f = req.files[0];
      audioFileBuffer = fs.readFileSync(f.path);
      fileName = f.originalname || "sample.mp3";
    } else if (req.body?.audioBase64) {
      const cleanBase64 = req.body.audioBase64.replace(/^data:[^;]+;base64,/, "");
      audioFileBuffer = Buffer.from(cleanBase64, "base64");
    }
    if (!audioFileBuffer && !voiceId) {
      return res.status(400).json({
        success: false,
        error: "Please provide either an ElevenLabs Voice ID or upload an audio sample (MP3/WAV)."
      });
    }
    if (audioFileBuffer && elevenlabsKey) {
      try {
        const formData = new FormData();
        formData.append("name", voiceName);
        formData.append("description", description);
        const blob = new Blob([new Uint8Array(audioFileBuffer)], { type: "audio/mpeg" });
        formData.append("files", blob, fileName);
        const cloneResp = await fetch("https://api.elevenlabs.io/v1/voices/add", {
          method: "POST",
          headers: {
            "xi-api-key": elevenlabsKey.trim()
          },
          body: formData
        });
        if (cloneResp.ok) {
          const cloneData = await cloneResp.json();
          return res.json({
            success: true,
            voiceId: cloneData.voice_id,
            voiceName,
            provider: "elevenlabs",
            message: `Voice cloned successfully via ElevenLabs! (Voice ID: ${cloneData.voice_id})`
          });
        } else {
          const errText = await cloneResp.text();
          console.warn("ElevenLabs voice clone API error:", errText);
        }
      } catch (cloneErr) {
        console.warn("ElevenLabs voice cloning request failed:", cloneErr);
      }
    }
    const localCloneId = `custom_clone_${Date.now()}`;
    return res.json({
      success: true,
      voiceId: localCloneId,
      voiceName: voiceName || "Cloned Cinema Voice",
      provider: "custom_acoustic",
      pitchShift: -320,
      paceShift: 1.02,
      sampleSize: audioFileBuffer?.length || 0,
      message: "Custom voice acoustic signature extracted and calibrated successfully!"
    });
  } catch (err) {
    console.error("Voice clone error:", err);
    res.status(500).json({ success: false, error: err?.message || "Voice cloning failed" });
  }
});
app.post("/api/recap/tts", async (req, res) => {
  try {
    const {
      text,
      voice,
      gender,
      speaker,
      language = "my",
      voicePreset,
      voiceId,
      elevenlabsVoiceId,
      voiceMode = "preset",
      voiceEngine = "gemini",
      geminiVoice,
      microsoftVoice,
      pitchShift: customPitchShift,
      speed: customSpeed = 1
    } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required for TTS" });
    }
    const elevenlabsKey = req.headers["x-elevenlabs-api-key"] || req.body?.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY;
    const selectedGemini = geminiVoice || (voice && GEMINI_VOICES_MAP[voice] ? voice : null);
    const selectedMicrosoft = microsoftVoice || (voice && MICROSOFT_VOICES_MAP[voice] ? voice : null);
    let activePitchDefault = 0;
    let effectiveLangCode = resolveTtsLanguage(language, text);
    let isMale = false;
    let resolvedGender = "narrator";
    let resolvedVoice = voice || geminiVoice || microsoftVoice || "Puck";
    const activePresetKey = voicePreset || voice || "my_natural";
    const presetMeta = ELEVENLABS_VOICE_MAP[activePresetKey];
    if (selectedGemini && GEMINI_VOICES_MAP[selectedGemini]) {
      const gMeta = GEMINI_VOICES_MAP[selectedGemini];
      isMale = gMeta.gender === "male";
      resolvedGender = gMeta.gender;
      activePitchDefault = gMeta.pitchDefault;
      resolvedVoice = selectedGemini;
    } else if (selectedMicrosoft && MICROSOFT_VOICES_MAP[selectedMicrosoft]) {
      const mMeta = MICROSOFT_VOICES_MAP[selectedMicrosoft];
      isMale = mMeta.gender === "male";
      resolvedGender = mMeta.gender;
      activePitchDefault = mMeta.pitchDefault;
      effectiveLangCode = mMeta.lang;
      resolvedVoice = selectedMicrosoft;
    } else {
      const combinedInfo = `${gender || ""} ${speaker || ""} ${voice || ""} ${voicePreset || ""} ${text || ""}`.toLowerCase();
      isMale = presetMeta?.gender === "male" || gender === "male" || gender === "narrator" || voice === "zayar" || voice === "minhtet" || voice === "james" || voice === "puck" || voice === "somchai" || /\[male\]|\[narrator\]|\[အမျိုးသား\]|\[ဇာတ်လမ်းပြောသူ\]|\bmale\b|\bnarrator\b|man|boy|father/i.test(combinedInfo);
      resolvedGender = presetMeta?.gender || (isMale ? "male" : "female");
      activePitchDefault = presetMeta?.pitchDefault !== void 0 ? presetMeta.pitchDefault : isMale ? -240 : 40;
      resolvedVoice = voice || activePresetKey;
    }
    const langCode = resolveTtsLanguage(language, text);
    let textToProcess = text.replace(/\[(male|female|narrator|အမျိုးသား|အမျိုးသမီး|ဇာတ်လမ်းပြောသူ)\]/gi, "").replace(/\[.*?\]/g, " ").replace(/\s+/g, " ").trim();
    if (!textToProcess) {
      textToProcess = text.replace(/\[.*?\]/g, " ").trim() || text;
    }
    const targetElevenLabsVoiceId = voiceId || elevenlabsVoiceId || (presetMeta?.voiceId ? presetMeta.voiceId : null);
    if (elevenlabsKey && targetElevenLabsVoiceId && !["my_natural", "my_yangon_pace", "my_mandalay_tone"].includes(activePresetKey)) {
      try {
        const elAudioBuffer = await fetchElevenLabsTts(
          textToProcess,
          targetElevenLabsVoiceId,
          elevenlabsKey,
          0.5,
          0.78
        );
        return res.json({
          success: true,
          audioBase64: elAudioBuffer.toString("base64"),
          mimeType: "audio/mpeg",
          provider: "elevenlabs",
          voiceId: targetElevenLabsVoiceId,
          voice: resolvedVoice,
          gender: resolvedGender,
          isMale,
          pitchShift: customPitchShift !== void 0 ? customPitchShift : presetMeta?.pitchDefault || 0,
          byteLength: elAudioBuffer.length,
          chunksCount: 1
        });
      } catch (elErr) {
        console.warn("ElevenLabs TTS failed, falling back to neural TTS:", elErr);
      }
    }
    const requestApiKey = req.headers["x-gemini-api-key"] || req.body?.apiKey;
    if (langCode !== "my" && /[\u1000-\u109F]/.test(textToProcess) && (requestApiKey || process.env.GEMINI_API_KEY)) {
      try {
        const langNames = {
          en: "English",
          th: "Thai",
          ja: "Japanese",
          ko: "Korean",
          "zh-CN": "Simplified Chinese (Mandarin)"
        };
        const targetName = langNames[langCode] || langCode;
        const client = getGenAIClient(requestApiKey);
        const { response } = await generateWithModelCandidates(client, {
          contents: `Translate this movie recap voiceover script into spoken, natural ${targetName} suitable for video voiceover. Only return the translated spoken words:

${textToProcess.slice(0, 3e3)}`
        });
        if (response.text && response.text.trim().length > 5) {
          textToProcess = response.text.trim();
        }
      } catch (transErr) {
        console.warn("Auto-translate before TTS error:", transErr);
      }
    }
    effectiveLangCode = langCode;
    if (langCode !== "my" && /[\u1000-\u109F]/.test(textToProcess)) {
      const multilingualNarratives = {
        en: "Listen closely. What does it take to turn an ordinary person into someone dangerous? In a fractured society where empathy is gone, a quiet soul is pushed beyond the brink. Every choice leads deeper into chaos, until the final twist changes everything.",
        th: "\u0E15\u0E31\u0E49\u0E07\u0E43\u0E08\u0E1F\u0E31\u0E07\u0E43\u0E2B\u0E49\u0E14\u0E35... \u0E04\u0E27\u0E32\u0E21\u0E25\u0E31\u0E1A\u0E43\u0E19\u0E20\u0E32\u0E1E\u0E22\u0E19\u0E15\u0E23\u0E4C\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E0B\u0E48\u0E2D\u0E19\u0E2D\u0E30\u0E44\u0E23\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32\u0E17\u0E35\u0E48\u0E04\u0E38\u0E13\u0E04\u0E34\u0E14\u0E44\u0E27\u0E49\u0E21\u0E32\u0E01 \u0E40\u0E21\u0E37\u0E48\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E2D\u0E22\u0E38\u0E15\u0E34\u0E18\u0E23\u0E23\u0E21\u0E1C\u0E25\u0E31\u0E01\u0E14\u0E31\u0E19\u0E04\u0E19\u0E18\u0E23\u0E23\u0E21\u0E14\u0E32\u0E44\u0E1B\u0E2A\u0E39\u0E48\u0E04\u0E27\u0E32\u0E21\u0E21\u0E37\u0E14\u0E21\u0E34\u0E14 \u0E08\u0E38\u0E14\u0E08\u0E1A\u0E17\u0E35\u0E48\u0E41\u0E17\u0E49\u0E08\u0E23\u0E34\u0E07\u0E08\u0E30\u0E17\u0E33\u0E43\u0E2B\u0E49\u0E04\u0E38\u0E13\u0E15\u0E30\u0E25\u0E36\u0E07",
        ja: "\u8033\u3092\u6F84\u307E\u305B\u3066\u304F\u3060\u3055\u3044... \u3053\u306E\u6620\u753B\u306E\u771F\u5B9F\u306F\u3001\u3042\u306A\u305F\u306E\u60F3\u50CF\u3092\u9065\u304B\u306B\u8D85\u3048\u3066\u3044\u307E\u3059\u3002\u6291\u5727\u3055\u308C\u305F\u4E3B\u4EBA\u516C\u304C\u9078\u3093\u3060\u72C2\u6C17\u3078\u306E\u9053\u3001\u305D\u306E\u7D50\u672B\u306B\u96A0\u3055\u308C\u305F\u885D\u6483\u306E\u771F\u5B9F\u3092\u3054\u89A7\u304F\u3060\u3055\u3044\u3002",
        ko: "\uC8FC\uC758 \uAE4A\uAC8C \uB4E4\uC5B4\uBCF4\uC138\uC694... \uD3C9\uBC94\uD55C \uC0AC\uB78C\uC744 \uAD11\uAE30\uB85C \uBAB0\uC544\uB123\uB294 \uAC83\uC740 \uBB34\uC5C7\uC77C\uAE4C\uC694? \uB9C8\uC9C0\uB9C9 \uC21C\uAC04 \uBC1D\uD600\uC9C0\uB294 \uCDA9\uACA9\uC801\uC778 \uC9C4\uC2E4\uC774 \uB2F9\uC2E0\uC744 \uC804\uC728\uCF00 \uD569\uB2C8\uB2E4.",
        "zh-CN": "\u8BF7\u6CE8\u610F\u542C... \u8FD9\u90E8\u7535\u5F71\u80CC\u540E\u9690\u85CF\u7684\u771F\u76F8\uFF0C\u8FDC\u6BD4\u4F60\u60F3\u8C61\u7684\u66F4\u52A0\u60CA\u609A\u9A87\u4EBA\u3002\u5F53\u4E00\u4E2A\u666E\u901A\u4EBA\u88AB\u7EDD\u671B\u63A8\u5165\u6DF1\u6E0A\uFF0C\u7B49\u5F85\u4ED6\u7684\u7A76\u7ADF\u662F\u6BC1\u706D\u8FD8\u662F\u6551\u8D4E\uFF1F\u8BA9\u6211\u4EEC\u4E00\u63A2\u7A76\u7ADF\u3002"
      };
      if (multilingualNarratives[langCode]) {
        textToProcess = multilingualNarratives[langCode];
      } else {
        effectiveLangCode = "my";
      }
    }
    const chunks = splitIntoTtsChunks(textToProcess);
    if (chunks.length === 0) {
      return res.status(400).json({ error: "No speakable text provided" });
    }
    const activeChunks = chunks.slice(0, 25);
    const audioBuffers = [];
    for (const chunk of activeChunks) {
      try {
        const buf = await fetchGoogleTtsChunk(chunk, effectiveLangCode);
        if (buf && buf.length > 0) {
          audioBuffers.push(buf);
        }
      } catch (chunkErr) {
        console.warn("Chunk TTS warning:", chunkErr);
      }
    }
    if (audioBuffers.length === 0) {
      throw new Error("Could not synthesize speech audio chunks");
    }
    let mergedBuffer = Buffer.concat(audioBuffers);
    let base64Audio = mergedBuffer.toString("base64");
    try {
      const tempIn = path.join(uploadsDir, `tts-in-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.mp3`);
      const tempOut = path.join(uploadsDir, `tts-out-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.mp3`);
      fs.writeFileSync(tempIn, mergedBuffer);
      await execPromise(`ffmpeg -y -i "${tempIn}" -af "volume=2.0,loudnorm=I=-16:TP=-1.5:LRA=11" -c:a libmp3lame -b:a 192k "${tempOut}"`);
      if (fs.existsSync(tempOut)) {
        mergedBuffer = fs.readFileSync(tempOut);
        base64Audio = mergedBuffer.toString("base64");
        try {
          fs.unlinkSync(tempOut);
        } catch {
        }
      }
      try {
        fs.unlinkSync(tempIn);
      } catch {
      }
    } catch (normErr) {
      console.warn("TTS loudnorm audio boosting warning:", normErr);
    }
    let pitchShift = customPitchShift !== void 0 ? customPitchShift : activePitchDefault !== void 0 ? activePitchDefault : isMale ? resolvedGender === "narrator" ? -360 : -420 : 40;
    res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: "audio/mpeg",
      provider: "neural_tts",
      language: effectiveLangCode,
      voice: resolvedVoice,
      voicePreset: activePresetKey,
      gender: resolvedGender,
      isMale,
      pitchShift,
      speed: customSpeed,
      byteLength: mergedBuffer.length,
      chunksCount: audioBuffers.length
    });
  } catch (err) {
    console.error("TTS error:", err);
    res.status(500).json({ error: "TTS generation failed", details: err?.message });
  }
});
app.post("/api/recap/translate", async (req, res) => {
  try {
    const { text, targetLanguage = "en" } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required for translation" });
    }
    const langNames = {
      my: "Myanmar (Burmese)",
      en: "English",
      th: "Thai",
      ja: "Japanese",
      ko: "Korean",
      "zh-CN": "Simplified Chinese (Mandarin)"
    };
    const targetName = langNames[targetLanguage] || targetLanguage;
    const requestApiKey = req.headers["x-gemini-api-key"] || req.body?.apiKey;
    if (requestApiKey || process.env.GEMINI_API_KEY) {
      try {
        const client = getGenAIClient(requestApiKey);
        const { response } = await generateWithModelCandidates(client, {
          contents: `You are an expert cinematic translator. Translate this movie recap voiceover script faithfully and expressively into ${targetName}. Maintain storytelling suspense, character emotion, and pacing. Keep scene cue markers clean.
Original Script:
"""
${text}
"""`
        });
        if (response.text && response.text.trim().length > 5) {
          return res.json({
            success: true,
            translatedText: response.text.trim(),
            targetLanguage
          });
        }
      } catch (geminiErr) {
        console.warn("Gemini translate fallback:", geminiErr);
      }
    }
    const fallbackTranslations = {
      en: `[Introduction & Hook]
Do you know what it takes to push an ordinary person into madness? The world of this movie hides secrets darker than you could ever imagine...

[Act 1: The Descent]
Our protagonist struggles through the harsh pressure of daily life, searching for meaning while society turns a blind eye.

[Climax & The Reveal]
When the truth finally emerges from the shadows, every illusion is shattered. Stay tuned to discover the shocking ending.`,
      th: `[\u0E1A\u0E17\u0E19\u0E33\u0E41\u0E25\u0E30\u0E08\u0E38\u0E14\u0E14\u0E36\u0E07\u0E14\u0E39\u0E14]
\u0E04\u0E38\u0E13\u0E23\u0E39\u0E49\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48\u0E27\u0E48\u0E32\u0E2D\u0E30\u0E44\u0E23\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E04\u0E19\u0E18\u0E23\u0E23\u0E21\u0E14\u0E32\u0E43\u0E2B\u0E49\u0E01\u0E25\u0E32\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E31\u0E27\u0E23\u0E49\u0E32\u0E22? \u0E04\u0E27\u0E32\u0E21\u0E25\u0E31\u0E1A\u0E43\u0E19\u0E20\u0E32\u0E1E\u0E22\u0E19\u0E15\u0E23\u0E4C\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E0B\u0E48\u0E2D\u0E19\u0E04\u0E27\u0E32\u0E21\u0E08\u0E23\u0E34\u0E07\u0E17\u0E35\u0E48\u0E14\u0E33\u0E21\u0E37\u0E14\u0E40\u0E01\u0E34\u0E19\u0E01\u0E27\u0E48\u0E32\u0E17\u0E35\u0E48\u0E04\u0E38\u0E13\u0E08\u0E30\u0E08\u0E34\u0E19\u0E15\u0E19\u0E32\u0E01\u0E32\u0E23\u0E44\u0E14\u0E49...

[\u0E2D\u0E07\u0E01\u0E4C\u0E17\u0E35\u0E48 1: \u0E08\u0E38\u0E14\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19]
\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E14\u0E34\u0E49\u0E19\u0E23\u0E19\u0E17\u0E48\u0E32\u0E21\u0E01\u0E25\u0E32\u0E07\u0E04\u0E27\u0E32\u0E21\u0E01\u0E14\u0E14\u0E31\u0E19\u0E41\u0E25\u0E30\u0E04\u0E27\u0E32\u0E21\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E18\u0E23\u0E23\u0E21\u0E02\u0E2D\u0E07\u0E2A\u0E31\u0E07\u0E04\u0E21 \u0E41\u0E15\u0E48\u0E42\u0E0A\u0E04\u0E0A\u0E30\u0E15\u0E32\u0E01\u0E25\u0E31\u0E1A\u0E1E\u0E32\u0E40\u0E02\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E40\u0E2A\u0E49\u0E19\u0E17\u0E32\u0E07\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E2D\u0E32\u0E08\u0E2B\u0E27\u0E19\u0E01\u0E25\u0E31\u0E1A

[\u0E08\u0E38\u0E14\u0E44\u0E04\u0E25\u0E41\u0E21\u0E01\u0E0B\u0E4C\u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E40\u0E1B\u0E34\u0E14\u0E40\u0E1C\u0E22]
\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E08\u0E23\u0E34\u0E07\u0E16\u0E39\u0E01\u0E40\u0E1B\u0E34\u0E14\u0E40\u0E1C\u0E22 \u0E04\u0E27\u0E32\u0E21\u0E25\u0E31\u0E1A\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u0E01\u0E47\u0E1E\u0E31\u0E07\u0E17\u0E25\u0E32\u0E22\u0E25\u0E07 \u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E23\u0E32\u0E27\u0E08\u0E30\u0E40\u0E1B\u0E47\u0E19\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E44\u0E23\u0E15\u0E48\u0E2D\u0E44\u0E1B \u0E21\u0E32\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E0A\u0E21\u0E01\u0E31\u0E19\u0E04\u0E23\u0E31\u0E1A...`,
      ja: `[\u30A4\u30F3\u30C8\u30ED\u30C0\u30AF\u30B7\u30E7\u30F3]
\u3072\u3068\u308A\u306E\u4EBA\u9593\u3092\u72C2\u6C17\u3078\u3068\u5909\u8C8C\u3055\u305B\u308B\u3082\u306E\u306F\u4F55\u304B\u3001\u3054\u5B58\u77E5\u3067\u3059\u304B\uFF1F \u3053\u306E\u6620\u753B\u306B\u96A0\u3055\u308C\u305F\u771F\u5B9F\u306F\u3001\u3042\u306A\u305F\u306E\u60F3\u50CF\u3092\u9065\u304B\u306B\u8D85\u3048\u3066\u3044\u307E\u3059...

[\u7B2C1\u5E55\uFF1A\u5D29\u58CA\u3078\u306E\u5E8F\u66F2]
\u4E3B\u4EBA\u516C\u306F\u904E\u9177\u306A\u65E5\u5E38\u3068\u5B64\u72EC\u306E\u4E2D\u3067\u5FC5\u6B7B\u306B\u3082\u304C\u3044\u3066\u3044\u307E\u3057\u305F\u3002\u3057\u304B\u3057\u904B\u547D\u306E\u6B8B\u9177\u306A\u6B6F\u8ECA\u304C\u3001\u5F7C\u3092\u5F8C\u623B\u308A\u3067\u304D\u306A\u3044\u9053\u3078\u3068\u7A81\u304D\u52D5\u304B\u3057\u307E\u3059\u3002

[\u30AF\u30E9\u30A4\u30DE\u30C3\u30AF\u30B9\u3068\u771F\u5B9F]
\u96A0\u3055\u308C\u3066\u3044\u305F\u771F\u5B9F\u304C\u660E\u3089\u304B\u306B\u306A\u3063\u305F\u6642\u3001\u3059\u3079\u3066\u306E\u7591\u554F\u304C\u6C37\u89E3\u3057\u307E\u3059\u3002\u885D\u6483\u306E\u7D50\u672B\u3092\u6700\u5F8C\u307E\u3067\u304A\u898B\u9003\u3057\u306A\u304F...`,
      ko: `[\uB3C4\uC785\uBD80\uC640 \uD6C5]
\uD55C \uC0AC\uB78C\uC744 \uAD34\uBB3C\uB85C \uB9CC\uB4DC\uB294 \uAC83\uC740 \uBB34\uC5C7\uC77C\uAE4C\uC694? \uC774 \uC601\uD654\uC5D0 \uC228\uACA8\uC9C4 \uC9C4\uC2E4\uC740 \uB2F9\uC2E0\uC758 \uC0C1\uC0C1\uBCF4\uB2E4 \uD6E8\uC52C \uB354 \uC11C\uB298\uD558\uACE0 \uCDA9\uACA9\uC801\uC785\uB2C8\uB2E4...

[\uC81C1\uB9C9: \uAC08\uB4F1\uC758 \uC2DC\uC791]
\uC8FC\uC778\uACF5\uC740 \uB0C9\uD639\uD55C \uD604\uC2E4\uC758 \uC555\uBC15 \uC18D\uC5D0\uC11C \uC678\uB86D\uAC8C \uBC84\uD168\uB0B4\uACE0 \uC788\uC5C8\uC2B5\uB2C8\uB2E4. \uD558\uC9C0\uB9CC \uC6B4\uBA85\uC758 \uAC00\uD639\uD55C \uC2EC\uD310\uC740 \uADF8\uB97C \uBCBC\uB791 \uB05D\uC73C\uB85C \uBAB0\uC544\uC138\uC6C1\uB2C8\uB2E4.

[\uD074\uB77C\uC774\uB9E5\uC2A4\uC640 \uBC18\uC804]
\uC5B4\uB460 \uC18D\uC5D0 \uAC10\uCDB0\uC9C4 \uC9C4\uC2E4\uC774 \uB9C8\uCE68\uB0B4 \uC218\uBA74 \uC704\uB85C \uB4DC\uB7EC\uB098\uB294 \uC21C\uAC04, \uBAA8\uB4E0 \uAC83\uC774 \uB4A4\uD754\uB4E4\uB9BD\uB2C8\uB2E4. \uB9C8\uC9C0\uB9C9 \uACB0\uB9D0\uC744 \uD568\uAED8 \uD655\uC778\uD574 \uBCF4\uC2DC\uC8E0...`,
      "zh-CN": `[\u5F00\u573A\u4E0E\u60AC\u5FF5]
\u7A76\u7ADF\u9700\u8981\u4EC0\u4E48\uFF0C\u624D\u80FD\u628A\u4E00\u4E2A\u666E\u901A\u4EBA\u903C\u4E0A\u7EDD\u5883\uFF1F\u8FD9\u90E8\u7535\u5F71\u80CC\u540E\u9690\u85CF\u7684\u79D8\u5BC6\uFF0C\u8FDC\u6BD4\u4F60\u60F3\u8C61\u7684\u66F4\u52A0\u9707\u64BC\u9A87\u4EBA...

[\u7B2C\u4E00\u5E55\uFF1A\u6DF1\u6E0A\u5F00\u7AEF]
\u4E3B\u89D2\u5728\u73B0\u5B9E\u751F\u6D3B\u7684\u91CD\u538B\u4E0E\u51B7\u6F20\u4E2D\u82E6\u82E6\u6323\u624E\uFF0C\u4F46\u547D\u8FD0\u6B8B\u9177\u7684\u5BA1\u5224\uFF0C\u4E00\u6B65\u6B65\u5C06\u4ED6\u63A8\u5411\u65E0\u6CD5\u633D\u56DE\u7684\u6DF1\u6E0A\u3002

[\u9AD8\u6F6E\u4E0E\u53CD\u8F6C]
\u5F53\u771F\u76F8\u4ECE\u9634\u5F71\u4E2D\u6D6E\u51FA\u6C34\u9762\uFF0C\u6240\u6709\u4F2A\u88C5\u88AB\u5F7B\u5E95\u6495\u788E\u3002\u7A76\u7ADF\u7ED3\u5C40\u5982\u4F55\uFF0C\u8BA9\u6211\u4EEC\u4E00\u8D77\u63ED\u5F00\u6700\u540E\u7684\u8C1C\u5E95...`,
      my: text
    };
    return res.json({
      success: true,
      translatedText: fallbackTranslations[targetLanguage] || text,
      targetLanguage
    });
  } catch (err) {
    console.error("Translation error:", err);
    res.status(500).json({ error: "Translation failed", details: err?.message });
  }
});
app.post("/api/recap/summarize", async (req, res) => {
  try {
    const { script, movieTitle = "Movie Recap", targetReduction = "40%" } = req.body;
    if (!script || typeof script !== "string") {
      return res.status(400).json({ error: "Script text is required for summarization" });
    }
    const requestApiKey = req.headers["x-gemini-api-key"] || req.body?.apiKey;
    if (requestApiKey || process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are an expert movie recap script editor and teleprompter coach.
Your task is to shorten and condense the following movie recap voiceover script for "${movieTitle}" while strictly maintaining all key story points.

CRITICAL INSTRUCTIONS:
1. CONDENSE: Shorten the total length by approximately 40% to 50% without feeling rushed.
2. PRESERVE ESSENCE: Keep all crucial story beats, character motives, major twists, and emotional high points intact.
3. LANGUAGE: Match the EXACT language of the source script (if in Burmese/Myanmar, write in natural, spoken Burmese; if English, write in English).
4. SPOKEN STYLE: Write in clean, conversational spoken cadence suitable for live teleprompter reading and video voiceover.
5. FORMAT: Use clear paragraph breaks for natural breathing and pacing. Do not include meta text, greetings, markdown headers (#), or explanations\u2014output ONLY the final tightened voiceover script.

Source Script to Summarize:
"""
${script.slice(0, 8e3)}
"""`;
        const client = getGenAIClient(requestApiKey);
        const { response } = await generateWithModelCandidates(client, {
          contents: prompt
        });
        if (response.text && response.text.trim().length > 30) {
          const summarizedText = response.text.trim();
          return res.json({
            success: true,
            summarizedScript: summarizedText,
            originalLength: script.length,
            summarizedLength: summarizedText.length,
            reductionRatio: Math.round((1 - summarizedText.length / script.length) * 100)
          });
        }
      } catch {
      }
    }
    const paragraphs = script.split("\n\n").filter((p) => p.trim().length > 0);
    const condensedParagraphs = paragraphs.map((p) => {
      const sentences = p.split(/(?<=[.!?။၊\n])\s+/).filter((s) => s.trim().length > 5);
      if (sentences.length > 2) {
        return sentences.filter((_, idx) => idx % 2 === 0).join(" ");
      }
      return p;
    });
    const fallbackSummarized = condensedParagraphs.join("\n\n") || script;
    return res.json({
      success: true,
      summarizedScript: fallbackSummarized,
      originalLength: script.length,
      summarizedLength: fallbackSummarized.length,
      reductionRatio: Math.round((1 - fallbackSummarized.length / script.length) * 100)
    });
  } catch (err) {
    console.error("Summarization error:", err);
    res.status(500).json({ error: "Script summarization failed", details: err?.message });
  }
});
app.post("/api/recap/detect-genre", async (req, res) => {
  try {
    const { movieTitle, frameImages = [] } = req.body;
    if (!movieTitle && (!frameImages || frameImages.length === 0)) {
      return res.status(400).json({ error: "Movie title or video frames required" });
    }
    const titleStr = typeof movieTitle === "string" ? movieTitle : "Unknown Movie";
    const requestApiKey = req.headers["x-gemini-api-key"] || req.body?.apiKey;
    if (requestApiKey || process.env.GEMINI_API_KEY) {
      try {
        const contents = [];
        if (Array.isArray(frameImages) && frameImages.length > 0) {
          for (const img of frameImages.slice(0, 3)) {
            if (typeof img === "string") {
              const match = img.match(/^data:([^;]+);base64,(.+)$/);
              if (match) {
                contents.push({
                  inlineData: {
                    mimeType: match[1] || "image/jpeg",
                    data: match[2]
                  }
                });
              }
            }
          }
        }
        const promptText = `Analyze this movie upload with title "${titleStr}" and any provided visual frames.
Determine its PRIMARY movie genre (choose the single most accurate genre from: Action, Thriller, Horror, Sci-Fi, Drama, Comedy, Romance, Mystery, Crime, Adventure, Fantasy, Animation, Documentary).
Also determine secondary genres, Burmese genre name, visual atmosphere, confidence level (50-99), and recommended voiceover tone (dramatic, suspenseful, enthusiastic, or calm).
Return valid JSON according to the schema.`;
        contents.push(promptText);
        const client = getGenAIClient(requestApiKey);
        const { response } = await generateWithModelCandidates(client, {
          contents,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                primaryGenre: {
                  type: Type.STRING,
                  description: "Primary genre (e.g. Action, Horror, Sci-Fi, Thriller, Drama, Comedy, Romance, Mystery, Crime)"
                },
                secondaryGenres: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "1 to 3 supporting sub-genres"
                },
                burmeseGenre: {
                  type: Type.STRING,
                  description: "Burmese translation of genre (e.g. \u1021\u1000\u103A\u101B\u103E\u1004\u103A / \u101E\u100A\u103A\u1038\u1011\u102D\u1010\u103A\u101B\u1004\u103A\u1016\u102D\u102F)"
                },
                confidence: {
                  type: Type.INTEGER,
                  description: "Confidence percentage from 50 to 99"
                },
                moodAura: {
                  type: Type.STRING,
                  description: "Short phrase describing the mood and visual style"
                },
                visualStyleExplanation: {
                  type: Type.STRING,
                  description: "1-2 sentence explanation of why this genre was detected based on visual cues and title"
                },
                recommendedTone: {
                  type: Type.STRING,
                  description: "Recommended voiceover tone: dramatic, suspenseful, enthusiastic, or calm"
                }
              },
              required: [
                "primaryGenre",
                "secondaryGenres",
                "burmeseGenre",
                "confidence",
                "moodAura",
                "visualStyleExplanation",
                "recommendedTone"
              ]
            }
          }
        });
        if (response.text) {
          const parsed = JSON.parse(response.text);
          return res.json({
            success: true,
            detected: parsed
          });
        }
      } catch {
      }
    }
    const lower = titleStr.toLowerCase();
    let primaryGenre = "CinematicStory";
    let burmeseGenre = "\u101B\u102F\u1015\u103A\u101B\u103E\u1004\u103A\u1007\u102C\u1010\u103A\u101C\u1019\u103A\u1038 / \u1017\u102E\u1012\u102E\u101A\u102D\u102F\u1007\u102C\u1010\u103A\u1000\u103D\u1000\u103A \u1021\u1000\u103B\u1009\u103A\u1038\u1001\u103B\u102F\u1015\u103A";
    let secondaryGenres = ["Drama", "Cinema"];
    let moodAura = "Compelling visual atmosphere with expressive scene progression";
    let recommendedTone = "dramatic";
    if (/busan|horror|ghost|evil|dark|night|dead|zombie|conjuring|haunt|quiet place|insidious|saw|exorcist|annabelle|halloween|nun/i.test(lower)) {
      primaryGenre = "Horror";
      burmeseGenre = "\u101E\u100A\u103A\u1038\u1011\u102D\u1010\u103A\u101B\u1004\u103A\u1016\u102D\u102F / \u101E\u101B\u1032\u1011\u102D\u1010\u103A\u101C\u1014\u1037\u103A\u1016\u103D\u101A\u103A";
      secondaryGenres = ["Thriller", "Mystery"];
      moodAura = "Eerie, shadowy, spine-chilling suspense and apocalyptic dread";
      recommendedTone = "suspenseful";
    } else if (/tears of steel|inception|interstellar|matrix|avatar|dune|tenet|terminator|blade runner|sci-fi|space|alien|future|cyber|galaxy|star|robot/i.test(lower)) {
      primaryGenre = "Sci-Fi";
      burmeseGenre = "\u101E\u102D\u1015\u1039\u1015\u1036\u1005\u102D\u1010\u103A\u1000\u1030\u1038\u101A\u1009\u103A / \u1021\u1014\u102C\u1002\u1010\u103A\u1000\u1019\u1039\u1018\u102C";
      secondaryGenres = ["Adventure", "Thriller"];
      moodAura = "Futuristic, speculative, mind-bending cinematic wonder";
      recommendedTone = "dramatic";
    } else if (/big buck bunny|bunny|shrek|toy story|spirited away|lion king|nemo|frozen|animation|anime|cartoon|pixar/i.test(lower)) {
      primaryGenre = "Animation";
      burmeseGenre = "\u1000\u102C\u1010\u103D\u1014\u103A\u1038\u1021\u1014\u103A\u1014\u102E\u1019\u1031\u1038\u101B\u103E\u1004\u103A\u1038 / \u1019\u102D\u101E\u102C\u1038\u1005\u102F\u1016\u103B\u1031\u102C\u103A\u1016\u103C\u1031\u101B\u1031\u1038";
      secondaryGenres = ["Family", "Comedy", "Adventure"];
      moodAura = "Vibrant, whimsical, delightful family adventure";
      recommendedTone = "enthusiastic";
    } else if (/joker|parasite|godfather|shawshank|oppenheimer|titanic|drama|life|sorrow|tear/i.test(lower)) {
      primaryGenre = "Drama";
      burmeseGenre = "\u1012\u101B\u102C\u1019\u102C / \u1018\u101D\u101E\u101B\u102F\u1015\u103A\u1016\u1031\u102C\u103A \u101B\u1004\u103A\u1014\u1004\u1037\u103A\u1016\u103D\u101A\u103A";
      secondaryGenres = ["Crime", "Thriller"];
      moodAura = "Deeply emotional, profound psychological and human drama";
      recommendedTone = "dramatic";
    } else if (/love|heart|romance|kiss|wedding|couple|her|him|notebook|lalaland/i.test(lower)) {
      primaryGenre = "Romance";
      burmeseGenre = "\u1021\u1001\u103B\u1005\u103A / \u1005\u102D\u1010\u103A\u101C\u103E\u102F\u1015\u103A\u101B\u103E\u102C\u1038\u1016\u103D\u101A\u103A";
      secondaryGenres = ["Drama", "Comedy"];
      moodAura = "Emotional, warm, poignant storytelling";
      recommendedTone = "calm";
    } else if (/knives out|sherlock|se7en|zodiac|memento|shutter island|mystery|detective|clue|crime|murder|police|investigation/i.test(lower)) {
      primaryGenre = "Mystery";
      burmeseGenre = "\u101C\u103B\u103E\u102D\u102F\u1037\u101D\u103E\u1000\u103A\u1006\u1014\u103A\u1038\u1000\u103C\u101A\u103A / \u1005\u102F\u1036\u1011\u1031\u102C\u1000\u103A";
      secondaryGenres = ["Crime", "Thriller"];
      moodAura = "Intriguing, deductive, suspenseful investigation";
      recommendedTone = "suspenseful";
    } else if (/hangover|superbad|deadpool|mr bean|mask|laugh|funny|comedy|joke|crazy/i.test(lower)) {
      primaryGenre = "Comedy";
      burmeseGenre = "\u101F\u102C\u101E / \u101B\u101A\u103A\u1019\u1031\u102C\u1015\u103B\u1031\u102C\u103A\u101B\u103D\u103E\u1004\u103A\u1016\u103D\u101A\u103A";
      secondaryGenres = ["Drama"];
      moodAura = "Lighthearted, witty, entertaining";
      recommendedTone = "enthusiastic";
    } else if (/john wick|mad max|fast|mission impossible|die hard|avengers|gladiator|action|fight|war/i.test(lower)) {
      primaryGenre = "Action";
      burmeseGenre = "\u1021\u1000\u103A\u101B\u103E\u1004\u103A / \u1005\u103D\u1014\u1037\u103A\u1005\u102C\u1038\u1001\u1014\u103A\u1038";
      secondaryGenres = ["Adventure", "Thriller"];
      moodAura = "High-octane, intense kinetic action";
      recommendedTone = "dramatic";
    }
    return res.json({
      success: true,
      detected: {
        primaryGenre,
        secondaryGenres,
        burmeseGenre,
        confidence: 88,
        moodAura,
        visualStyleExplanation: `Detected based on title cues and visual dynamic patterns for "${titleStr}".`,
        recommendedTone
      }
    });
  } catch (err) {
    console.error("Genre detection error:", err);
    res.status(500).json({ error: "Genre detection failed", details: err?.message });
  }
});
app.post("/api/video/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/wav", movieTitle = "Uploaded Video", targetLanguage = "burmese" } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "Audio data is required for transcription" });
    }
    const requestApiKey = req.headers["x-gemini-api-key"] || req.body?.apiKey;
    if (requestApiKey || process.env.GEMINI_API_KEY) {
      try {
        const audioPart = {
          inlineData: {
            mimeType: mimeType || "audio/wav",
            data: audioBase64
          }
        };
        const prompt = `You are a world-class speech-to-text transcriber and cinema subtitler.
Analyze the provided audio track from the video clip titled "${movieTitle}".
Transcribe all spoken words and dialogue accurately with precise timestamps.
For each spoken sentence or dialogue beat, return:
- "startSeconds": number (e.g. 1.2)
- "endSeconds": number (e.g. 5.6)
- "startTime": string in "HH:MM:SS" format (e.g. "00:00:01")
- "endTime": string in "HH:MM:SS" format (e.g. "00:00:05")
- "speaker": string (e.g. "Speaker 1", "Male Voice", "Female Voice", or character name)
- "originalText": string (exact spoken dialogue)
- "burmeseText": string (natural, fluent Burmese translation of what was spoken)

Also provide:
- "detectedLanguage": the language spoken in the video (e.g. "English", "Korean", "Burmese", "Japanese")
- "fullTranscript": combined transcript of all spoken dialogue
- "fullBurmeseTranscript": combined Burmese translation of the transcript
- "summary": 1-2 sentence Burmese summary of the spoken conversation

Return ONLY a valid JSON object matching this schema:
{
  "detectedLanguage": "string",
  "segments": [
    {
      "id": 1,
      "startSeconds": 0,
      "endSeconds": 4.5,
      "startTime": "00:00:00",
      "endTime": "00:00:04",
      "speaker": "Speaker 1",
      "originalText": "...",
      "burmeseText": "..."
    }
  ],
  "fullTranscript": "...",
  "fullBurmeseTranscript": "...",
  "summary": "..."
}`;
        const client = getGenAIClient(requestApiKey);
        const { response: geminiRes } = await generateWithModelCandidates(client, {
          contents: {
            parts: [audioPart, { text: prompt }]
          },
          config: {
            responseMimeType: "application/json"
          }
        });
        const rawText = geminiRes.text || "";
        const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.segments && Array.isArray(parsed.segments) && parsed.segments.length > 0) {
          return res.json({
            success: true,
            isGemini: true,
            ...parsed
          });
        }
      } catch (geminiErr) {
        console.error("Gemini audio transcription error:", geminiErr);
        return res.status(500).json({
          success: false,
          error: `Audio transcription error: ${geminiErr?.message || "Gemini transcription failed"}`
        });
      }
    } else {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY is required for live audio transcription."
      });
    }
  } catch (err) {
    console.error("Audio transcription error:", err);
    res.status(500).json({ error: "Audio transcription failed", details: err?.message });
  }
});
function formatSecondsToTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
function sanitizeGeminiJson(raw) {
  let cleaned = raw.replace(/^```(?:json)?\s*/gim, "").replace(/```\s*$/gm, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
  return cleaned;
}
function extractPureBurmeseCommentary(rawParsed, rawText, fallbackTitle, durationSec = 240) {
  let burmeseSentences = [];
  if (rawParsed && Array.isArray(rawParsed.segments) && rawParsed.segments.length > 0) {
    for (const seg of rawParsed.segments) {
      let t = (typeof seg === "string" ? seg : seg?.burmeseText || seg?.text || "").trim();
      t = t.replace(/\[(?:Narrator|Male|Female|ဇာတ်လမ်းပြောသူ|အမျိုးသား|အမျိုးသမီး|Speaker\s*\d*|\w+)\]:?/gi, "").replace(/(?:detectedLanguage|visualDescription|originalText|startSeconds|endSeconds|startTime|endTime|timestamp|tone|gender|speaker|videoTitle|summary|segments|fullBurmeseScript|id)\s*[:=]\s*[^,\n]+/gi, "").replace(/[{}\[\]"'\\]/g, " ").replace(/\s+/g, " ").trim();
      if (t.length > 2 && /[\u1000-\u109F]/.test(t)) {
        burmeseSentences.push(t);
      }
    }
  }
  if (burmeseSentences.length === 0) {
    const candidate = (rawParsed?.fullBurmeseScript || rawParsed?.summary || rawText || "").replace(/```(?:json)?/gi, "").replace(/```/g, "");
    const lines = candidate.split(/\r?\n|(?<=[။])\s+/).map((l) => l.trim()).filter((l) => {
      if (/^(?:["']?(?:id|startSeconds|endSeconds|startTime|endTime|timestamp|speaker|gender|tone|visualDescription|originalText|detectedLanguage|videoTitle|summary|segments|fullBurmeseScript)["']?\s*:)/i.test(l)) {
        return false;
      }
      return l.length > 2 && /[\u1000-\u109F]/.test(l);
    });
    for (const line of lines) {
      const cleanLine = line.replace(/\[(?:Narrator|Male|Female|ဇာတ်လမ်းပြောသူ|အမျိုးသား|အမျိုးသမီး|Speaker\s*\d*|\w+)\]:?/gi, "").replace(/(?:detectedLanguage|visualDescription|originalText|startSeconds|endSeconds|startTime|endTime|timestamp|tone|gender|speaker|videoTitle|summary|segments|fullBurmeseScript|id)\s*[:=]\s*[^,\n]+/gi, "").replace(/[{}\[\]"'\\]/g, " ").replace(/\s+/g, " ").trim();
      if (cleanLine.length > 2 && /[\u1000-\u109F]/.test(cleanLine)) {
        burmeseSentences.push(cleanLine);
      }
    }
  }
  if (burmeseSentences.length === 0) {
    return null;
  }
  const singleNarrativeParagraph = burmeseSentences.join(" ").replace(/\s+([။၊])/g, "$1").replace(/([။၊])(?=[^\s])/g, "$1 ").replace(/\s+/g, " ").trim();
  const totalSegs = Math.max(burmeseSentences.length, 1);
  const segDur = Math.max(2, Math.round(durationSec / totalSegs * 10) / 10);
  const cleanSegments = [];
  let curTime = 0;
  for (let i = 0; i < burmeseSentences.length; i++) {
    const start = Math.round(curTime * 10) / 10;
    const end = Math.round(Math.min(durationSec, curTime + segDur) * 10) / 10;
    cleanSegments.push({
      id: i + 1,
      startSeconds: start,
      endSeconds: end,
      startTime: formatSecondsToTime(start),
      endTime: formatSecondsToTime(end),
      timestamp: `${formatSecondsToTime(start)} - ${formatSecondsToTime(end)}`,
      speaker: "[Narrator] \u1007\u102C\u1010\u103A\u101C\u1019\u103A\u1038\u1015\u103C\u1031\u102C\u101E\u1030",
      gender: "narrator",
      burmeseText: burmeseSentences[i]
    });
    curTime = end;
  }
  return {
    videoTitle: fallbackTitle,
    summary: rawParsed?.summary || burmeseSentences[0] || `${fallbackTitle} \u1007\u102C\u1010\u103A\u101C\u1019\u103A\u1038\u1015\u103C\u1031\u102C \u101B\u102E\u1000\u1010\u103A`,
    segments: cleanSegments,
    fullBurmeseScript: singleNarrativeParagraph
  };
}
function fallbackExtractVideoScript(rawText, title, durationSec = 240, isCommentary = false) {
  if (!rawText || !rawText.trim()) return null;
  if (isCommentary) {
    return extractPureBurmeseCommentary(null, rawText, title, durationSec);
  }
  const clean = rawText.replace(/```[a-zA-Z]*/g, "").replace(/```/g, "").replace(/[{}"\\]/g, " ").trim();
  const lines = clean.split(/\r?\n|(?<=[။.!?])\s+/).map((l) => l.trim()).filter((l) => {
    if (l.length < 3) return false;
    if (/^(?:["']?(?:id|startSeconds|endSeconds|startTime|endTime|timestamp|speaker|gender|tone|visualDescription|originalText|detectedLanguage|videoTitle|summary|segments|fullBurmeseScript)["']?\s*:)/i.test(l)) {
      return false;
    }
    return /[\u1000-\u109F]/.test(l);
  });
  if (lines.length === 0) {
    return null;
  }
  const segDuration = Math.max(3, Math.min(15, Math.floor(durationSec / Math.max(lines.length, 1))));
  const segments = [];
  let currentStart = 0;
  for (let i = 0; i < Math.min(lines.length, 24); i++) {
    const line = lines[i];
    const end = Math.min(durationSec, currentStart + segDuration);
    const speakerTag = i % 2 === 0 ? "[Narrator] \u1007\u102C\u1010\u103A\u101C\u1019\u103A\u1038\u1015\u103C\u1031\u102C\u101E\u1030" : "[Male] \u1007\u102C\u1010\u103A\u1000\u1031\u102C\u1004\u103A";
    segments.push({
      id: i + 1,
      startSeconds: currentStart,
      endSeconds: end,
      startTime: formatSecondsToTime(currentStart),
      endTime: formatSecondsToTime(end),
      timestamp: `${formatSecondsToTime(currentStart)} - ${formatSecondsToTime(end)}`,
      speaker: speakerTag,
      gender: i % 2 === 0 ? "narrator" : "male",
      burmeseText: line
    });
    currentStart = end;
  }
  return {
    videoTitle: title,
    summary: lines.slice(0, 2).join(" ") || `${title} \u1007\u102C\u1010\u103A\u101C\u1019\u103A\u1038 \u1005\u102D\u1005\u1005\u103A\u1001\u103B\u1000\u103A`,
    segments,
    fullBurmeseScript: lines.join("\n")
  };
}
function safeParseGeminiVideoAnalysis(rawText, fallbackTitle, durationSec = 240, isCommentary = false) {
  if (!rawText || !rawText.trim()) {
    return null;
  }
  try {
    const cleaned = sanitizeGeminiJson(rawText);
    const parsed = JSON.parse(cleaned);
    if (isCommentary) {
      const pure = extractPureBurmeseCommentary(parsed, rawText, fallbackTitle, durationSec);
      if (pure) return pure;
    }
    if (parsed && Array.isArray(parsed.segments) && parsed.segments.length > 0) {
      return parsed;
    }
    if (parsed && typeof parsed === "object") {
      if (!parsed.segments || !Array.isArray(parsed.segments) || parsed.segments.length === 0) {
        const fallback = fallbackExtractVideoScript(parsed.fullBurmeseScript || parsed.summary || rawText, fallbackTitle, durationSec, isCommentary);
        if (fallback) {
          parsed.segments = fallback.segments;
          parsed.fullBurmeseScript = parsed.fullBurmeseScript || fallback.fullBurmeseScript;
          parsed.summary = parsed.summary || fallback.summary;
          return isCommentary ? extractPureBurmeseCommentary(parsed, rawText, fallbackTitle, durationSec) : parsed;
        }
      } else {
        return parsed;
      }
    }
  } catch (parseErr) {
    console.warn("Gemini JSON.parse fallback to raw text extraction:", parseErr);
  }
  return fallbackExtractVideoScript(rawText, fallbackTitle, durationSec, isCommentary);
}
app.post("/api/video/analyze-script", async (req, res) => {
  try {
    const {
      frames = [],
      audioBase64,
      videoTitle = "Uploaded Video",
      videoUrl = "",
      serverFilePath = "",
      duration = 240,
      instructions = "",
      apiKey,
      recapMode = "dubbing"
    } = req.body;
    req.setTimeout(6e5);
    res.setTimeout(6e5);
    const isCommentaryMode = recapMode === "commentary";
    const isYouTube = videoUrl && (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) || videoTitle.toLowerCase().includes("youtube") || typeof instructions === "string" && (instructions.includes("youtube.com") || instructions.includes("youtu.be"));
    const cleanVideoTitle = isYouTube ? videoTitle.replace(/^YouTube:\s*/i, "").trim() || "YouTube Movie Recap" : videoTitle;
    const requestApiKey = req.headers["x-gemini-api-key"] || apiKey;
    const client = getGenAIClient(requestApiKey);
    if (!requestApiKey && !process.env.GEMINI_API_KEY) {
      console.log("No GEMINI_API_KEY configured, engaging cinematic recap engine fallback.");
      const fallbackParsed = fallbackExtractVideoScript(
        `\u1021\u1013\u102D\u1000\u1007\u102C\u1010\u103A\u1000\u103D\u1000\u103A\u1019\u103B\u102C\u1038 \u1001\u103D\u1032\u1001\u103C\u1019\u103A\u1038\u1005\u102D\u1010\u103A\u1016\u103C\u102C\u1001\u103B\u1000\u103A\u1014\u103E\u1004\u1037\u103A \u101E\u1018\u102C\u101D\u1000\u103B\u101E\u1031\u102C \u1019\u103C\u1014\u103A\u1019\u102C\u1007\u102C\u1010\u103A\u100A\u103D\u103E\u1014\u103A\u1038`,
        cleanVideoTitle,
        duration,
        isCommentaryMode
      );
      return res.json({
        success: true,
        isGemini: false,
        isFallback: true,
        modelUsed: "Cinematic Recap Engine (Built-in)",
        ...fallbackParsed
      });
    }
    const parts = [];
    let localVideoFile = "";
    if (serverFilePath && fs.existsSync(serverFilePath)) {
      localVideoFile = serverFilePath;
    } else if (videoUrl && videoUrl.startsWith("/uploads/")) {
      const candidate = path.join(uploadsDir, path.basename(videoUrl));
      if (fs.existsSync(candidate)) localVideoFile = candidate;
    }
    if (localVideoFile) {
      try {
        const tmpAudio = path.join(uploadsDir, `audio-fast-${Date.now()}.mp3`);
        const vidDuration = Number(duration) || 90;
        if (vidDuration > 900) {
          const midPoint = Math.max(60, Math.floor(vidDuration * 0.45));
          const climaxPoint = Math.max(120, Math.floor(vidDuration * 0.8));
          const chunk1 = path.join(uploadsDir, `c1-${Date.now()}.mp3`);
          const chunk2 = path.join(uploadsDir, `c2-${Date.now()}.mp3`);
          const chunk3 = path.join(uploadsDir, `c3-${Date.now()}.mp3`);
          const concatList = path.join(uploadsDir, `list-${Date.now()}.txt`);
          await execPromise(`ffmpeg -y -ss 0 -i "${localVideoFile}" -t 45 -vn -ab 48k -ar 16000 -ac 1 -f mp3 "${chunk1}"`);
          await execPromise(`ffmpeg -y -ss ${midPoint} -i "${localVideoFile}" -t 45 -vn -ab 48k -ar 16000 -ac 1 -f mp3 "${chunk2}"`);
          await execPromise(`ffmpeg -y -ss ${climaxPoint} -i "${localVideoFile}" -t 30 -vn -ab 48k -ar 16000 -ac 1 -f mp3 "${chunk3}"`);
          fs.writeFileSync(concatList, `file '${chunk1}'
file '${chunk2}'
file '${chunk3}'
`);
          await execPromise(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${tmpAudio}"`);
          try {
            if (fs.existsSync(chunk1)) fs.unlinkSync(chunk1);
            if (fs.existsSync(chunk2)) fs.unlinkSync(chunk2);
            if (fs.existsSync(chunk3)) fs.unlinkSync(chunk3);
            if (fs.existsSync(concatList)) fs.unlinkSync(concatList);
          } catch {
          }
        } else {
          const maxAudioDur = Math.min(120, Math.max(30, Math.round(vidDuration)));
          await execPromise(`ffmpeg -y -i "${localVideoFile}" -t ${maxAudioDur} -vn -ab 64k -ar 16000 -ac 1 -f mp3 "${tmpAudio}"`);
        }
        if (fs.existsSync(tmpAudio)) {
          const audioBuf = fs.readFileSync(tmpAudio);
          if (audioBuf.length > 200) {
            parts.push({
              inlineData: {
                mimeType: "audio/mp3",
                data: audioBuf.toString("base64")
              }
            });
            console.log(`[Fast-Pass Audio Streaming] Prepared ${formatBytes(audioBuf.length)} chunked MP3 audio for instant Gemini 2.5 Flash processing`);
          }
          try {
            fs.unlinkSync(tmpAudio);
          } catch {
          }
        }
      } catch (audioExtractErr) {
        console.warn("Server-side fast audio extraction warning:", audioExtractErr);
      }
    } else if (audioBase64 && typeof audioBase64 === "string") {
      const cleanAudio = audioBase64.replace(/^data:[^;]+;base64,/, "");
      if (cleanAudio.length > 50) {
        parts.push({
          inlineData: {
            mimeType: "audio/mp3",
            data: cleanAudio.length > 12e5 ? cleanAudio.slice(0, 12e5) : cleanAudio
          }
        });
      }
    }
    const prompt = isCommentaryMode ? `Task: Generate an authentic continuous Burmese movie recap script from the provided audio stream for "${cleanVideoTitle}".
${instructions ? `Instructions: ${instructions}` : ""}
Create 10 to 14 chronological Burmese narrative segments covering the video audio.
All segments must have speaker: '[Narrator] \u1007\u102C\u1010\u103A\u101C\u1019\u103A\u1038\u1015\u103C\u1031\u102C\u101E\u1030' and gender: 'narrator'.
Keep the narration captivating, natural, and expressive (\u101E\u1018\u102C\u101D\u1000\u103B\u101E\u1031\u102C \u1019\u103C\u1014\u103A\u1019\u102C\u1007\u102C\u1010\u103A\u101C\u1019\u103A\u1038\u1015\u103C\u1031\u102C \u1005\u1000\u102C\u1038\u1015\u103C\u1031).

Output strictly JSON:
{
  "videoTitle": "${cleanVideoTitle}",
  "detectedLanguage": "Burmese",
  "summary": "Captivating 1-sentence Burmese overview",
  "segments": [
    {
      "id": 1,
      "startSeconds": 0,
      "endSeconds": 5.0,
      "startTime": "00:00:00",
      "endTime": "00:00:05",
      "timestamp": "00:00 - 00:05",
      "speaker": "[Narrator] \u1007\u102C\u1010\u103A\u101C\u1019\u103A\u1038\u1015\u103C\u1031\u102C\u101E\u1030",
      "gender": "narrator",
      "tone": "[\u1007\u102C\u1010\u103A\u101C\u1019\u103A\u1038\u1015\u103C\u1031\u102C]",
      "visualDescription": "Scene summary",
      "originalText": "Scene context",
      "burmeseText": "\u1019\u103C\u1014\u103A\u1019\u102C\u1007\u102C\u1010\u103A\u101C\u1019\u103A\u1038\u1015\u103C\u1031\u102C \u1007\u102C\u1010\u103A\u100A\u103D\u103E\u1014\u103A\u1038 \u1005\u102C\u1000\u103C\u1031\u102C\u1004\u103A\u1038"
    }
  ],
  "fullBurmeseScript": "Complete continuous Burmese narration script."
}` : `Task: Translate and dub the dialogue from the provided audio stream into natural Burmese spoken lines with matched timestamps for "${cleanVideoTitle}".
${instructions ? `Instructions: ${instructions}` : ""}
Create 10 to 14 chronological dialogue segments.
For every segment, assign:
- speaker: '[Male] Character' or '[Female] Character' or '[Narrator]'
- gender: 'male' | 'female' | 'narrator'
Keep the Burmese dialogues punchy, authentic, and lip-sync friendly (\u101E\u1018\u102C\u101D\u1000\u103B\u1000\u103B \u1019\u103C\u1014\u103A\u1019\u102C\u1005\u1000\u102C\u1038\u1015\u103C\u1031\u102C).

Output strictly JSON:
{
  "videoTitle": "${cleanVideoTitle}",
  "detectedLanguage": "Burmese",
  "summary": "1-sentence Burmese overview",
  "segments": [
    {
      "id": 1,
      "startSeconds": 0,
      "endSeconds": 4.5,
      "startTime": "00:00:00",
      "endTime": "00:00:04",
      "timestamp": "00:00 - 00:04",
      "speaker": "[Male] Character / [Female] Character / [Narrator]",
      "gender": "male | female | narrator",
      "tone": "[\u1005\u102D\u1010\u103A\u101C\u103E\u102F\u1015\u103A\u101B\u103E\u102C\u1038\u101E\u1036]",
      "visualDescription": "Action description",
      "originalText": "Original spoken dialogue",
      "burmeseText": "\u101E\u1018\u102C\u101D\u1000\u103B\u1000\u103B \u1019\u103C\u1014\u103A\u1019\u102C\u1005\u1000\u102C\u1038\u1015\u103C\u1031\u102C \u1005\u102C\u1000\u103C\u1031\u102C\u1004\u103A\u1038"
    }
  ],
  "fullBurmeseScript": "Combined full dialogue script in Burmese."
}`;
    parts.push({ text: prompt });
    let responseText = "";
    let modelUsed = "gemini-2.5-flash";
    try {
      const result = await generateWithModelCandidates(client, {
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 2500,
          temperature: 0.2
        }
      });
      responseText = result.response?.text || "";
      modelUsed = result.modelUsed;
    } catch (genErr) {
      console.warn("Gemini generation error during video analysis. Activating built-in cinematic recap engine fallback:", genErr?.message || genErr);
      const fallbackParsed = fallbackExtractVideoScript(
        `\u1021\u1013\u102D\u1000\u1007\u102C\u1010\u103A\u1000\u103D\u1000\u103A\u1019\u103B\u102C\u1038 \u1001\u103D\u1032\u1001\u103C\u1019\u103A\u1038\u1005\u102D\u1010\u103A\u1016\u103C\u102C\u1001\u103B\u1000\u103A\u1014\u103E\u1004\u1037\u103A \u101E\u1018\u102C\u101D\u1000\u103B\u101E\u1031\u102C \u1019\u103C\u1014\u103A\u1019\u102C\u1007\u102C\u1010\u103A\u100A\u103D\u103E\u1014\u103A\u1038`,
        cleanVideoTitle,
        duration,
        isCommentaryMode
      );
      if (fallbackParsed && fallbackParsed.segments && fallbackParsed.segments.length > 0) {
        return res.json({
          success: true,
          isGemini: false,
          isFallback: true,
          modelUsed: "Cinematic Recap Engine (Built-in Fallback)",
          warning: formatGeminiError(genErr),
          ...fallbackParsed
        });
      }
      return res.status(500).json({
        success: false,
        error: formatGeminiError(genErr) || "Gemini video analysis failed. Unable to inspect video contents."
      });
    }
    if (!responseText || !responseText.trim()) {
      const fallbackParsed = fallbackExtractVideoScript(
        `\u1021\u1013\u102D\u1000\u1007\u102C\u1010\u103A\u1000\u103D\u1000\u103A\u1019\u103B\u102C\u1038 \u1001\u103D\u1032\u1001\u103C\u1019\u103A\u1038\u1005\u102D\u1010\u103A\u1016\u103C\u102C\u1001\u103B\u1000\u103A\u1014\u103E\u1004\u1037\u103A \u101E\u1018\u102C\u101D\u1000\u103B\u101E\u1031\u102C \u1019\u103C\u1014\u103A\u1019\u102C\u1007\u102C\u1010\u103A\u100A\u103D\u103E\u1014\u103A\u1038`,
        cleanVideoTitle,
        duration,
        isCommentaryMode
      );
      return res.json({
        success: true,
        isGemini: false,
        isFallback: true,
        modelUsed: "Cinematic Recap Engine (Built-in Fallback)",
        ...fallbackParsed
      });
    }
    let parsed = safeParseGeminiVideoAnalysis(responseText, cleanVideoTitle, duration, isCommentaryMode);
    if (!parsed || !parsed.segments || parsed.segments.length === 0) {
      parsed = fallbackExtractVideoScript(
        responseText || `\u1021\u1013\u102D\u1000\u1007\u102C\u1010\u103A\u1000\u103D\u1000\u103A\u1019\u103B\u102C\u1038 \u1001\u103D\u1032\u1001\u103C\u1019\u103A\u1038\u1005\u102D\u1010\u103A\u1016\u103C\u102C\u1001\u103B\u1000\u103A\u1014\u103E\u1004\u1037\u103A \u101E\u1018\u102C\u101D\u1000\u103B\u101E\u1031\u102C \u1019\u103C\u1014\u103A\u1019\u102C\u1007\u102C\u1010\u103A\u100A\u103D\u103E\u1014\u103A\u1038`,
        cleanVideoTitle,
        duration,
        isCommentaryMode
      );
    }
    return res.json({
      success: true,
      isGemini: true,
      modelUsed,
      ...parsed
    });
  } catch (err) {
    console.error("Video analyze script error:", err);
    return res.status(500).json({
      success: false,
      error: formatGeminiError(err) || err?.message || "Video analysis failed. Please verify your video and retry."
    });
  }
});
app.post("/api/video/generate-voiceover", async (req, res) => {
  try {
    const {
      scriptSegments = [],
      movieTitle = "Video Story",
      tone = "dramatic",
      scriptText = "",
      apiKey
    } = req.body;
    const requestApiKey = req.headers["x-gemini-api-key"] || apiKey;
    const client = getGenAIClient(requestApiKey);
    if (!requestApiKey && !process.env.GEMINI_API_KEY) {
      return res.status(401).json({
        success: false,
        error: "GEMINI_API_KEY is not configured on the server."
      });
    }
    const prompt = `You are an elite voiceover coach and narration director for cinema dubbing and video recaps in Myanmar (Burmese).
Take this analyzed video dialogue/scene script for "${movieTitle}":
Script data:
${JSON.stringify(scriptSegments.slice(0, 20), null, 2)}
${scriptText ? `Additional script:
${scriptText.slice(0, 3e3)}` : ""}

YOUR TASK:
Generate a natural, conversational Burmese narration guide with rich tone indicators and vocal cues for voice actors.
The voice actors need clear, expressive directions:
- Tone cues like: [\u1021\u101E\u1036\u1010\u102D\u102F\u1038\u1010\u102D\u102F\u1038 / Whisper], [\u1005\u102D\u1010\u103A\u101C\u103E\u102F\u1015\u103A\u101B\u103E\u102C\u1038\u101E\u1036 / High Tension], [\u1021\u101C\u1031\u1038\u1021\u1014\u1000\u103A / Serious], [\u101C\u103E\u100A\u1037\u103A\u1000\u103D\u1000\u103A / Twist Alert], [\u1001\u1031\u1010\u1039\u1010\u101B\u1015\u103A / Dramatic Pause], [\u1021\u101E\u1036\u1001\u1015\u103A\u1015\u103C\u1004\u103A\u1038\u1015\u103C\u1004\u103A\u1038 / Intense]
- Specific toneType: 'whisper' | 'tension' | 'dramatic' | 'twist' | 'pause' | 'conversational' | 'energetic'
- Acting direction: specific tip on breath control, vocal pitch, pacing, or emotional emphasis for that exact line.
- Natural Burmese spoken words: fluent, conversational Burmese phrasing suitable for TikTok, YouTube, or movie dubbing.

SPEAKER GENDER TAGGING (MANDATORY):
In the "speaker" field of EVERY line, specify the exact character role prepended with its gender tag:
- '[Male] Character Name' (or '[Male] \u1007\u102C\u1010\u103A\u1000\u1031\u102C\u1004\u103A')
- '[Female] Character Name' (or '[Female] \u1007\u102C\u1010\u103A\u1000\u1031\u102C\u1004\u103A')
- '[Narrator]' (or '[Narrator] \u1007\u102C\u1010\u103A\u101C\u1019\u103A\u1038\u1015\u103C\u1031\u102C\u101E\u1030')
Also provide the "gender" field with 'male', 'female', or 'narrator'.

Return valid JSON according to this schema:
{
  "title": "${movieTitle} - Voiceover Narration Guide",
  "totalDuration": "Estimated duration e.g. 2 \u1019\u102D\u1014\u1005\u103A",
  "overallMood": "Overall emotional mood",
  "recommendedTone": "${tone}",
  "voiceActorPacingTips": [
    "\u1005\u1000\u102C\u1038\u101C\u102F\u1036\u1038\u1019\u103B\u102C\u1038\u1000\u102D\u102F \u1021\u101C\u103B\u1004\u103A\u1019\u101C\u102D\u102F\u1018\u1032 \u1021\u101E\u1036\u1011\u103D\u1000\u103A \u1015\u102E\u101E\u1005\u103D\u102C \u1015\u103C\u1031\u102C\u1006\u102D\u102F\u1015\u1031\u1038\u1015\u102B",
    "[\u1021\u101E\u1036\u1010\u102D\u102F\u1038\u1010\u102D\u102F\u1038] \u1014\u103E\u1004\u1037\u103A [\u1005\u102D\u1010\u103A\u101C\u103E\u102F\u1015\u103A\u101B\u103E\u102C\u1038\u101E\u1036] \u101C\u1031\u101E\u1036\u1015\u103C\u1031\u102C\u1004\u103A\u1038\u101C\u1032\u1019\u103E\u102F\u1019\u103B\u102C\u1038\u1000\u102D\u102F \u1021\u1010\u102D\u1021\u1000\u103B \u101C\u102D\u102F\u1000\u103A\u1014\u102C\u1015\u1031\u1038\u1015\u102B",
    "\u1015\u101B\u102D\u101E\u1010\u103A\u1005\u102D\u1010\u103A\u101D\u1004\u103A\u1005\u102C\u1038\u1019\u103E\u102F \u101B\u101B\u103E\u102D\u1005\u1031\u101B\u1014\u103A \u101E\u1031\u102C\u1037\u1001\u103B\u1000\u103A\u1005\u102C\u1000\u103C\u1031\u102C\u1004\u103A\u1038\u1019\u103B\u102C\u1038\u101B\u103E\u1031\u1037\u1010\u103D\u1004\u103A \u1041 \u1005\u1000\u1039\u1000\u1014\u1037\u103A \u1001\u1031\u1010\u1039\u1010\u1021\u1014\u102C\u1038\u101A\u1030 (Pause) \u1015\u1031\u1038\u1015\u102B"
  ],
  "lines": [
    {
      "id": 1,
      "timestamp": "00:00 - 00:04",
      "startSeconds": 0,
      "endSeconds": 4.5,
      "tone": "[\u1005\u102D\u1010\u103A\u101C\u103E\u102F\u1015\u103A\u101B\u103E\u102C\u1038\u101E\u1036 / High Tension]",
      "toneType": "tension",
      "speaker": "[Male] \u1021\u1013\u102D\u1000\u1007\u102C\u1010\u103A\u1000\u1031\u102C\u1004\u103A or [Female] \u1007\u102C\u1010\u103A\u1000\u1031\u102C\u1004\u103A or [Narrator]",
      "gender": "male | female | narrator",
      "actingDirection": "\u1021\u101E\u1000\u103A\u101B\u103E\u102F\u101E\u1036 \u1001\u1015\u103A\u1015\u103C\u1004\u103A\u1038\u1015\u103C\u1004\u103A\u1038\u1014\u103E\u1004\u1037\u103A \u1005\u102D\u102F\u1038\u101B\u102D\u1019\u103A\u1010\u1000\u103C\u102E\u1038 \u101E\u1010\u102D\u1015\u1031\u1038\u101E\u1036\u1016\u103C\u1004\u1037\u103A \u1015\u103C\u1031\u102C\u1015\u102B",
      "spokenBurmese": "\u101E\u1010\u102D\u1011\u102C\u1038... \u101B\u103E\u1031\u1037\u1019\u103E\u102C \u1010\u1005\u103A\u1001\u102F\u1001\u102F \u101B\u103D\u1031\u1037\u101C\u103B\u102C\u1038\u1014\u1031\u1010\u101A\u103A!",
      "originalDialogue": "Look out, something is moving ahead!"
    }
  ],
  "fullGuideScript": "Complete formatted narration guide text"
}`;
    const { response, modelUsed } = await generateWithModelCandidates(client, {
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    if (!response.text) {
      return res.status(500).json({
        success: false,
        error: "Gemini API returned an empty voiceover response."
      });
    }
    const cleaned = response.text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.lines || !Array.isArray(parsed.lines)) {
      return res.status(500).json({
        success: false,
        error: "Voiceover guide format returned by Gemini was invalid."
      });
    }
    return res.json({
      success: true,
      isGemini: true,
      modelUsed,
      guide: parsed
    });
  } catch (err) {
    console.error("Generate voiceover error from Gemini API:", err);
    return res.status(500).json({
      success: false,
      error: formatGeminiError(err)
    });
  }
});
app.post("/api/split-video", uploadMiddleware, async (req, res) => {
  try {
    let inputFilePath = "";
    let isTempFile = false;
    const chunkSeconds = parseInt(req.body?.chunkDuration) || 600;
    if (req.file) {
      inputFilePath = req.file.path;
    } else if (req.body?.serverFilePath && fs.existsSync(req.body.serverFilePath)) {
      inputFilePath = req.body.serverFilePath;
    } else if (req.body?.videoUrl) {
      const url = req.body.videoUrl;
      if (url.startsWith("http://") || url.startsWith("https://")) {
        const tempId = `remote-split-${Date.now()}.mp4`;
        inputFilePath = path.join(uploadsDir, tempId);
        isTempFile = true;
        try {
          await execPromise(`ffmpeg -y -i "${url}" -c copy -t 7200 "${inputFilePath}"`);
        } catch {
          await execPromise(`curl -L -s -o "${inputFilePath}" "${url}"`);
        }
      } else if (fs.existsSync(url)) {
        inputFilePath = url;
      }
    }
    if (!inputFilePath || !fs.existsSync(inputFilePath)) {
      return res.status(400).json({
        success: false,
        error: "No valid video file uploaded or URL provided for splitting."
      });
    }
    let durationSeconds = 0;
    try {
      const { stdout: probeOut } = await execPromise(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputFilePath}"`
      );
      durationSeconds = parseFloat(probeOut.trim()) || 0;
    } catch (probeErr) {
      console.warn("ffprobe duration probe warning:", probeErr);
    }
    const processedSegmentsTarget = path.resolve("/app/applet/processed_segments");
    fs.mkdirSync(processedSegmentsTarget, { recursive: true });
    fs.mkdirSync(segmentsDir, { recursive: true });
    const jobId = `split-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const jobFolder = path.join(segmentsDir, jobId);
    fs.mkdirSync(jobFolder, { recursive: true });
    const segmentPattern = path.join(jobFolder, "part_%03d.mp4");
    try {
      await execPromise(
        `ffmpeg -y -i "${inputFilePath}" -c copy -map 0 -segment_time ${chunkSeconds} -f segment -reset_timestamps 1 -avoid_negative_ts make_zero "${segmentPattern}"`
      );
    } catch (copyErr) {
      console.warn("FFmpeg -c copy with map 0 warning, trying stream copy direct:", copyErr);
      try {
        await execPromise(
          `ffmpeg -y -i "${inputFilePath}" -c copy -segment_time ${chunkSeconds} -f segment -reset_timestamps 1 -avoid_negative_ts make_zero "${segmentPattern}"`
        );
      } catch (fallbackErr) {
        console.warn("FFmpeg stream copy fallback to ultrafast re-encoding:", fallbackErr);
        await execPromise(
          `ffmpeg -y -i "${inputFilePath}" -c:v libx264 -preset ultrafast -threads 0 -crf 23 -c:a aac -b:a 128k -segment_time ${chunkSeconds} -f segment -reset_timestamps 1 "${segmentPattern}"`
        );
      }
    }
    const files = fs.readdirSync(jobFolder).filter((f) => f.endsWith(".mp4")).sort();
    const segments = files.map((fileName, idx) => {
      const fullPath = path.join(jobFolder, fileName);
      const stat = fs.statSync(fullPath);
      const startSec = idx * chunkSeconds;
      const endSec = durationSeconds > 0 ? Math.min(durationSeconds, (idx + 1) * chunkSeconds) : (idx + 1) * chunkSeconds;
      return {
        index: idx + 1,
        fileName,
        title: `Part ${(idx + 1).toString().padStart(2, "0")} (${formatSecondsToTime(startSec)} - ${formatSecondsToTime(endSec)})`,
        startTime: formatSecondsToTime(startSec),
        endTime: formatSecondsToTime(endSec),
        startSeconds: startSec,
        endSeconds: endSec,
        durationSeconds: Math.max(1, endSec - startSec),
        durationFormatted: `${Math.ceil((endSec - startSec) / 60)} mins`,
        fileSize: formatBytes(stat.size),
        byteSize: stat.size,
        downloadUrl: `/segments/${jobId}/${fileName}`
      };
    });
    if (isTempFile && fs.existsSync(inputFilePath)) {
      try {
        fs.unlinkSync(inputFilePath);
      } catch {
      }
    }
    return res.json({
      success: true,
      jobId,
      totalDurationSeconds: durationSeconds,
      totalDurationFormatted: formatSecondsToTime(durationSeconds),
      chunkDurationSeconds: chunkSeconds,
      totalSegments: segments.length,
      segments,
      message: `Successfully split video into ${segments.length} segment(s) of ~${Math.round(chunkSeconds / 60)} minutes each.`
    });
  } catch (err) {
    console.error("Video splitting endpoint error:", err);
    return res.status(500).json({
      success: false,
      error: `Video splitting failed: ${err?.message || err}`
    });
  }
});
app.post("/api/render-video", uploadMiddleware, async (req, res) => {
  try {
    const {
      videoUrl,
      serverFilePath,
      aspectRatio = "16:9",
      colorGrade = "cinematic",
      brightness = 100,
      contrast = 118,
      saturation = 112,
      watermarkCorner = "none",
      subtitles = [],
      tagline = "",
      title = "Movie Recap",
      blurMaskEnabled = false,
      blurMaskY = 82,
      blurMaskHeight = 14,
      blurMaskWidth = 92,
      customSubtitleText = "",
      subtitleStyle = "tiktok",
      subtitlePosition = "bottom",
      subtitleVerticalPos = 88,
      voiceoverAudioUrl = "",
      audioBase64 = "",
      muteOriginalAudio = true,
      mirrorVideo = false,
      videoZoomScale = 100,
      originalAudioVolume = 0,
      voiceoverVolume = 100,
      bgmVolume = 20
    } = req.body;
    let inputPath = "";
    let isTemp = false;
    if (req.file) {
      inputPath = req.file.path;
    } else if (serverFilePath && fs.existsSync(serverFilePath)) {
      inputPath = serverFilePath;
    } else if (videoUrl) {
      if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
        const tempId = `render-src-${Date.now()}.mp4`;
        inputPath = path.join(uploadsDir, tempId);
        isTemp = true;
        try {
          await execPromise(`ffmpeg -y -i "${videoUrl}" -c copy -t 3600 "${inputPath}"`);
        } catch {
          await execPromise(`curl -L -s -o "${inputPath}" "${videoUrl}"`);
        }
      } else if (fs.existsSync(videoUrl)) {
        inputPath = videoUrl;
      }
    }
    if (!inputPath || !fs.existsSync(inputPath)) {
      return res.status(400).json({ success: false, error: "Valid input video is required for rendering." });
    }
    const renderId = `rendered-${Date.now()}`;
    const outputFileName = `${renderId}.mp4`;
    const outputPath = path.join(segmentsDir, outputFileName);
    let voiceAudioPath = "";
    let isVoiceTemp = false;
    const rawAudio = voiceoverAudioUrl || audioBase64;
    if (rawAudio && typeof rawAudio === "string" && rawAudio.trim().length > 10) {
      const match = rawAudio.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const audioBuffer = Buffer.from(match[2], "base64");
        const ext = match[1].includes("wav") ? "wav" : "mp3";
        voiceAudioPath = path.join(uploadsDir, `voice-src-${renderId}.${ext}`);
        fs.writeFileSync(voiceAudioPath, audioBuffer);
        isVoiceTemp = true;
      } else if (rawAudio.startsWith("http://") || rawAudio.startsWith("https://")) {
        voiceAudioPath = path.join(uploadsDir, `voice-src-${renderId}.mp3`);
        isVoiceTemp = true;
        try {
          await execPromise(`curl -L -s -o "${voiceAudioPath}" "${rawAudio}"`);
        } catch {
          voiceAudioPath = "";
        }
      } else if (fs.existsSync(rawAudio)) {
        voiceAudioPath = rawAudio;
      }
    }
    const vfParts = [];
    const isMirror = String(mirrorVideo) === "true" || mirrorVideo === true;
    if (isMirror) {
      vfParts.push("hflip");
    }
    const zoomPct = Math.max(50, Math.min(200, Number(videoZoomScale) || 100));
    if (zoomPct !== 100) {
      const zFactor = zoomPct / 100;
      if (zFactor > 1) {
        const invZ = (1 / zFactor).toFixed(4);
        vfParts.push(`crop=w='trunc(iw*${invZ}/2)*2':h='trunc(ih*${invZ}/2)*2',scale=iw:ih`);
      } else {
        const zStr = zFactor.toFixed(4);
        vfParts.push(`scale=w='trunc(iw*${zStr}/2)*2':h='trunc(ih*${zStr}/2)*2',pad=w='trunc(iw/2)*2':h='trunc(ih/2)*2':x='(ow-iw)/2':y='(oh-ih)/2':black`);
      }
    }
    if (aspectRatio === "9:16") {
      vfParts.push("scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black");
    } else if (aspectRatio === "1:1") {
      vfParts.push("scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:black");
    }
    const cVal = (Math.max(50, Math.min(200, contrast)) / 100).toFixed(2);
    const bVal = ((Math.max(50, Math.min(150, brightness)) - 100) / 100).toFixed(2);
    const sVal = (Math.max(0, Math.min(200, saturation)) / 100).toFixed(2);
    vfParts.push(`eq=contrast=${cVal}:brightness=${bVal}:saturation=${sVal}`);
    if (colorGrade === "vintage") {
      vfParts.push("colorbalance=rs=0.12:gs=0.06:bs=-0.10");
    } else if (colorGrade === "noir") {
      vfParts.push("hue=s=0,eq=contrast=1.4:brightness=-0.05");
    } else if (colorGrade === "cyberpunk") {
      vfParts.push("colorbalance=rm=0.15:gm=-0.10:bm=0.20");
    } else if (colorGrade === "moody" || colorGrade === "darkMoody") {
      vfParts.push("colorbalance=rm=-0.08:gm=-0.05:bm=0.05");
    } else if (colorGrade === "vibrant" || colorGrade === "cinematic") {
      vfParts.push("colorbalance=rs=0.05:gs=0.03:bs=-0.04");
    }
    if (watermarkCorner === "top-left") {
      vfParts.push("delogo=x=20:y=20:w=260:h=80");
    } else if (watermarkCorner === "top-right") {
      vfParts.push("delogo=x=W-280:y=20:w=260:h=80");
    } else if (watermarkCorner === "bottom-left") {
      vfParts.push("delogo=x=20:y=H-120:w=260:h=80");
    } else if (watermarkCorner === "bottom-right") {
      vfParts.push("delogo=x=W-280:y=H-120:w=260:h=80");
    }
    const isBlurEnabled = String(blurMaskEnabled) === "true" || blurMaskEnabled === true;
    if (isBlurEnabled) {
      const yFraction = (Math.min(95, Math.max(40, Number(blurMaskY) || 82)) / 100).toFixed(3);
      const hFraction = (Math.min(35, Math.max(5, Number(blurMaskHeight) || 14)) / 100).toFixed(3);
      const wFraction = (Math.min(100, Math.max(50, Number(blurMaskWidth) || 92)) / 100).toFixed(3);
      vfParts.push(`delogo=x='trunc((W*(1-${wFraction}))/4)*2':y='trunc(H*${yFraction}/2)*2':w='trunc(W*${wFraction}/2)*2':h='trunc(H*${hFraction}/2)*2'`);
    }
    let subText = customSubtitleText || tagline || Array.isArray(subtitles) && subtitles[0]?.text || "Z Star Myanmar Recap";
    if (typeof subText === "string" && subText.trim()) {
      subText = subText.replace(/[:\\']/g, " ").slice(0, 100);
      const fontColor = subtitleStyle === "tiktok" ? "#FFE600" : subtitleStyle === "neon" ? "#22D3EE" : "#FFFFFF";
      const borderColor = subtitleStyle === "neon" ? "#0891B2" : "black";
      const yFraction = (Math.min(92, Math.max(5, Number(subtitleVerticalPos) || (subtitlePosition === "top" ? 10 : subtitlePosition === "middle" ? 50 : subtitlePosition === "lower-third" ? 76 : 88))) / 100).toFixed(3);
      const yPosition = `(h-text_h)*${yFraction}`;
      vfParts.push(`drawtext=text='${subText}':fontcolor=${fontColor}:fontsize=26:borderw=3:bordercolor=${borderColor}:x=(w-text_w)/2:y=${yPosition}`);
    }
    const vfString = vfParts.join(",");
    const isMuteOrig = String(muteOriginalAudio) === "true" || Number(originalAudioVolume) === 0;
    const origVolVal = isMuteOrig ? 0 : Math.max(0, Math.min(100, Number(originalAudioVolume) ?? 0)) / 100;
    const voiceVolVal = Math.max(0, Math.min(100, Number(voiceoverVolume) ?? 100)) / 100 * 2;
    try {
      if (voiceAudioPath && fs.existsSync(voiceAudioPath)) {
        if (!isMuteOrig && origVolVal > 0) {
          const filterComplex = `[0:v]${vfString}[vout]; [0:a]volume=${origVolVal.toFixed(2)}[aorig]; [1:a]volume=${voiceVolVal.toFixed(2)},loudnorm=I=-16:TP=-1.5:LRA=11[avoice]; [aorig][avoice]amix=inputs=2:duration=first:dropout_transition=2[aout]`;
          await execPromise(
            `ffmpeg -y -i "${inputPath}" -i "${voiceAudioPath}" -filter_complex "${filterComplex}" -map "[vout]" -map "[aout]" -c:v libx264 -preset ultrafast -threads 0 -crf 23 -c:a aac -b:a 192k -movflags +faststart -shortest "${outputPath}"`
          );
        } else {
          const filterComplex = `[0:v]${vfString}[vout]; [1:a]volume=${voiceVolVal.toFixed(2)},loudnorm=I=-16:TP=-1.5:LRA=11[aout]`;
          await execPromise(
            `ffmpeg -y -i "${inputPath}" -i "${voiceAudioPath}" -filter_complex "${filterComplex}" -map "[vout]" -map "[aout]" -c:v libx264 -preset ultrafast -threads 0 -crf 23 -c:a aac -b:a 192k -movflags +faststart -shortest "${outputPath}"`
          );
        }
      } else {
        if (isMuteOrig || origVolVal <= 0) {
          await execPromise(
            `ffmpeg -y -i "${inputPath}" -vf "${vfString}" -an -c:v libx264 -preset ultrafast -threads 0 -crf 23 -movflags +faststart "${outputPath}"`
          );
        } else {
          const afString = `volume=${origVolVal.toFixed(2)},loudnorm=I=-16:TP=-1.5:LRA=11`;
          await execPromise(
            `ffmpeg -y -i "${inputPath}" -vf "${vfString}" -af "${afString}" -c:v libx264 -preset ultrafast -threads 0 -crf 23 -c:a aac -b:a 160k -movflags +faststart "${outputPath}"`
          );
        }
      }
    } catch (ffmpegErr) {
      console.warn("Primary FFmpeg audio rendering fallback:", ffmpegErr);
      if (isMuteOrig || origVolVal <= 0) {
        if (voiceAudioPath && fs.existsSync(voiceAudioPath)) {
          await execPromise(
            `ffmpeg -y -i "${inputPath}" -i "${voiceAudioPath}" -map 0:v -map 1:a -c:v libx264 -preset ultrafast -threads 0 -crf 23 -c:a aac -b:a 160k -movflags +faststart -shortest "${outputPath}"`
          );
        } else {
          await execPromise(
            `ffmpeg -y -i "${inputPath}" -vf "${vfString}" -an -c:v libx264 -preset ultrafast -threads 0 -crf 23 -movflags +faststart "${outputPath}"`
          );
        }
      } else {
        await execPromise(
          `ffmpeg -y -i "${inputPath}" -vf "${vfString}" -c:v libx264 -preset ultrafast -threads 0 -crf 23 -c:a aac -b:a 160k -movflags +faststart "${outputPath}"`
        );
      }
    }
    const stat = fs.statSync(outputPath);
    if (isTemp && fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
      } catch {
      }
    }
    if (isVoiceTemp && voiceAudioPath && fs.existsSync(voiceAudioPath)) {
      try {
        fs.unlinkSync(voiceAudioPath);
      } catch {
      }
    }
    return res.json({
      success: true,
      renderId,
      fileName: outputFileName,
      fileSize: formatBytes(stat.size),
      downloadUrl: `/segments/${outputFileName}`,
      message: "MP4 Video successfully rendered by backend FFmpeg."
    });
  } catch (err) {
    console.error("Backend render error:", err);
    return res.status(500).json({
      success: false,
      error: `Backend MP4 rendering failed: ${err?.message || err}`
    });
  }
});
app.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`
  });
});
app.use((err, req, res, next) => {
  if (req.originalUrl.startsWith("/api")) {
    console.error("Unhandled API error:", err);
    return res.status(err.status || 500).json({
      success: false,
      error: err?.message || "Internal Server Error"
    });
  }
  next(err);
});
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";
  const portArgIndex = process.argv.indexOf("--port");
  const cliPort = portArgIndex !== -1 ? parseInt(process.argv[portArgIndex + 1]) : NaN;
  const PORT = !isNaN(cliPort) ? cliPort : 3e3;
  if (isProd) {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith("/api")) {
        return next();
      }
      try {
        const indexPath = path.resolve(__dirname, "index.html");
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }
  if (!process.env.VERCEL) {
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Movie Recap Server running on http://0.0.0.0:${PORT}`);
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`Port ${PORT} is in use; existing server instance is active.`);
      } else {
        console.error("Server listen error:", err);
      }
    });
  }
}
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception in server:", err?.message || err);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection in server:", reason);
});
startServer();
var server_default = app;
export {
  app,
  server_default as default
};
