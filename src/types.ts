export interface SubtitleCue {
  id: number;
  startTime: string; // e.g. "00:00:02,000"
  endTime: string;   // e.g. "00:00:06,500"
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface SampledFrame {
  id: number;
  timestamp: number; // in seconds
  timestampFormatted: string; // e.g. "02:15"
  dataUrl: string;
  label?: string;
}

export interface Character {
  name: string;
  actor?: string;
  role: string;
  description: string;
  fate?: string;
}

export interface SceneBreakdown {
  timestamp: string;
  title: string;
  description: string;
  intensity: 'Low' | 'Medium' | 'High' | 'Climax' | string;
  mood: string;
  stillUrl?: string;
}

export interface TwistEnding {
  hasMajorTwist: boolean;
  twistSummary: string;
  endingExplanation: string;
  hiddenClues: string[];
}

export interface VoiceoverScript {
  hook: string;
  fullScript: string;
  estimatedNarrationTime: string;
  toneRecommendation: string;
}

export interface CreatorPack {
  suggestedVideoTitle: string;
  thumbnailConcept: string;
  hashtags: string[];
  retentionTip?: string;
}

export interface MovieRecap {
  id: string;
  title: string;
  originalTitle?: string;
  burmeseTitle?: string;
  year: string;
  genre: string[];
  director: string;
  duration: string;
  imdbRating: string;
  posterUrl: string;
  backdropUrl: string;
  tagline: string;
  logline: string;
  overview: string;
  characters: Character[];
  scenes: SceneBreakdown[];
  twistEnding: TwistEnding;
  voiceoverScript: VoiceoverScript;
  moralAndThemes: string[];
  creatorPack: CreatorPack;
  subtitles?: SubtitleCue[];
  sampledFrames?: SampledFrame[];
  viewCount?: number;
  likes?: number;
  isFeatured?: boolean;
  isCustom?: boolean;
  createdAt?: string;
  videoUrl?: string;
}

export type ViewTab = 'overview' | 'scenes' | 'voiceover' | 'twist' | 'characters' | 'creator';

export interface TranscriptSegment {
  id: number;
  startTime: string; // "00:00:02"
  endTime: string;   // "00:00:06"
  startSeconds: number;
  endSeconds: number;
  speaker?: string;
  gender?: 'male' | 'female' | 'narrator';
  originalText: string;
  burmeseText: string;
}

export interface VoiceoverGuideItem {
  id: number;
  timestamp: string; // e.g. "00:02 - 00:07"
  startSeconds: number;
  endSeconds: number;
  tone: string; // e.g. "[စိတ်လှုပ်ရှားသံ / High Tension]", "[အသံတိုးတိုး / Whisper]", "[အလေးအနက် / Serious]"
  toneType: 'whisper' | 'tension' | 'dramatic' | 'twist' | 'pause' | 'conversational' | 'energetic';
  speaker: string;
  gender?: 'male' | 'female' | 'narrator';
  actingDirection: string; // Direction for voice actor, e.g. "အသက်ရှုသံ ခပ်ပြင်းပြင်းနှင့် စိုးရိမ်တကြီး ပြောပါ"
  spokenBurmese: string; // Spoken Burmese script
  originalDialogue?: string;
}

export interface VoiceoverNarrationGuide {
  title: string;
  totalDuration: string;
  overallMood: string;
  recommendedTone: string;
  voiceActorPacingTips: string[];
  lines: VoiceoverGuideItem[];
  fullGuideScript: string;
}

export interface AudioTranscriptionResult {
  detectedLanguage: string;
  audioDuration: number;
  segments: TranscriptSegment[];
  fullTranscript: string;
  fullBurmeseTranscript: string;
  summary?: string;
}

export interface ProcessedVideoSegment {
  index: number;
  fileName: string;
  title: string;
  startTime: string;
  endTime: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  durationFormatted: string;
  fileSize: string;
  byteSize: number;
  downloadUrl: string;
}

export interface SplitVideoResult {
  jobId: string;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  chunkDurationSeconds: number;
  totalSegments: number;
  segments: ProcessedVideoSegment[];
  message: string;
}

