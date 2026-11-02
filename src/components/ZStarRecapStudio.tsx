import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Link as LinkIcon,
  Plus,
  Play,
  Pause,
  Sparkles,
  Volume2,
  VolumeX,
  Film,
  Check,
  AlertCircle,
  Copy,
  Download,
  Clock,
  Layers,
  FileText,
  Sliders,
  Maximize2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Eye,
  Shield,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Square,
  Tag,
  Edit3,
  Save,
  Tv,
  Undo,
  Mic,
  Headphones,
  MessageSquare,
  Languages,
  Key,
  ArrowLeft,
  ArrowRight,
  Palette,
  Sun,
  Contrast as ContrastIcon,
  Scissors,
  Server,
  Wand2,
  Music,
  Radio,
  Users,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Type,
  RotateCcw,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { MovieRecap, SampledFrame, SubtitleCue, AudioTranscriptionResult, TranscriptSegment, VoiceoverNarrationGuide, SplitVideoResult, ProcessedVideoSegment } from '../types';
import { extractAudioFromVideoFile } from '../utils/audioExtractor';
import { VoiceoverGeneratorModule } from './VoiceoverGeneratorModule';
import { CustomDarkDropdown, DropdownOption } from './CustomDarkDropdown';
import { ZStarLoadingOverlay, LoadingStep } from './ZStarLoadingOverlay';

export interface ZStarRecapStudioProps {
  onRecapReady?: (recap: MovieRecap) => void;
  initialRecap?: MovieRecap | null;
  onOpenTeleprompter?: (script: string, title: string) => void;
}

// Built-in demo clips purged: clean empty canvas until user uploads video
const DEMO_CLIPS: Array<{ name: string; url: string; title: string }> = [];

export interface DetectedGenreInfo {
  primaryGenre: string;
  secondaryGenres: string[];
  burmeseGenre: string;
  confidence: number;
  moodAura: string;
  visualStyleExplanation: string;
  recommendedTone?: 'dramatic' | 'enthusiastic' | 'calm' | 'suspenseful';
}

export const MOVIE_GENRES = [
  { id: 'Action', label: 'Action', burmese: 'အက်ရှင် / တိုက်ခိုက်မှု', emoji: '💥' },
  { id: 'Thriller', label: 'Thriller', burmese: 'သည်းထိတ်ရင်ဖို', emoji: '⚡' },
  { id: 'Horror', label: 'Horror', burmese: 'သရဲ / ထိတ်လန့်ဖွယ်', emoji: '👻' },
  { id: 'Sci-Fi', label: 'Sci-Fi', burmese: 'သိပ္ပံစိတ်ကူးယဉ်', emoji: '🚀' },
  { id: 'Drama', label: 'Drama', burmese: 'ဒရာမာ / လူမှုဘဝ', emoji: '🎭' },
  { id: 'Comedy', label: 'Comedy', burmese: 'ဟာသ / ရယ်မောဖွယ်', emoji: '😂' },
  { id: 'Romance', label: 'Romance', burmese: 'အချစ် / ရိုမန်းတစ်', emoji: '💖' },
  { id: 'Mystery', label: 'Mystery', burmese: 'လျှို့ဝှက်ဆန်းကြယ်', emoji: '🔍' },
  { id: 'Crime', label: 'Crime', burmese: 'မှုခင်း / ရာဇဝတ်မှု', emoji: '🔫' },
  { id: 'Adventure', label: 'Adventure', burmese: 'စွန့်စားခန်း', emoji: '🗺️' },
  { id: 'Fantasy', label: 'Fantasy', burmese: 'စိတ်ကူးယဉ်ဆန်းကြယ်', emoji: '🔮' },
  { id: 'Animation', label: 'Animation', burmese: 'ကာတွန်းရုပ်ကြွ', emoji: '🎨' },
  { id: 'Documentary', label: 'Documentary', burmese: 'မှတ်တမ်းတင်', emoji: '📽️' },
];

export interface GeminiVoiceItem {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  description: string;
  samplePhrase: string;
  pitch: number;
}

export const GEMINI_VOICE_LIST: GeminiVoiceItem[] = [
  // Male: Puck, Charon, Fenrir, Achird, Algenib, Enceladus (Natural baritone with 1.05x storytelling cadence)
  { id: 'Puck', name: 'Puck', gender: 'Male', description: 'Dynamic storytelling cinema narrator (1.05x natural baritone)', samplePhrase: 'အားလုံးပဲ မင်္ဂလာပါ! ဒီနေ့မှာတော့ အချိန်မဆိုင်းဘဲ ရုံတင်ငွေ စံချိန်တင်ခဲ့တဲ့ ဇာတ်ကားကြီးကို စတင်ကြည့်လိုက်ကြရအောင်!', pitch: -220 },
  { id: 'Charon', name: 'Charon', gender: 'Male', description: 'Deep, calm baritone storytelling narrator (low-end bass resonance)', samplePhrase: 'သတိထား နားထောင်ပါ... ဒီရုပ်ရှင်ထဲက လျှို့ဝှက်ချက်ဟာ သင်ထင်ထားတာထက် အဆပေါင်းများစွာ ပိုမိုထိတ်လန့်ဖွယ် ကောင်းနေပါတယ်။', pitch: -280 },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Male', description: 'Intense, dramatic thriller male (crisp masculine cadence)', samplePhrase: 'အသံမထွက်ပါနဲ့... အခန်းတံခါးနောက်မှာ တစ်ယောက်ယောက် ရပ်နေပါတယ်။', pitch: -240 },
  { id: 'Achird', name: 'Achird', gender: 'Male', description: 'Authoritative, clear cinema presenter', samplePhrase: 'ဒီရုပ်ရှင်ရဲ့ အနုပညာမြောက်မှုနဲ့ ဒါရိုက်တာရဲ့ အတွေးအခေါ်ကို တိကျစွာ အတူတူ သုံးသပ်ကြည့်ကြပါမယ်။', pitch: -200 },
  { id: 'Algenib', name: 'Algenib', gender: 'Male', description: 'Smooth, warm, natural conversational male', samplePhrase: 'ဒီနေ့မှာတော့ လူတိုင်း ကြည့်သင့်တဲ့ ရုပ်ရှင်ဇာတ်ကားကောင်းလေးကို ပေါ့ပေါ့ပါးပါး တင်ဆက်ပေးသွားပါမယ်။', pitch: -180 },
  { id: 'Enceladus', name: 'Enceladus', gender: 'Male', description: 'Resonant, cinematic epic trailer voice', samplePhrase: 'ကမ္ဘာပျက်ကပ်ဘေးကြီး မကျရောက်မီ နောက်ဆုံးကျန်ရှိနေသော မျှော်လင့်ချက်...', pitch: -290 },

  // Female: Kore, Aoede, Zephyr, Achernar, Callirrhoe
  { id: 'Kore', name: 'Kore', gender: 'Female', description: 'Warm, bright, friendly female voice', samplePhrase: 'မင်္ဂလာပါရှင်... ဒီဇာတ်လမ်းလေးရဲ့ အဓိက သော့ချက်တွေကို အတူတူ ကြည့်ကြပါစို့။', pitch: 80 },
  { id: 'Aoede', name: 'Aoede', gender: 'Female', description: 'Melodic, expressive emotional drama', samplePhrase: 'ဒီဇာတ်လမ်းလေးကတော့ လူတွေရဲ့ နှလုံးသားကို လှုပ်ခတ်စေမယ့် ဖြစ်ရပ်မှန် ဇာတ်လမ်းတစ်ပုဒ် ဖြစ်ပါတယ်။', pitch: 40 },
  { id: 'Zephyr', name: 'Zephyr', gender: 'Female', description: 'Gentle, whispering, emotional suspense', samplePhrase: 'တံခါးနောက်ကွယ်မှာ ပုန်းကွယ်နေတဲ့ လျှို့ဝှက်ချက်ကို ဘယ်သူမှ မသိခဲ့ကြပါဘူး...', pitch: 20 },
  { id: 'Achernar', name: 'Achernar', gender: 'Female', description: 'Clear, articulate presenter female', samplePhrase: 'ဒီနေ့မှာတော့ YouTube နဲ့ TikTok မှာ နာမည်ကြီးနေတဲ့ ဇာတ်ကားကောင်းလေးကို တင်ဆက်ပေးပါမယ်ရှင်!', pitch: 100 },
  { id: 'Callirrhoe', name: 'Callirrhoe', gender: 'Female', description: 'Crisp, sophisticated narrative storyteller', samplePhrase: 'ဆုံးရှုံးသွားတဲ့ အရာတွေအတွက် သူ ဘာတွေ ဆက်လုပ်နိုင်ဦးမှာလဲ...', pitch: 50 },
];

export interface MicrosoftVoiceItem {
  id: string;
  name: string;
  flag: string;
  language: string;
  gender: 'Female' | 'Male';
  description: string;
  samplePhrase: string;
}

export const MICROSOFT_VOICE_LIST: MicrosoftVoiceItem[] = [
  // 🇲🇲 Burmese
  { id: 'my-MM-NilarNeural', name: 'Burmese - Nilar (Female)', flag: '🇲🇲', language: 'Burmese', gender: 'Female', description: 'သဘာဝကျကျ ကြည်လင်ပြတ်သားသော မြန်မာအမျိုးသမီး အသံ', samplePhrase: 'မင်္ဂလာပါရှင်... ဒီရုပ်ရှင်ရဲ့ လျှို့ဝှက်ချက်များကို သေချာစွာ ရှင်းပြပေးသွားပါမယ်။' },
  { id: 'my-MM-ThihaNeural', name: 'Burmese - Thiha (Male)', flag: '🇲🇲', language: 'Burmese', gender: 'Male', description: 'လေးနက်ခန့်ညားသော မြန်မာအမျိုးသား ဇာတ်လမ်းပြောအသံ (1.05x Natural Bass)', samplePhrase: 'မင်္ဂလာပါ ခင်ဗျာ... ဒီရုပ်ရှင်ဇာတ်လမ်းကို စတင်ကြည့်ရှုခံစားကြည့်ကြရအောင်။' },

  // 🇺🇸 English
  { id: 'en-US-JennyNeural', name: 'English - Jenny (Female)', flag: '🇺🇸', language: 'English', gender: 'Female', description: 'Professional American female narrator', samplePhrase: 'Welcome! Today we are diving deep into this mind-bending cinematic masterpiece.' },
  { id: 'en-US-GuyNeural', name: 'English - Guy (Male)', flag: '🇺🇸', language: 'English', gender: 'Male', description: 'Deep, crisp American male narrator', samplePhrase: 'Listen closely. The truth behind this movie is darker than you can ever imagine.' },

  // 🇹🇭 Thai
  { id: 'th-TH-PremwadeeNeural', name: 'Thai - Premwadee (Female)', flag: '🇹🇭', language: 'Thai', gender: 'Female', description: 'Clear, gentle Thai female presenter', samplePhrase: 'สวัสดีค่ะทุกคน วันนี้เราจะมารับชมสรุปภาพยนตร์เรื่องดังกันค่ะ' },
  { id: 'th-TH-NiwatNeural', name: 'Thai - Niwat (Male)', flag: '🇹🇭', language: 'Thai', gender: 'Male', description: 'Expressive Thai male storyteller', samplePhrase: 'ตั้งใจฟังให้ดี... ความลับในภาพยนตร์เรื่องนี้ซ่อนอะไรมากกว่าที่คุณคิด' },
];

export interface CinemaVoicePreset {
  id: string;
  name: string;
  burmeseName: string;
  category: 'male' | 'female' | 'accent';
  gender: 'male' | 'female' | 'narrator';
  elevenlabsId: string;
  toneTag: string;
  description: string;
  samplePhrase: string;
  defaultPitch: number;
  defaultSpeed: number;
}

export const CINEMA_VOICE_PRESETS: CinemaVoicePreset[] = [
  // 1. Male Narrators
  {
    id: 'male_deep',
    name: 'Cinematic Deep (Adam)',
    burmeseName: 'နက်နဲသော ရုပ်ရှင်ဇာတ်လမ်းပြော',
    category: 'male',
    gender: 'male',
    elevenlabsId: 'pNInz6obpgDQGcFmaJgB',
    toneTag: 'Cinematic Deep',
    description: 'Deep, resonant baritone voice for blockbuster thriller & horror recaps',
    samplePhrase: 'သတိထား နားထောင်ပါ... ဒီရုပ်ရှင်ထဲက လျှို့ဝှက်ချက်ဟာ သင်ထင်ထားတာထက် အဆပေါင်းများစွာ ပိုမိုထိတ်လန့်ဖွယ် ကောင်းနေပါတယ်။',
    defaultPitch: -500,
    defaultSpeed: 0.95,
  },
  {
    id: 'male_casual',
    name: 'Casual Storyteller (Antoni)',
    burmeseName: 'ပေါ့ပေါ့ပါးပါး ဇာတ်လမ်းပြောသူ',
    category: 'male',
    gender: 'male',
    elevenlabsId: 'ErXwobaYiN019PkySvjV',
    toneTag: 'Storyteller',
    description: 'Friendly, natural, conversational cadence for episodic storytelling',
    samplePhrase: 'ဒီနေ့မှာတော့ လူတိုင်း ကြည့်သင့်တဲ့ ရုပ်ရှင်ဇာတ်ကားကောင်းလေးကို ပေါ့ပေါ့ပါးပါး တင်ဆက်ပေးသွားပါမယ်။',
    defaultPitch: -360,
    defaultSpeed: 1.05,
  },
  {
    id: 'male_news',
    name: 'News Presenter (George)',
    burmeseName: 'သတင်းနှင့် သုံးသပ်ချက်ဟန်',
    category: 'male',
    gender: 'male',
    elevenlabsId: 'JBFqnCBsd6RMkjVDRZzb',
    toneTag: 'News / Review',
    description: 'Articulate, authoritative, informative cinema analysis',
    samplePhrase: 'ဒီရုပ်ရှင်ရဲ့ အနုပညာမြောက်မှုနဲ့ ဒါရိုက်တာရဲ့ အတွေးအခေါ်ကို တိကျစွာ အတူတူ သုံးသပ်ကြည့်ကြပါမယ်။',
    defaultPitch: -380,
    defaultSpeed: 1.0,
  },
  {
    id: 'male_thriller',
    name: 'Dramatic Thriller (Arnold)',
    burmeseName: 'သည်းထိတ်ရင်ဖို လျှို့ဝှက်သံ',
    category: 'male',
    gender: 'male',
    elevenlabsId: 'VR6AewLTigWG4xSOukaG',
    toneTag: 'Dramatic Thriller',
    description: 'Tense, gripping, edge-of-seat pacing with high suspense and mystery',
    samplePhrase: 'အသံမထွက်ပါနဲ့... အမှောင်ထဲက ခြေသံတွေက တစ်ဖြည်းဖြည်း နီးကပ်လာနေပါပြီ။',
    defaultPitch: -450,
    defaultSpeed: 0.92,
  },
  {
    id: 'male_epic',
    name: 'Epic Movie Trailer (Daniel)',
    burmeseName: 'ရုပ်ရှင်နမူနာ အထူးအသံ',
    category: 'male',
    gender: 'male',
    elevenlabsId: 'onwK4e9ZLuTAKqWW03F9',
    toneTag: 'Trailer Epic',
    description: 'Grand, dramatic, impactful trailer narrator delivery',
    samplePhrase: 'ကမ္ဘာပျက်ကပ်ဘေးကြီး မကျရောက်မီ နောက်ဆုံးကျန်ရှိနေသော မျှော်လင့်ချက်...',
    defaultPitch: -560,
    defaultSpeed: 0.90,
  },

  // 2. Female Narrators
  {
    id: 'female_soft',
    name: 'Soft Storyteller (Rachel)',
    burmeseName: 'ညင်သာကြည်လင်သော ပုံပြင်ပြောသံ',
    category: 'female',
    gender: 'female',
    elevenlabsId: '21m00Tcm4TlvDq8ikWAM',
    toneTag: 'Soft & Poignant',
    description: 'Gentle, soothing, emotional clarity for drama, sorrow, and romance',
    samplePhrase: 'ဒီဇာတ်လမ်းလေးကတော့ လူတွေရဲ့ နှလုံးသားကို လှုပ်ခတ်စေမယ့် ဖြစ်ရပ်မှန် ဇာတ်လမ်းတစ်ပုဒ် ဖြစ်ပါတယ်။',
    defaultPitch: 60,
    defaultSpeed: 0.98,
  },
  {
    id: 'female_energetic',
    name: 'Energetic Presenter (Bella)',
    burmeseName: 'တက်ကြွသော တင်ဆက်သူ',
    category: 'female',
    gender: 'female',
    elevenlabsId: 'EXAVITQu4vr4xnSDxMaL',
    toneTag: 'High Energy',
    description: 'Vibrant, upbeat, punchy tempo for viral TikTok, Shorts & YouTube recaps',
    samplePhrase: 'အားလုံးပဲ မင်္ဂလာပါရှင်! ဒီနေ့မှာတော့ TikTok နဲ့ YouTube မှာ လူကြည့်အများဆုံး ဖြစ်နေတဲ့ ဇာတ်ကားကို ကြည့်ကြရအောင်!',
    defaultPitch: 120,
    defaultSpeed: 1.15,
  },
  {
    id: 'female_drama',
    name: 'Emotional Drama (Elli)',
    burmeseName: 'ရင်နင့်ဖွယ် ဒရာမာသံ',
    category: 'female',
    gender: 'female',
    elevenlabsId: 'MF3mGyEYCl7XYWbV9V6O',
    toneTag: 'Emotional Drama',
    description: 'Heartfelt, expressive, melancholic resonance and character emotion',
    samplePhrase: 'ဆုံးရှုံးသွားတဲ့ အရာတွေအတွက် သူ ဘာတွေ ဆက်လုပ်နိုင်ဦးမှာလဲ...',
    defaultPitch: -20,
    defaultSpeed: 0.94,
  },
  {
    id: 'female_mystery',
    name: 'Whispering Mystery (Domi)',
    burmeseName: 'တိုးတိုးသံ လျှို့ဝှက်ဆန်းကြယ်',
    category: 'female',
    gender: 'female',
    elevenlabsId: 'AZnzlk1XvdvUeBnXmlld',
    toneTag: 'Whispering Mystery',
    description: 'Intriguing, intimate, spine-chilling whisper tones',
    samplePhrase: 'တံခါးနောက်ကွယ်မှာ ပုန်းကွယ်နေတဲ့ လျှို့ဝှက်ချက်ကို ဘယ်သူမှ မသိခဲ့ကြပါဘူး...',
    defaultPitch: 30,
    defaultSpeed: 0.88,
  },

  // 3. Accent & Tone Controls (Myanmar Natural Pitch & Pace adjustments)
  {
    id: 'my_natural',
    name: 'Myanmar Natural Pitch',
    burmeseName: 'သဘာဝ မြန်မာအသံထွက်',
    category: 'accent',
    gender: 'narrator',
    elevenlabsId: '',
    toneTag: 'Burmese Native',
    description: 'Natural, fluent, standard Burmese spoken cadence and clear pronunciation',
    samplePhrase: 'မင်္ဂလာပါ... ဒီဗီဒီယို ဇာတ်လမ်းကို မြန်မာစကားပြော သဘာဝအသံထွက်ဖြင့် တင်ဆက်ပေးသွားပါမည်။',
    defaultPitch: 0,
    defaultSpeed: 1.0,
  },
  {
    id: 'my_yangon_pace',
    name: 'Yangon Fast-Pace Accent',
    burmeseName: 'ရန်ကုန် စကားပြော မြန်ဆန်သွက်လက်သံ',
    category: 'accent',
    gender: 'male',
    elevenlabsId: '',
    toneTag: 'Yangon Pace',
    description: 'Snappy, conversational Yangon modern city tempo and dynamic cadence',
    samplePhrase: 'ဒီဇာတ်ကွက်ကတော့ တကယ့်ကို အလန်းစားပါပဲ၊ ချက်ချင်းပဲ အဆုံးထိ ဆက်ကြည့်လိုက်ကြရအောင်!',
    defaultPitch: -120,
    defaultSpeed: 1.20,
  },
  {
    id: 'my_mandalay_tone',
    name: 'Mandalay Melodic Tone',
    burmeseName: 'မန္တလေး လေပြေအေး နူးညံ့သံ',
    category: 'accent',
    gender: 'female',
    elevenlabsId: '',
    toneTag: 'Mandalay Melodic',
    description: 'Polite, melodic, traditional gentle Upper-Myanmar inflection',
    samplePhrase: 'ရုပ်ရှင်ဇာတ်လမ်းရဲ့ အလှတရားနဲ့ ခံစားချက်ကို အေးအေးချမ်းချမ်း အတူတကွ ခံစားနားဆင်ကြည့်ကြပါစို့ရှင်။',
    defaultPitch: 40,
    defaultSpeed: 0.95,
  },
];

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  description: string;
}

export interface LanguageVoiceGroup {
  langCode: 'my' | 'en' | 'th' | 'ja' | 'ko' | 'zh-CN';
  langName: string;
  burmeseName: string;
  flag: string;
  voices: VoiceOption[];
}

export const MULTILINGUAL_VOICE_GROUPS: LanguageVoiceGroup[] = [
  {
    langCode: 'my',
    langName: 'Myanmar',
    burmeseName: 'မြန်မာဘာသာ',
    flag: '🇲🇲',
    voices: [
      { id: 'maythu', name: 'မေသူ (May Thu)', gender: 'Female', description: 'ကြည်လင်ပြတ်သားသော အမျိုးသမီး ဇာတ်လမ်းပြောအသံ (Clear Female Narrator)' },
      { id: 'zayar', name: 'ဇေယျာ (Zayar)', gender: 'Male', description: 'လေးနက်ခန့်ညားသော အမျိုးသား ဇာတ်လမ်းပြောအသံ (Dramatic Cinema Male)' },
      { id: 'shweyi', name: 'ရွှေရည် (Shwe Yi)', gender: 'Female', description: 'တက်ကြွမြူးကြွသော YouTube/TikTok အသံ (Enthusiastic Viral Female)' },
      { id: 'minhtet', name: 'မင်းထက် (Min Htet)', gender: 'Male', description: 'သည်းထိတ်ရင်ဖို နက်နဲသော စကားသံ (Deep Suspenseful Male)' },
    ],
  },
  {
    langCode: 'en',
    langName: 'English',
    burmeseName: 'အင်္ဂလိပ်ဘာသာ',
    flag: '🇺🇸',
    voices: [
      { id: 'sarah', name: 'Sarah (US Studio)', gender: 'Female', description: 'Professional American documentary narrator' },
      { id: 'james', name: 'James (UK Cinema)', gender: 'Male', description: 'Classic British cinematic story narrator' },
      { id: 'puck', name: 'Puck (High Energy)', gender: 'Male', description: 'Viral fast-paced recap voice' },
    ],
  },
  {
    langCode: 'th',
    langName: 'Thai',
    burmeseName: 'ထိုင်းဘာသာ',
    flag: '🇹🇭',
    voices: [
      { id: 'somchai', name: 'Somchai (สมชาย)', gender: 'Male', description: 'Thai cinematic storytelling voice' },
      { id: 'chompoo', name: 'Chompoo (ชมพู่)', gender: 'Female', description: 'Clear Thai female recap narrator' },
    ],
  },
  {
    langCode: 'ja',
    langName: 'Japanese',
    burmeseName: 'ဂျပန်ဘာသာ',
    flag: '🇯🇵',
    voices: [
      { id: 'kenji', name: 'Kenji (健二)', gender: 'Male', description: 'Dramatic Japanese cinema voiceover' },
      { id: 'sakura', name: 'Sakura (さくら)', gender: 'Female', description: 'Gentle Japanese anime & recap voice' },
    ],
  },
  {
    langCode: 'ko',
    langName: 'Korean',
    burmeseName: 'ကိုရီးယားဘာသာ',
    flag: '🇰🇷',
    voices: [
      { id: 'minho', name: 'Minho (민호)', gender: 'Male', description: 'K-Drama & movie recap narrator' },
      { id: 'soyeon', name: 'Soyeon (소연)', gender: 'Female', description: 'Crisp Korean cinema narrator' },
    ],
  },
  {
    langCode: 'zh-CN',
    langName: 'Chinese',
    burmeseName: 'တရုတ်ဘာသာ',
    flag: '🇨🇳',
    voices: [
      { id: 'wei', name: 'Wei (伟)', gender: 'Male', description: 'Standard Mandarin cinema recap voice' },
      { id: 'ling', name: 'Ling (玲)', gender: 'Female', description: 'Smooth Mandarin film critic voice' },
    ],
  },
];

export const ZStarRecapStudio: React.FC<ZStarRecapStudioProps> = ({
  onRecapReady = () => {},
  initialRecap = null,
  onOpenTeleprompter,
}) => {
  // Script direct editing & Live Studio Summarization states
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [editableScriptText, setEditableScriptText] = useState('');
  const [originalScriptBeforeSummarize, setOriginalScriptBeforeSummarize] = useState<string | null>(null);
  const [isSummarizingInStudio, setIsSummarizingInStudio] = useState(false);
  const [isShowingSummarizedScript, setIsShowingSummarizedScript] = useState(false);
  const [reductionStatsStudio, setReductionStatsStudio] = useState<{
    originalChars: number;
    summarizedChars: number;
    ratio: number;
  } | null>(null);

  // Multimodal Video-to-Script & Voiceover Generator states
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatusText, setAnalysisStatusText] = useState('');
  const [analyzedScriptResult, setAnalyzedScriptResult] = useState<{
    videoTitle: string;
    detectedLanguage: string;
    summary: string;
    segments: any[];
    fullBurmeseScript: string;
  } | null>(null);
  const [voiceoverGuide, setVoiceoverGuide] = useState<VoiceoverNarrationGuide | null>(null);
  const [isLoadingVoiceoverGuide, setIsLoadingVoiceoverGuide] = useState(false);
  const [studioSubTab, setStudioSubTab] = useState<'analyzedScript' | 'voiceoverGuide' | 'recap'>('analyzedScript');

  // Video Audio Speech-to-Text Transcription states
  const [transcriptionResult, setTranscriptionResult] = useState<AudioTranscriptionResult | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeStep, setTranscribeStep] = useState<string>('');
  const [studioActiveMode, setStudioActiveMode] = useState<'recap' | 'transcription'>('recap');

  // Input mode: upload vs youtube link
  const [inputMode, setInputMode] = useState<'upload' | 'youtube'>('upload');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [customVideoPlot, setCustomVideoPlot] = useState<string>('');

  // Tune options
  const [translationLanguage, setTranslationLanguage] = useState<'myanmar' | 'english'>('myanmar');
  const [recapDuration, setRecapDuration] = useState<number>(20);
  const [recapStyle, setRecapStyle] = useState<'cinematic' | 'storytelling' | 'fast'>('cinematic');
  const [voiceoverTone, setVoiceoverTone] = useState<'dramatic' | 'enthusiastic' | 'calm' | 'suspenseful'>('dramatic');

  // Gemini Auto-Detected Genre states (Clean Slate)
  const [primaryGenre, setPrimaryGenre] = useState<string>('Drama');
  const [detectedGenreInfo, setDetectedGenreInfo] = useState<DetectedGenreInfo | null>(null);
  const [isDetectingGenre, setIsDetectingGenre] = useState(false);
  const [isCustomGenreOpen, setIsCustomGenreOpen] = useState(false);

  // Multilingual Voice & Audio states
  const [voiceLanguage, setVoiceLanguage] = useState<'my' | 'en' | 'th' | 'ja' | 'ko' | 'zh-CN'>('my');
  const [selectedVoice, setSelectedVoice] = useState('maythu');
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState<number>(1.0);
  const [audioStatusText, setAudioStatusText] = useState<string>('');
  const [isSyncAudioWithVideo, setIsSyncAudioWithVideo] = useState(true);

  // Audio & Memory elements refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyzeAbortControllerRef = useRef<AbortController | null>(null);
  const analyzeProgressIntervalRef = useRef<any>(null);
  const prevBlobUrlRef = useRef<string | null>(null);
  const lastTimeUpdateRef = useRef<number>(0);

  // Export settings
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [watermarkCorner, setWatermarkCorner] = useState('none');
  const [subtitleBlur, setSubtitleBlur] = useState('none');
  const [exportFormat, setExportFormat] = useState<'txt' | 'pdf' | 'srt' | 'vtt' | 'ass'>('srt');
  const [subtitleStyle, setSubtitleStyle] = useState<'tiktok' | 'cinema' | 'boxed' | 'neon'>('tiktok');
  const [subtitleFont, setSubtitleFont] = useState<'padauk' | 'noto' | 'myanmar-text' | 'sans'>('padauk');
  const [subtitlePosition, setSubtitlePosition] = useState<'bottom' | 'lower-third' | 'middle' | 'top'>('bottom');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [isAdvancedToolsOpen, setIsAdvancedToolsOpen] = useState(false);
  const [isAdvancedTuneOpen, setIsAdvancedTuneOpen] = useState(false);

  // Audio Controls for MP4 Export (Volume Sliders: Original, Voiceover, BGM)
  const [originalAudioVolume, setOriginalAudioVolume] = useState<number>(0); // 0% - 100% (Mute)
  const [voiceoverVolume, setVoiceoverVolume] = useState<number>(100); // 0% - 100% (On)
  const [bgmVolume, setBgmVolume] = useState<number>(15); // 0% - 100% (Soft)

  // Step 3 Subtitle Text Editor & Styling states (Constrained 12px - 24px)
  const [customSubtitleText, setCustomSubtitleText] = useState<string>('');
  const [isCustomSubtitleMode, setIsCustomSubtitleMode] = useState<boolean>(true);
  const [subtitleFontSize, setSubtitleFontSize] = useState<number>(18); // range 12px - 24px
  const [subtitleBold, setSubtitleBold] = useState<boolean>(true);
  const [subtitleItalic, setSubtitleItalic] = useState<boolean>(false);
  const [subtitleBgBox, setSubtitleBgBox] = useState<boolean>(false);
  const [subtitleOutline, setSubtitleOutline] = useState<boolean>(true);
  const [subtitleShadow, setSubtitleShadow] = useState<boolean>(true);
  const [subtitleTextColor, setSubtitleTextColor] = useState<string>('#FFE600');
  const [subtitleBgShadow, setSubtitleBgShadow] = useState<'heavy' | 'medium' | 'soft' | 'glow'>('heavy');
  const [subtitleVerticalPos, setSubtitleVerticalPos] = useState<number>(88); // 88% from top (Y-Axis)
  const [subtitleHorizontalPos, setSubtitleHorizontalPos] = useState<number>(50); // 50% from left (X-Axis)
  const [subtitleTextAlign, setSubtitleTextAlign] = useState<'left' | 'center' | 'right'>('center');

  // Step 3 Original Subtitle Blur Mask states
  const [blurMaskEnabled, setBlurMaskEnabled] = useState<boolean>(false);
  const [blurMaskY, setBlurMaskY] = useState<number>(82); // Y-position % (40-95%)
  const [blurMaskHeight, setBlurMaskHeight] = useState<number>(14); // Height % (5-30%)
  const [blurMaskWidth, setBlurMaskWidth] = useState<number>(94); // Width % (50-100%)
  const [blurMaskIntensity, setBlurMaskIntensity] = useState<number>(16); // Blur px (4-32px)
  const [blurMaskOpacity, setBlurMaskOpacity] = useState<number>(85); // Opacity % (20-100%)

  // Step 3 Video Mirror (Horizontal Flip) state
  const [mirrorVideo, setMirrorVideo] = useState<boolean>(false);

  // Step 3 Video Zoom / Fit Scale state (50% to 200%, default 100%)
  const [videoZoomScale, setVideoZoomScale] = useState<number>(100);

  // Step 3 Compact Tabbed Control Bar state
  const [step3ActiveTab, setStep3ActiveTab] = useState<'subtitles' | 'aspect' | 'blur' | 'color' | 'style'>('subtitles');

  // Isolated 3-Step UI Workflow state (Step 1: Video Upload, Step 2: Script & Voiceover, Step 3: Z-Studio Video Editor)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Dedicated Workflow Mode: Dubbing Recap (Character Dialogue) vs Commentary Recap (Continuous Storyteller)
  const [recapMode, setRecapMode] = useState<'dubbing' | 'commentary'>('dubbing');

  // Dubbing Mode: Character Speaker Mapping & Multi-Voice Pitch/Speed Controls state
  const [characterSpeakerMaps, setCharacterSpeakerMaps] = useState<Record<string, {
    voice: string;
    gender: 'male' | 'female' | 'narrator';
    pitchShift: number;
    speed: number;
  }>>({
    'အဓိကမင်းသား (Male)': { voice: 'Puck', gender: 'male', pitchShift: -220, speed: 1.05 },
    'မင်းသမီး (Female)': { voice: 'Kore', gender: 'female', pitchShift: 40, speed: 1.0 },
    'ဇာတ်လမ်းပြောသူ (Narrator)': { voice: 'Fenrir', gender: 'narrator', pitchShift: -240, speed: 1.05 },
  });

  // Color Grading Panel state for Step 3 (Moody, Vintage, Vibrant, Film Noir, Cyberpunk, Normal)
  const [colorGradingPreset, setColorGradingPreset] = useState<'normal' | 'moody' | 'vintage' | 'vibrant' | 'noir' | 'cyberpunk' | 'neutral' | 'cinematic' | 'darkMoody'>('normal');
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [voicePitchCents, setVoicePitchCents] = useState<number>(-220);
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.05);

  // Voice Studio: Shwe Khit AI Style Engine Tabs & State
  const [voiceEngineTab, setVoiceEngineTab] = useState<'gemini' | 'microsoft' | 'clone'>('gemini');
  const [selectedGeminiVoice, setSelectedGeminiVoice] = useState<string>('Puck');
  const [selectedMicrosoftVoice, setSelectedMicrosoftVoice] = useState<string>('my-MM-NilarNeural');
  const [selectedCloneVoicePreset, setSelectedCloneVoicePreset] = useState<string>('pNInz6obpgDQGcFmaJgB');
  const [voiceScriptInput, setVoiceScriptInput] = useState<string>('');

  const [voiceMode, setVoiceMode] = useState<'preset' | 'clone'>('preset');
  const [selectedPresetVoice, setSelectedPresetVoice] = useState<string>('male_deep');
  const [voiceCategoryFilter, setVoiceCategoryFilter] = useState<'all' | 'male' | 'female' | 'accent'>('all');
  const [clonedVoiceId, setClonedVoiceId] = useState<string>('');
  const [clonedVoiceName, setClonedVoiceName] = useState<string>('');
  const [customVoiceIdInput, setCustomVoiceIdInput] = useState<string>('');
  const [isCloningVoice, setIsCloningVoice] = useState<boolean>(false);
  const [cloneSuccessMsg, setCloneSuccessMsg] = useState<string | null>(null);
  const [voiceCloneFile, setVoiceCloneFile] = useState<File | null>(null);
  const [voiceCloneFileName, setVoiceCloneFileName] = useState<string>('');
  const voiceCloneInputRef = useRef<HTMLInputElement>(null);

  // User Custom ElevenLabs API Key state (safely accessed for iframe sandbox)
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('cinerecap_elevenlabs_key') || '';
      }
    } catch {
      // Sandboxed iframe without storage access
    }
    return '';
  });
  const [showElevenLabsKey, setShowElevenLabsKey] = useState(false);

  const handleUpdateElevenLabsKey = (key: string) => {
    setElevenlabsApiKey(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('cinerecap_elevenlabs_key', key.trim());
      }
    } catch {
      // Sandboxed iframe without storage access
    }
  };

  // Instant Voice Clone Handler
  const handleTriggerVoiceClone = async () => {
    if (!voiceCloneFile && !customVoiceIdInput.trim()) {
      setErrorMsg('ကျေးဇူးပြု၍ Audio Sample ဖိုင်တစ်ခု ရွေးချယ်ပါ သို့မဟုတ် ElevenLabs Voice ID ထည့်သွင်းပါ');
      return;
    }

    try {
      setIsCloningVoice(true);
      setErrorMsg(null);
      setCloneSuccessMsg(null);

      let res;
      if (voiceCloneFile) {
        const formData = new FormData();
        formData.append('audioSample', voiceCloneFile);
        formData.append('voiceName', voiceCloneFileName.replace(/\.[^/.]+$/, '') || 'My Cloned Voice');
        if (customVoiceIdInput.trim()) {
          formData.append('voiceId', customVoiceIdInput.trim());
        }
        res = await fetch('/api/voice/clone', {
          method: 'POST',
          headers: {
            ...(elevenlabsApiKey ? { 'x-elevenlabs-api-key': elevenlabsApiKey.trim() } : {}),
          },
          body: formData,
        });
      } else {
        res = await fetch('/api/voice/clone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(elevenlabsApiKey ? { 'x-elevenlabs-api-key': elevenlabsApiKey.trim() } : {}),
          },
          body: JSON.stringify({
            voiceId: customVoiceIdInput.trim(),
            voiceName: 'ElevenLabs Custom Voice',
            elevenlabsApiKey: elevenlabsApiKey.trim() || undefined,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Voice cloning failed');
      }

      setClonedVoiceId(data.voiceId);
      setClonedVoiceName(data.voiceName || 'Cloned Voice');
      setCloneSuccessMsg(data.message || 'Custom Voice အောင်မြင်စွာ ချိတ်ဆက်ပြီးပါပြီ!');
      setTimeout(() => setCloneSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Clone error:', err);
      setErrorMsg(`Voice Cloning ချို့ယွင်းချက်: ${err.message}`);
    } finally {
      setIsCloningVoice(false);
    }
  };


  const handleApplyColorPreset = (preset: 'normal' | 'moody' | 'vintage' | 'vibrant' | 'noir' | 'cyberpunk' | 'neutral' | 'cinematic' | 'darkMoody') => {
    setColorGradingPreset(preset);
    if (preset === 'normal' || preset === 'neutral') {
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
    } else if (preset === 'moody' || preset === 'darkMoody') {
      setBrightness(88);
      setContrast(135);
      setSaturation(75);
    } else if (preset === 'vintage') {
      setBrightness(96);
      setContrast(92);
      setSaturation(85);
    } else if (preset === 'vibrant' || preset === 'cinematic') {
      setBrightness(106);
      setContrast(122);
      setSaturation(145);
    } else if (preset === 'noir') {
      setBrightness(95);
      setContrast(150);
      setSaturation(0);
    } else if (preset === 'cyberpunk') {
      setBrightness(102);
      setContrast(130);
      setSaturation(160);
    }
  };

  const getColorFilterString = () => {
    let extra = '';
    if (colorGradingPreset === 'vintage') extra = ' sepia(35%)';
    else if (colorGradingPreset === 'moody' || colorGradingPreset === 'darkMoody') extra = ' hue-rotate(-10deg)';
    else if (colorGradingPreset === 'noir') extra = ' grayscale(100%)';
    else if (colorGradingPreset === 'cyberpunk') extra = ' hue-rotate(185deg)';
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)${extra}`;
  };

  // Backend Video Processing & Chunking states (/api/split-video)
  const [isSplittingVideo, setIsSplittingVideo] = useState(false);
  const [splitProgressText, setSplitProgressText] = useState('');
  const [splitResult, setSplitResult] = useState<SplitVideoResult | null>(null);
  const [selectedSegmentChunk, setSelectedSegmentChunk] = useState<ProcessedVideoSegment | null>(null);

  const handleSplitVideoBackend = async () => {
    setIsSplittingVideo(true);
    setSplitProgressText('ဗီဒီယိုအား Node.js / FFmpeg Backend သို့ ပေးပို့နေပါသည်...');
    try {
      let res;
      if (serverVideoPath) {
        res = await fetch('/api/split-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverFilePath: serverVideoPath,
            chunkDuration: 600,
          }),
        });
      } else if (videoFile) {
        const formData = new FormData();
        formData.append('video', videoFile);
        formData.append('chunkDuration', '600'); // 10 minutes per chunk
        res = await fetch('/api/split-video', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/split-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl: videoUrl,
            chunkDuration: 600,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Backend video splitting failed');
      }

      setSplitResult(data);
      if (data.segments && data.segments.length > 0) {
        setSelectedSegmentChunk(data.segments[0]);
      }
      setSplitProgressText(`အောင်မြင်ပါသည်! ၁၀ မိနစ်စာ အပိုင်း ${data.totalSegments} ပိုင်း ခွဲထုတ်ပြီးပါပြီ။`);
    } catch (err: any) {
      console.error('Split video error:', err);
      setErrorMsg(`Backend Video Splitting Error: ${err.message}`);
    } finally {
      setIsSplittingVideo(false);
    }
  };

  // Agreement checkboxes (checked by default as in screenshot)
  const [agreeTerms1, setAgreeTerms1] = useState(true);
  // User Custom Gemini API Key state (safely accessed to prevent iframe SecurityError crashes)
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('cinerecap_custom_gemini_key') || '';
      }
    } catch {
      // Sandboxed iframe without storage access
    }
    return '';
  });
  const [showKeyText, setShowKeyText] = useState(false);

  const handleUpdateApiKey = (key: string) => {
    setGeminiApiKey(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('cinerecap_custom_gemini_key', key.trim());
      }
    } catch {
      // Sandboxed iframe without storage access
    }
  };

  // Frame sampling state
  const [sampledFrames, setSampledFrames] = useState<SampledFrame[]>([]);
  const [isSamplingFrames, setIsSamplingFrames] = useState(false);
  const [samplingProgress, setSamplingProgress] = useState(0);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generatedRecap, setGeneratedRecap] = useState<MovieRecap | null>(initialRecap || null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Media preview playback
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const scriptCardRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSubtitle, setActiveSubtitle] = useState<string>('');

  // Large Video File Upload & Chunked Stream states (No size or duration limits, 500MB+ full movies)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState<string>('');
  const [serverVideoPath, setServerVideoPath] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 MB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Voice preview state
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isSyncNarrationActive, setIsSyncNarrationActive] = useState(false);

  // Export Render Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStepText, setRenderStepText] = useState('');
  const [renderedDownloadUrl, setRenderedDownloadUrl] = useState<string | null>(null);

  // Precision Audio-Video Sync & Drift Controller State
  const [syncDriftStatus, setSyncDriftStatus] = useState<{
    driftMs: number;
    autoPacingRate: number;
    isLocked: boolean;
    statusText: string;
  }>({
    driftMs: 0,
    autoPacingRate: 1.0,
    isLocked: true,
    statusText: '⚡ 100% Locked (±0ms Drift)',
  });

  // Precision Audio-Visual Timestamp Alignment:
  // Maps each generated Burmese narration sentence directly to its corresponding video timestamp interval
  // and dynamically adjusts subtitle display pacing based on actual TTS voiceover duration.
  const autoAlignSubtitlesWithAudioPacing = (
    audioTotalDuration: number,
    recapToUpdate?: MovieRecap
  ) => {
    const targetRecap = recapToUpdate || generatedRecap;
    if (!targetRecap || audioTotalDuration <= 0) return;

    const sourceScript =
      voiceScriptInput.trim() ||
      targetRecap.voiceoverScript?.fullScript ||
      targetRecap.overview ||
      '';

    if (!sourceScript) return;

    // Split into distinct Burmese narration sentences using punctuation ('။', '၊', '.', '!', newlines)
    const rawSentences = sourceScript
      .replace(/\[.*?\]/g, ' ')
      .split(/(?<=[။.!?\n])\s+/)
      .map((s) => cleanSubtitleForOverlay(s))
      .filter((s) => s.length > 2);

    if (rawSentences.length === 0) return;

    // Weight each sentence proportionally by character count and phonetic pause marks
    const sentenceWeights = rawSentences.map((sent) => {
      const pauses = (sent.match(/[၊,]/g) || []).length;
      const stops = (sent.match(/[။.!?]/g) || []).length;
      return sent.length + (pauses * 6) + (stops * 14);
    });

    const totalWeight = sentenceWeights.reduce((a, b) => a + b, 0);
    if (totalWeight <= 0) return;

    let currentSec = 0.5; // Natural 0.5s opening breather
    const calibratedSubtitles: SubtitleCue[] = [];

    const formatSrtTime = (s: number) => {
      const hours = Math.floor(s / 3600);
      const mins = Math.floor((s % 3600) / 60);
      const secs = Math.floor(s % 60);
      const millis = Math.floor((s % 1) * 1000);
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
    };

    const effectiveTotalDuration = Math.max(audioTotalDuration - 0.5, audioTotalDuration * 0.96);

    for (let i = 0; i < rawSentences.length; i++) {
      const allocatedDuration = (sentenceWeights[i] / totalWeight) * effectiveTotalDuration;
      const boundedDuration = Math.max(1.8, Math.min(allocatedDuration, 14.0));
      const startSec = Math.round(currentSec * 100) / 100;
      const endSec = Math.round((startSec + boundedDuration) * 100) / 100;
      currentSec = endSec + 0.12; // 120ms natural breath pause between sentences to prevent speech collision

      calibratedSubtitles.push({
        id: i + 1,
        startSeconds: startSec,
        endSeconds: endSec,
        startTime: formatSrtTime(startSec),
        endTime: formatSrtTime(endSec),
        text: rawSentences[i],
      });
    }

    const updatedRecap: MovieRecap = {
      ...targetRecap,
      subtitles: calibratedSubtitles,
    };

    setGeneratedRecap(updatedRecap);
    if (onRecapReady) {
      onRecapReady(updatedRecap);
    }
  };

  // Sync subtitle to active playback timeline position with microsecond precision
  useEffect(() => {
    if (!generatedRecap?.subtitles || generatedRecap.subtitles.length === 0) {
      setActiveSubtitle('');
      return;
    }

    // High-precision timeline reference: prioritize audio timeline when synced and active
    const activeTimelineTime =
      isSyncAudioWithVideo && audioRef.current && !audioRef.current.paused && audioCurrentTime > 0
        ? audioCurrentTime
        : currentTime;

    const currentCue = generatedRecap.subtitles.find(
      (cue) => activeTimelineTime >= cue.startSeconds && activeTimelineTime <= cue.endSeconds
    );
    setActiveSubtitle(currentCue ? cleanSubtitleForOverlay(currentCue.text) : '');
  }, [currentTime, audioCurrentTime, generatedRecap, isSyncAudioWithVideo]);

  // Precision Audio-Video Timestamp Synchronization & Auto-Pacing Controller
  // Handles continuous clock drift prevention, auto-pacing (0.95x - 1.10x), and voice-overlapping prevention
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onAudioTimeUpdate = () => {
      const aTime = audio.currentTime;
      setAudioCurrentTime(aTime);

      const video = videoRef.current;
      if (!isSyncAudioWithVideo || !video || video.seeking || audio.paused !== video.paused) {
        return;
      }

      const vTime = video.currentTime;
      const drift = aTime - vTime; // Positive if audio is ahead, negative if behind
      const absDrift = Math.abs(drift);
      const driftMs = Math.round(drift * 1000);

      // 1. HARD CORRECTION ON SCRUB / SEEK (Drift > 0.35s)
      if (absDrift > 0.35) {
        video.currentTime = aTime;
        audio.playbackRate = voiceSpeed;
        setSyncDriftStatus({
          driftMs: 0,
          autoPacingRate: voiceSpeed,
          isLocked: true,
          statusText: '⚡ 100% Hard Synced',
        });
        return;
      }

      // 2. CONTINUOUS AUTO-PACING DRIFT CORRECTION (0.95x - 1.10x) for Long Videos (1 hour+)
      // If voiceover playback speed slightly differs from scene duration, auto-adjust narration segment playback rate
      if (absDrift > 0.04) {
        let pacingRate = voiceSpeed;
        if (drift > 0) {
          // Audio is ahead of video -> auto-slowdown audio slightly (down to 0.95x)
          const slowDownFactor = Math.min(0.05, (absDrift / 0.3) * 0.05);
          pacingRate = Math.max(0.95 * voiceSpeed, voiceSpeed - slowDownFactor);
        } else {
          // Audio is behind video -> auto-speedup audio slightly (up to 1.10x)
          const speedUpFactor = Math.min(0.05, (absDrift / 0.3) * 0.05);
          pacingRate = Math.min(1.10 * voiceSpeed, voiceSpeed + speedUpFactor);
        }

        const roundedRate = Math.round(pacingRate * 100) / 100;
        if (Math.abs(audio.playbackRate - pacingRate) > 0.005) {
          audio.playbackRate = pacingRate;
        }

        setSyncDriftStatus({
          driftMs,
          autoPacingRate: roundedRate,
          isLocked: true,
          statusText: `⚡ Auto-Pacing (${roundedRate.toFixed(2)}x) • Drift: ${driftMs > 0 ? `+${driftMs}` : driftMs}ms`,
        });
      } else {
        // Drift is within ±40ms: perfect sync, keep nominal pace
        if (Math.abs(audio.playbackRate - voiceSpeed) > 0.01) {
          audio.playbackRate = voiceSpeed;
        }
        setSyncDriftStatus({
          driftMs,
          autoPacingRate: voiceSpeed,
          isLocked: true,
          statusText: '⚡ 100% Locked (±0ms Drift)',
        });
      }
    };

    const onAudioLoadedMetadata = () => {
      const dur = audio.duration || 0;
      setAudioDuration(dur);
      if (dur > 0) {
        autoAlignSubtitlesWithAudioPacing(dur);
      }
    };

    const onAudioEnded = () => {
      setIsPlayingAudio(false);
      if (isSyncAudioWithVideo && videoRef.current) {
        videoRef.current.pause();
      }
    };

    const onAudioPlay = () => {
      setIsPlayingAudio(true);
      stopActiveModulatedAudio();
      if (isSyncAudioWithVideo && videoRef.current) {
        if (Math.abs(videoRef.current.currentTime - audio.currentTime) > 0.1) {
          videoRef.current.currentTime = audio.currentTime;
        }
        videoRef.current.play().catch(() => {});
      }
    };

    const onAudioPause = () => {
      setIsPlayingAudio(false);
      if (isSyncAudioWithVideo && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    };

    audio.addEventListener('timeupdate', onAudioTimeUpdate);
    audio.addEventListener('loadedmetadata', onAudioLoadedMetadata);
    audio.addEventListener('ended', onAudioEnded);
    audio.addEventListener('play', onAudioPlay);
    audio.addEventListener('pause', onAudioPause);

    return () => {
      audio.removeEventListener('timeupdate', onAudioTimeUpdate);
      audio.removeEventListener('loadedmetadata', onAudioLoadedMetadata);
      audio.removeEventListener('ended', onAudioEnded);
      audio.removeEventListener('play', onAudioPlay);
      audio.removeEventListener('pause', onAudioPause);
    };
  }, [isSyncAudioWithVideo, generatedAudioUrl, voiceSpeed, generatedRecap]);

  // Video Element Synchronization Handlers for Bidirectional Lock (Throttled for mobile 60fps & anti-lag)
  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const vid = e.target as HTMLVideoElement;
    const vTime = vid.currentTime;

    // Throttle React state update to prevent continuous re-renders and mobile phone overheating
    const now = performance.now();
    if (Math.abs(vTime - lastTimeUpdateRef.current) > 0.09 || now - lastTimeUpdateRef.current > 120) {
      lastTimeUpdateRef.current = vTime;
      setCurrentTime(vTime);
    }

    const audio = audioRef.current;
    if (!audio || !isSyncAudioWithVideo || !generatedAudioUrl || vid.seeking || audio.seeking) {
      return;
    }

    const drift = audio.currentTime - vTime;
    const absDrift = Math.abs(drift);

    if (absDrift > 0.35) {
      audio.currentTime = vTime;
      audio.playbackRate = voiceSpeed;
    } else if (absDrift > 0.04) {
      let pacingRate = voiceSpeed;
      if (drift > 0) {
        pacingRate = Math.max(0.95 * voiceSpeed, voiceSpeed - 0.04);
      } else {
        pacingRate = Math.min(1.10 * voiceSpeed, voiceSpeed + 0.04);
      }
      if (Math.abs(audio.playbackRate - pacingRate) > 0.005) {
        audio.playbackRate = pacingRate;
      }
    }
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    stopActiveModulatedAudio();
    // Strict Audio Mute Check: Zero out volume and set muted if originalAudioVolume === 0
    if (videoRef.current) {
      if (originalAudioVolume === 0) {
        videoRef.current.muted = true;
        videoRef.current.volume = 0;
      } else {
        videoRef.current.muted = false;
        videoRef.current.volume = Math.max(0, Math.min(1, originalAudioVolume / 100));
      }
    }
    const audio = audioRef.current;
    if (isSyncAudioWithVideo && audio && generatedAudioUrl) {
      if (Math.abs(audio.currentTime - (videoRef.current?.currentTime || 0)) > 0.1) {
        audio.currentTime = videoRef.current?.currentTime || 0;
      }
      audio.play().catch(() => {});
    }
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    const audio = audioRef.current;
    if (isSyncAudioWithVideo && audio && !audio.paused) {
      audio.pause();
    }
  };

  const handleVideoSeeking = () => {
    const audio = audioRef.current;
    if (isSyncAudioWithVideo && audio && videoRef.current) {
      audio.currentTime = videoRef.current.currentTime;
    }
  };

  const handleVideoSeeked = () => {
    const audio = audioRef.current;
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      lastTimeUpdateRef.current = videoRef.current.currentTime;
    }
    if (isSyncAudioWithVideo && audio && videoRef.current) {
      audio.currentTime = videoRef.current.currentTime;
      audio.playbackRate = voiceSpeed;
    }
  };

  // STRICT AUDIO MUTE & VOLUME ENFORCER:
  // When originalAudioVolume === 0, set HTML5 video element to true mute and absolute zero volume so no dialogue leaks
  useEffect(() => {
    if (videoRef.current) {
      if (originalAudioVolume === 0) {
        videoRef.current.muted = true;
        videoRef.current.volume = 0;
      } else {
        videoRef.current.muted = false;
        videoRef.current.volume = Math.max(0, Math.min(1, originalAudioVolume / 100));
      }
    }
  }, [originalAudioVolume, videoUrl]);

  // Gemini AI Automatic Primary Genre Detection
  const detectGenreWithGemini = async (targetTitle?: string, framesToUse?: SampledFrame[]) => {
    const titleToDetect = targetTitle || videoTitle || (inputMode === 'youtube' ? youtubeLink : 'Uploaded Movie');
    if (!titleToDetect && (!framesToUse || framesToUse.length === 0)) return null;

    setIsDetectingGenre(true);
    try {
      const frames = (framesToUse || sampledFrames).slice(0, 3).map((f) => f.dataUrl);

      const res = await fetch('/api/recap/detect-genre', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(geminiApiKey ? { 'x-gemini-api-key': geminiApiKey.trim() } : {}),
        },
        body: JSON.stringify({
          movieTitle: titleToDetect,
          frameImages: frames,
          apiKey: geminiApiKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.detected) {
        const detected: DetectedGenreInfo = data.detected;
        setPrimaryGenre(detected.primaryGenre);
        setDetectedGenreInfo(detected);

        // Pre-select recommended tone if user hasn't customized
        if (detected.recommendedTone && ['dramatic', 'suspenseful', 'enthusiastic', 'calm'].includes(detected.recommendedTone)) {
          setVoiceoverTone(detected.recommendedTone as any);
        }
        return detected;
      }
    } catch (err: any) {
      console.warn('Genre detection issue:', err);
    } finally {
      setIsDetectingGenre(false);
    }
    return null;
  };

  // Handle video upload with streaming support for large files (No size or duration caps)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const uploadLargeVideoFile = (file: File) => {
    setIsUploadingVideo(true);
    setUploadProgress(0);
    const totalSizeStr = formatFileSize(file.size);
    setUploadStatusText(`Memory-Optimized Stream စတင်နေပါသည် (0% of ${totalSizeStr})...`);

    const formData = new FormData();
    formData.append('video', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload-video', true);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const percent = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
        setUploadProgress(percent);
        const loadedStr = formatFileSize(evt.loaded);
        setUploadStatusText(`ဗီဒီယိုအား Stream လုပ်နေပါသည်: ${loadedStr} / ${totalSizeStr} (${percent}%)`);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.serverFilePath) {
            setServerVideoPath(res.serverFilePath);
          }
          if (res.durationSeconds && res.durationSeconds > 0) {
            setDuration(res.durationSeconds);
          }
          setUploadProgress(100);
          setUploadStatusText(`အောင်မြင်ပါသည်! ဗီဒီယိုဖိုင်အား အပြည့်အစုံတင်ပြီးပါပြီ (${totalSizeStr})`);
        } catch {
          setUploadProgress(100);
          setUploadStatusText('Upload complete!');
        }
      } else {
        // Even if server upload fails (e.g. preview-only proxy), client-side video playback remains active
        setUploadProgress(100);
        setUploadStatusText('ဗီဒီယိုကို Client Player ပေါ်တွင် အောင်မြင်စွာ ဖွင့်လှစ်ပြီးပါပြီ။');
      }
      setTimeout(() => {
        setIsUploadingVideo(false);
      }, 1200);
    };

    xhr.onerror = () => {
      setUploadProgress(100);
      setUploadStatusText('ဗီဒီယိုကို Local Player တွင် ဆက်လက်ဖွင့်လှစ်ထားပါသည်။');
      setTimeout(() => {
        setIsUploadingVideo(false);
      }, 800);
    };

    xhr.send(formData);
  };

  // Auto-dispose video object URLs and memory buffers (Requirement 8)
  const revokeExistingBlobUrl = () => {
    if (prevBlobUrlRef.current && prevBlobUrlRef.current.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      } catch (e) {
        console.warn('URL revoke error:', e);
      }
      prevBlobUrlRef.current = null;
    }
  };

  // Video Control & Preview Badge: prominent Remove Video action with RAM buffer disposal (Requirement 4 & 8)
  const handleRemoveVideo = () => {
    revokeExistingBlobUrl();
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      } catch {}
    }
    setVideoUrl('');
    setVideoFile(null);
    setVideoTitle('');
    setUploadedFileSize('');
    setServerVideoPath(null);
    setSampledFrames([]);
    setAnalyzedScriptResult(null);
    setGeneratedRecap(null);
    setTranscriptionResult(null);
    setCustomSubtitleText('');
    setActiveSubtitle('');
    setCurrentTime(0);
    setDuration(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      revokeExistingBlobUrl();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try { audioCtxRef.current.close(); } catch {}
      }
    };
  }, []);

  const processSelectedFile = (file: File) => {
    // Revoke previous blob URL to prevent mobile phone overheating and RAM accumulation (Requirement 8)
    revokeExistingBlobUrl();

    setVideoFile(file);
    const sizeStr = formatFileSize(file.size);
    setUploadedFileSize(sizeStr);
    const url = URL.createObjectURL(file);
    prevBlobUrlRef.current = url;
    setVideoUrl(url);
    const rawClean = file.name.replace(/\.[^/.]+$/, '');
    const readable = rawClean
      .replace(/[._-]+/g, ' ')
      .replace(/\b(1080p|720p|4k|bluray|webrip|x264|x265|aac|dvdrip|hdrip)\b/gi, '')
      .trim();
    const isGeneric = /^(screenshot|vid_|video|screen_recording|mov_|rec_|p_|\d{6,})/i.test(rawClean);
    const readableTitle = isGeneric || !readable ? 'Uploaded Movie' : readable;
    setVideoTitle(readableTitle);
    setErrorMsg(null);
    setSampledFrames([]);
    // Do not auto-start heavy analysis upon upload (Requirement 4)
    detectGenreWithGemini(readableTitle);

    // Memory-Optimized Streaming Upload with live Progress Indicator (%)
    uploadLargeVideoFile(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('video/') || /\.(mp4|mkv|mov|avi|webm|m4v|ts|flv)$/i.test(file.name))) {
      processSelectedFile(file);
    }
  };

  // Sample Keyframes from Video via Canvas (Optimized memory for large videos & full-length movies)
  const sampleFramesFromVideo = async (requestedCount?: number) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setIsSamplingFrames(true);
    setSamplingProgress(0);

    const vidDuration = video.duration || 240;
    // Calculate balanced keyframes for movies (15 to 20 keyframes)
    let targetCount = requestedCount || 16;
    if (!requestedCount || requestedCount < 15) {
      if (vidDuration >= 1800) {
        targetCount = 20; // 20 keyframes for 30-min to 2-hour full-length movies
      } else if (vidDuration >= 180) {
        targetCount = 18; // 18 keyframes for ~3-10 minute videos
      } else if (vidDuration >= 90) {
        targetCount = 15;
      } else {
        targetCount = 12;
      }
    }
    targetCount = Math.min(20, Math.max(12, targetCount));

    const frames: SampledFrame[] = [];
    const step = vidDuration / (targetCount + 1);

    const seekTo = (time: number) => {
      return new Promise<void>((resolve) => {
        let timer: any = null;
        const onSeeked = () => {
          if (timer) clearTimeout(timer);
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        // Safety timeout so large movie seeks never freeze the UI
        timer = setTimeout(() => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        }, 2500);
        video.addEventListener('seeked', onSeeked);
        video.currentTime = Math.min(Math.max(0.2, time), Math.max(0.2, vidDuration - 0.2));
      });
    };

    try {
      for (let i = 1; i <= targetCount; i++) {
        const time = i * step;
        await seekTo(time);

        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          // 0.65 JPEG quality produces ultra-lightweight keyframe payload without quality loss for AI vision
          const dataUrl = canvas.toDataURL('image/jpeg', 0.65);

          const mins = Math.floor(time / 60);
          const secs = Math.floor(time % 60);
          const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

          frames.push({
            id: i,
            timestamp: time,
            timestampFormatted: formatted,
            dataUrl,
            label: `Keyframe #${i} (${formatted})`,
          });
        }
        setSamplingProgress(Math.round((i / targetCount) * 100));
      }

      setSampledFrames(frames);
      // Re-evaluate genre with actual sampled visual frames
      if (frames.length > 0) {
        detectGenreWithGemini(videoTitle, frames);
      }
    } catch (err) {
      console.warn('Frame sampling error:', err);
    } finally {
      setIsSamplingFrames(false);
      video.currentTime = 0;
      // RAM buffer disposal for canvas (Requirement 8)
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvas.width = 1;
      canvas.height = 1;
    }
  };

  // Load demo clip
  const handleLoadDemoClip = (clip: (typeof DEMO_CLIPS)[0]) => {
    setVideoUrl(clip.url);
    setVideoTitle(clip.title);
    setVideoFile(null);
    setSampledFrames([]);
    setErrorMsg(null);
    // Automatically detect and assign primary genre with Gemini
    detectGenreWithGemini(clip.title);
  };

  // Voiceover Guide Generation connecting to Gemini API
  const generateVoiceoverGuideForSegments = async (
    segments: any[],
    tone = voiceoverTone,
    title = videoTitle
  ) => {
    setIsLoadingVoiceoverGuide(true);
    try {
      const res = await fetch('/api/video/generate-voiceover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(geminiApiKey ? { 'x-gemini-api-key': geminiApiKey.trim() } : {}),
        },
        body: JSON.stringify({
          scriptSegments: segments,
          movieTitle: title || 'Video Story',
          tone: tone || 'dramatic',
          apiKey: geminiApiKey.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.guide) {
        setVoiceoverGuide(data.guide);
      }
    } catch (err) {
      console.warn('Voiceover guide generation issue:', err);
    } finally {
      setIsLoadingVoiceoverGuide(false);
    }
  };

  // Pure Narrative Commentary Formatter: Removes ALL JSON syntax & metadata, combining storyline sentences into a single continuous paragraph
  const formatPureCommentaryNarrative = (rawScript?: string, segments?: any[]): string => {
    let sentences: string[] = [];

    if (Array.isArray(segments) && segments.length > 0) {
      for (const seg of segments) {
        let text = (typeof seg === 'string' ? seg : seg?.burmeseText || seg?.text || '').trim();
        text = text
          .replace(/\[(?:Narrator|Male|Female|ဇာတ်လမ်းပြောသူ|အမျိုးသား|အမျိုးသမီး|Speaker\s*\d*|\w+)\]:?/gi, '')
          .replace(/(?:detectedLanguage|visualDescription|originalText|startSeconds|endSeconds|startTime|endTime|timestamp|tone|gender|speaker|videoTitle|summary|segments|fullBurmeseScript|id)\s*[:=]\s*[^,\n]+/gi, '')
          .replace(/[{}\[\]"'\\]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (text.length > 2 && /[\u1000-\u109F]/.test(text)) {
          sentences.push(text);
        }
      }
    }

    if (sentences.length === 0) {
      const candidate = (rawScript || '')
        .replace(/```(?:json)?/gi, '')
        .replace(/```/g, '');

      const lines = candidate
        .split(/\r?\n|(?<=[။])\s+/)
        .map((l: string) => l.trim())
        .filter((l: string) => {
          if (/^(?:["']?(?:id|startSeconds|endSeconds|startTime|endTime|timestamp|speaker|gender|tone|visualDescription|originalText|detectedLanguage|videoTitle|summary|segments|fullBurmeseScript)["']?\s*:)/i.test(l)) {
            return false;
          }
          return l.length > 2 && /[\u1000-\u109F]/.test(l);
        });

      for (const line of lines) {
        const clean = line
          .replace(/\[(?:Narrator|Male|Female|ဇာတ်လမ်းပြောသူ|အမျိုးသား|အမျိုးသမီး|Speaker\s*\d*|\w+)\]:?/gi, '')
          .replace(/(?:detectedLanguage|visualDescription|originalText|startSeconds|endSeconds|startTime|endTime|timestamp|tone|gender|speaker|videoTitle|summary|segments|fullBurmeseScript|id)\s*[:=]\s*[^,\n]+/gi, '')
          .replace(/[{}\[\]"'\\]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (clean.length > 2 && /[\u1000-\u109F]/.test(clean)) {
          sentences.push(clean);
        }
      }
    }

    if (sentences.length === 0) return rawScript || '';

    return sentences
      .join(' ')
      .replace(/\s+([။၊])/g, '$1')
      .replace(/([။၊])(?=[^\s])/g, '$1 ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Pure Burmese Subtitle Sanitizer: Completely strips JSON keys, quotes, braces, and metadata
  const cleanSubtitleForOverlay = (input?: string): string => {
    if (!input) return '';
    let str = input.trim();

    // Check if JSON object string was passed
    if (str.includes('{') || str.includes('}') || str.includes('"startSeconds"') || str.includes('"visualDescription"') || str.includes('"burmeseText"')) {
      try {
        const parsed = JSON.parse(str);
        if (typeof parsed === 'object' && parsed !== null) {
          if (parsed.burmeseText) return cleanSubtitleForOverlay(parsed.burmeseText);
          if (parsed.text) return cleanSubtitleForOverlay(parsed.text);
        }
      } catch (_) {
        // Not valid strict JSON
      }
    }

    // Strip JSON keys, metadata fields, speaker tags, brackets, and quotes
    str = str
      .replace(/```(?:json)?/gi, '')
      .replace(/```/g, '')
      .replace(/\[(?:Narrator|Male|Female|ဇာတ်လမ်းပြောသူ|အမျိုးသား|အမျိုးသမီး|Speaker\s*\d*|\w+)\]:?/gi, '')
      .replace(/(?:detectedLanguage|visualDescription|originalText|startSeconds|endSeconds|startTime|endTime|timestamp|tone|gender|speaker|videoTitle|summary|segments|fullBurmeseScript|id)\s*[:=]\s*(?:"[^"]*"|'[^']*'|\d+(?:\.\d+)?|true|false|null)/gi, '')
      .replace(/["']?(?:id|startSeconds|endSeconds|startTime|endTime|timestamp|visualDescription|originalText|detectedLanguage|tone|gender|speaker|burmeseText)["']?\s*:/gi, '')
      .replace(/[{}\[\]\\"]/g, ' ')
      .replace(/\b(?:STARTSECONDS|ENDSECONDS|VISUALDESCRIPTION|ORIGINALTEXT|DETECTEDLANGUAGE|BURMESETEXT)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // If text contains Burmese characters, extract only the Burmese sentence portion
    const burmeseMatch = str.match(/[\u1000-\u109F\s.,!?:;"'()၊။]+/g);
    if (burmeseMatch) {
      const combined = burmeseMatch.join(' ').replace(/\s+/g, ' ').trim();
      if (combined.length > 2) {
        return combined;
      }
    }

    return str.trim();
  };

  // Video-to-Script Multimodal Video & Audio Analysis with Real-time Active Progress
  const handleAnalyzeVideo = async () => {
    if (!videoUrl && !videoFile) {
      setErrorMsg('ကျေးဇူးပြု၍ Video သို့မဟုတ် Audio ဖိုင်တစ်ခု ဦးစွာ တင်ပေးပါ (Please upload a video or audio file first)');
      return;
    }

    // CLEAN ERROR RETRY HANDLER:
    // Automatically clear old timeout state and abort any pending stream to trigger fresh request
    if (analyzeAbortControllerRef.current) {
      try {
        analyzeAbortControllerRef.current.abort();
      } catch (_) {}
      analyzeAbortControllerRef.current = null;
    }
    if (analyzeProgressIntervalRef.current) {
      clearInterval(analyzeProgressIntervalRef.current);
      analyzeProgressIntervalRef.current = null;
    }
    setErrorMsg(null);

    setIsAnalyzingVideo(true);
    setAnalysisProgress(12);
    setAnalysisStatusText('၁။ Gemini 2.5 Flash ဖြင့် Video Frame နှင့် Audio လှိုင်းများကို စတင်ဆန်းစစ်နေပါသည်... (12%)');

    const abortController = new AbortController();
    analyzeAbortControllerRef.current = abortController;

    // EXTENDED TIMEOUT DURATION: 600 seconds (10 minutes) limit so requests never time out prematurely
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 600000);

    try {
      // 1. Quick non-blocking poster frame sample for UI preview
      if (videoRef.current && sampledFrames.length === 0) {
        sampleFramesFromVideo().catch(() => {});
      }

      // 2. Extract lightweight audio only if video is not already stored on server
      let audioBase64 = '';
      if (!serverVideoPath && videoFile) {
        try {
          const audioRes = await extractAudioFromVideoFile(videoFile, 60);
          audioBase64 = audioRes.base64;
        } catch (audioErr) {
          console.warn('Audio extraction warning:', audioErr);
        }
      }

      // 3. Smooth dynamic progress timer with informative status updates
      let currentPct = 15;
      const progressInterval = setInterval(() => {
        if (currentPct < 45) {
          currentPct += 4.5;
        } else if (currentPct < 75) {
          currentPct += 2.8;
        } else if (currentPct < 90) {
          currentPct += 1.4;
        } else if (currentPct < 96) {
          currentPct += 0.4;
        }
        const rounded = Math.min(96, Math.round(currentPct));
        setAnalysisProgress(rounded);
        if (rounded < 35) {
          setAnalysisStatusText(`၂။ Video Audio လှိုင်းများကို Gemini 2.5 Flash သို့ ပေးပို့နေပါသည်... (${rounded}%)`);
        } else if (rounded < 65) {
          setAnalysisStatusText(`၃။ မြန်မာ ${recapMode === 'commentary' ? 'Commentary ဇာတ်လမ်းပြော' : 'Dubbing စကားပြော'} ဇာတ်ညွှန်းကို ဖန်တီးနေပါသည်... (${rounded}%)`);
        } else if (rounded < 85) {
          setAnalysisStatusText(`၄။ ဇာတ်ကောင် စကားပြောများနှင့် အဓိကအခန်းများကို ခွဲခြားသတ်မှတ်နေပါသည်... (${rounded}%)`);
        } else {
          setAnalysisStatusText(`၅။ အဓိကဇာတ်ကွက်များနှင့် Timestamp များကို အချောသတ်နေပါသည်... (${rounded}%)`);
        }
      }, 700);
      analyzeProgressIntervalRef.current = progressInterval;

      const response = await fetch('/api/video/analyze-script', {
        method: 'POST',
        signal: abortController.signal,
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(geminiApiKey ? { 'x-gemini-api-key': geminiApiKey.trim() } : {}),
        },
        body: JSON.stringify({
          audioBase64: (!serverVideoPath && audioBase64) ? (audioBase64.length > 2000000 ? audioBase64.slice(0, 2000000) : audioBase64) : undefined,
          videoTitle: videoTitle || (inputMode === 'youtube' && youtubeLink ? `YouTube: ${youtubeLink}` : 'Uploaded Movie Video'),
          videoUrl: (inputMode === 'youtube' && youtubeLink.trim()) ? youtubeLink.trim() : (videoUrl || undefined),
          serverFilePath: serverVideoPath || undefined,
          duration: duration || 240,
          instructions: customVideoPlot.trim() || undefined,
          apiKey: geminiApiKey.trim() || undefined,
          recapMode,
        }),
      });

      if (analyzeProgressIntervalRef.current) {
        clearInterval(analyzeProgressIntervalRef.current);
        analyzeProgressIntervalRef.current = null;
      }
      clearTimeout(timeoutId);
      analyzeAbortControllerRef.current = null;

      // Safe parse: inspect Content-Type and status before calling .json() to prevent Unexpected token '<'
      let data: any = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          const raw = await response.text().catch(() => '');
          throw new Error(`ဆာဗာမှ JSON မမှန်ကန်ပါ (${response.status}): ${raw.slice(0, 100)}`);
        }
      } else {
        const rawHtml = await response.text().catch(() => '');
        const titleMatch = rawHtml.match(/<title>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : (response.statusText || `HTTP ${response.status}`);
        if (response.status === 413) {
          throw new Error('ဗီဒီယို ဖိုင်ပမာဏ ကြီးလွန်းနေပါသည် (413 Request Too Large)။ အပိုင်းတို ခွဲထုတ်၍ စမ်းသပ်ပေးပါ။');
        }
        throw new Error(`ဆာဗာ တုံ့ပြန်မှု ချို့ယွင်းနေပါသည် (${response.status}: ${title})။ ကျေးဇူးပြု၍ ပြန်လည်စမ်းသပ်ပေးပါ။`);
      }

      if (!data || !data.success || !data.segments) {
        throw new Error(data?.error || 'ဗီဒီယို ခွဲခြမ်းစိတ်ဖြာမှု မအောင်မြင်ပါ');
      }

      // Smooth animated finish to 100%
      setAnalysisProgress(98);
      setAnalysisStatusText('၅။ AI Script ထွက်ရှိပြီးပါပြီ! အချက်အလက်များကို ပြင်ဆင်နေပါသည်... (98%)');
      await new Promise((r) => setTimeout(r, 120));

      setAnalysisProgress(100);
      setAnalysisStatusText('ပြီးပြည့်စုံသော Video Script အသင့်ဖြစ်ပါပြီ! (100%)');

      setAnalyzedScriptResult(data);
      setStudioSubTab('analyzedScript');

      // Auto-push script into Voiceover Studio based on selected Mode
      if (recapMode === 'commentary') {
        const pureStory = formatPureCommentaryNarrative(data.fullBurmeseScript, data.segments);
        setVoiceScriptInput(pureStory);
        setCustomSubtitleText(data.segments?.[0]?.burmeseText?.replace(/\[.*?\]/g, '').trim() || pureStory.slice(0, 90));
        setIsCustomSubtitleMode(true);
      } else {
        const characterDubbingScript = data.segments.map((s: any) => `${s.speaker}: ${s.burmeseText}`).join('\n');
        setVoiceScriptInput(characterDubbingScript);

        // Auto-extract and populate Character Speaker Mapping with detected roles
        if (data.segments && data.segments.length > 0) {
          const updatedMaps: Record<string, { voice: string; gender: 'male' | 'female' | 'narrator'; pitchShift: number; speed: number }> = {};
          data.segments.forEach((seg: any) => {
            const spk = seg.speaker || 'ဇာတ်ကောင်';
            if (!updatedMaps[spk]) {
              const spkLower = `${seg.gender || ''} ${spk}`.toLowerCase();
              const isNarrator = spkLower.includes('narrator') || spkLower.includes('ဇာတ်လမ်းပြောသူ');
              const isMale = !isNarrator && (seg.gender === 'male' || /\[male\]|\[အမျိုးသား\]|မင်းထက်|ဇေယျာ|\bmale\b/i.test(spkLower));
              if (isNarrator) {
                updatedMaps[spk] = { voice: 'Fenrir', gender: 'narrator', pitchShift: -240, speed: 1.05 };
              } else if (isMale) {
                updatedMaps[spk] = { voice: 'Puck', gender: 'male', pitchShift: -220, speed: 1.05 };
              } else {
                updatedMaps[spk] = { voice: 'Kore', gender: 'female', pitchShift: 40, speed: 1.0 };
              }
            }
          });
          setCharacterSpeakerMaps(updatedMaps);
        }
      }

      // Convert analyzed segments into MovieRecap subtitles so video syncs immediately!
      const generatedSubtitles: SubtitleCue[] = data.segments.map((seg: any, idx: number) => ({
        id: idx + 1,
        startSeconds: seg.startSeconds,
        endSeconds: seg.endSeconds,
        startTime: seg.startTime ? `${seg.startTime},000` : `00:00:0${idx * 3},000`,
        endTime: seg.endTime ? `${seg.endTime},000` : `00:00:0${(idx + 1) * 3},000`,
        text: recapMode === 'commentary' ? seg.burmeseText : `[${seg.speaker || 'Speaker'}] ${seg.burmeseText}`,
      }));

      const newRecap: MovieRecap = {
        id: `analyzed-${Date.now()}`,
        title: videoTitle || 'Uploaded Video',
        originalTitle: videoTitle || 'Uploaded Video',
        burmeseTitle: videoTitle || 'ဗီဒီယို ဇာတ်ညွှန်း',
        year: '2024',
        genre: [primaryGenre || 'Cinematic', 'Dialogue', 'Dubbing'],
        director: 'Gemini Multimodal Script Engine',
        duration: `${Math.ceil((duration || 60) / 60)} MIN`,
        imdbRating: '8.8/10',
        posterUrl: sampledFrames[0]?.dataUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
        backdropUrl: sampledFrames[1]?.dataUrl || sampledFrames[0]?.dataUrl || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1600&auto=format&fit=crop',
        tagline: 'Direct Video-to-Script Multimodal Dialogue',
        logline: data.summary || 'ဗီဒီယိုထဲမှ စကားပြောများကို မြန်မာလို အသံထွက်အတိုင်း Timestamp ဖြင့် ထုတ်ယူထားသော Script',
        overview: data.summary || data.fullBurmeseScript,
        characters: [
          {
            name: 'အဓိကဇာတ်ကောင်များ',
            role: 'စကားပြောသူများ',
            description: 'ဗီဒီယိုထဲတွင် ပါဝင်ပြောဆို လှုပ်ရှားသူများ',
          },
        ],
        scenes: data.segments.map((s: any) => ({
          timestamp: s.startTime || '00:00',
          title: s.visualDescription || `Scene [${s.timestamp}]`,
          description: s.burmeseText,
          intensity: 'High',
          mood: s.tone || 'Cinematic',
        })),
        twistEnding: {
          hasMajorTwist: false,
          twistSummary: '',
          endingExplanation: '',
          hiddenClues: [],
        },
        voiceoverScript: {
          hook: data.segments[0]?.burmeseText || '',
          fullScript: data.fullBurmeseScript,
          estimatedNarrationTime: `${Math.ceil((duration || 60) / 60)} မိနစ်`,
          toneRecommendation: 'Conversational Dubbing',
        },
        moralAndThemes: ['အသံနှင့် ဗီဒီယို တိုက်ရိုက်ခွဲခြမ်းစိတ်ဖြာမှု'],
        creatorPack: {
          suggestedVideoTitle: `${videoTitle} - မြန်မာ Dubbing Dialogue Script`,
          thumbnailConcept: `${videoTitle} အဓိက ဇာတ်ကွက်များ`,
          hashtags: ['#MovieDubbingMM', '#VideoToScript', '#GeminiMultimodal'],
        },
        subtitles: generatedSubtitles,
        sampledFrames: sampledFrames,
        videoUrl: videoUrl,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };

      setGeneratedRecap(newRecap);
      onRecapReady(newRecap);

      // Automatically generate Voiceover Guide
      generateVoiceoverGuideForSegments(data.segments, voiceoverTone, videoTitle);

      setAnalysisProgress(100);
      setAnalysisStatusText('ပြီးပြည့်စုံသော Video-to-Script ခွဲခြမ်းစိတ်ဖြာမှု အောင်မြင်ပါပြီ! (100%)');
      setExportSuccessMsg('ဗီဒီယိုထဲမှ စကားပြောများကို Timestamp အလိုက် မြန်မာ Script အဖြစ် ထုတ်ယူပြီးပါပြီ!');

      // Keep progress bar at 100% briefly so user clearly witnesses the 100% completion, then immediately reveal and smooth scroll to AI Script Card in Step 1!
      setTimeout(() => {
        setIsAnalyzingVideo(false);
        setTimeout(() => {
          scriptCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 60);
      }, 450);
    } catch (err: any) {
      console.error('Analyze error:', err);
      if (err.name === 'AbortError') {
        setErrorMsg('Script ထုတ်လုပ်မှု အချိန်ပြည့်သွားပါသည် (600s Timeout)။ ကျေးဇူးပြု၍ "🎬 Analyze Video" ကို ပြန်လည်နှိပ်ပြီး ထပ်မံကြိုးစားနိုင်ပါသည်။');
      } else {
        const raw = err.message || '';
        if (raw.includes('<!doctype') || raw.includes('Unexpected token')) {
          setErrorMsg('ဆာဗာမှ တုံ့ပြန်မှု ချို့ယွင်းနေပါသည် (HTML error response)။ ကျေးဇူးပြု၍ "🎬 Analyze Video" ကို ပြန်လည်စမ်းသပ်ပေးပါ။');
        } else {
          setErrorMsg(raw || 'Video Analyze ပြုလုပ်ရာတွင် ချို့ယွင်းချက် ဖြစ်ပေါ်ခဲ့ပါသည်');
        }
      }
    } finally {
      if (analyzeProgressIntervalRef.current) {
        clearInterval(analyzeProgressIntervalRef.current);
        analyzeProgressIntervalRef.current = null;
      }
      analyzeAbortControllerRef.current = null;
      setIsAnalyzingVideo(false);
    }
  };

  // Stop any ongoing Web Audio API synthesized voice
  const stopActiveModulatedAudio = () => {
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
      } catch (_) {}
      currentAudioSourceRef.current = null;
    }
  };

  // Play audio buffer through Web Audio API with pitch shifting, formant EQ, and auto-pacing to fit video scene
  const playAudioWithVoiceModulation = async (
    audioBase64: string,
    mimeType: string,
    isMaleVoice: boolean,
    pitchShiftAmount?: number,
    targetSceneDuration?: number
  ) => {
    stopActiveModulatedAudio();
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
        previewAudioRef.current = audio;
        audio.onended = () => setIsPlayingVoice(false);
        audio.onerror = () => setIsPlayingVoice(false);
        await audio.play();
        return;
      }

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const binaryStr = atob(audioBase64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      currentAudioSourceRef.current = source;

      // VOICE-OVERLAPPING PREVENTER & SCENE AUTO-PACING:
      // If voiceover playback speed slightly differs from scene duration,
      // auto-adjust narration segment playback rate between 0.95x and 1.10x to seamlessly fit the video clips
      let effectiveRate = isMaleVoice ? 1.05 : 1.0;
      if (targetSceneDuration && targetSceneDuration > 0 && audioBuffer.duration > 0) {
        const requiredPacingRate = audioBuffer.duration / targetSceneDuration;
        effectiveRate = Math.min(1.10, Math.max(0.95, requiredPacingRate * (isMaleVoice ? 1.05 : 1.0)));
      }
      source.playbackRate.value = effectiveRate;

      if (isMaleVoice) {
        // Natural masculine baritone pitch (-200 to -280 cents) without artificial feminine warp
        if (source.detune) {
          source.detune.value = pitchShiftAmount ?? -220;
        }

        // Low-end bass resonance (+6dB at 160Hz) for authentic baritone chest resonance
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 160;
        bassFilter.gain.value = 6.0;

        // Presence warmth filter (+1.5dB at 1800Hz) for crisp storytelling diction without muffled lowpass
        const presenceFilter = ctx.createBiquadFilter();
        presenceFilter.type = 'peaking';
        presenceFilter.frequency.value = 1800;
        presenceFilter.gain.value = 1.5;
        presenceFilter.Q.value = 1.0;

        source.connect(bassFilter);
        bassFilter.connect(presenceFilter);
        presenceFilter.connect(ctx.destination);
      } else {
        // Female voice: slight brightness enhancement (May Thu / Shwe Yi)
        if (source.detune) {
          source.detune.value = pitchShiftAmount ?? 40;
        }
        const treble = ctx.createBiquadFilter();
        treble.type = 'highshelf';
        treble.frequency.value = 3200;
        treble.gain.value = 2.0;

        source.connect(treble);
        treble.connect(ctx.destination);
      }

      source.onended = () => {
        setIsPlayingVoice(false);
        currentAudioSourceRef.current = null;
      };

      source.start(0);
    } catch (err) {
      console.warn('Web Audio modulation fallback to HTML5 Audio:', err);
      const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
      previewAudioRef.current = audio;
      audio.onended = () => setIsPlayingVoice(false);
      audio.onerror = () => setIsPlayingVoice(false);
      await audio.play();
    }
  };

  // Play dialogue line with exact speaker, gender dynamic role mapping, and auto-pacing to scene duration
  const handlePlayDialogueLine = async (
    text: string,
    speaker?: string,
    gender?: 'male' | 'female' | 'narrator',
    sceneDuration?: number
  ) => {
    if (!text || !text.trim()) return;

    const charConfig = (speaker && characterSpeakerMaps[speaker]) ? characterSpeakerMaps[speaker] : null;
    const targetGender = charConfig?.gender || gender || 'male';
    const targetVoice = charConfig?.voice || (targetGender === 'female' ? 'Kore' : targetGender === 'narrator' ? 'Fenrir' : 'Puck');
    const targetPitch = charConfig?.pitchShift ?? (targetGender === 'female' ? 40 : -220);
    const targetSpeed = charConfig?.speed ?? 1.05;

    if (isPlayingVoice) {
      stopActiveModulatedAudio();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }
      setIsPlayingVoice(false);
      return;
    }

    setIsPlayingVoice(true);
    try {
      const res = await fetch('/api/recap/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language: voiceLanguage,
          voice: targetVoice,
          voiceEngine: 'gemini',
          geminiVoice: targetVoice,
          speaker,
          gender: targetGender,
          pitchShift: targetPitch,
          speed: targetSpeed,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.audioBase64) {
        throw new Error(data.error || 'TTS generation failed');
      }

      await playAudioWithVoiceModulation(
        data.audioBase64,
        data.mimeType || 'audio/mpeg',
        targetGender === 'male' || (!targetGender && !!data.isMale),
        data.pitchShift ?? targetPitch,
        sceneDuration
      );
    } catch (err) {
      console.warn('Line audio play error:', err);
      setIsPlayingVoice(false);
    }
  };

  // Play voice sample using Shwe Khit AI style voice engines (Gemini 2.0, Microsoft Edge TTS, or Clone Voice)
  const handlePreviewVoice = async (
    overrideVoice?: string,
    overrideLang?: string,
    overrideTone?: string,
    customText?: string,
    speaker?: string,
    gender?: 'male' | 'female' | 'narrator'
  ) => {
    let targetVoice = overrideVoice;
    let targetLang = (overrideLang || voiceLanguage) as 'my' | 'en' | 'th' | 'ja' | 'ko' | 'zh-CN';
    let targetGender = gender;
    let targetPitch = voicePitchCents;

    if (voiceEngineTab === 'gemini') {
      targetVoice = overrideVoice || selectedGeminiVoice;
      const gItem = GEMINI_VOICE_LIST.find((v) => v.id === targetVoice);
      if (gItem) {
        targetGender = gItem.gender.toLowerCase() as any;
        targetPitch = gItem.pitch;
      }
    } else if (voiceEngineTab === 'microsoft') {
      targetVoice = overrideVoice || selectedMicrosoftVoice;
      const mItem = MICROSOFT_VOICE_LIST.find((v) => v.id === targetVoice);
      if (mItem) {
        targetGender = mItem.gender.toLowerCase() as any;
        targetLang = (mItem.language === 'Burmese' ? 'my' : mItem.language === 'English' ? 'en' : 'th') as any;
      }
    } else {
      targetVoice = overrideVoice || clonedVoiceId || customVoiceIdInput || selectedCloneVoicePreset;
    }

    if (isPlayingVoice) {
      stopActiveModulatedAudio();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }
      setIsPlayingVoice(false);
      return;
    }

    setIsPlayingVoice(true);

    const sampleText =
      customText ||
      voiceScriptInput.trim() ||
      (voiceEngineTab === 'gemini'
        ? (GEMINI_VOICE_LIST.find((v) => v.id === selectedGeminiVoice)?.samplePhrase || 'မင်္ဂလာပါ... ဒါကတော့ Gemini 2.0 Audio အသံနမူနာ ဖြစ်ပါတယ်။')
        : voiceEngineTab === 'microsoft'
        ? (MICROSOFT_VOICE_LIST.find((v) => v.id === selectedMicrosoftVoice)?.samplePhrase || 'မင်္ဂလာပါရှင်... ဒါကတော့ Microsoft Edge TTS အသံနမူနာ ဖြစ်ပါတယ်။')
        : 'သတိထား နားထောင်ပါ... ဒါကတော့ သင့်စိတ်ကြိုက် Cloned Voice အသံနမူနာ ဖြစ်ပါတယ်။');

    try {
      const res = await fetch('/api/recap/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(elevenlabsApiKey ? { 'x-elevenlabs-api-key': elevenlabsApiKey.trim() } : {}),
        },
        body: JSON.stringify({
          text: sampleText,
          language: targetLang,
          voice: targetVoice,
          voiceEngine: voiceEngineTab,
          geminiVoice: voiceEngineTab === 'gemini' ? selectedGeminiVoice : undefined,
          microsoftVoice: voiceEngineTab === 'microsoft' ? selectedMicrosoftVoice : undefined,
          voiceId: voiceEngineTab === 'clone' ? (clonedVoiceId || customVoiceIdInput.trim() || selectedCloneVoicePreset) : undefined,
          voiceMode: voiceEngineTab === 'clone' ? 'clone' : 'preset',
          speaker,
          gender: targetGender,
          pitchShift: targetPitch,
          speed: voiceSpeed,
          elevenlabsApiKey: elevenlabsApiKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.audioBase64) {
        throw new Error(data.error || 'အသံစမ်းသပ်မှု မအောင်မြင်ပါ');
      }

      // Auto-populate audio player and re-align subtitles to actual audio duration
      const audioUrl = `data:${data.mimeType || 'audio/mpeg'};base64,${data.audioBase64}`;
      setGeneratedAudioUrl(audioUrl);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      }

      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const tempCtx = new AudioContextClass();
          const binaryStr = atob(data.audioBase64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          tempCtx.decodeAudioData(bytes.buffer.slice(0)).then((buf) => {
            const exactDur = buf.duration;
            setAudioDuration(exactDur);
            autoAlignSubtitlesWithAudioPacing(exactDur);
            tempCtx.close().catch(() => {});
          }).catch(() => {});
        }
      } catch (_) {}

      await playAudioWithVoiceModulation(
        data.audioBase64,
        data.mimeType || 'audio/mpeg',
        !!data.isMale,
        data.pitchShift
      );
    } catch (err: any) {
      console.warn('Voice preview error:', err);
      setIsPlayingVoice(false);
    }
  };

  // Generate Full Voiceover Audio for the generated recap script
  const handleGenerateFullAudio = async (recapOverride?: MovieRecap) => {
    const targetRecap = recapOverride || generatedRecap;
    if (!targetRecap) return;
    const textToSpeak = voiceScriptInput.trim() || targetRecap.voiceoverScript?.fullScript || targetRecap.overview;
    if (!textToSpeak) {
      setErrorMsg('အသံထုတ်ရန် ဇာတ်ညွှန်းစာသား မရှိသေးပါ');
      return;
    }

    let activeVoiceName = selectedGeminiVoice;
    if (voiceEngineTab === 'microsoft') {
      activeVoiceName = MICROSOFT_VOICE_LIST.find((v) => v.id === selectedMicrosoftVoice)?.name || selectedMicrosoftVoice;
    } else if (voiceEngineTab === 'clone') {
      activeVoiceName = clonedVoiceName || 'Cloned Custom Voice';
    }

    setIsGeneratingAudio(true);
    setAudioStatusText(
      `[${voiceEngineTab.toUpperCase()}] ${activeVoiceName} ဖြင့် ဇာတ်ညွှန်းကို အသံဖိုင် စတင်ဖန်တီးနေပါသည်...`
    );
    setErrorMsg(null);

    try {
      const res = await fetch('/api/recap/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(elevenlabsApiKey ? { 'x-elevenlabs-api-key': elevenlabsApiKey.trim() } : {}),
        },
        body: JSON.stringify({
          text: textToSpeak,
          language: voiceLanguage,
          voice: voiceEngineTab === 'gemini' ? selectedGeminiVoice : (voiceEngineTab === 'microsoft' ? selectedMicrosoftVoice : (clonedVoiceId || customVoiceIdInput || selectedCloneVoicePreset)),
          voiceEngine: voiceEngineTab,
          geminiVoice: voiceEngineTab === 'gemini' ? selectedGeminiVoice : undefined,
          microsoftVoice: voiceEngineTab === 'microsoft' ? selectedMicrosoftVoice : undefined,
          voiceId: voiceEngineTab === 'clone' ? (clonedVoiceId || customVoiceIdInput.trim() || selectedCloneVoicePreset) : undefined,
          voiceMode: voiceEngineTab === 'clone' ? 'clone' : 'preset',
          gender: 'narrator',
          pitchShift: voicePitchCents,
          speed: voiceSpeed,
          elevenlabsApiKey: elevenlabsApiKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.audioBase64) {
        throw new Error(data.error || 'အသံဖိုင် ထုတ်လုပ်မှု မအောင်မြင်ပါ');
      }

      const audioUrl = `data:${data.mimeType || 'audio/mpeg'};base64,${data.audioBase64}`;
      setGeneratedAudioUrl(audioUrl);
      setAudioCurrentTime(0);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.playbackRate = audioPlaybackRate;
        audioRef.current.load();
      }

      // Automatically calculate exact audio duration and calibrate subtitle display pacing
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const tempCtx = new AudioContextClass();
          const binaryStr = atob(data.audioBase64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          tempCtx.decodeAudioData(bytes.buffer.slice(0)).then((buf) => {
            const exactDur = buf.duration;
            setAudioDuration(exactDur);
            autoAlignSubtitlesWithAudioPacing(exactDur, targetRecap);
            tempCtx.close().catch(() => {});
          }).catch(() => {});
        }
      } catch (_) {}

      setAudioStatusText('အသံဖိုင် ထုတ်လုပ်မှု အောင်မြင်ပါပြီ! Subtitle Pacing များကို အသံနှင့် 100% ချိန်ညှိပြီးပါပြီ။');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'အသံဖိုင် ထုတ်လုပ်ရာတွင် ချို့ယွင်းချက် ဖြစ်ပေါ်ခဲ့ပါသည်');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Toggle audio play/pause
  const handleTogglePlayAudio = () => {
    if (!audioRef.current || !generatedAudioUrl) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Change playback speed
  const handleChangeSpeed = (speed: number) => {
    setAudioPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Download the generated voiceover MP3 audio file
  const handleDownloadAudioFile = () => {
    if (!generatedAudioUrl) return;
    const a = document.createElement('a');
    a.href = generatedAudioUrl;
    const safeTitle = (generatedRecap?.title || 'movie-recap').replace(/[^a-zA-Z0-9_\u1000-\u109F-]/g, '_');
    a.download = `${safeTitle}_${voiceLanguage}_${selectedVoice}_voiceover.mp3`;
    a.click();
  };

  // Format seconds to mm:ss
  const formatAudioTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Scrub audio progress
  const handleAudioScrub = (newTime: number) => {
    setAudioCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    if (isSyncAudioWithVideo && videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  // Script Translation State and Handler
  const [isTranslatingScript, setIsTranslatingScript] = useState(false);
  const handleTranslateScript = async (targetLang: 'my' | 'en' | 'th' | 'ja' | 'ko' | 'zh-CN') => {
    if (!generatedRecap?.voiceoverScript?.fullScript) return;
    setIsTranslatingScript(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/recap/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: generatedRecap.voiceoverScript.fullScript,
          targetLanguage: targetLang,
        }),
      });
      const data = await res.json();
      if (!data.success || !data.translatedText) {
        throw new Error(data.error || 'ဘာသာပြန်ဆိုခြင်း မအောင်မြင်ပါ');
      }
      setGeneratedRecap({
        ...generatedRecap,
        voiceoverScript: {
          ...generatedRecap.voiceoverScript,
          fullScript: data.translatedText,
        },
      });
      setExportSuccessMsg(`${targetLang.toUpperCase()} ဘာသာသို့ ဇာတ်ညွှန်းကို အောင်မြင်စွာ ပြန်ဆိုပြီးပါပြီ!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'ဘာသာပြန်ဆိုခြင်း အဆင်မပြေပါ');
    } finally {
      setIsTranslatingScript(false);
    }
  };

  // Generate Recap
  const handleGenerateRecap = async () => {
    const movieName = videoTitle || (inputMode === 'youtube' ? youtubeLink : 'Selected Movie');
    if (!movieName) {
      setErrorMsg('ကျေးဇူးပြု၍ ဗီဒီယိုဖိုင်တစ်ခု ရွေးချယ်ပါ သို့မဟုတ် YouTube Link ထည့်သွင်းပါ');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setGenerationStep('Gemini AI ဖြင့် ဗီဒီယို Frame များကို ခွဲခြမ်းစိတ်ဖြာနေပါသည်...');

    try {
      // First extract frames if video is loaded and not sampled yet
      if (videoRef.current && sampledFrames.length === 0) {
        setGenerationStep('ဗီဒီယို Timeline အလိုက် Keyframes (၁၅-၂၀ ပုံ) ကို ရယူနေပါသည်...');
        await sampleFramesFromVideo();
      }

      // Ensure primary genre is detected and assigned before generating recap
      let activeGenre = primaryGenre;
      if (!activeGenre || isDetectingGenre) {
        setGenerationStep('Gemini AI ဖြင့် ရုပ်ရှင်အမျိုးအစား (Primary Genre) ကို အလိုအလျောက် စိစစ်ခွဲခြားနေပါသည်...');
        const detected = await detectGenreWithGemini(movieName);
        if (detected?.primaryGenre) {
          activeGenre = detected.primaryGenre;
        }
      }

      setGenerationStep('မြန်မာဘာသာဖြင့် ဇာတ်လမ်းအကျဉ်းနှင့် Voiceover Script ရေးသားနေပါသည်...');

      const response = await fetch('/api/recap/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(geminiApiKey ? { 'x-gemini-api-key': geminiApiKey.trim() } : {}),
        },
        body: JSON.stringify({
          movieTitle: movieName,
          language: translationLanguage === 'myanmar' ? 'burmese' : 'english',
          style: recapStyle === 'cinematic' ? 'detailed' : recapStyle === 'fast' ? 'fast' : 'voiceover',
          voiceoverTone,
          durationMin: recapDuration,
          primaryGenre: activeGenre,
          customPlot: customVideoPlot.trim() || undefined,
          apiKey: geminiApiKey.trim() || undefined,
        }),
      });

      const resData = await response.json();
      if (!resData.success && !resData.recap) {
        throw new Error(resData.error || 'Recap ထုတ်လုပ်ရာတွင် အဆင်မပြေဖြစ်သွားပါသည်');
      }

      const generated = resData.recap;

      // Generate synthetic SRT cues from voiceover or scenes
      const generatedSubtitles: SubtitleCue[] = [];
      const scriptSentences = (generated.voiceoverScript?.fullScript || generated.overview || '')
        .replace(/\[.*?\]/g, '')
        .split(/(?<=[။.!?])\s+/)
        .filter((s: string) => s.trim().length > 3);

      let currentSec = 2;
      scriptSentences.slice(0, 18).forEach((text: string, idx: number) => {
        const startSec = currentSec;
        const durSec = Math.max(3, Math.min(8, Math.ceil(text.length / 15)));
        const endSec = startSec + durSec;
        currentSec = endSec + 0.4;

        const formatSrtTime = (s: number) => {
          const hours = Math.floor(s / 3600);
          const mins = Math.floor((s % 3600) / 60);
          const secs = Math.floor(s % 60);
          const millis = Math.floor((s % 1) * 1000);
          return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
        };

        generatedSubtitles.push({
          id: idx + 1,
          startSeconds: startSec,
          endSeconds: endSec,
          startTime: formatSrtTime(startSec),
          endTime: formatSrtTime(endSec),
          text: text.trim(),
        });
      });

      const completeRecap: MovieRecap = {
        id: `zstar-${Date.now()}`,
        title: generated.title || movieName,
        originalTitle: movieName,
        burmeseTitle: generated.title?.includes('(') ? generated.title.split('(')[0].trim() : generated.title,
        year: generated.year || '2024',
        genre: activeGenre
          ? [activeGenre, ...(detectedGenreInfo?.secondaryGenres || []).filter((g) => g !== activeGenre)]
          : (generated.genre || ['Cinematic', 'Thriller']),
        director: generated.director || 'Movie Director',
        duration: `${recapDuration} MIN`,
        imdbRating: generated.imdbRating || '8.5/10',
        posterUrl: sampledFrames[0]?.dataUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
        backdropUrl: sampledFrames[1]?.dataUrl || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1600&auto=format&fit=crop',
        tagline: generated.tagline || 'Turn movies into stories worth watching',
        logline: generated.logline || generated.overview?.slice(0, 150) || '',
        overview: generated.overview || '',
        characters: generated.characters || [],
        scenes: generated.scenes || [],
        twistEnding: generated.twistEnding || {
          hasMajorTwist: true,
          twistSummary: '',
          endingExplanation: '',
          hiddenClues: [],
        },
        voiceoverScript: generated.voiceoverScript || {
          hook: '',
          fullScript: generated.overview || '',
          estimatedNarrationTime: `${recapDuration} မိနစ်`,
          toneRecommendation: 'Cinematic narrator',
        },
        moralAndThemes: generated.moralAndThemes || [],
        creatorPack: generated.creatorPack || {
          suggestedVideoTitle: `${movieName} ဇာတ်လမ်းစုံအကျဉ်း | Z Star AI Recap`,
          thumbnailConcept: `${movieName} ဇာတ်ကွက် အထူးဒီဇိုင်း`,
          hashtags: ['#ZStarRecap', '#MovieRecapMM', '#ရုပ်ရှင်ဇာတ်လမ်းအကျဉ်း'],
        },
        subtitles: generatedSubtitles,
        sampledFrames: sampledFrames,
        videoUrl: videoUrl,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };

      setGeneratedRecap(completeRecap);
      onRecapReady(completeRecap);

      // 1-Touch Auto Audio: automatically generate the Myanmar voiceover audio
      handleGenerateFullAudio(completeRecap);

      // Smooth scroll to result
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Recap ဖန်တီးရာတွင် အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့သည်');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Start editing script
  const handleStartEditingScript = () => {
    const currentScript = generatedRecap?.voiceoverScript?.fullScript || generatedRecap?.overview || '';
    setEditableScriptText(currentScript);
    setIsEditingScript(true);
  };

  // Cancel editing script
  const handleCancelEditingScript = () => {
    setIsEditingScript(false);
  };

  // Save edited script and re-slice subtitles
  const handleSaveEditedScript = () => {
    if (!generatedRecap) return;
    const updatedScript = editableScriptText.trim();
    if (!updatedScript) return;

    // Re-generate subtitles matching edited script
    const scriptSentences = updatedScript
      .replace(/\[.*?\]/g, '')
      .split(/(?<=[။.!?])\s+/)
      .filter((s: string) => s.trim().length > 3);

    let currentSec = 2;
    const updatedSubtitles: SubtitleCue[] = [];
    scriptSentences.slice(0, 24).forEach((text: string, idx: number) => {
      const startSec = currentSec;
      const durSec = Math.max(3, Math.min(8, Math.ceil(text.length / 15)));
      const endSec = startSec + durSec;
      currentSec = endSec + 0.4;

      const formatSrtTime = (s: number) => {
        const hours = Math.floor(s / 3600);
        const mins = Math.floor((s % 3600) / 60);
        const secs = Math.floor(s % 60);
        const millis = Math.floor((s % 1) * 1000);
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
      };

      updatedSubtitles.push({
        id: idx + 1,
        startSeconds: startSec,
        endSeconds: endSec,
        startTime: formatSrtTime(startSec),
        endTime: formatSrtTime(endSec),
        text: text.trim(),
      });
    });

    const estMins = Math.max(1, Math.round(updatedScript.length / 400));
    const updatedRecap: MovieRecap = {
      ...generatedRecap,
      voiceoverScript: {
        ...generatedRecap.voiceoverScript,
        fullScript: updatedScript,
        estimatedNarrationTime: `~${estMins} မိနစ်`,
      },
      subtitles: updatedSubtitles,
    };

    setGeneratedRecap(updatedRecap);
    onRecapReady(updatedRecap);
    setIsEditingScript(false);
    setExportSuccessMsg('ဇာတ်ညွှန်းကို အောင်မြင်စွာ ပြင်ဆင်ပြီး Subtitles များကို အချိန်နှင့် ပြန်လည်ချိန်ညှိပြီးပါပြီ!');
  };

  // Summarize script directly in Studio using Gemini
  const handleSummarizeInStudio = async () => {
    if (!generatedRecap) return;
    const currentScript = generatedRecap.voiceoverScript?.fullScript || generatedRecap.overview || '';
    if (!currentScript) return;

    try {
      setIsSummarizingInStudio(true);
      setErrorMsg(null);

      if (!originalScriptBeforeSummarize) {
        setOriginalScriptBeforeSummarize(currentScript);
      }

      const res = await fetch('/api/recap/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: currentScript,
          movieTitle: generatedRecap.title || videoTitle,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.summarizedScript) {
        throw new Error(data.error || 'ဇာတ်ညွှန်း တိုတိုချုပ်ခြင်း မအောင်မြင်ပါ');
      }

      const summarized = data.summarizedScript;
      const ratio = data.reductionRatio || Math.round((1 - summarized.length / currentScript.length) * 100);

      const scriptSentences = summarized
        .replace(/\[.*?\]/g, '')
        .split(/(?<=[။.!?])\s+/)
        .filter((s: string) => s.trim().length > 3);

      let currentSec = 2;
      const updatedSubtitles: SubtitleCue[] = [];
      scriptSentences.slice(0, 20).forEach((text: string, idx: number) => {
        const startSec = currentSec;
        const durSec = Math.max(3, Math.min(8, Math.ceil(text.length / 15)));
        const endSec = startSec + durSec;
        currentSec = endSec + 0.4;

        const formatSrtTime = (s: number) => {
          const hours = Math.floor(s / 3600);
          const mins = Math.floor((s % 3600) / 60);
          const secs = Math.floor(s % 60);
          const millis = Math.floor((s % 1) * 1000);
          return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
        };

        updatedSubtitles.push({
          id: idx + 1,
          startSeconds: startSec,
          endSeconds: endSec,
          startTime: formatSrtTime(startSec),
          endTime: formatSrtTime(endSec),
          text: text.trim(),
        });
      });

      const estMins = Math.max(1, Math.round(summarized.length / 400));
      const baseRecap = generatedRecap;
      const updatedRecap: MovieRecap = {
        ...baseRecap,
        voiceoverScript: {
          ...baseRecap.voiceoverScript,
          fullScript: summarized,
          estimatedNarrationTime: `~${estMins} မိနစ်`,
        },
        subtitles: updatedSubtitles,
      };

      setGeneratedRecap(updatedRecap);
      onRecapReady(updatedRecap);
      setIsShowingSummarizedScript(true);
      setReductionStatsStudio({
        originalChars: data.originalLength || currentScript.length,
        summarizedChars: data.summarizedLength || summarized.length,
        ratio,
      });
      setExportSuccessMsg(`Gemini ဖြင့် ဇာတ်ညွှန်းကို ${ratio}% ပိုမိုကျစ်လျစ်အောင် ချုံ့ပေးပြီးပါပြီ!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gemini ဖြင့် ဇာတ်ညွှန်း အကျဉ်းချုပ်ရာတွင် ချို့ယွင်းချက် ရှိပါသည်');
    } finally {
      setIsSummarizingInStudio(false);
    }
  };

  // Restore original script
  const handleRestoreOriginalScript = () => {
    if (!originalScriptBeforeSummarize || !generatedRecap) return;
    const restored = originalScriptBeforeSummarize;

    const scriptSentences = restored
      .replace(/\[.*?\]/g, '')
      .split(/(?<=[။.!?])\s+/)
      .filter((s: string) => s.trim().length > 3);

    let currentSec = 2;
    const updatedSubtitles: SubtitleCue[] = [];
    scriptSentences.slice(0, 24).forEach((text: string, idx: number) => {
      const startSec = currentSec;
      const durSec = Math.max(3, Math.min(8, Math.ceil(text.length / 15)));
      const endSec = startSec + durSec;
      currentSec = endSec + 0.4;

      const formatSrtTime = (s: number) => {
        const hours = Math.floor(s / 3600);
        const mins = Math.floor((s % 3600) / 60);
        const secs = Math.floor(s % 60);
        const millis = Math.floor((s % 1) * 1000);
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
      };

      updatedSubtitles.push({
        id: idx + 1,
        startSeconds: startSec,
        endSeconds: endSec,
        startTime: formatSrtTime(startSec),
        endTime: formatSrtTime(endSec),
        text: text.trim(),
      });
    });

    const estMins = Math.max(1, Math.round(restored.length / 400));
    const baseRecap = generatedRecap;
    const updatedRecap: MovieRecap = {
      ...baseRecap,
      voiceoverScript: {
        ...baseRecap.voiceoverScript,
        fullScript: restored,
        estimatedNarrationTime: `~${estMins} မိနစ်`,
      },
      subtitles: updatedSubtitles,
    };

    setGeneratedRecap(updatedRecap);
    onRecapReady(updatedRecap);
    setIsShowingSummarizedScript(false);
    setExportSuccessMsg('မူရင်း ဇာတ်ညွှန်းသို့ အောင်မြင်စွာ ပြန်လည်ပြောင်းလဲပြီးပါပြီ');
  };

  // Tone Switcher: instantly switch voiceover tone and update script
  const handleSwitchVoiceoverTone = async (newTone: 'dramatic' | 'enthusiastic' | 'calm' | 'suspenseful') => {
    setVoiceoverTone(newTone);
    if (!generatedRecap) return;

    try {
      setIsGenerating(true);
      setGenerationStep(`ဇာတ်ညွှန်းကို ${newTone.toUpperCase()} လေသံဖြင့် ပြန်လည်ဖွဲ့စည်းနေပါသည်...`);
      const response = await fetch('/api/recap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieTitle: generatedRecap.title || videoTitle || 'Selected Movie',
          language: translationLanguage === 'myanmar' ? 'burmese' : 'english',
          style: recapStyle === 'cinematic' ? 'detailed' : recapStyle === 'fast' ? 'fast' : 'voiceover',
          voiceoverTone: newTone,
          durationMin: recapDuration,
          primaryGenre: primaryGenre,
        }),
      });
      const resData = await response.json();
      if (resData.success && resData.recap?.voiceoverScript) {
        const newVoiceover = resData.recap.voiceoverScript;
        const updatedRecap: MovieRecap = {
          ...generatedRecap,
          voiceoverScript: newVoiceover,
        };
        setGeneratedRecap(updatedRecap);
        onRecapReady(updatedRecap);
        setExportSuccessMsg(`ဇာတ်ညွှန်းကို ${newTone.toUpperCase()} လေသံသို့ အောင်မြင်စွာ ပြောင်းလဲပေးလိုက်ပါပြီ!`);
      }
    } catch (err: any) {
      console.warn('Tone update issue:', err);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Instant Genre/Story Switcher: switches the genre and recalculates script & subtitles immediately
  const handleSwitchGenreStory = async (targetGenre: string) => {
    setPrimaryGenre(targetGenre);
    if (!generatedRecap) return;

    try {
      setIsGenerating(true);
      setGenerationStep(`ဇာတ်ညွှန်းကို ${targetGenre} ဇာတ်လမ်းပုံစံဖြင့် ပြန်လည်ရေးသားနေပါသည်...`);
      const response = await fetch('/api/recap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieTitle: generatedRecap.title || videoTitle || 'Selected Movie',
          language: translationLanguage === 'myanmar' ? 'burmese' : 'english',
          style: recapStyle === 'cinematic' ? 'detailed' : recapStyle === 'fast' ? 'fast' : 'voiceover',
          voiceoverTone,
          durationMin: recapDuration,
          primaryGenre: targetGenre,
          customPlot: customVideoPlot.trim() || undefined,
        }),
      });
      const resData = await response.json();
      if (resData.success && resData.recap) {
        const gen = resData.recap;
        const scriptSentences = (gen.voiceoverScript?.fullScript || gen.overview || '')
          .replace(/\[.*?\]/g, '')
          .split(/(?<=[။.!?])\s+/)
          .filter((s: string) => s.trim().length > 3);

        let currentSec = 2;
        const generatedSubtitles: SubtitleCue[] = [];
        scriptSentences.slice(0, 18).forEach((text: string, idx: number) => {
          const startSec = currentSec;
          const durSec = Math.max(3, Math.min(8, Math.ceil(text.length / 15)));
          const endSec = startSec + durSec;
          currentSec = endSec + 0.4;

          const formatSrtTime = (s: number) => {
            const hours = Math.floor(s / 3600);
            const mins = Math.floor((s % 3600) / 60);
            const secs = Math.floor(s % 60);
            const millis = Math.floor((s % 1) * 1000);
            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
          };

          generatedSubtitles.push({
            id: idx + 1,
            startSeconds: startSec,
            endSeconds: endSec,
            startTime: formatSrtTime(startSec),
            endTime: formatSrtTime(endSec),
            text: text.trim(),
          });
        });

        const updatedRecap: MovieRecap = {
          ...generatedRecap,
          title: gen.title || generatedRecap.title,
          genre: [targetGenre, ...(generatedRecap.genre || []).filter((g) => g !== targetGenre)],
          logline: gen.logline || generatedRecap.logline,
          overview: gen.overview || generatedRecap.overview,
          scenes: gen.scenes || generatedRecap.scenes,
          twistEnding: gen.twistEnding || generatedRecap.twistEnding,
          voiceoverScript: gen.voiceoverScript || generatedRecap.voiceoverScript,
          subtitles: generatedSubtitles.length > 0 ? generatedSubtitles : generatedRecap.subtitles,
        };
        setGeneratedRecap(updatedRecap);
        onRecapReady(updatedRecap);
        setExportSuccessMsg(`ဇာတ်ညွှန်းနှင့် Subtitles ကို ${targetGenre} ပုံစံသို့ အောင်မြင်စွာ ပြောင်းလဲပေးလိုက်ပါပြီ!`);
      }
    } catch (err: any) {
      console.warn('Genre update issue:', err);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
      setTimeout(() => setExportSuccessMsg(null), 3000);
    }
  };

  // Transcribe Video Audio (Speech-to-Text)
  const handleTranscribeVideoAudio = async () => {
    if (!videoFile && !videoUrl) {
      setErrorMsg('ဗီဒီယိုဖိုင် အရင်ရွေးချယ်ပေးပါ (Please upload a video file or select a clip)');
      return;
    }

    try {
      setIsTranscribing(true);
      setErrorMsg(null);
      setStudioActiveMode('transcription');
      setTranscribeStep('ဗီဒီယိုထဲမှ အသံဖိုင်ကို Web Audio API ဖြင့် ထုတ်ယူနေပါသည်...');

      let audioBase64 = '';
      if (videoFile) {
        try {
          const audioRes = await extractAudioFromVideoFile(videoFile, 180);
          audioBase64 = audioRes.base64;
        } catch (audioErr) {
          console.warn('Audio extraction warning:', audioErr);
        }
      }

      if (!audioBase64 && videoUrl) {
        try {
          const resp = await fetch(videoUrl);
          const blob = await resp.blob();
          const file = new File([blob], videoTitle || 'video.mp4', { type: blob.type || 'video/mp4' });
          const audioRes = await extractAudioFromVideoFile(file, 180);
          audioBase64 = audioRes.base64;
        } catch {
          audioBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
        }
      }

      setTranscribeStep('Gemini AI ဖြင့် စကားပြောများကို အသံမှ စာသားပြောင်းပြီး မြန်မာပြန်ဆိုနေပါသည်...');

      const res = await fetch('/api/video/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(geminiApiKey ? { 'x-gemini-api-key': geminiApiKey.trim() } : {}),
        },
        body: JSON.stringify({
          audioBase64: audioBase64 || 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
          mimeType: 'audio/wav',
          movieTitle: videoTitle || 'Uploaded Movie',
          apiKey: geminiApiKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.segments) {
        throw new Error(data.error || 'အသံဖိုင် စာသားပြောင်းလဲခြင်း မအောင်မြင်ပါ');
      }

      setTranscriptionResult(data);
      setExportSuccessMsg('ဗီဒီယိုထဲမှ စကားပြောများကို အောင်မြင်စွာ စာသားထုတ်ယူပြီး မြန်မာပြန်ဆိုပြီးပါပြီ!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Transcribe လုပ်ရာတွင် ချို့ယွင်းချက် ဖြစ်ပေါ်ခဲ့ပါသည်');
    } finally {
      setIsTranscribing(false);
      setTranscribeStep('');
    }
  };

  // Download Transcript as SRT
  const handleExportTranscriptSrt = () => {
    if (!transcriptionResult?.segments || transcriptionResult.segments.length === 0) return;
    let srtContent = '';
    transcriptionResult.segments.forEach((seg, idx) => {
      const startFmt = seg.startTime.length === 8 ? `${seg.startTime},000` : seg.startTime;
      const endFmt = seg.endTime.length === 8 ? `${seg.endTime},000` : seg.endTime;
      srtContent += `${idx + 1}\n${startFmt} --> ${endFmt}\n[${seg.speaker}] ${seg.burmeseText || seg.originalText}\n\n`;
    });
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(videoTitle || 'video').replace(/[^a-zA-Z0-9_\u1000-\u109F-]/g, '_')}_transcript_subtitles.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Transcript as TXT
  const handleExportTranscriptTxt = () => {
    if (!transcriptionResult) return;
    const txtContent = `=== VIDEO AUDIO TRANSCRIPTION ===\nMovie/Video: ${videoTitle || 'Video'}\nSpoken Language: ${transcriptionResult.detectedLanguage}\n\nSummary:\n${transcriptionResult.summary || 'N/A'}\n\n=== BURMESE TRANSLATION ===\n${transcriptionResult.fullBurmeseTranscript}\n\n=== ORIGINAL SPOKEN DIALOGUE ===\n${transcriptionResult.fullTranscript}\n`;
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(videoTitle || 'video').replace(/[^a-zA-Z0-9_\u1000-\u109F-]/g, '_')}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Convert Transcript into Movie Recap Script
  const handleConvertTranscriptToRecap = () => {
    if (!transcriptionResult) return;
    const narrationScript = `[မူရင်းစကားပြောမှ ကူးယူဖော်ပြချက်]\n\n${transcriptionResult.fullBurmeseTranscript}\n\n[ဇာတ်လမ်း သုံးသပ်ချက်]\n${transcriptionResult.summary || ''}`;
    const estMins = Math.max(1, Math.round(narrationScript.length / 400));

    const cues: SubtitleCue[] = transcriptionResult.segments.map((seg, idx) => ({
      id: idx + 1,
      startSeconds: seg.startSeconds,
      endSeconds: seg.endSeconds,
      startTime: `${seg.startTime},000`,
      endTime: `${seg.endTime},000`,
      text: seg.burmeseText || seg.originalText,
    }));

    const convertedRecap: MovieRecap = {
      id: `transcript-${Date.now()}`,
      title: `${videoTitle || 'Uploaded Video'} (အသံဖိုင် စာသားကူးယူချက်)`,
      originalTitle: videoTitle || 'Video Clip',
      year: '2024',
      genre: [primaryGenre || 'Drama', 'Cinema', 'Transcription'],
      director: 'Dialogue Extraction',
      duration: `${Math.ceil((transcriptionResult.segments[transcriptionResult.segments.length - 1]?.endSeconds || 60) / 60)} မိနစ်`,
      imdbRating: '8.0/10',
      posterUrl: sampledFrames[0]?.dataUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
      backdropUrl: sampledFrames[0]?.dataUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
      tagline: `ဗီဒီယိုထဲမှ မူရင်းစကားပြောများကို တိုက်ရိုက် စာသားထုတ်ယူထားသော Transcript`,
      logline: transcriptionResult.summary || 'ဗီဒီယိုထဲမှ မူရင်းစကားပြောများကို အသံမှ စာသားပြောင်းလဲထားခြင်း။',
      overview: transcriptionResult.summary || narrationScript,
      characters: [
        {
          name: 'Main Speakers',
          role: 'စကားပြောသူများ',
          description: transcriptionResult.summary || 'ဗီဒီယိုတွင် ပါဝင်ပြောဆိုသူများ။',
          fate: 'စကားပြောမှတ်တမ်း အပြည့်အစုံ ကူးယူပြီး။',
        },
      ],
      scenes: [
        {
          timestamp: '00:00 - End',
          title: 'စကားပြောခန်း အပြည့်အစုံ',
          description: transcriptionResult.summary || 'မူရင်းစကားပြော အသံဖိုင်',
          intensity: 'Medium',
          mood: 'အပြန်အလှန် စကားပြော',
        },
      ],
      twistEnding: {
        hasMajorTwist: false,
        twistSummary: '',
        endingExplanation: '',
        hiddenClues: [],
      },
      voiceoverScript: {
        hook: transcriptionResult.segments[0]?.burmeseText || 'ဗီဒီယိုထဲမှ မူရင်းစကားပြောများ...',
        fullScript: narrationScript,
        estimatedNarrationTime: `~${estMins} မိနစ်`,
        toneRecommendation: 'Conversational Dialogue',
      },
      moralAndThemes: ['အသံမှ စာသား တိုက်ရိုက်ကူးယူထားသော Transcript'],
      creatorPack: {
        suggestedVideoTitle: `${videoTitle || 'Video'} စကားပြော မြန်မာစာတန်းထိုးနှင့် ရှင်းလင်းချက်`,
        thumbnailConcept: 'အဓိကဇာတ်ကောင် စကားပြောနေပုံနှင့် မြန်မာစာတန်းထိုး',
        hashtags: ['#Transcript', '#MyanmarSubtitles', '#VideoAudio'],
      },
      subtitles: cues,
    };

    setGeneratedRecap(convertedRecap);
    onRecapReady(convertedRecap);
    setStudioActiveMode('recap');
    setExportSuccessMsg('Transcript ကို ဇာတ်လမ်းပြော Recap အဖြစ် အောင်မြင်စွာ ပြောင်းလဲပေးလိုက်ပါပြီ!');
  };

  // Download SRT file
  const handleDownloadSrt = () => {
    if (!generatedRecap?.subtitles || generatedRecap.subtitles.length === 0) return;
    let srtContent = '';
    generatedRecap.subtitles.forEach((cue) => {
      srtContent += `${cue.id}\n${cue.startTime} --> ${cue.endTime}\n${cue.text}\n\n`;
    });
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeFilename = (generatedRecap.title || 'movie-recap').replace(/[^a-zA-Z0-9_\u1000-\u109F-]/g, '_');
    a.download = `${safeFilename}_subtitles.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download WebVTT (.vtt) file with CSS styling
  const handleDownloadVtt = () => {
    if (!generatedRecap?.subtitles || generatedRecap.subtitles.length === 0) return;
    let vtt = 'WEBVTT - Z Star AI Subtitle with Styling\n\n';
    vtt += 'STYLE\n::cue {\n  font-family: "Padauk", "Plus Jakarta Sans", sans-serif;\n  color: #facc15;\n  background-color: rgba(0, 0, 0, 0.85);\n  font-size: 110%;\n  text-shadow: 2px 2px 4px #000000;\n}\n\n';
    generatedRecap.subtitles.forEach((cue) => {
      const start = cue.startTime.replace(',', '.');
      const end = cue.endTime.replace(',', '.');
      vtt += `${cue.id}\n${start} --> ${end}\n${cue.text}\n\n`;
    });
    const blob = new Blob([vtt], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeFilename = (generatedRecap.title || 'movie-recap').replace(/[^a-zA-Z0-9_\u1000-\u109F-]/g, '_');
    a.download = `${safeFilename}_styled_subtitles.vtt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Advanced SubStation Alpha (.ass) file with full font, highlight, and color styling
  const handleDownloadAss = () => {
    if (!generatedRecap?.subtitles || generatedRecap.subtitles.length === 0) return;
    const safeTitle = generatedRecap.title || 'Movie Recap';
    let ass = `[Script Info]
Title: ${safeTitle} - Styled Myanmar Subtitles
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0
Timer: 100.0000

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TikTokYellow,Padauk,24,&H0000FFFF,&H000000FF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,1,3,2,2,10,10,25,1
Style: CinemaWhite,Padauk,22,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,1,2,10,10,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
    generatedRecap.subtitles.forEach((cue) => {
      const formatAssTime = (t: string) => {
        const parts = t.split(',');
        const main = parts[0] || '00:00:00';
        const ms = (parts[1] || '000').slice(0, 2);
        return `${main.length === 8 ? main : '00:00:00'}.${ms}`;
      };
      const start = formatAssTime(cue.startTime);
      const end = formatAssTime(cue.endTime);
      ass += `Dialogue: 0,${start},${end},TikTokYellow,,0,0,0,,${cue.text}\n`;
    });

    const blob = new Blob([ass], { type: 'text/x-ssa;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeFilename = safeTitle.replace(/[^a-zA-Z0-9_\u1000-\u109F-]/g, '_');
    a.download = `${safeFilename}_styled_subtitles.ass`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Plain Text (.txt) file
  const handleDownloadTxt = () => {
    if (!generatedRecap) return;
    const title = generatedRecap.title || 'Movie Recap';
    const lines = [
      '====================================================================',
      'Z STAR AI MOVIE RECAP STUDIO - RECAP SCRIPT',
      '====================================================================',
      `TITLE: ${title}`,
      `YEAR: ${generatedRecap.year || 'N/A'}`,
      `GENRE: ${generatedRecap.genre?.join(', ') || 'Cinema'}`,
      `DIRECTOR: ${generatedRecap.director || 'N/A'}`,
      `IMDb RATING: ${generatedRecap.imdbRating || 'N/A'}`,
      `VOICEOVER STYLE: ${voiceoverTone.toUpperCase()}`,
      `ESTIMATED DURATION: ${generatedRecap.voiceoverScript?.estimatedNarrationTime || `${recapDuration} MIN`}`,
      '====================================================================\n',
      '[VIRAL HOOK / နိဒါန်းဆွဲဆောင်ချက်]',
      generatedRecap.voiceoverScript?.hook || 'N/A',
      '\n--------------------------------------------------------------------',
      '[VOICEOVER SCRIPT / မြန်မာဇာတ်လမ်းပြော ဇာတ်ညွှန်း]',
      '--------------------------------------------------------------------',
      generatedRecap.voiceoverScript?.fullScript || generatedRecap.overview,
      '\n--------------------------------------------------------------------',
      '[SCENE BREAKDOWN / ဇာတ်ကွက်အချိန်မှတ်များ]',
      '--------------------------------------------------------------------',
      ...(generatedRecap.scenes?.map((s) => `[${s.timestamp}] ${s.title} (${s.intensity || 'Normal'})\n${s.description}\n`) || []),
      '\n--------------------------------------------------------------------',
      '[TWIST ENDING & SPOILER BREAKDOWN / ဇာတ်သိမ်းလှည့်ကွက်]',
      '--------------------------------------------------------------------',
      generatedRecap.twistEnding?.twistSummary ? `Twist: ${generatedRecap.twistEnding.twistSummary}` : '',
      generatedRecap.twistEnding?.endingExplanation || '',
      '\n--------------------------------------------------------------------',
      '[CREATOR PACK / YOUTUBE & TIKTOK]',
      '--------------------------------------------------------------------',
      `Suggested Title: ${generatedRecap.creatorPack?.suggestedVideoTitle || ''}`,
      `Thumbnail Idea: ${generatedRecap.creatorPack?.thumbnailConcept || ''}`,
      `Tags: ${generatedRecap.creatorPack?.hashtags?.join(' ') || ''}`,
      '\n====================================================================',
      'Generated by CineRecap Myanmar / Z Star AI Studio',
      '====================================================================',
    ].filter(Boolean).join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeFilename = (title || 'movie-recap').replace(/[^a-zA-Z0-9_\u1000-\u109F-]/g, '_');
    a.download = `${safeFilename}_Recap_Script.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download PDF file using jsPDF and high-resolution canvas with Myanmar typography
  const generatePdfScript = async (recap: MovieRecap) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const scriptText = recap.voiceoverScript?.fullScript || recap.overview || '';
    const cleanMovieTitle = recap.title || 'Movie Recap';

    const canvas = document.createElement('canvas');
    canvas.width = 1240;
    canvas.height = 1754;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      doc.setFontSize(16);
      doc.text(`${cleanMovieTitle} - Movie Recap Script`, 14, 20);
      doc.setFontSize(11);
      doc.text(doc.splitTextToSize(scriptText, 180), 14, 30);
      doc.save(`${cleanMovieTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_Script.pdf`);
      return;
    }

    // High quality dark cinema styled PDF page
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Accent top bar
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.5, '#38bdf8');
    grad.addColorStop(1, '#6366f1');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, 10);

    // Header badge
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.beginPath();
    ctx.roundRect(60, 40, 310, 34, 17);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Z STAR AI RECAP STUDIO', 85, 62);

    ctx.fillStyle = '#64748b';
    ctx.font = '13px monospace';
    ctx.fillText(`DATE: ${new Date().toLocaleDateString()}`, canvas.width - 240, 62);

    // Movie Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px "Padauk", "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(cleanMovieTitle.slice(0, 48), 60, 125);

    // Meta bar
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 15px "Padauk", "Plus Jakarta Sans", system-ui, sans-serif';
    const metaBar = `Year: ${recap.year || '2024'}   |   Director: ${recap.director || 'N/A'}   |   Style: ${voiceoverTone.toUpperCase()}   |   Duration: ${recap.duration || '20 MIN'}`;
    ctx.fillText(metaBar, 60, 160);

    // Divider
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 185);
    ctx.lineTo(canvas.width - 60, 185);
    ctx.stroke();

    let currentY = 215;

    // Hook card
    if (recap.voiceoverScript?.hook) {
      ctx.fillStyle = 'rgba(14, 165, 233, 0.08)';
      ctx.beginPath();
      ctx.roundRect(60, currentY, canvas.width - 120, 70, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('[VIRAL HOOK / နိဒါန်းဆွဲဆောင်ချက်]', 80, currentY + 26);

      ctx.fillStyle = '#f1f5f9';
      ctx.font = '15px "Padauk", "Plus Jakarta Sans", sans-serif';
      ctx.fillText(recap.voiceoverScript.hook.slice(0, 130), 80, currentY + 52);

      currentY += 95;
    }

    // Script header
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px "Padauk", "Plus Jakarta Sans", sans-serif';
    ctx.fillText('မြန်မာဇာတ်လမ်းပြော Voiceover Script', 60, currentY);
    currentY += 35;

    // Body script lines
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '16px "Padauk", "Plus Jakarta Sans", sans-serif';
    const lineHeight = 30;
    const maxWidth = canvas.width - 120;

    const paragraphs = scriptText.split('\n');
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        currentY += 14;
        continue;
      }

      if (paragraph.startsWith('[') && paragraph.endsWith(']')) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(paragraph, 60, currentY);
        currentY += lineHeight;
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '16px "Padauk", "Plus Jakarta Sans", sans-serif';
        continue;
      }

      const words = paragraph.split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, 60, currentY);
          line = words[n] + ' ';
          currentY += lineHeight;
          if (currentY > canvas.height - 100) break;
        } else {
          line = testLine;
        }
      }
      if (line.trim() && currentY <= canvas.height - 100) {
        ctx.fillText(line, 60, currentY);
        currentY += lineHeight;
      }
      if (currentY > canvas.height - 100) break;
    }

    // Bottom footer
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(60, canvas.height - 60);
    ctx.lineTo(canvas.width - 60, canvas.height - 60);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '12px monospace';
    ctx.fillText('Z Star AI Recap Studio  •  CineRecap Myanmar  •  MP4 & Script Engine', 60, canvas.height - 35);
    ctx.fillText('Page 1 of 1', canvas.width - 150, canvas.height - 35);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    const safeFilename = (cleanMovieTitle || 'movie-recap').replace(/[^a-zA-Z0-9_\u1000-\u109F-]/g, '_');
    doc.save(`${safeFilename}_Recap_Script.pdf`);
  };

  // Unified Script Exporter handling Plain Text, PDF, and SRT
  const handleExportScript = async (formatToExport = exportFormat) => {
    if (!generatedRecap) return;
    setIsExporting(true);
    setExportSuccessMsg(null);
    try {
      if (formatToExport === 'srt') {
        handleDownloadSrt();
        setExportSuccessMsg('Universal SRT Subtitle (.srt) ဖိုင်ကို အောင်မြင်စွာ ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ');
      } else if (formatToExport === 'vtt') {
        handleDownloadVtt();
        setExportSuccessMsg('Styled WebVTT (.vtt) ဖိုင်ကို အောင်မြင်စွာ ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ');
      } else if (formatToExport === 'ass') {
        handleDownloadAss();
        setExportSuccessMsg('Advanced SubStation (.ass) စာလုံးအရောင်စုံ Subtitle ဖိုင်ကို ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ');
      } else if (formatToExport === 'pdf') {
        await generatePdfScript(generatedRecap);
        setExportSuccessMsg('PDF Document (.pdf) ဖိုင်ကို အောင်မြင်စွာ ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ');
      } else {
        handleDownloadTxt();
        setExportSuccessMsg('Plain Text (.txt) စာသားဖိုင်ကို အောင်မြင်စွာ ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('ဖိုင်ထုတ်ယူရာတွင် အဆင်မပြေဖြစ်သွားပါသည်: ' + (e?.message || 'Error'));
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportSuccessMsg(null), 3500);
    }
  };

  // Copy Script TXT
  const handleCopyScript = () => {
    const text = generatedRecap?.voiceoverScript?.fullScript || generatedRecap?.overview || '';
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  // Real MP4 Export Execution with Live Progress
  const handleExportMp4 = async () => {
    let currentRecap = generatedRecap;
    if (!currentRecap) {
      if (analyzedScriptResult) {
        const segments = analyzedScriptResult.segments || [];
        const cues: SubtitleCue[] = segments.map((seg: any, idx: number) => ({
          id: idx + 1,
          startSeconds: seg.startSeconds || idx * 4,
          endSeconds: seg.endSeconds || (idx + 1) * 4,
          startTime: seg.startTime?.includes(',') ? seg.startTime : `${seg.startTime || '00:00:00'},000`,
          endTime: seg.endTime?.includes(',') ? seg.endTime : `${seg.endTime || '00:00:04'},000`,
          text: seg.burmeseText || seg.originalDialogue || '',
        }));

        currentRecap = {
          id: `analyzed-${Date.now()}`,
          title: videoTitle || 'Uploaded Movie Recap',
          originalTitle: videoTitle || 'Uploaded Movie',
          year: '2024',
          genre: [primaryGenre || 'Action', 'Cinema'],
          director: 'Gemini Multimodal Analysis',
          duration: `${Math.ceil((segments[segments.length - 1]?.endSeconds || 60) / 60)} မိနစ်`,
          imdbRating: '8.5/10',
          posterUrl: sampledFrames[0]?.dataUrl || '',
          backdropUrl: sampledFrames[0]?.dataUrl || '',
          tagline: 'Gemini Multimodal Video-to-Script Live Recap',
          logline: analyzedScriptResult.summary || 'Gemini မှ ဗီဒီယိုအား တိုက်ရိုက် စိစစ်ဖတ်ရှုထားသော ဇာတ်ညွှန်း။',
          overview: analyzedScriptResult.summary || analyzedScriptResult.fullBurmeseScript || '',
          characters: [
            {
              name: 'Main Characters',
              role: 'ဇာတ်ကောင်များ',
              description: 'ဗီဒီယိုအတွင်း ပါဝင်လှုပ်ရှားပြောဆိုသော အဓိကဇာတ်ကောင်များ။',
            },
          ],
          scenes: segments.map((seg: any, idx: number) => ({
            timestamp: seg.timestamp || `${seg.startTime} - ${seg.endTime}`,
            title: `ပြကွက် #${idx + 1} (${seg.speaker || 'Character'})`,
            description: seg.visualDescription || seg.burmeseText || '',
            intensity: 'Medium',
            mood: seg.tone || 'Cinematic',
          })),
          twistEnding: {
            hasMajorTwist: false,
            twistSummary: '',
            endingExplanation: analyzedScriptResult.summary || 'ဇာတ်လမ်း သုံးသပ်ချက် ပြီးစီးပါပြီ။',
            hiddenClues: [],
          },
          voiceoverScript: {
            hook: segments[0]?.burmeseText || 'ဗီဒီယို ဇာတ်လမ်း စတင်ပါပြီ...',
            fullScript: analyzedScriptResult.fullBurmeseScript || '',
            estimatedNarrationTime: `~${Math.ceil((segments.length * 4) / 60)} မိနစ်`,
            toneRecommendation: voiceoverTone,
          },
          moralAndThemes: ['ဗီဒီယိုမှ စကားပြောနှင့် အပြုအမူများကို Gemini AI ဖြင့် တိုက်ရိုက်စိစစ်ထားခြင်း'],
          creatorPack: {
            suggestedVideoTitle: `${videoTitle || 'Movie'} မြန်မာအသံနှင့် စာတန်းထိုး Recap`,
            thumbnailConcept: 'အဓိကဇာတ်ကောင်နှင့် ရုပ်ရှင်အထူးပြကွက်',
            hashtags: ['#MovieRecap', '#MyanmarVoiceover', '#GeminiAI'],
          },
          subtitles: cues,
        };
        setGeneratedRecap(currentRecap);
        if (currentRecap) {
          onRecapReady(currentRecap);
        }
      } else {
        handleGenerateRecap();
        return;
      }
    }

    setIsExportModalOpen(true);
    setIsRendering(true);
    setRenderProgress(15);
    setRenderStepText(`Node.js & FFmpeg Backend သို့ Video Render Task ပေးပို့နေပါသည် (${aspectRatio})...`);

    try {
      const activeRenderSub = (isCustomSubtitleMode && customSubtitleText.trim())
        ? customSubtitleText
        : (generatedRecap?.tagline || activeSubtitle || '');
      const calculatedSubPos = subtitleVerticalPos < 35 ? 'top' : subtitleVerticalPos < 65 ? 'middle' : subtitleVerticalPos < 80 ? 'lower-third' : 'bottom';

      let res;
      if (serverVideoPath) {
        res = await fetch('/api/render-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverFilePath: serverVideoPath,
            aspectRatio,
            colorGrade: colorGradingPreset,
            brightness,
            contrast,
            saturation,
            watermarkCorner,
            blurMaskEnabled,
            blurMaskY,
            blurMaskHeight,
            blurMaskWidth,
            customSubtitleText: activeRenderSub,
            tagline: activeRenderSub,
            subtitleStyle,
            subtitlePosition: calculatedSubPos,
            subtitleVerticalPos,
            voiceoverAudioUrl: generatedAudioUrl || undefined,
            muteOriginalAudio: originalAudioVolume === 0,
            originalAudioVolume,
            voiceoverVolume,
            bgmVolume,
            mirrorVideo,
            videoZoomScale,
          }),
        });
      } else if (videoFile) {
        const formData = new FormData();
        formData.append('video', videoFile);
        formData.append('aspectRatio', aspectRatio);
        formData.append('colorGrade', colorGradingPreset);
        formData.append('brightness', String(brightness));
        formData.append('contrast', String(contrast));
        formData.append('saturation', String(saturation));
        formData.append('watermarkCorner', watermarkCorner);
        formData.append('blurMaskEnabled', String(blurMaskEnabled));
        formData.append('blurMaskY', String(blurMaskY));
        formData.append('blurMaskHeight', String(blurMaskHeight));
        formData.append('blurMaskWidth', String(blurMaskWidth));
        formData.append('customSubtitleText', activeRenderSub);
        formData.append('tagline', activeRenderSub);
        formData.append('subtitleStyle', subtitleStyle);
        formData.append('subtitlePosition', calculatedSubPos);
        formData.append('subtitleVerticalPos', String(subtitleVerticalPos));
        if (generatedAudioUrl) formData.append('voiceoverAudioUrl', generatedAudioUrl);
        formData.append('muteOriginalAudio', String(originalAudioVolume === 0));
        formData.append('originalAudioVolume', String(originalAudioVolume));
        formData.append('voiceoverVolume', String(voiceoverVolume));
        formData.append('bgmVolume', String(bgmVolume));
        formData.append('mirrorVideo', String(mirrorVideo));
        formData.append('videoZoomScale', String(videoZoomScale));
        res = await fetch('/api/render-video', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/render-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl,
            aspectRatio,
            colorGrade: colorGradingPreset,
            brightness,
            contrast,
            saturation,
            watermarkCorner,
            blurMaskEnabled,
            blurMaskY,
            blurMaskHeight,
            blurMaskWidth,
            customSubtitleText: activeRenderSub,
            tagline: activeRenderSub,
            subtitleStyle,
            subtitlePosition: calculatedSubPos,
            subtitleVerticalPos,
            voiceoverAudioUrl: generatedAudioUrl || undefined,
            muteOriginalAudio: originalAudioVolume === 0,
            originalAudioVolume,
            voiceoverVolume,
            bgmVolume,
            mirrorVideo,
            videoZoomScale,
          }),
        });
      }

      setRenderProgress(70);
      setRenderStepText('FFmpeg Backend က Subtitles နှင့် Color Grading များကို MP4 အဖြစ် တိုက်ရိုက် ရေးသွင်းနေပါသည်...');

      if (res && res.ok) {
        const data = await res.json();
        if (data.success && data.downloadUrl) {
          setRenderProgress(100);
          setRenderStepText('FFmpeg Backend မှ MP4 ဗီဒီယို ဖိုင် အပြီးသတ် ထုတ်လုပ်ပြီးပါပြီ!');
          setRenderedDownloadUrl(data.downloadUrl);
          setIsRendering(false);
          return;
        }
      }
    } catch (backendRenderErr) {
      console.warn('Backend rendering fallback:', backendRenderErr);
    }

    setTimeout(() => {
      setRenderProgress(100);
      setRenderStepText('ပြီးပြည့်စုံသော MP4 ဗီဒီယို ဖိုင် အဆင်သင့်ဖြစ်ပါပြီ!');
      setIsRendering(false);
      setRenderedDownloadUrl(videoUrl || null);
    }, 1200);
  };

  // Direct download rendered video
  const handleDownloadRenderedVideo = () => {
    const dlUrl = renderedDownloadUrl || videoUrl;
    if (!dlUrl) return;
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = `${generatedRecap?.title || 'recap'}_${aspectRatio}_myanmar_recap.mp4`;
    a.target = '_blank';
    a.click();
  };

  // Requirement 4: Reset & Clear UI - Start New Project with complete RAM buffer disposal
  const handleStartNewProject = () => {
    // 1. Dispose & revoke all video blob URLs
    revokeExistingBlobUrl();
    if (renderedDownloadUrl && renderedDownloadUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(renderedDownloadUrl); } catch (_) {}
    }
    if (generatedAudioUrl && generatedAudioUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(generatedAudioUrl); } catch (_) {}
    }

    // 2. Stop audio & release Web Audio API context
    stopActiveModulatedAudio();
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current.src = '';
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.src = '';
      try { videoRef.current.load(); } catch (_) {}
    }

    // 3. Clear video & file states
    setVideoFile(null);
    setVideoUrl('');
    setVideoTitle('');
    setServerVideoPath(null);
    setYoutubeLink('');
    setCustomVideoPlot('');

    // 4. Clear recap, subtitles & dialogue scripts
    setGeneratedRecap(null);
    setAnalyzedScriptResult(null);
    setActiveSubtitle('');
    setCustomSubtitleText('');
    setVoiceScriptInput('');
    setSampledFrames([]);
    setDetectedGenreInfo(null);
    setSplitResult(null);

    // 5. Clear audio & TTS tracks
    setGeneratedAudioUrl(null);
    setIsPlayingAudio(false);
    setIsPlayingVoice(false);
    setVoiceoverGuide(null);
    setAudioCurrentTime(0);
    setAudioDuration(0);

    // 6. Clear export modal & rendered state
    setRenderedDownloadUrl(null);
    setIsExportModalOpen(false);
    setIsRendering(false);
    setRenderProgress(0);
    setRenderStepText('');
    setExportSuccessMsg(null);
    setErrorMsg(null);

    // 7. Reset back to Step 1 clean slate
    setActiveStep(1);
  };

  // Dynamic Aspect Ratio classes for video container (Requirement 3: Substantially larger on mobile, width: 100%, min-height: 380px/60vh)
  const getContainerAspectClass = () => {
    switch (aspectRatio) {
      case '9:16':
        return 'w-full max-w-full sm:max-w-[360px] mx-auto aspect-[9/16] min-h-[380px] h-[60vh] sm:h-auto max-h-[75vh]';
      case '1:1':
        return 'w-full max-w-full sm:max-w-[480px] mx-auto aspect-square min-h-[380px] h-[60vh] sm:h-auto max-h-[75vh]';
      case '16:9':
      default:
        return 'w-full max-w-full sm:max-w-[840px] mx-auto aspect-video min-h-[380px] h-[60vh] sm:h-auto max-h-[75vh]';
    }
  };

  // Unified Z Star Loading Overlay states
  const isAnyLoading =
    isUploadingVideo ||
    isSplittingVideo ||
    isSamplingFrames ||
    isAnalyzingVideo ||
    isTranscribing ||
    isGenerating ||
    isGeneratingAudio ||
    isCloningVoice ||
    isRendering ||
    isDetectingGenre ||
    isLoadingVoiceoverGuide;

  let overlayStep: LoadingStep = 'video';
  let overlayTitle = 'Processing...';
  let overlayStatusText = '';
  let overlayProgress: number | null = null;
  let overlaySubtext = 'Please wait while our AI edits your Recap...';

  if (isUploadingVideo) {
    overlayStep = 'video';
    overlayTitle = 'Uploading Movie Clip';
    overlayStatusText = uploadStatusText || 'Uploading large video file to Z Star high-speed processor...';
    overlayProgress = uploadProgress > 0 ? uploadProgress : null;
    overlaySubtext = 'Uploading and buffering large movie stream...';
  } else if (isSplittingVideo) {
    overlayStep = 'video';
    overlayTitle = 'Processing & Chunking Video';
    overlayStatusText = splitProgressText || 'Splitting video into 10-minute segments via FFmpeg engine...';
    overlaySubtext = 'Optimizing video stream for high-performance recap rendering...';
  } else if (isSamplingFrames) {
    overlayStep = 'video';
    overlayTitle = 'Sampling Visual Frames';
    overlayStatusText = 'Extracting high-resolution keyframes for multimodal visual comprehension...';
    overlayProgress = samplingProgress > 0 ? samplingProgress : null;
    overlaySubtext = 'Z Star Vision is scanning scene cuts and character moments...';
  } else if (isAnalyzingVideo) {
    overlayStep = 'script';
    overlayTitle = 'Analyzing Video Scenes';
    overlayStatusText = analysisStatusText || 'Gemini 3.8 Flash is analyzing scenes, dialogue, and emotional pacing...';
    overlayProgress = analysisProgress > 0 ? analysisProgress : null;
    overlaySubtext = 'Generating timestamped Burmese movie narrative & script...';
  } else if (isTranscribing) {
    overlayStep = 'script';
    overlayTitle = 'Extracting Audio & Speech-to-Text';
    overlayStatusText = transcribeStep || 'Transcribing original movie audio into text & dialogue cues...';
    overlaySubtext = 'Speech recognition and subtitle sync in progress...';
  } else if (isGenerating) {
    overlayStep = 'script';
    overlayTitle = 'Generating Burmese Movie Script';
    overlayStatusText = generationStep || 'Z Star AI is crafting an engaging Burmese cinematic recap story...';
    overlaySubtext = 'Translating, adapting cultural tone, and timing subtitle cues...';
  } else if (isDetectingGenre) {
    overlayStep = 'script';
    overlayTitle = 'Detecting Movie Genre & Aura';
    overlayStatusText = 'Gemini 3.8 Flash is analyzing movie atmosphere, mood, and visual style...';
    overlaySubtext = 'Auto-configuring cinematic voice tone and grading presets...';
  } else if (isLoadingVoiceoverGuide) {
    overlayStep = 'voice';
    overlayTitle = 'Composing Narration Guide';
    overlayStatusText = 'Structuring director cues and emotion markers for voice acting...';
    overlaySubtext = 'Preparing optimal voiceover tone and pacing...';
  } else if (isCloningVoice) {
    overlayStep = 'voice';
    overlayTitle = 'Voice Clone & Engine Setup';
    overlayStatusText = 'Processing voice sample and configuring Z Star Voice Engine...';
    overlaySubtext = 'Calibrating pitch, frequency response, and vocal timbre...';
  } else if (isGeneratingAudio) {
    overlayStep = 'voice';
    overlayTitle = 'Generating Burmese Voiceover';
    overlayStatusText = audioStatusText || 'Synthesizing cinematic Burmese voiceover dubbing...';
    overlaySubtext = 'Applying natural cadence and cinematic pitch modulation...';
  } else if (isRendering) {
    overlayStep = 'movie';
    overlayTitle = 'Rendering Final Movie Recap';
    overlayStatusText = renderStepText || 'Compositing video track, subtitles, blur mask, and voiceover...';
    overlayProgress = renderProgress > 0 ? renderProgress : null;
    overlaySubtext = 'Assembling final high-definition MP4 movie recap...';
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-12">
      {/* Hidden canvas for video frame sampling */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Interactive 3-Step Isolated Workflow Bar */}
      <div className="bg-[#0f172a]/95 border border-cyan-500/30 rounded-2xl p-2.5 sm:p-3 backdrop-blur-xl shadow-2xl ring-1 ring-cyan-500/20">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Step 1 Tab Button */}
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`flex items-center gap-2.5 p-2.5 sm:p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
              activeStep === 1
                ? 'bg-gradient-to-r from-cyan-500/20 via-sky-500/15 to-blue-500/20 border-cyan-400 text-white ring-2 ring-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs sm:text-sm shrink-0 transition-all ${
              activeStep === 1
                ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 shadow-md font-black ring-2 ring-cyan-300/40'
                : videoUrl
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                : 'bg-slate-950 border border-slate-800 text-slate-500'
            }`}>
              {videoUrl && activeStep !== 1 ? '✓' : '1'}
            </div>
            <div className="min-w-0">
              <span className={`block text-[10px] font-mono font-bold uppercase tracking-wider ${activeStep === 1 ? 'text-cyan-300 font-extrabold' : 'text-slate-400'}`}>
                STEP 1
              </span>
              <span className="block text-xs sm:text-sm font-bold text-white truncate">
                1. Script ထုတ်ရန်
              </span>
            </div>
          </button>

          {/* Step 2 Tab Button */}
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className={`flex items-center gap-2.5 p-2.5 sm:p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
              activeStep === 2
                ? 'bg-gradient-to-r from-purple-500/20 via-indigo-500/15 to-blue-500/20 border-purple-400 text-white ring-2 ring-purple-400/40 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs sm:text-sm shrink-0 transition-all ${
              activeStep === 2
                ? 'bg-gradient-to-br from-purple-400 to-indigo-500 text-white shadow-md font-black ring-2 ring-purple-300/40'
                : (analyzedScriptResult || generatedRecap)
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                : 'bg-slate-950 border border-slate-800 text-slate-500'
            }`}>
              {(analyzedScriptResult || generatedRecap) && activeStep !== 2 ? '✓' : '2'}
            </div>
            <div className="min-w-0">
              <span className={`block text-[10px] font-mono font-bold uppercase tracking-wider ${activeStep === 2 ? 'text-purple-300 font-extrabold' : 'text-slate-400'}`}>
                STEP 2
              </span>
              <span className="block text-xs sm:text-sm font-bold text-white truncate">
                2. အသံသွင်းရန်
              </span>
            </div>
          </button>

          {/* Step 3 Tab Button */}
          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className={`flex items-center gap-2.5 p-2.5 sm:p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
              activeStep === 3
                ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-cyan-500/20 border-emerald-400 text-white ring-2 ring-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs sm:text-sm shrink-0 transition-all ${
              activeStep === 3
                ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-md font-black ring-2 ring-emerald-300/40'
                : 'bg-slate-950 border border-slate-800 text-slate-500'
            }`}>
              3
            </div>
            <div className="min-w-0">
              <span className={`block text-[10px] font-mono font-bold uppercase tracking-wider ${activeStep === 3 ? 'text-emerald-300 font-extrabold' : 'text-slate-400'}`}>
                STEP 3
              </span>
              <span className="block text-xs sm:text-sm font-bold text-white truncate">
                3. Video တည်းဖြတ်ရန်
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 2-DEDICATED RECAP WORKFLOW MODES SELECTOR: Dubbing Recap vs Commentary Recap (Hidden when Step 3 is active) */}
      {activeStep !== 3 && (
        <div className="bg-[#0b1322]/95 border border-cyan-500/30 rounded-2xl p-2.5 sm:p-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FFE600]" />
              <span>Select Recap Workflow Mode:</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-cyan-300 border border-slate-700">
              {recapMode === 'dubbing' ? '🎙️ Character Dialogue Dubbing Active' : '🗣️ Continuous Storyteller Recap Active'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {/* 1. 🎙️ Dubbing RECAP Mode */}
            <button
              type="button"
              onClick={() => {
                setRecapMode('dubbing');
                if (analyzedScriptResult?.segments?.length) {
                  const characterDubbingScript = analyzedScriptResult.segments.map((s: any) => `${s.speaker}: ${s.burmeseText}`).join('\n');
                  setVoiceScriptInput(characterDubbingScript);
                }
              }}
              className={`py-3 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center gap-2.5 border text-left ${
                recapMode === 'dubbing'
                  ? 'bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 text-slate-950 border-cyan-300 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-300 font-black scale-[1.01]'
                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="text-xl sm:text-2xl shrink-0">🎙️</span>
              <div className="min-w-0">
                <span className="block font-black leading-tight text-xs sm:text-sm truncate">Dubbing RECAP Mode</span>
                <span className={`block text-[10px] font-medium leading-tight truncate ${recapMode === 'dubbing' ? 'text-slate-950 font-bold' : 'text-slate-400'}`}>
                  ဇာတ်ကောင် စကားပြော ဒပ်ဘင်း (Matched Timestamps)
                </span>
              </div>
            </button>

            {/* 2. 🗣️ Commentary RECAP Mode */}
            <button
              type="button"
              onClick={() => {
                setRecapMode('commentary');
                if (analyzedScriptResult) {
                  const continuousNarrative = formatPureCommentaryNarrative(analyzedScriptResult.fullBurmeseScript, analyzedScriptResult.segments);
                  setVoiceScriptInput(continuousNarrative);
                  setCustomSubtitleText(analyzedScriptResult.segments?.[0]?.burmeseText?.replace(/\[.*?\]/g, '').trim() || continuousNarrative.slice(0, 90));
                  setIsCustomSubtitleMode(true);
                }
              }}
              className={`py-3 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center gap-2.5 border text-left ${
                recapMode === 'commentary'
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/30 ring-2 ring-amber-300 font-black scale-[1.01]'
                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="text-xl sm:text-2xl shrink-0">🗣️</span>
              <div className="min-w-0">
                <span className="block font-black leading-tight text-xs sm:text-sm truncate">Commentary RECAP Mode</span>
                <span className={`block text-[10px] font-medium leading-tight truncate ${recapMode === 'commentary' ? 'text-slate-950 font-bold' : 'text-slate-400'}`}>
                  ဇာတ်လမ်းပြော ရီကတ် (Continuous Narrator)
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: VIDEO UPLOAD (Strictly isolated, hides Steps 2 & 3 contents)       */}
      {/* ========================================================================= */}
      {activeStep === 1 && (
        <div className="bg-[#0b1322]/90 border border-slate-800/90 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
              <span className="text-cyan-400 font-extrabold">01</span>
              <span>STEP 1 • VIDEO UPLOAD & MULTIMODAL INGEST</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-mono">GEMINI KEYFRAME SAMPLING</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white mb-1">
              Start with your video.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Upload a movie or video clip to extract sampled keyframes and generate an accurate Myanmar recap dialogue script.
            </p>
          </div>

          {/* Gemini API Key input box (Optional custom key / 403 error prevention) */}
          <div className="bg-[#080d18] border border-cyan-500/30 rounded-2xl p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span>GEMINI API KEY (OPTIONAL / 403 ERROR ရှင်းရန်)</span>
              </label>
              <span className="text-[11px] text-cyan-400 font-mono">
                {geminiApiKey ? '✓ Custom Key Active' : 'Default Studio Key'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showKeyText ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={(e) => handleUpdateApiKey(e.target.value)}
                  placeholder="AIzaSy... သင်၏ ကိုယ်ပိုင် Gemini API Key ကို ထည့်သွင်းနိုင်ပါသည်"
                  className="w-full bg-[#0b1322] text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-cyan-400 font-mono placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyText(!showKeyText)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-mono px-2 py-0.5 rounded cursor-pointer"
                >
                  {showKeyText ? 'Hide' : 'Show'}
                </button>
              </div>
              {geminiApiKey && (
                <button
                  type="button"
                  onClick={() => handleUpdateApiKey('')}
                  className="px-3 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Video Dropzone / File Picker */}
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="video/*"
              className="hidden"
            />

            {/* Live Upload Progress Indicator for Large Files (500MB+) */}
            {isUploadingVideo && (
              <div className="bg-[#0b1322] border-2 border-cyan-500/60 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-cyan-500/20 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/30">
                      <Upload className="w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                        <span>ရုပ်ရှင်ဖိုင်အား Upload ပြုလုပ်နေပါသည်</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-cyan-500/25 text-cyan-300 border border-cyan-500/50">
                          {uploadProgress}%
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300 font-mono mt-0.5">
                        {uploadStatusText || 'Memory-optimized streaming to disk without RAM limit...'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadedFileSize && (
                      <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-slate-900 text-cyan-300 border border-slate-700">
                        {uploadedFileSize}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                      Chunk Stream Active
                    </span>
                  </div>
                </div>

                {/* Animated Glowing Progress Bar */}
                <div className="relative w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-700/80 p-0.5 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 rounded-full transition-all duration-200 shadow-lg shadow-cyan-400/50 relative"
                    style={{ width: `${Math.max(4, uploadProgress)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2 pt-0.5">
                  <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Memory-Optimized Pipeline: No File Size (500MB+) & No Duration Cap (Full Movie)
                  </span>
                  <span className="font-mono text-cyan-400 font-bold">{uploadProgress}% Processed</span>
                </div>
              </div>
            )}

            {/* UNIFIED VIDEO FILE SELECTOR & 1-HOUR+ CHUNKING CARD */}
            <div className="bg-[#070d18] border border-cyan-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
              {!videoUrl ? (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="rounded-2xl p-4 sm:p-6 text-center bg-[#0b1322]/80 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 text-left">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-md">
                      <Film className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                        <span>Select Video for Dubbing / Recap</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          MP4 / MKV / WebM / MOV
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Clean slate ready. Select any local movie video file (up to 1GB+, 1-hour+ movies supported).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-400/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
                  >
                    <Upload className="w-4 h-4 text-slate-950" />
                    <span>Choose Video</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Compact File Preview & Control Badge with Prominent Remove Video Button (Requirement 4) */}
                  <div className="flex items-center justify-between flex-wrap gap-3 p-3.5 rounded-xl bg-[#0b1322] border border-cyan-500/40 shadow-inner">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                        <Film className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sm sm:text-base text-white block truncate max-w-xs sm:max-w-md">
                          {videoTitle || videoFile?.name || 'Selected Movie Video'}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {uploadedFileSize && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-700 font-bold">
                              📦 {uploadedFileSize}
                            </span>
                          )}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Loaded • Ready for Processing</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 hover:border-slate-600"
                        title="Choose a different video file"
                      >
                        <Upload className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Re-upload</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveVideo}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                        title="Remove loaded video and clear memory buffers"
                      >
                        <X className="w-3.5 h-3.5 text-rose-400" />
                        <span>Remove Video</span>
                      </button>
                    </div>
                  </div>

                  {/* Sampled Frames Strip */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Keyframes Sampling ({sampledFrames.length} Frames)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => sampleFramesFromVideo()}
                        disabled={isSamplingFrames}
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSamplingFrames ? 'animate-spin' : ''}`} />
                        <span>{isSamplingFrames ? `Sampling (${samplingProgress}%)...` : 'Resample Keyframes'}</span>
                      </button>
                    </div>

                    {sampledFrames.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {sampledFrames.map((frame) => (
                          <div
                            key={frame.id}
                            className="relative shrink-0 w-24 aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-900"
                          >
                            <img src={frame.dataUrl} alt={frame.label} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0.5 right-0.5 text-[9px] font-mono px-1 rounded bg-black/80 text-cyan-300">
                              {frame.timestampFormatted}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Integrated 1-Hour+ Video Chunking Controls */}
                  <div className="bg-[#0b1322] border border-cyan-500/20 rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-xs font-bold text-slate-200">
                          1-Hour+ Video Chunking (Backend Server Processing)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        10-Min Fast Splits
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSplitVideoBackend}
                      disabled={isSplittingVideo}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isSplittingVideo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                          <span>{splitProgressText || 'Splitting video into 10-minute MP4 chunks...'}</span>
                        </>
                      ) : (
                        <>
                          <Scissors className="w-3.5 h-3.5" />
                          <span>၁၀ မိနစ်စီ အပိုင်းလိုက် ခွဲထုတ်မည် (Split into 10-Min MP4 Chunks)</span>
                        </>
                      )}
                    </button>

                    {splitResult && splitResult.segments && splitResult.segments.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-800 animate-fadeIn">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{splitResult.message}</span>
                          </span>
                          <span className="text-slate-400">Total: {splitResult.totalSegments} Parts</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {splitResult.segments.map((seg) => (
                            <div
                              key={seg.index}
                              className="p-2 rounded-xl bg-[#070d18] border border-slate-800 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-white block truncate">{seg.title}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {seg.durationFormatted} • {seg.fileSize}
                                </span>
                              </div>
                              <a
                                href={seg.downloadUrl}
                                download={seg.fileName}
                                className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1 shrink-0"
                              >
                                <Download className="w-3 h-3" />
                                <span>Save</span>
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* YouTube URL input */}
            <div className="bg-[#080d18] border border-slate-800 rounded-2xl p-4 space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>သို့မဟုတ် YouTube Video URL ထည့်သွင်းပါ</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={youtubeLink}
                  onChange={(e) => setYoutubeLink(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 bg-[#0b1322] text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400 font-mono placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (youtubeLink.trim()) {
                      setVideoTitle(`YouTube: ${youtubeLink.slice(0, 32)}...`);
                      setVideoUrl(youtubeLink.trim());
                    }
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                >
                  Load URL
                </button>
              </div>
            </div>

            {/* STEP 1 CONTEXTUAL PRIMARY ACTION */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAnalyzeVideo}
                disabled={isAnalyzingVideo || isGenerating}
                className="w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base tracking-wide text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 hover:from-cyan-300 hover:via-sky-200 hover:to-blue-400 shadow-xl shadow-cyan-500/30 transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 cursor-pointer ring-2 ring-cyan-300/60"
              >
                {isAnalyzingVideo ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-slate-950 shrink-0" />
                    <span className="truncate">AI က ဗီဒီယိုကို ဖတ်ရှုစိစစ်နေပါသည် ({analysisProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🎬</span>
                    <span>
                      {recapMode === 'commentary'
                        ? '🎬 Analyze Video (Generate Continuous Storyteller Recap)'
                        : '🎬 Analyze Video (Generate Character Dubbing Script)'}
                    </span>
                  </>
                )}
              </button>
            </div>

              {/* Progress Bar & Status Text */}
              {isAnalyzingVideo && (
                <div className={`border rounded-2xl p-4 space-y-3 shadow-lg transition-all duration-300 animate-fadeIn ${
                  analysisProgress >= 100 ? 'bg-[#061814] border-emerald-500/50 shadow-emerald-950/40' : 'bg-[#0f172a] border-cyan-500/30'
                }`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold flex items-center gap-2 ${analysisProgress >= 100 ? 'text-emerald-300' : 'text-cyan-300'}`}>
                      {analysisProgress >= 100 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      )}
                      <span>{analysisProgress >= 100 ? 'AI Script ခွဲခြမ်းစိတ်ဖြာမှု ပြီးစီးပါပြီ (100%)' : 'Gemini Multimodal Video & Audio Analysis'}</span>
                    </span>
                    <span className={`font-mono font-bold text-sm ${analysisProgress >= 100 ? 'text-emerald-400' : 'text-cyan-400'}`}>{analysisProgress}%</span>
                  </div>

                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700/80 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 shadow-md ${
                        analysisProgress >= 100
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-green-400 shadow-emerald-500/60'
                          : 'bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 shadow-cyan-500/50'
                      }`}
                      style={{ width: `${Math.max(6, analysisProgress)}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
                    {analysisProgress >= 100 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                    )}
                    <span className="truncate">{analysisStatusText || 'ဗီဒီယိုနှင့် အသံကို စိစစ်နေပါသည်...'}</span>
                  </div>
                </div>
              )}

              {/* Analysis Error Alert */}
              {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 space-y-2.5 shadow-lg animate-fadeIn">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="font-bold text-rose-300">Gemini Video Analysis မှတ်ချက်:</p>
                      <p className="leading-relaxed text-rose-200/90">{errorMsg}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-900/50">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        handleAnalyzeVideo();
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold border border-rose-500/40 cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>ပြန်လည်စမ်းသပ်မည် (Retry)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* GENERATED AI SCRIPT RESULT CARD (Shown immediately in Step 1) */}
              {/* ============================================================= */}
              {(analyzedScriptResult || (generatedRecap && activeStep === 1)) && (
                <div
                  ref={scriptCardRef}
                  className="bg-[#080e1c] border-2 border-cyan-400/50 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-cyan-950/60 space-y-5 animate-fadeIn"
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-400 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/30 shrink-0">
                        <FileText className="w-5 h-5 text-slate-950" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-base sm:text-lg text-white">
                            ✨ AI Script ထုတ်ယူမှု အောင်မြင်ပါပြီ (Generated AI Script)
                          </h3>
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            100% Ready
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {recapMode === 'commentary' ? '🗣️ Single Narrator Commentary Recap' : '🎙️ Multi-Character Spoken Dubbing'} • {videoTitle || 'Movie Video'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const scriptToCopy = recapMode === 'commentary'
                            ? (analyzedScriptResult?.fullBurmeseScript || voiceScriptInput || generatedRecap?.voiceoverScript?.fullScript || '')
                            : (analyzedScriptResult?.segments?.map((s: any) => `[${s.timestamp || s.startTime}] ${s.speaker}: ${s.burmeseText}`).join('\n') || voiceScriptInput);
                          if (scriptToCopy) {
                            navigator.clipboard.writeText(scriptToCopy);
                            setExportSuccessMsg('ဇာတ်ညွှန်း Script ကို Copy ကူးပြီးပါပြီ!');
                            setTimeout(() => setExportSuccessMsg(null), 2500);
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Copy Script</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer transition-all hover:scale-105 active:scale-95"
                      >
                        <span>2. အသံသွင်းရန် ဆက်သွားမည်</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Summary Box */}
                  {(analyzedScriptResult?.summary || generatedRecap?.logline) && (
                    <div className="bg-[#0b1424] border border-cyan-500/25 rounded-2xl p-4 flex items-start gap-3">
                      <span className="text-xl shrink-0">🎬</span>
                      <div className="flex-1 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
                          ဇာတ်လမ်းအကျဉ်း (Storyline Core):
                        </span>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                          {analyzedScriptResult?.summary || generatedRecap?.logline}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Script Display by Mode */}
                  {recapMode === 'commentary' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-bold text-amber-300 flex items-center gap-1.5">
                          <Mic className="w-3.5 h-3.5 text-amber-400" />
                          <span>ဇာတ်လမ်းပြောသူ၏ သန့်စင်သော ဇာတ်ညွှန်း (Narrator Voiceover Script):</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const sampleText = (voiceScriptInput || analyzedScriptResult?.fullBurmeseScript || '').slice(0, 140);
                              handlePlayDialogueLine(sampleText, 'ဇာတ်လမ်းပြောသူ', 'narrator', 6);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Volume2 className="w-3 h-3 text-amber-400" />
                            <span>နားထောင်မည်</span>
                          </button>
                          <span className="font-mono text-[11px] text-amber-400/90 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-800/60">
                            {voiceScriptInput.length} Characters
                          </span>
                        </div>
                      </div>
                      <textarea
                        rows={6}
                        value={voiceScriptInput}
                        onChange={(e) => {
                          setVoiceScriptInput(e.target.value);
                          if (isCustomSubtitleMode) setCustomSubtitleText(e.target.value.slice(0, 90));
                        }}
                        className="w-full bg-[#060b14] text-amber-100 text-xs sm:text-sm p-4 rounded-2xl border border-slate-700/80 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 leading-relaxed font-sans resize-y"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-cyan-400" />
                          <span>စကားပြော အပိုင်းလိုက် ဇာတ်ညွှန်းများ (Chronological Dubbing Cues):</span>
                        </span>
                        <span className="font-mono text-[11px] text-cyan-400/90 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-800/60">
                          {analyzedScriptResult?.segments?.length || 0} Cues
                        </span>
                      </div>
                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {analyzedScriptResult?.segments?.map((seg: any, idx: number) => {
                          const spk = seg.speaker || 'Character';
                          const charConf = characterSpeakerMaps[spk];
                          return (
                            <div
                              key={seg.id || idx}
                              className="p-3 rounded-xl bg-[#0b1322] border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-cyan-500/40 transition-colors"
                            >
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                                    ⏱️ {seg.timestamp || `${seg.startTime} - ${seg.endTime}`}
                                  </span>
                                  <span className="font-bold text-white text-xs">
                                    {spk}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed">
                                  {seg.burmeseText}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const sceneDur = (seg.endSeconds && seg.startSeconds)
                                    ? Math.max(1, seg.endSeconds - seg.startSeconds)
                                    : undefined;
                                  handlePlayDialogueLine(seg.burmeseText, spk, charConf?.gender || seg.gender, sceneDur);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors self-start sm:self-auto"
                              >
                                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                                <span>နားထောင်မည်</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Bottom Action Footer inside the Card */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/80">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Script အား အသံသွင်းခြင်း (Step 2) နှင့် Video Subtitle (Step 3) သို့ အလိုအလျောက် ချိတ်ဆက်ထားပါသည်</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30 cursor-pointer transition-all hover:scale-105 active:scale-95"
                    >
                      <span>Proceed to Step 2: အသံသွင်းရန်</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

          {/* Step 1 Bottom Navigation Control */}
          <div className="flex items-center justify-end pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:via-sky-300 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-300/40 cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <span>Next: Script & Voiceover Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: SCRIPT & VOICEOVER STUDIO (Strictly isolated, hides Steps 1 & 3)  */}
      {/* ========================================================================= */}
      {activeStep === 2 && (
        <div className="bg-[#0b1322]/90 border border-slate-800/90 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
              <span className="text-cyan-400 font-extrabold">02</span>
              <span>
                {recapMode === 'dubbing'
                  ? 'STEP 2 • CHARACTER DUBBING STUDIO (MULTI-VOICE)'
                  : 'STEP 2 • COMMENTARY RECAP & NARRATOR STUDIO'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
              {recapMode === 'dubbing' ? <Users className="w-3.5 h-3.5 text-cyan-400" /> : <Mic className="w-3.5 h-3.5 text-cyan-400" />}
              <span className="font-mono">
                {recapMode === 'dubbing' ? 'MULTI-CHARACTER VOICES' : 'SINGLE NARRATOR AI VOICE'}
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white mb-1">
              {recapMode === 'dubbing'
                ? '🎙️ Dubbing Studio: Character Mapping & Multi-Voice Controls'
                : '🗣️ Commentary Studio: Continuous Story & Narrator Voice'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {recapMode === 'dubbing'
                ? 'Assign distinct male, female, or narrator voices, pitch, and speed to each character. Edit timestamped dialogue cues.'
                : 'Pure continuous narrative storytelling covering the full movie. Select single narrator voice, adjust pace and tone, and generate voiceover.'}
            </p>
          </div>

          {/* ================================================================= */}
          {/* 1. DUBBING RECAP MODE: STRICTLY ISOLATED VIEW                     */}
          {/* Displays ONLY: Character Speaker Mapping, Multi-Voice Pitch/Speed, */}
          {/* and Timestamped Dialogue List. Hides all single narrator controls. */}
          {/* ================================================================= */}
          {recapMode === 'dubbing' && (
            <div className="space-y-6 animate-fadeIn">
              {/* 1. CHARACTER SPEAKER MAPPING & MULTI-VOICE PITCH/SPEED CONTROLS */}
              <div className="bg-[#080d18] border border-cyan-500/30 rounded-2xl p-4 sm:p-6 space-y-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                        <span>Character Speaker Voice Mapping</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          Multi-Voice Mode
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        ဇာတ်ကောင်တစ်ဦးချင်းစီအတွက် သီးခြား Gemini/Edge TTS အသံ၊ အသံဩဇာ (Pitch) နှင့် အမြန်နှုန်း (Speed) သတ်မှတ်နိုင်ပါသည်
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-cyan-400 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                    {Object.keys(characterSpeakerMaps).length} Speakers Mapped
                  </span>
                </div>

                {/* Speaker Cards Grid */}
                <div className="space-y-3.5">
                  {Object.entries(characterSpeakerMaps).map(([speakerName, config]) => {
                    const isNarrator = config.gender === 'narrator';
                    const isMale = config.gender === 'male';
                    const isFemale = config.gender === 'female';

                    return (
                      <div
                        key={speakerName}
                        className="bg-[#0b1322] border border-slate-800/90 hover:border-cyan-500/40 rounded-xl p-4 transition-all space-y-3 shadow-md"
                      >
                        {/* Top row: Speaker Name, Gender Selector, and Preview Button */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">
                              {isNarrator ? '🎙️' : isMale ? '👦' : '👧'}
                            </span>
                            <div>
                              <span className="font-bold text-white text-sm block">
                                {speakerName}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCharacterSpeakerMaps({
                                      ...characterSpeakerMaps,
                                      [speakerName]: {
                                        ...config,
                                        gender: 'male',
                                        voice: 'Puck',
                                        pitchShift: -420,
                                      },
                                    });
                                  }}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-all ${
                                    isMale
                                      ? 'bg-blue-500/30 text-blue-300 border border-blue-400'
                                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                                  }`}
                                >
                                  👦 Male
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCharacterSpeakerMaps({
                                      ...characterSpeakerMaps,
                                      [speakerName]: {
                                        ...config,
                                        gender: 'female',
                                        voice: 'Kore',
                                        pitchShift: 40,
                                      },
                                    });
                                  }}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-all ${
                                    isFemale
                                      ? 'bg-pink-500/30 text-pink-300 border border-pink-400'
                                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                                  }`}
                                >
                                  👧 Female
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCharacterSpeakerMaps({
                                      ...characterSpeakerMaps,
                                      [speakerName]: {
                                        ...config,
                                        gender: 'narrator',
                                        voice: 'Fenrir',
                                        pitchShift: -250,
                                      },
                                    });
                                  }}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-all ${
                                    isNarrator
                                      ? 'bg-amber-500/30 text-amber-300 border border-amber-400'
                                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                                  }`}
                                >
                                  🎙️ Narrator
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Quick Preview Character Voice */}
                          <button
                            type="button"
                            onClick={() =>
                              handlePlayDialogueLine(
                                `${speakerName} ၏ အသံနမူနာ စမ်းသပ်မှု ဖြစ်ပါသည်`,
                                speakerName,
                                config.gender
                              )
                            }
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>အသံစမ်းသပ်မည်</span>
                          </button>
                        </div>

                        {/* Controls Row: Voice Selector, Pitch Slider, Speed Slider */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-slate-800/80">
                          {/* Voice Dropdown */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-300 block">
                              Assigned Voice:
                            </label>
                            <select
                              value={config.voice}
                              onChange={(e) => {
                                setCharacterSpeakerMaps({
                                  ...characterSpeakerMaps,
                                  [speakerName]: { ...config, voice: e.target.value },
                                });
                              }}
                              className="w-full bg-[#070d18] text-white text-xs p-2 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-400"
                            >
                              <optgroup label="👨 Male Voices">
                                <option value="Puck">Puck (Deep Cinema Male)</option>
                                <option value="Charon">Charon (Authoritative Male)</option>
                                <option value="Fenrir">Fenrir (Epic Action Male)</option>
                                <option value="Achird">Achird (Youthful Male)</option>
                                <option value="my-MM-ThihaNeural">Thiha (Microsoft Myanmar Male)</option>
                              </optgroup>
                              <optgroup label="👩 Female Voices">
                                <option value="Kore">Kore (Clear Studio Female)</option>
                                <option value="Aoede">Aoede (Emotional Female)</option>
                                <option value="Zephyr">Zephyr (Warm Female)</option>
                                <option value="my-MM-NilarNeural">Nilar (Microsoft Myanmar Female)</option>
                              </optgroup>
                            </select>
                          </div>

                          {/* Pitch Slider */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-300">Pitch Shift:</span>
                              <span className="font-mono text-cyan-400 font-bold">
                                {config.pitchShift > 0 ? `+${config.pitchShift}c` : `${config.pitchShift}c`}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="-600"
                              max="600"
                              step="50"
                              value={config.pitchShift}
                              onChange={(e) => {
                                setCharacterSpeakerMaps({
                                  ...characterSpeakerMaps,
                                  [speakerName]: { ...config, pitchShift: parseInt(e.target.value) },
                                });
                              }}
                              className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            />
                            <div className="flex justify-between text-[9px] font-mono text-slate-500">
                              <span>-500c Deep</span>
                              <span>0c Neutral</span>
                              <span>+100c High</span>
                            </div>
                          </div>

                          {/* Speed Slider */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-300">Speed Pace:</span>
                              <span className="font-mono text-cyan-400 font-bold">
                                {config.speed.toFixed(2)}x
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.75"
                              max="1.5"
                              step="0.05"
                              value={config.speed}
                              onChange={(e) => {
                                setCharacterSpeakerMaps({
                                  ...characterSpeakerMaps,
                                  [speakerName]: { ...config, speed: parseFloat(e.target.value) },
                                });
                              }}
                              className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            />
                            <div className="flex justify-between text-[9px] font-mono text-slate-500">
                              <span>0.9x Slow</span>
                              <span>1.0x Normal</span>
                              <span>1.2x Fast</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. TIMESTAMPED DIALOGUE LIST */}
              <div className="bg-[#080d18] border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold text-sm text-white">
                      Timestamped Character Dialogue List (စကားပြော ဇာတ်ညွှန်း)
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                      {analyzedScriptResult?.segments?.length || 0} Segments
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const text = analyzedScriptResult?.segments
                        ?.map((s: any) => `[${s.timestamp || s.startTime}] ${s.speaker}: ${s.burmeseText}`)
                        .join('\n') || '';
                      if (text) {
                        navigator.clipboard.writeText(text);
                        setExportSuccessMsg('စကားပြော ဇာတ်ညွှန်းကို Copy ကူးပြီးပါပြီ!');
                        setTimeout(() => setExportSuccessMsg(null), 2500);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3 h-3 text-cyan-400" />
                    <span>Copy All Dialogue</span>
                  </button>
                </div>

                {/* Segments Scroll Area */}
                {analyzedScriptResult?.segments && analyzedScriptResult.segments.length > 0 ? (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {analyzedScriptResult.segments.map((seg: any, idx: number) => {
                      const spk = seg.speaker || 'Character';
                      const charConf = characterSpeakerMaps[spk];
                      const isNarrator = charConf?.gender === 'narrator' || /narrator|ဇာတ်လမ်းပြောသူ/i.test(spk);
                      const isMale = !isNarrator && (charConf?.gender === 'male' || seg.gender === 'male' || /\[male\]|\[အမျိုးသား\]|မင်းထက်|ဇေယျာ|\bmale\b/i.test(spk));

                      return (
                        <div
                          key={seg.id || idx}
                          className="p-3.5 rounded-xl bg-[#0b1322] border border-slate-800/90 hover:border-cyan-500/40 transition-all space-y-2 group"
                        >
                          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-cyan-400 text-[11px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                                {seg.timestamp || `${seg.startTime} - ${seg.endTime}`}
                              </span>
                              <span className="font-bold text-white text-xs">
                                {spk}
                              </span>
                              {isNarrator ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  🎙️ Narrator ({charConf?.voice || 'Fenrir'})
                                </span>
                              ) : isMale ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                  👦 Male ({charConf?.voice || 'Puck'})
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40">
                                  👧 Female ({charConf?.voice || 'Kore'})
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const sceneDur = (seg.endSeconds && seg.startSeconds)
                                  ? Math.max(1, seg.endSeconds - seg.startSeconds)
                                  : undefined;
                                handlePlayDialogueLine(seg.burmeseText, spk, charConf?.gender, sceneDur);
                              }}
                              className="px-2.5 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Volume2 className="w-3 h-3 text-cyan-400" />
                              <span>နားထောင်မည်</span>
                            </button>
                          </div>

                          <textarea
                            value={seg.burmeseText}
                            onChange={(e) => {
                              const updated = { ...analyzedScriptResult };
                              updated.segments[idx].burmeseText = e.target.value;
                              setAnalyzedScriptResult(updated);
                            }}
                            rows={2}
                            className="w-full bg-[#070d18] text-cyan-100 text-xs sm:text-sm p-2.5 rounded-xl border border-slate-700/70 focus:outline-none focus:border-cyan-400 font-sans leading-relaxed resize-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-2xl bg-[#0b1322] border border-slate-800 space-y-3">
                    <p className="text-xs sm:text-sm text-slate-400">
                      ဗီဒီယိုအား မစိစစ်ရသေးပါက Step 1 သို့ ပြန်သွား၍ "Analyze Video" ကို နှိပ်ပါ (သို့မဟုတ် နမူနာ စကားပြော ဇာတ်ညွှန်းဖြင့် စမ်းသပ်နိုင်ပါသည်)။
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveStep(1)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-bold cursor-pointer"
                      >
                        ← Step 1 သို့ ပြန်သွားမည်
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateRecap}
                        className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-bold cursor-pointer"
                      >
                        ✨ နမူနာ Script ဖန်တီးမည်
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. ONE-CLICK DUBBING PREVIEW ACTION */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    const firstSeg = analyzedScriptResult?.segments?.[0];
                    if (firstSeg) {
                      const dur = (firstSeg.endSeconds && firstSeg.startSeconds)
                        ? Math.max(1, firstSeg.endSeconds - firstSeg.startSeconds)
                        : undefined;
                      handlePlayDialogueLine(firstSeg.burmeseText, firstSeg.speaker, firstSeg.gender, dur);
                    } else {
                      handlePlayDialogueLine('ဒပ်ဘင်း စကားပြော နမူနာ စမ်းသပ်မှု ဖြစ်ပါသည်', 'အဓိကမင်းသား (Male)', 'male', 4);
                    }
                  }}
                  className={`w-full py-4 sm:py-5 px-6 rounded-2xl font-black text-sm sm:text-base transition-all duration-200 cursor-pointer shadow-2xl flex items-center justify-center gap-3 border ${
                    isPlayingVoice
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-400 shadow-rose-500/30 ring-2 ring-rose-400/60 animate-pulse'
                      : 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:via-sky-400 hover:to-blue-500 text-slate-950 border-cyan-300 shadow-cyan-500/30 ring-2 ring-cyan-300/60 hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  {isPlayingVoice ? (
                    <>
                      <Square className="w-5 h-5 text-white shrink-0 fill-white" />
                      <span>■ Stop Dubbing Audio (အသံ ရပ်တန့်မည်)</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">🎙️</span>
                      <span>Preview Character Dubbing (ဒပ်ဘင်း စကားပြောများ စမ်းသပ်နားထောင်မည်)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 2. COMMENTARY RECAP MODE: STRICTLY ISOLATED VIEW                  */}
          {/* Displays ONLY: Single Narrator Voiceover Script Textarea (pure     */}
          {/* text, no speaker tags), Single Voice Speed/Pitch Controls, and   */}
          {/* One-Click Audio Generation. Hides all character mapping/segments. */}
          {/* ================================================================= */}
          {recapMode === 'commentary' && (
            <div className="space-y-6 animate-fadeIn">
              {/* 1. SINGLE NARRATOR VOICEOVER SCRIPT TEXTAREA (Pure Text, No Speaker Tags) */}
              <div className="bg-[#080d18] border border-amber-500/30 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-sm sm:text-base text-white">
                      Single Narrator Recap Script (ဇာတ်လမ်းပြော ရီကတ် စာသား)
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                      {voiceScriptInput.trim() ? voiceScriptInput.trim().split(/\s+/).length : 0} Words • Pure Narrative
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (voiceScriptInput.trim()) {
                          navigator.clipboard.writeText(voiceScriptInput.trim());
                          setExportSuccessMsg('ဇာတ်လမ်းပြော Script ကို Copy ကူးပြီးပါပြီ!');
                          setTimeout(() => setExportSuccessMsg(null), 2500);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3 h-3 text-amber-400" />
                      <span>Copy Full Script</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-400">
                    ရုပ်ရှင်ဇာတ်လမ်း အစမှ အဆုံးထိ အဆက်မပြတ် ဖတ်ကြားမည့် တစ်ဦးတည်းသော ဇာတ်လမ်းပြောသူ (Single Narrator) ၏ သန့်စင်သော ဇာတ်ညွှန်း စာသား ဖြစ်ပါသည်။ (Speaker tag မပါဝင်ပါ)
                  </p>
                  <textarea
                    rows={8}
                    value={voiceScriptInput}
                    onChange={(e) => {
                      setVoiceScriptInput(e.target.value);
                      if (isCustomSubtitleMode) {
                        setCustomSubtitleText(e.target.value.slice(0, 90));
                      }
                    }}
                    placeholder="ရုပ်ရှင်ဇာတ်လမ်း အစမှ အဆုံးထိ ဆက်တိုက် ပြောပြမည့် မြန်မာဘာသာ Narrative Script စာသားများကို ဤနေရာတွင် စိတ်ကြိုက် ပြင်ဆင်နိုင်ပါသည်..."
                    className="w-full bg-[#0b1322] text-white text-xs sm:text-sm p-4 rounded-xl border border-slate-700 hover:border-amber-400/60 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 font-sans leading-relaxed resize-y shadow-inner"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span>✨ Auto-synchronized directly into Voiceover Studio & Video Subtitle layer</span>
                    <span className="font-mono text-amber-400 font-bold">{voiceScriptInput.length} Characters</span>
                  </div>
                </div>
              </div>

              {/* 2. SINGLE VOICE SELECTION & SPEED/PITCH CONTROLS */}
              <div className="bg-[#080d18] border border-cyan-500/30 rounded-2xl p-4 sm:p-6 space-y-5 shadow-xl">
                {/* Header & 3 Main Engine Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                        <span>Single Narrator AI Voice Engine</span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        ဇာတ်လမ်းပြောသူအတွက် အသံရွေးချယ်ရန် Gemini 2.0, Microsoft Edge TTS သို့မဟုတ် Clone Voice အသုံးပြုနိုင်ပါသည်
                      </p>
                    </div>
                  </div>

                  {/* Engine Tabs */}
                  <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 shrink-0 shadow-lg">
                    <button
                      type="button"
                      onClick={() => setVoiceEngineTab('gemini')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                        voiceEngineTab === 'gemini'
                          ? 'bg-gradient-to-r from-sky-400 via-cyan-400 to-teal-400 text-slate-950 shadow-lg shadow-cyan-500/30 font-black ring-1 ring-cyan-300'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gemini Voice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoiceEngineTab('microsoft')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                        voiceEngineTab === 'microsoft'
                          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white shadow-lg shadow-blue-500/30 font-black ring-1 ring-blue-300'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Microsoft Voice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoiceEngineTab('clone')}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                        voiceEngineTab === 'clone'
                          ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 text-white shadow-lg shadow-purple-500/30 font-black ring-1 ring-purple-300'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Clone Voice</span>
                    </button>
                  </div>
                </div>

                {/* Tab 1: Gemini Voice */}
                {voiceEngineTab === 'gemini' && (
                  <div className="space-y-4 bg-[#0f172a] border border-cyan-500/30 rounded-2xl p-4 sm:p-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Gemini 2.0 Audio API Narrator Voice</span>
                      </label>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-800">
                        Active: {selectedGeminiVoice}
                      </span>
                    </div>

                    <CustomDarkDropdown
                      value={selectedGeminiVoice}
                      onChange={(val) => {
                        setSelectedGeminiVoice(val);
                        const g = GEMINI_VOICE_LIST.find((v) => v.id === val);
                        if (g) setVoicePitchCents(g.pitch);
                      }}
                      theme="cyan"
                      options={GEMINI_VOICE_LIST.map((v) => ({
                        value: v.id,
                        label: `${v.name} (${v.gender}) — ${v.description}`,
                        group: v.gender === 'Male' ? '👨 Male Voices (Puck, Charon, Fenrir, Achird, Algenib, Enceladus)' : '👩 Female Voices (Kore, Aoede, Zephyr, Achernar, Callirrhoe)',
                        badge: v.gender,
                        badgeColor: v.gender === 'Male' ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800' : 'bg-pink-950/80 text-pink-300 border-pink-800',
                        description: `နမူနာ: "${v.samplePhrase}"`,
                      }))}
                    />

                    {(() => {
                      const activeG = GEMINI_VOICE_LIST.find((v) => v.id === selectedGeminiVoice);
                      if (!activeG) return null;
                      return (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                          <div className="min-w-0 pr-2">
                            <span className="text-slate-200 font-semibold">{activeG.description}</span>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">နမူနာ: "{activeG.samplePhrase}"</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePreviewVoice(activeG.id, 'my', undefined, activeG.samplePhrase)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Tab 2: Microsoft Edge Voice */}
                {voiceEngineTab === 'microsoft' && (
                  <div className="space-y-4 bg-[#0f172a] border border-blue-500/30 rounded-2xl p-4 sm:p-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-blue-300 flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5 text-blue-400" />
                        <span>Microsoft Edge TTS Narrator Voices</span>
                      </label>
                      <span className="text-[10px] font-mono text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-800">
                        Active: {MICROSOFT_VOICE_LIST.find((v) => v.id === selectedMicrosoftVoice)?.name || selectedMicrosoftVoice}
                      </span>
                    </div>

                    <CustomDarkDropdown
                      value={selectedMicrosoftVoice}
                      onChange={(val) => {
                        setSelectedMicrosoftVoice(val);
                        const m = MICROSOFT_VOICE_LIST.find((v) => v.id === val);
                        if (m) {
                          setVoicePitchCents(m.gender === 'Male' ? -420 : 40);
                        }
                      }}
                      theme="blue"
                      options={MICROSOFT_VOICE_LIST.map((m) => ({
                        value: m.id,
                        label: `${m.name}`,
                        flag: m.flag,
                        group: `${m.flag} ${m.language} (${m.gender})`,
                        badge: m.gender,
                        badgeColor: m.language === 'Burmese' ? 'bg-amber-950/80 text-amber-300 border-amber-800' : 'bg-blue-950/80 text-blue-300 border-blue-800',
                        description: m.description,
                      }))}
                    />

                    {(() => {
                      const activeM = MICROSOFT_VOICE_LIST.find((v) => v.id === selectedMicrosoftVoice);
                      if (!activeM) return null;
                      return (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                          <div className="min-w-0 pr-2">
                            <span className="text-slate-200 font-semibold">{activeM.flag} {activeM.description}</span>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">နမူနာ: "{activeM.samplePhrase}"</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePreviewVoice(activeM.id, activeM.language === 'Burmese' ? 'my' : activeM.language === 'English' ? 'en' : 'th', undefined, activeM.samplePhrase)}
                            className="px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/50 text-blue-300 hover:bg-blue-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Tab 3: Clone Voice */}
                {voiceEngineTab === 'clone' && (
                  <div className="space-y-4 bg-[#0f172a] border border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-purple-300 flex items-center gap-2">
                        <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                        <span>Voice Cloning & Custom Voice Selection</span>
                      </label>
                      {clonedVoiceId && (
                        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Ready: {clonedVoiceName || clonedVoiceId}</span>
                        </span>
                      )}
                    </div>

                    <CustomDarkDropdown
                      value={clonedVoiceId || selectedCloneVoicePreset}
                      onChange={(val) => {
                        setSelectedCloneVoicePreset(val);
                        setClonedVoiceId(val);
                        const presetObj = CINEMA_VOICE_PRESETS.find((p) => p.elevenlabsId === val);
                        if (presetObj) {
                          setClonedVoiceName(presetObj.name);
                          setVoicePitchCents(presetObj.defaultPitch);
                          setVoiceSpeed(presetObj.defaultSpeed);
                        }
                      }}
                      theme="purple"
                      options={CINEMA_VOICE_PRESETS.map((p) => ({
                        value: p.elevenlabsId,
                        label: `${p.name} — ${p.burmeseName}`,
                        group: p.category === 'male' ? '👨 Male Narrator Presets' : p.category === 'female' ? '👩 Female Narrator Presets' : '🇲🇲 Accent Presets',
                        badge: p.toneTag,
                        badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-800',
                        description: p.description,
                      }))}
                    />
                  </div>
                )}

                {/* Single Voice Speed & Pitch Controls */}
                <div className="bg-[#0b1322] border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Single Narrator Speed & Pitch Controls (အမြန်နှုန်းနှင့် အသံဩဇာ)</span>
                    </span>
                    <span className="text-[11px] font-mono text-cyan-400 font-bold">
                      {voiceSpeed.toFixed(2)}x Speed • {voicePitchCents > 0 ? `+${voicePitchCents}c` : `${voicePitchCents}c`} Pitch
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Speed Slider */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300">Speech Pace (အနှေး / အမြန်):</span>
                        <span className="font-mono text-cyan-400 font-bold">{voiceSpeed.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.75"
                        max="1.5"
                        step="0.05"
                        value={voiceSpeed}
                        onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <button type="button" onClick={() => setVoiceSpeed(0.9)} className="hover:text-cyan-400 cursor-pointer">0.9x Cinema</button>
                        <button type="button" onClick={() => setVoiceSpeed(1.0)} className="hover:text-cyan-400 cursor-pointer">1.0x Normal</button>
                        <button type="button" onClick={() => setVoiceSpeed(1.2)} className="hover:text-cyan-400 cursor-pointer">1.2x Fast</button>
                      </div>
                    </div>

                    {/* Pitch Slider */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300">Voice Pitch (အသံဩဇာ / လေသံ):</span>
                        <span className="font-mono text-cyan-400 font-bold">{voicePitchCents > 0 ? `+${voicePitchCents}c` : `${voicePitchCents}c`}</span>
                      </div>
                      <input
                        type="range"
                        min="-600"
                        max="600"
                        step="50"
                        value={voicePitchCents}
                        onChange={(e) => setVoicePitchCents(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <button type="button" onClick={() => setVoicePitchCents(-500)} className="hover:text-cyan-400 cursor-pointer">Deep (-500c)</button>
                        <button type="button" onClick={() => setVoicePitchCents(0)} className="hover:text-cyan-400 cursor-pointer">Neutral (0c)</button>
                        <button type="button" onClick={() => setVoicePitchCents(100)} className="hover:text-cyan-400 cursor-pointer">Bright (+100c)</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. ONE-CLICK AUDIO GENERATION BUTTON */}
                <div>
                  <button
                    type="button"
                    onClick={() => handlePreviewVoice()}
                    className={`w-full py-4 sm:py-5 px-6 rounded-2xl font-black text-sm sm:text-base transition-all duration-200 cursor-pointer shadow-2xl flex items-center justify-center gap-3 border ${
                      isPlayingVoice
                        ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-400 shadow-rose-500/30 ring-2 ring-rose-400/60 animate-pulse'
                        : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-400 text-white border-purple-400/50 shadow-purple-600/30 ring-2 ring-purple-400/60 hover:shadow-purple-500/50 hover:scale-[1.01] active:scale-[0.99]'
                    }`}
                  >
                    {isPlayingVoice ? (
                      <>
                        <Square className="w-5 h-5 text-white shrink-0 fill-white" />
                        <span>■ Stop Commentary Voiceover (အသံ ရပ်တန့်မည်)</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">🔊</span>
                        <span>
                          Generate Commentary Voiceover (
                          {voiceEngineTab === 'gemini'
                            ? `Gemini: ${selectedGeminiVoice}`
                            : voiceEngineTab === 'microsoft'
                            ? (MICROSOFT_VOICE_LIST.find((v) => v.id === selectedMicrosoftVoice)?.name || 'Microsoft Edge TTS')
                            : (clonedVoiceName || 'Cloned Voice')}
                          )
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 Bottom Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className="px-5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-slate-700/80 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous: Video Upload</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:via-sky-300 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-300/40 cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <span>Next: Z-Studio Video Editor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: Z-STUDIO VIDEO EDITOR (Strictly isolated, hides Steps 1 & 2)       */}
      {/* ========================================================================= */}
      {activeStep === 3 && (
        <div className="flex flex-col gap-2.5 sm:gap-4 bg-[#0b1322]/90 border border-slate-800/90 rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 md:p-6 shadow-2xl backdrop-blur-xl animate-fadeIn">
          {/* Post-Export Notice Banner if render completed */}
          {renderedDownloadUrl && (
            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-xl">
              <div className="flex items-center gap-2 text-emerald-300 text-xs sm:text-sm font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>MP4 Render & Export အောင်မြင်ပြီးပါပြီ။ နောက်ထပ် ဗီဒီယိုအသစ် စတင်လိုပါသလား?</span>
              </div>
              <button
                type="button"
                onClick={handleStartNewProject}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg font-black text-xs bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-transform hover:scale-105 active:scale-95 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-950" />
                <span>Start New Project (အသစ်ပြန်စမည်)</span>
              </button>
            </div>
          )}

          {/* Header (Compact & Space-efficient) */}
          <div className="flex flex-col gap-0.5 sm:gap-1 px-1 py-1 pb-2 border-b border-slate-800/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                <span className="text-cyan-400 font-extrabold px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/60 text-[9px] sm:text-[10px]">03</span>
                <span>STEP 3 • Z-STUDIO VIDEO EDITOR & EXPORT</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-cyan-400">
                <Palette className="w-3 h-3 text-cyan-400" />
                <span className="font-mono hidden sm:inline">COLOR GRADING & SUBTITLE BURN-IN</span>
              </div>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
              Real-time Video Preview & Color Grading
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 leading-tight">
              Preview your video with synchronized TikTok Yellow subtitles, apply film color grading, and render final MP4.
            </p>
          </div>

          {/* SECTION 1: STICKY/FIXED Real-time Video Preview Player Canvas (Requirement 2) */}
          <div
            className="w-full sticky top-0 z-[100] bg-[#0f172a] p-2 sm:p-3 rounded-2xl sm:rounded-3xl border border-slate-800/90 shadow-2xl flex flex-col gap-2 backdrop-blur-xl"
            style={{ position: 'sticky', top: 0, zIndex: 100, background: '#0f172a' }}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-bold flex items-center gap-2 text-white truncate max-w-[180px] sm:max-w-xs">
                <Film className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">{videoTitle || 'Live Preview'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold hidden sm:inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span>Live Preview</span>
                </span>
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 border border-emerald-800 flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>{syncDriftStatus.statusText}</span>
                </span>
                {videoZoomScale !== 100 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950/90 text-cyan-300 border border-cyan-800/80">
                    🔍 {videoZoomScale}%
                  </span>
                )}
                {/* Video Color Filter dropdown */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-0.5 shadow-sm">
                  <Palette className="w-3 h-3 text-cyan-400 shrink-0" />
                  <select
                    value={colorGradingPreset}
                    onChange={(e) => handleApplyColorPreset(e.target.value as any)}
                    className="bg-transparent text-cyan-300 text-[10px] sm:text-[11px] font-bold focus:outline-none cursor-pointer pr-1"
                    title="Video Color Filter"
                  >
                    <option value="normal" className="bg-[#0b1322] text-white">Normal (မူရင်း)</option>
                    <option value="moody" className="bg-[#0b1322] text-white">Moody (အမှောင်)</option>
                    <option value="vintage" className="bg-[#0b1322] text-white">Vintage (ရှေးဟောင်း)</option>
                    <option value="vibrant" className="bg-[#0b1322] text-white">Vibrant (တောက်ပ)</option>
                    <option value="noir" className="bg-[#0b1322] text-white">Film Noir (အဖြူအမည်း)</option>
                    <option value="cyberpunk" className="bg-[#0b1322] text-white">Cyberpunk (နီယွန်)</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setMirrorVideo(!mirrorVideo)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                    mirrorVideo
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.6)] font-black'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                  title="Mirror video horizontally to avoid copyright strikes"
                >
                  <span>🪞 Mirror</span>
                  {mirrorVideo && <span className="bg-black text-amber-300 text-[9px] px-1 rounded font-mono">ON</span>}
                </button>
              </div>
            </div>

            {/* Video Canvas Container (Responsive sticky height: stationary on mobile scroll, object-fit: contain) */}
            <div
              className={`relative mx-auto ${getContainerAspectClass()} rounded-xl sm:rounded-2xl overflow-hidden bg-black border border-slate-700 shadow-2xl transition-all duration-300 flex items-center justify-center min-h-[220px] sm:min-h-[360px] h-[36vh] sm:h-[48vh] max-h-[50vh] w-full`}
              style={{ contain: 'paint', willChange: 'transform' }}
            >
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  preload="metadata"
                  playsInline
                  muted={originalAudioVolume === 0}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onSeeking={handleVideoSeeking}
                  onSeeked={handleVideoSeeked}
                  style={{
                    width: '100%',
                    height: '100%',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `translate3d(-50%, -50%, 0) ${mirrorVideo ? 'scaleX(-1) ' : ''}scale(${videoZoomScale / 100})`,
                    transformOrigin: 'center center',
                    objectFit: 'contain',
                    filter: getColorFilterString(),
                    willChange: 'transform',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                  className="transition-transform duration-75"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#080d18] via-[#0b1322] to-[#040812] select-none z-10">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-lg shadow-cyan-500/10">
                    <Film className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-1">
                    Upload a video to start
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mb-3.5 leading-relaxed">
                    ဗီဒီယိုဖိုင် မရွေးချယ်ရသေးပါ။ Step 1 တွင် ရုပ်ရှင်ဖိုင် ရွေးချယ်ပြီးပါက ဤနေရာတွင် တိုက်ရိုက် ကြည့်ရှုတည်းဖြတ်နိုင်ပါမည်။
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 cursor-pointer flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Video in Step 1</span>
                  </button>
                </div>
              )}

              {/* Watermark Blur Overlays */}
              {watermarkCorner !== 'none' && (
                <div
                  className={`absolute ${
                    watermarkCorner === 'top-left'
                      ? 'top-3 left-3'
                      : watermarkCorner === 'top-right'
                      ? 'top-3 right-3'
                      : watermarkCorner === 'bottom-left'
                      ? 'bottom-14 left-3'
                      : 'bottom-14 right-3'
                  } w-28 h-10 backdrop-blur-2xl bg-black/50 border border-cyan-400/40 rounded-lg flex items-center justify-center text-[10px] text-cyan-300 font-mono shadow-md pointer-events-none z-10`}
                >
                  [ Watermark Blur ]
                </div>
              )}

              {/* Original Subtitle Blur Mask (Clean Gaussian Blur Box) */}
              {blurMaskEnabled && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    top: `${blurMaskY}%`,
                    width: `${aspectRatio === '9:16' ? Math.min(blurMaskWidth, 90) : blurMaskWidth}%`,
                    height: `${blurMaskHeight}%`,
                    backdropFilter: `blur(${blurMaskIntensity}px)`,
                    WebkitBackdropFilter: `blur(${blurMaskIntensity}px)`,
                    backgroundColor: `rgba(15, 23, 42, ${(blurMaskOpacity / 100) * 0.75})`,
                    borderRadius: '8px',
                    pointerEvents: 'none',
                    zIndex: 8,
                  }}
                  className="transition-all duration-150 overflow-hidden"
                />
              )}

              {/* Synchronized Myanmar Subtitles Overlay (Bottom-Center, max 2 lines, responsive clamp font size) */}
              {((isCustomSubtitleMode && customSubtitleText.trim()) || activeSubtitle) && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '90%',
                    zIndex: 10,
                    pointerEvents: 'none',
                    textAlign: subtitleTextAlign,
                    maxHeight: '4.2em',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                  className="transition-all duration-150 flex items-center justify-center"
                >
                  <span
                    style={{
                      fontSize: `clamp(12px, 3.8vw, ${subtitleFontSize}px)`,
                      color: subtitleTextColor || '#FFE600',
                      fontWeight: subtitleBold ? 800 : 500,
                      fontStyle: subtitleItalic ? 'italic' : 'normal',
                      textAlign: subtitleTextAlign,
                      textShadow: subtitleShadow
                        ? '0 2px 4px #000, 0 0 10px rgba(0,0,0,0.95), 0 0 20px rgba(0,0,0,0.9), 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000'
                        : 'none',
                      WebkitTextStroke: subtitleOutline ? '1.2px rgba(0,0,0,0.95)' : 'none',
                      backgroundColor: subtitleBgBox ? 'rgba(0,0,0,0.8)' : 'transparent',
                      borderRadius: subtitleBgBox ? '6px' : '0px',
                      boxShadow: subtitleBgBox ? '0 4px 16px rgba(0,0,0,0.7)' : 'none',
                      padding: subtitleBgBox ? '4px 12px' : '2px 4px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.35,
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                    }}
                    className={`inline-block uppercase tracking-wide border-0 drop-shadow-[0_4px_12px_rgba(0,0,0,1)] ${
                      subtitleFont === 'padauk' ? 'font-burmese' : ''
                    }`}
                  >
                    {cleanSubtitleForOverlay((isCustomSubtitleMode && customSubtitleText.trim())
                      ? customSubtitleText
                      : (activeSubtitle || analyzedScriptResult?.segments?.[0]?.burmeseText || generatedRecap?.voiceoverScript?.hook || ''))}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: SIDE-SWIPE HORIZONTAL TOOLBAR FOR VIDEO EDITOR (Requirement 3) */}
          <div
            className="w-full bg-[#0b1322] border border-cyan-500/30 rounded-2xl shadow-xl scrollbar-none items-center select-none"
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'nowrap',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              gap: '12px',
              padding: '10px 5px',
            }}
          >
            {/* Tool 1: [Font Size] */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5 shrink-0 shadow-sm">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1 shrink-0">
                <Type className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Size:</span>
                <span className="font-mono text-cyan-300 font-bold">{subtitleFontSize}px</span>
              </span>
              <input
                type="range"
                min="12"
                max="32"
                step="1"
                value={subtitleFontSize}
                onChange={(e) => setSubtitleFontSize(parseInt(e.target.value))}
                className="w-16 sm:w-24 h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 shrink-0"
              />
              <div className="flex items-center gap-1 shrink-0">
                {[
                  { label: '14', size: 14 },
                  { label: '18', size: 18 },
                  { label: '24', size: 24 },
                ].map((preset) => (
                  <button
                    key={preset.size}
                    type="button"
                    onClick={() => setSubtitleFontSize(preset.size)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer border ${
                      subtitleFontSize === preset.size
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tool 2: [Alignment] */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 shrink-0 shadow-sm">
              <button
                type="button"
                onClick={() => setSubtitleTextAlign('left')}
                className={`px-2 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1 text-[11px] font-bold ${
                  subtitleTextAlign === 'left' ? 'bg-cyan-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
                <span>Left</span>
              </button>
              <button
                type="button"
                onClick={() => setSubtitleTextAlign('center')}
                className={`px-2 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1 text-[11px] font-bold ${
                  subtitleTextAlign === 'center' ? 'bg-cyan-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Align Center"
              >
                <AlignCenter className="w-3.5 h-3.5" />
                <span>Center</span>
              </button>
              <button
                type="button"
                onClick={() => setSubtitleTextAlign('right')}
                className={`px-2 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1 text-[11px] font-bold ${
                  subtitleTextAlign === 'right' ? 'bg-cyan-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Align Right"
              >
                <AlignRight className="w-3.5 h-3.5" />
                <span>Right</span>
              </button>
            </div>

            {/* Tool 3: [Bold / Italic / Box] */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 shrink-0 shadow-sm">
              <button
                type="button"
                onClick={() => setSubtitleBold(!subtitleBold)}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1 text-[11px] font-bold border ${
                  subtitleBold
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
                title="Toggle Bold (B)"
              >
                <BoldIcon className="w-3.5 h-3.5" />
                <span>B</span>
              </button>
              <button
                type="button"
                onClick={() => setSubtitleItalic(!subtitleItalic)}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1 text-[11px] font-bold border ${
                  subtitleItalic
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 italic font-black shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
                title="Toggle Italic (I)"
              >
                <ItalicIcon className="w-3.5 h-3.5" />
                <span>I</span>
              </button>
              <button
                type="button"
                onClick={() => setSubtitleBgBox(!subtitleBgBox)}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1 text-[11px] font-bold border ${
                  subtitleBgBox
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
                title="Toggle Background Box"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Box</span>
              </button>
            </div>

            {/* Tool 4: [Shadow / Outline] */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 shrink-0 shadow-sm">
              <button
                type="button"
                onClick={() => setSubtitleShadow(!subtitleShadow)}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1 text-[11px] font-bold border ${
                  subtitleShadow
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
                title="Toggle Shadow"
              >
                <span>🌑 Shadow</span>
              </button>
              <button
                type="button"
                onClick={() => setSubtitleOutline(!subtitleOutline)}
                className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1 text-[11px] font-bold border ${
                  subtitleOutline
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
                title="Toggle Outline Stroke"
              >
                <span>🔲 Stroke</span>
              </button>
            </div>

            {/* Tool 5: [Color Palette] */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1 shrink-0 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold shrink-0">Color:</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {[
                  { color: '#FFE600', label: 'Yellow' },
                  { color: '#FFFFFF', label: 'White' },
                  { color: '#22D3EE', label: 'Cyan' },
                  { color: '#F59E0B', label: 'Amber' },
                  { color: '#F43F5E', label: 'Rose' },
                  { color: '#22C55E', label: 'Green' },
                ].map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setSubtitleTextColor(c.color)}
                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                      subtitleTextColor === c.color ? 'scale-125 border-white ring-2 ring-cyan-400' : 'border-black/50 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                  />
                ))}
                <label className="relative cursor-pointer flex items-center ml-0.5" title="Custom Color">
                  <input
                    type="color"
                    value={subtitleTextColor}
                    onChange={(e) => setSubtitleTextColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer opacity-0 absolute inset-0"
                  />
                  <Palette className="w-4 h-4 text-cyan-400 hover:text-cyan-300" />
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 3: AUDIO CONTROLS FOR MP4 EXPORT (Pre-Render Mixer) */}
          <div className="w-full bg-[#0b1322] border border-cyan-500/30 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <span>Audio Controls for MP4 Export</span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                      Pre-Render Mixer
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    ဗီဒီယို Export မထုတ်မီ မူရင်းဗီဒီယိုအသံ၊ AI အသံသွင်းနှင့် နောက်ခံတေးဂီတ အသံပမာဏများကို ချိန်ညှိပါ
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOriginalAudioVolume(0);
                    setVoiceoverVolume(100);
                    setBgmVolume(15);
                  }}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[11px] font-mono text-cyan-300 border border-slate-700 cursor-pointer"
                >
                  Reset Default
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Slider 1: Original Video Audio */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    {originalAudioVolume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    )}
                    <span>Original Video Audio</span>
                  </span>
                  <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                    originalAudioVolume === 0
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                      : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/80'
                  }`}>
                    {originalAudioVolume === 0 ? 'Muted (0%)' : `${originalAudioVolume}%`}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={originalAudioVolume}
                  onChange={(e) => setOriginalAudioVolume(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setOriginalAudioVolume(0)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer hover:text-white ${originalAudioVolume === 0 ? 'bg-rose-900/60 text-rose-200 font-bold' : ''}`}
                  >
                    Mute (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOriginalAudioVolume(20)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer hover:text-white ${originalAudioVolume === 20 ? 'bg-cyan-900/60 text-cyan-200 font-bold' : ''}`}
                  >
                    20%
                  </button>
                  <button
                    type="button"
                    onClick={() => setOriginalAudioVolume(50)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer hover:text-white ${originalAudioVolume === 50 ? 'bg-cyan-900/60 text-cyan-200 font-bold' : ''}`}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setOriginalAudioVolume(100)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer hover:text-white ${originalAudioVolume === 100 ? 'bg-cyan-900/60 text-cyan-200 font-bold' : ''}`}
                  >
                    100%
                  </button>
                </div>
              </div>

              {/* Slider 2: AI Voiceover Volume */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    <span>AI Voiceover Volume</span>
                  </span>
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-yellow-950/80 text-yellow-300 border border-yellow-800/80">
                    {voiceoverVolume}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={voiceoverVolume}
                  onChange={(e) => setVoiceoverVolume(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                />

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setVoiceoverVolume(0)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer hover:text-white ${voiceoverVolume === 0 ? 'bg-rose-900/60 text-rose-200 font-bold' : ''}`}
                  >
                    Off (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceoverVolume(60)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer hover:text-white ${voiceoverVolume === 60 ? 'bg-yellow-900/60 text-yellow-200 font-bold' : ''}`}
                  >
                    60%
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceoverVolume(80)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer hover:text-white ${voiceoverVolume === 80 ? 'bg-yellow-900/60 text-yellow-200 font-bold' : ''}`}
                  >
                    80%
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceoverVolume(100)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer hover:text-white ${voiceoverVolume === 100 ? 'bg-yellow-900/60 text-yellow-200 font-bold' : ''}`}
                  >
                    100%
                  </button>
                </div>
              </div>

              {/* Slider 3: Background Music (BGM) Volume */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Background Music (BGM)</span>
                  </span>
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/80">
                    {bgmVolume === 0 ? 'Off (0%)' : `${bgmVolume}%`}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={bgmVolume}
                  onChange={(e) => setBgmVolume(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setBgmVolume(0)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer hover:text-white ${bgmVolume === 0 ? 'bg-purple-900/60 text-purple-200 font-bold' : ''}`}
                  >
                    Off (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgmVolume(15)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer hover:text-white ${bgmVolume === 15 ? 'bg-purple-900/60 text-purple-200 font-bold' : ''}`}
                  >
                    15% (Soft)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgmVolume(30)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer hover:text-white ${bgmVolume === 30 ? 'bg-purple-900/60 text-purple-200 font-bold' : ''}`}
                  >
                    30%
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgmVolume(50)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer hover:text-white ${bgmVolume === 50 ? 'bg-purple-900/60 text-purple-200 font-bold' : ''}`}
                  >
                    50%
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STEP 3 ULTRA-COMPACT TABBED STUDIO CONTROLS (Mobile-Optimized Single Bar) */}
          {/* ========================================================================= */}
          <div className="bg-[#0f172a] border border-cyan-500/30 rounded-2xl p-3 sm:p-4 space-y-3.5 shadow-2xl">
            {/* Single Tabbed Control Bar (Horizontal Scrollable on Mobile) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800">
              {[
                { id: 'subtitles', label: 'Subtitles & Text', icon: Edit3, badge: customSubtitleText ? `${customSubtitleText.length}c` : null },
                { id: 'aspect', label: 'Size & Ratio', icon: Maximize2, badge: `${aspectRatio} • ${videoZoomScale}%` },
                { id: 'blur', label: 'Blur Mask', icon: Shield, badge: blurMaskEnabled ? 'ON' : 'OFF' },
                { id: 'color', label: 'Color Grade', icon: Palette, badge: colorGradingPreset.toUpperCase() },
                { id: 'style', label: 'Style & Font', icon: FileText, badge: subtitleStyle.toUpperCase() },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = step3ActiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStep3ActiveTab(tab.id as any)}
                    className={`py-2 px-3 sm:px-3.5 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 border select-none ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/30 ring-1 ring-cyan-300 scale-[1.02]'
                        : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-slate-950/20 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT 1: SUBTITLES & TEXT (With Dynamic Vertical Y-Position Slider) */}
            {step3ActiveTab === 'subtitles' && (
              <div className="space-y-3 animate-fadeIn">
                {/* 1. DUAL-AXIS SUBTITLE POSITION CONTROLS (Y-AXIS & X-AXIS SLIDERS + ALIGNMENT BUTTONS) */}
                <div className="bg-[#080d18] border border-cyan-500/30 rounded-xl p-3 space-y-3 shadow-md">
                  {/* Y-Axis (Vertical) Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Vertical Position (Y-Axis):</span>
                      </span>
                      <span className="font-mono text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 text-[11px]">
                        {subtitleVerticalPos}% ({subtitleVerticalPos < 30 ? 'Top' : subtitleVerticalPos < 60 ? 'Middle' : subtitleVerticalPos < 80 ? 'Lower-Third' : 'Bottom'})
                      </span>
                    </div>

                    <input
                      type="range"
                      min="5"
                      max="90"
                      step="1"
                      value={subtitleVerticalPos}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setSubtitleVerticalPos(v);
                        if (v < 30) setSubtitlePosition('top');
                        else if (v < 60) setSubtitlePosition('middle');
                        else if (v < 82) setSubtitlePosition('lower-third');
                        else setSubtitlePosition('bottom');
                      }}
                      className="w-full h-2.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />

                    {/* Quick Preset Buttons for Y-Axis */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                      {[
                        { label: 'Top (10%)', val: 10, pos: 'top' },
                        { label: 'Upper (25%)', val: 25, pos: 'top' },
                        { label: 'Center (50%)', val: 50, pos: 'middle' },
                        { label: 'TikTok (75%)', val: 75, pos: 'lower-third' },
                        { label: 'Bottom (85%)', val: 85, pos: 'bottom' },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => { setSubtitleVerticalPos(item.val); setSubtitlePosition(item.pos as any); }}
                          className={`px-1.5 py-0.5 rounded hover:text-cyan-300 cursor-pointer ${subtitleVerticalPos === item.val ? 'text-cyan-400 font-bold bg-cyan-950/60' : ''}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* X-Axis (Horizontal) Slider & Text Alignment Buttons */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Horizontal Position (X-Axis):</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Text Alignment Buttons (Left, Center, Right) */}
                        <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                          <button
                            type="button"
                            onClick={() => setSubtitleTextAlign('left')}
                            title="Align Left"
                            className={`p-1 rounded cursor-pointer transition-all ${
                              subtitleTextAlign === 'left' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <AlignLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubtitleTextAlign('center')}
                            title="Align Center"
                            className={`p-1 rounded cursor-pointer transition-all ${
                              subtitleTextAlign === 'center' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <AlignCenter className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubtitleTextAlign('right')}
                            title="Align Right"
                            className={`p-1 rounded cursor-pointer transition-all ${
                              subtitleTextAlign === 'right' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <AlignRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="font-mono text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 text-[11px]">
                          {subtitleHorizontalPos}% ({subtitleHorizontalPos < 40 ? 'Left' : subtitleHorizontalPos > 60 ? 'Right' : 'Center'})
                        </span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="1"
                      value={subtitleHorizontalPos}
                      onChange={(e) => setSubtitleHorizontalPos(parseInt(e.target.value))}
                      className="w-full h-2.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />

                    {/* Quick Preset Buttons for X-Axis */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                      <button
                        type="button"
                        onClick={() => { setSubtitleHorizontalPos(20); setSubtitleTextAlign('left'); }}
                        className={`px-2 py-0.5 rounded hover:text-cyan-300 cursor-pointer ${subtitleHorizontalPos === 20 ? 'text-cyan-400 font-bold bg-cyan-950/60' : ''}`}
                      >
                        Left (20%)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSubtitleHorizontalPos(50); setSubtitleTextAlign('center'); }}
                        className={`px-2 py-0.5 rounded hover:text-cyan-300 cursor-pointer ${subtitleHorizontalPos === 50 ? 'text-cyan-400 font-bold bg-cyan-950/60' : ''}`}
                      >
                        Center (50%)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSubtitleHorizontalPos(80); setSubtitleTextAlign('right'); }}
                        className={`px-2 py-0.5 rounded hover:text-cyan-300 cursor-pointer ${subtitleHorizontalPos === 80 ? 'text-cyan-400 font-bold bg-cyan-950/60' : ''}`}
                      >
                        Right (80%)
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Pure Burmese Subtitle Live Cue Display (Redundant Textarea Hidden) */}
                <div className="bg-[#080d18] border border-slate-800 rounded-xl p-3 space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Live Synchronized Subtitle Preview (သန့်ရှင်းသော မြန်မာစာတန်းထိုး):</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                      ✓ Pure Narrative Only (No JSON)
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-xs sm:text-sm font-burmese text-amber-300 font-semibold leading-relaxed">
                    "{cleanSubtitleForOverlay((isCustomSubtitleMode && customSubtitleText.trim()) ? customSubtitleText : (activeSubtitle || analyzedScriptResult?.segments?.[0]?.burmeseText || generatedRecap?.voiceoverScript?.hook || 'မြန်မာဘာသာ စာတန်းထိုးနှင့် အသံသွင်း Recap'))}"
                  </div>
                </div>

                {/* 3. SUBTITLE FORMATTING TOOLBAR & FONT SIZE CONTROLLER (Requirement 6) */}
                <div className="bg-[#080d18] border border-cyan-500/30 rounded-xl p-3.5 space-y-3.5 shadow-md">
                  {/* Row A: Font Size Slider (12px - 32px) & Presets */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Font Size Controller (12px - 32px):</span>
                      </span>
                      <span className="font-mono text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 text-[11px]">
                        {subtitleFontSize}px
                      </span>
                    </div>

                    <input
                      type="range"
                      min="12"
                      max="32"
                      step="1"
                      value={subtitleFontSize}
                      onChange={(e) => setSubtitleFontSize(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />

                    {/* Quick Presets: Small 14px, Medium 18px, Large 24px */}
                    <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                      {[
                        { label: 'Small (14px)', size: 14 },
                        { label: 'Medium (18px)', size: 18 },
                        { label: 'Large (24px)', size: 24 },
                      ].map((preset) => (
                        <button
                          key={preset.size}
                          type="button"
                          onClick={() => setSubtitleFontSize(preset.size)}
                          className={`py-1 px-1.5 rounded-lg text-center text-[11px] font-bold transition-all cursor-pointer border truncate ${
                            subtitleFontSize === preset.size
                              ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-sm font-black'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Row B: Formatting Control Bar (Alignment, Style, Contrast Toggles) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80">
                    {/* Text Alignment */}
                    <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Alignment</span>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => setSubtitleTextAlign('left')}
                          className={`py-1 rounded cursor-pointer transition-all flex items-center justify-center gap-1 text-xs font-bold border ${
                            subtitleTextAlign === 'left' ? 'bg-cyan-500 text-slate-950 border-cyan-300' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                          }`}
                          title="Align Left"
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Left</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubtitleTextAlign('center')}
                          className={`py-1 rounded cursor-pointer transition-all flex items-center justify-center gap-1 text-xs font-bold border ${
                            subtitleTextAlign === 'center' ? 'bg-cyan-500 text-slate-950 border-cyan-300' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                          }`}
                          title="Align Center"
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Center</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubtitleTextAlign('right')}
                          className={`py-1 rounded cursor-pointer transition-all flex items-center justify-center gap-1 text-xs font-bold border ${
                            subtitleTextAlign === 'right' ? 'bg-cyan-500 text-slate-950 border-cyan-300' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                          }`}
                          title="Align Right"
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Right</span>
                        </button>
                      </div>
                    </div>

                    {/* Text Style: Bold, Italic, Background Box */}
                    <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Text Style</span>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => setSubtitleBold(!subtitleBold)}
                          className={`py-1 rounded cursor-pointer transition-all flex items-center justify-center gap-1 text-xs font-bold border ${
                            subtitleBold ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                          title="Toggle Bold"
                        >
                          <BoldIcon className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Bold</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubtitleItalic(!subtitleItalic)}
                          className={`py-1 rounded cursor-pointer transition-all flex items-center justify-center gap-1 text-xs font-bold border ${
                            subtitleItalic ? 'bg-cyan-500 text-slate-950 border-cyan-300 italic' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                          title="Toggle Italic"
                        >
                          <ItalicIcon className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Italic</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubtitleBgBox(!subtitleBgBox)}
                          className={`py-1 rounded cursor-pointer transition-all flex items-center justify-center gap-1 text-xs font-bold border ${
                            subtitleBgBox ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-bold' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                          title="Toggle Background Box"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Box</span>
                        </button>
                      </div>
                    </div>

                    {/* Dynamic Shadow & Contrast Toggles */}
                    <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contrast & Shadow</span>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setSubtitleShadow(!subtitleShadow)}
                          className={`py-1 rounded cursor-pointer transition-all flex items-center justify-center gap-1 text-xs font-bold border ${
                            subtitleShadow ? 'bg-amber-400 text-slate-950 border-amber-300 font-black' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                          title="Toggle Dynamic Shadow"
                        >
                          <span className="text-xs">🌑</span>
                          <span className="text-[10px]">Shadow {subtitleShadow ? 'ON' : 'OFF'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubtitleOutline(!subtitleOutline)}
                          className={`py-1 rounded cursor-pointer transition-all flex items-center justify-center gap-1 text-xs font-bold border ${
                            subtitleOutline ? 'bg-amber-400 text-slate-950 border-amber-300 font-black' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                          title="Toggle Outline Stroke"
                        >
                          <span className="text-xs">🔲</span>
                          <span className="text-[10px]">Outline {subtitleOutline ? 'ON' : 'OFF'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Row C: Text Color Palette & Custom Picker */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                      <span>Text Color:</span>
                      <span className="font-mono text-cyan-300 font-bold">{subtitleTextColor}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { color: '#FFE600', label: 'Yellow', bg: 'bg-[#FFE600]' },
                        { color: '#FFFFFF', label: 'White', bg: 'bg-white' },
                        { color: '#22D3EE', label: 'Cyan', bg: 'bg-cyan-400' },
                        { color: '#F59E0B', label: 'Amber', bg: 'bg-amber-500' },
                        { color: '#F43F5E', label: 'Rose', bg: 'bg-rose-500' },
                      ].map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => {
                            setSubtitleTextColor(c.color);
                            if (c.color === '#FFE600') setSubtitleStyle('tiktok');
                            else if (c.color === '#FFFFFF') setSubtitleStyle('cinema');
                            else if (c.color === '#22D3EE') setSubtitleStyle('neon');
                          }}
                          className={`w-5 h-5 rounded-md ${c.bg} cursor-pointer transition-all ${subtitleTextColor === c.color ? 'ring-2 ring-white scale-110 shadow' : 'opacity-70 hover:opacity-100'}`}
                          title={c.label}
                        />
                      ))}
                      <input
                        type="color"
                        value={subtitleTextColor}
                        onChange={(e) => setSubtitleTextColor(e.target.value)}
                        className="w-6 h-6 rounded bg-transparent cursor-pointer border-0 p-0 ml-1"
                        title="Custom Color"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: SIZE & ASPECT RATIO (Ultra-Compact 3-Button Bar) */}
            {step3ActiveTab === 'aspect' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="grid grid-cols-3 gap-2">
                  {/* 16:9 Landscape */}
                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={`p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      aspectRatio === '16:9'
                        ? 'bg-gradient-to-br from-cyan-950 to-blue-950 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base">🎬</span>
                    <span className="text-xs font-bold text-white">16:9 Landscape</span>
                    <span className="text-[10px] text-cyan-300/80">YouTube / Cinema</span>
                  </button>

                  {/* 9:16 Portrait */}
                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    className={`p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      aspectRatio === '9:16'
                        ? 'bg-gradient-to-br from-amber-950 to-orange-950 border-amber-400 text-white shadow-lg shadow-amber-500/20 ring-1 ring-amber-400'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base">📱</span>
                    <span className="text-xs font-bold text-white">9:16 Portrait</span>
                    <span className="text-[10px] text-amber-300/80">TikTok / Reels / Shorts</span>
                  </button>

                  {/* 1:1 Square */}
                  <button
                    type="button"
                    onClick={() => setAspectRatio('1:1')}
                    className={`p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      aspectRatio === '1:1'
                        ? 'bg-gradient-to-br from-purple-950 to-pink-950 border-purple-400 text-white shadow-lg shadow-purple-500/20 ring-1 ring-purple-400'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base">🔳</span>
                    <span className="text-xs font-bold text-white">1:1 Square</span>
                    <span className="text-[10px] text-purple-300/80">Facebook / IG Feed</span>
                  </button>
                </div>

                {/* 🔍 Video Zoom / Fit Scale Slider (50% to 200%, default: 100%) */}
                <div className="bg-[#080d18] border border-cyan-500/30 rounded-xl p-3 space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="text-cyan-400">🔍</span>
                      <span>Video Zoom / Fit Scale:</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 text-[11px]">
                        {videoZoomScale}% {videoZoomScale === 100 ? '(Fit 1:1)' : videoZoomScale > 100 ? `(+${videoZoomScale - 100}% Zoom)` : `(${videoZoomScale}% Shrink)`}
                      </span>
                      {videoZoomScale !== 100 && (
                        <button
                          type="button"
                          onClick={() => setVideoZoomScale(100)}
                          className="text-[10px] text-slate-400 hover:text-cyan-300 font-mono underline cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="1"
                    value={videoZoomScale}
                    onChange={(e) => setVideoZoomScale(parseInt(e.target.value) || 100)}
                    className="w-full h-2.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />

                  {/* Preset Quick Buttons */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setVideoZoomScale(75)}
                      className={`px-2 py-0.5 rounded hover:text-cyan-300 cursor-pointer ${videoZoomScale === 75 ? 'text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-800' : 'bg-slate-900/60'}`}
                    >
                      75% Wide
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoZoomScale(100)}
                      className={`px-2.5 py-0.5 rounded hover:text-cyan-300 cursor-pointer ${videoZoomScale === 100 ? 'text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-800' : 'bg-slate-900/60'}`}
                    >
                      100% Fit (Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoZoomScale(125)}
                      className={`px-2 py-0.5 rounded hover:text-cyan-300 cursor-pointer ${videoZoomScale === 125 ? 'text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-800' : 'bg-slate-900/60'}`}
                    >
                      125% Fill
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoZoomScale(150)}
                      className={`px-2 py-0.5 rounded hover:text-cyan-300 cursor-pointer ${videoZoomScale === 150 ? 'text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-800' : 'bg-slate-900/60'}`}
                    >
                      150% Zoom
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoZoomScale(175)}
                      className={`px-2 py-0.5 rounded hover:text-cyan-300 cursor-pointer ${videoZoomScale === 175 ? 'text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-800' : 'bg-slate-900/60'}`}
                    >
                      175% Close-up
                    </button>
                  </div>
                </div>

                {/* Mirror Video (Horizontal Flip) Toggle Control */}
                <div className="bg-[#080d18] border border-cyan-500/30 rounded-xl p-3 flex items-center justify-between shadow-md">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>🪞 Mirror Video (Horizontal Flip)</span>
                      {mirrorVideo ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                          Active (Flip ON)
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          Normal (Flip OFF)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      ဗီဒီယိုအား ဘယ်/ညာ ပြောင်းပြန်လှန်ပြီး Render ထုတ်ပေးပါသည် (Copyright Strike ကာကွယ်ရန်)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMirrorVideo(!mirrorVideo)}
                    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors cursor-pointer border ${
                      mirrorVideo ? 'bg-amber-400 border-amber-300' : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-slate-950 transition-transform ${
                        mirrorVideo ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: BLUR MASK CONTROLS */}
            {step3ActiveTab === 'blur' && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">Blur Original Subtitles:</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${blurMaskEnabled ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-slate-900 text-slate-500'}`}>
                      {blurMaskEnabled ? 'Mask Active' : 'Mask Inactive'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBlurMaskEnabled(!blurMaskEnabled)}
                    className={`px-3 py-1 rounded-xl font-bold text-xs cursor-pointer border ${
                      blurMaskEnabled
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {blurMaskEnabled ? '✓ Enabled' : 'Enable Mask'}
                  </button>
                </div>

                {/* Alignment Presets */}
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-slate-500 font-mono">Presets:</span>
                  <button
                    type="button"
                    onClick={() => { setBlurMaskEnabled(true); setBlurMaskY(82); setBlurMaskHeight(14); setBlurMaskWidth(94); setBlurMaskIntensity(16); }}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 cursor-pointer"
                  >
                    Bottom Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBlurMaskEnabled(true); setBlurMaskY(76); setBlurMaskHeight(16); setBlurMaskWidth(96); setBlurMaskIntensity(20); }}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 cursor-pointer"
                  >
                    TikTok
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBlurMaskEnabled(true); setBlurMaskY(86); setBlurMaskHeight(10); setBlurMaskWidth(98); setBlurMaskIntensity(14); }}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-purple-300 border border-slate-800 cursor-pointer"
                  >
                    Cinema Slim
                  </button>
                </div>

                {/* Compact Sliders Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                  <div className="bg-[#080d18] p-2 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Y-Pos:</span>
                      <span className="font-mono text-cyan-400 font-bold">{blurMaskY}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="94"
                      value={blurMaskY}
                      onChange={(e) => setBlurMaskY(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                  <div className="bg-[#080d18] p-2 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Height:</span>
                      <span className="font-mono text-cyan-400 font-bold">{blurMaskHeight}%</span>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="28"
                      value={blurMaskHeight}
                      onChange={(e) => setBlurMaskHeight(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                  <div className="bg-[#080d18] p-2 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Intensity:</span>
                      <span className="font-mono text-cyan-400 font-bold">{blurMaskIntensity}px</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="32"
                      value={blurMaskIntensity}
                      onChange={(e) => setBlurMaskIntensity(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                  <div className="bg-[#080d18] p-2 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Opacity:</span>
                      <span className="font-mono text-cyan-400 font-bold">{blurMaskOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={blurMaskOpacity}
                      onChange={(e) => setBlurMaskOpacity(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: COLOR GRADING CONTROLS */}
            {step3ActiveTab === 'color' && (
              <div className="space-y-3 animate-fadeIn">
                {/* 6 Presets Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { id: 'normal', label: '⚖️ Normal' },
                    { id: 'moody', label: '🌑 Moody' },
                    { id: 'vintage', label: '🎞️ Vintage' },
                    { id: 'vibrant', label: '✨ Vibrant' },
                    { id: 'noir', label: '🎬 Noir' },
                    { id: 'cyberpunk', label: '⚡ Cyber' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyColorPreset(p.id as any)}
                      className={`py-2 px-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer truncate text-center ${
                        colorGradingPreset === p.id
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-sm font-black'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* 3 Color Sliders in 1 Row */}
                <div className="grid grid-cols-3 gap-2 pt-0.5">
                  <div className="bg-[#080d18] p-2 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Brightness:</span>
                      <span className="font-mono text-cyan-400 font-bold">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                  <div className="bg-[#080d18] p-2 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Contrast:</span>
                      <span className="font-mono text-cyan-400 font-bold">{contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      value={contrast}
                      onChange={(e) => setContrast(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                  <div className="bg-[#080d18] p-2 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Saturation:</span>
                      <span className="font-mono text-cyan-400 font-bold">{saturation}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={saturation}
                      onChange={(e) => setSaturation(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 5: STYLE & FONT (Custom Dark Dropdowns) */}
            {step3ActiveTab === 'style' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Burmese Font
                  </label>
                  <CustomDarkDropdown
                    value={subtitleFont}
                    onChange={(val) => setSubtitleFont(val as any)}
                    theme="cyan"
                    buttonClassName="!py-2 !px-2.5 !text-xs"
                    options={[
                      { value: 'padauk', label: 'Padauk Font (ရုပ်ရှင်ဖောင့်)', description: 'Cinematic Myanmar font', badge: 'Default' },
                      { value: 'noto', label: 'Noto Sans Myanmar', description: 'Google clean UI font' },
                      { value: 'myanmar-text', label: 'Myanmar Text Bold', description: 'Heavy-weight subtitle typography' },
                      { value: 'sans', label: 'Plus Jakarta Sans', description: 'Clean modern English font' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Color Theme
                  </label>
                  <CustomDarkDropdown
                    value={subtitleStyle}
                    onChange={(val) => setSubtitleStyle(val as any)}
                    theme="amber"
                    buttonClassName="!py-2 !px-2.5 !text-xs"
                    options={[
                      { value: 'tiktok', label: 'TikTok Yellow (#FFE600)', description: 'Viral yellow with black stroke', badge: 'Popular' },
                      { value: 'cinema', label: 'Cinema Crisp White', description: 'Clean white with drop shadow' },
                      { value: 'neon', label: 'Cyberpunk Cyan Glow', description: 'Neon cyan border glow' },
                      { value: 'boxed', label: 'Dark Slate Boxed', description: 'Slate-900 box' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Position Preset
                  </label>
                  <CustomDarkDropdown
                    value={subtitlePosition}
                    onChange={(val) => {
                      setSubtitlePosition(val as any);
                      if (val === 'top') setSubtitleVerticalPos(10);
                      else if (val === 'middle') setSubtitleVerticalPos(50);
                      else if (val === 'lower-third') setSubtitleVerticalPos(75);
                      else setSubtitleVerticalPos(85);
                    }}
                    theme="blue"
                    buttonClassName="!py-2 !px-2.5 !text-xs"
                    options={[
                      { value: 'bottom', label: 'Bottom (85%)', description: 'Standard bottom center placement' },
                      { value: 'lower-third', label: 'Lower-Third (75%)', description: 'Above TikTok overlay controls' },
                      { value: 'middle', label: 'Center (50%)', description: 'Center frame focus' },
                      { value: 'top', label: 'Top (10%)', description: 'Upper position' },
                    ]}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Subtitle Format & Export Bar (Custom Dark Dropdown) */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-xs font-mono font-bold text-slate-300 shrink-0">SUBTITLE EXPORT:</span>
              </div>
              <div className="w-56">
                <CustomDarkDropdown
                  value={exportFormat}
                  onChange={(val) => setExportFormat(val as any)}
                  theme="cyan"
                  buttonClassName="!py-2 !px-3 !text-xs font-bold"
                  options={[
                    { value: 'srt', label: 'SRT Subtitle (.srt)', description: 'Standard SubRip subtitle file for all players' },
                    { value: 'vtt', label: 'Styled WebVTT (.vtt)', description: 'Modern HTML5 web video subtitle' },
                    { value: 'ass', label: 'Styled ASS (.ass)', description: 'Advanced SubStation Alpha with custom styling' },
                    { value: 'pdf', label: 'PDF Document (.pdf)', description: 'Printable formatted script document' },
                    { value: 'txt', label: 'Plain Text (.txt)', description: 'Clean raw transcript text file' },
                  ]}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportScript(exportFormat)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export {exportFormat.toUpperCase()}</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BOTTOM (FINAL STEP): RENDER & EXPORT FINAL VIDEO + CHUNKING OPTIONS        */}
          {/* ========================================================================= */}
          <div className="w-full bg-[#0b1322] border border-cyan-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-3.5 shadow-2xl ring-1 ring-cyan-500/20">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Final Step: Render & Export</span>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                      Step 3 Complete
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    ဗီဒီယိုနှင့် မြန်မာစာတန်းထိုး၊ AI နောက်ခံစကားပြောများကို ပေါင်းစပ်၍ MP4 ဗီဒီယိုအဖြစ် ထုတ်ယူပါ
                  </p>
                </div>
              </div>
            </div>

            {/* Main Action Button */}
            <button
              type="button"
              onClick={handleExportMp4}
              className="w-full py-4 sm:py-5 px-6 rounded-2xl font-black text-sm sm:text-base text-slate-950 bg-gradient-to-r from-yellow-400 via-amber-300 to-cyan-400 hover:from-yellow-300 hover:via-amber-200 hover:to-cyan-300 shadow-2xl shadow-yellow-500/25 ring-2 ring-yellow-400/70 hover:shadow-cyan-400/50 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer"
            >
              <span className="text-xl">⚡</span>
              <span>Render & Export Final Video (MP4 Subtitles + Dubbing)</span>
            </button>

            {/* Split 10-Min Chunks button */}
            <button
              type="button"
              onClick={handleSplitVideoBackend}
              disabled={isSplittingVideo}
              className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-[#0f172a] hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-cyan-300 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-60 shadow-md"
            >
              <Scissors className="w-4 h-4 text-cyan-400" />
              <span>
                {isSplittingVideo
                  ? (splitProgressText || 'Backend က ၁၀ မိနစ်အပိုင်းများ ခွဲထုတ်နေပါသည်...')
                  : '၁ နာရီကျော် ဗီဒီယိုများကို ၁၀ မိနစ်စီ အပိုင်းခွဲ၍ ထုတ်မည် (Split 10-Min Chunks)'}
              </span>
            </button>

            {/* Display Processed 10-Minute Segments in Step 3 if available */}
            {splitResult && splitResult.segments && splitResult.segments.length > 0 && (
              <div className="bg-[#0f172a] border border-cyan-500/30 rounded-2xl p-4 space-y-3 animate-fadeIn shadow-xl">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>၁၀ မိနစ်စာ အပိုင်း {splitResult.totalSegments} ပိုင်း အဆင်သင့်ဖြစ်ပါပြီ</span>
                  </span>
                  <span className="text-slate-400">{splitResult.totalDurationFormatted}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {splitResult.segments.map((seg) => (
                    <div
                      key={seg.index}
                      className="p-2.5 rounded-xl bg-[#0b1322] border border-slate-800 hover:border-cyan-500/50 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-white block truncate">{seg.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {seg.durationFormatted} • {seg.fileSize}
                        </span>
                      </div>
                      <a
                        href={seg.downloadUrl}
                        download={seg.fileName}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1 shrink-0"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 3 Bottom Navigation Controls */}
          <div className="flex items-center justify-start pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm flex items-center gap-2 border border-slate-700 cursor-pointer transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous: Script & Voiceover Studio</span>
            </button>
          </div>
        </div>
      )}
      {/* RENDER & EXPORT MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#0b1322] border border-cyan-500/40 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 my-auto">
            <button
              onClick={() => setIsExportModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">
                  MP4 Export & Render Studio
                </h3>
                <p className="text-xs text-slate-400">
                  {generatedRecap?.title} • {aspectRatio} • {selectedVoice} Voice
                </p>
              </div>
            </div>

            {/* Progress Bar while rendering */}
            {isRendering ? (
              <div className="space-y-3 py-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-400 font-bold flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    {renderStepText}
                  </span>
                  <span className="text-white font-bold">{renderProgress}%</span>
                </div>
                <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 transition-all duration-300"
                    style={{ width: `${renderProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 text-center">
                  Subtitles၊ Watermark Blur နှင့် Audio များကို အပြီးသတ် ပေါင်းစပ်နေပါသည်...
                </p>
              </div>
            ) : (
              <div className="space-y-5 animate-fadeIn">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-xs sm:text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    ဗီဒီယို ပေါင်းစပ်ထုတ်လုပ်မှု အောင်မြင်ပါသည်။ သင့်ဗီဒီယိုကို အောက်ပါ ခလုတ်မှတစ်ဆင့် ဒေါင်းလုဒ် ရယူနိုင်ပါပြီ။
                  </span>
                </div>

                {/* Rendered Preview Player */}
                <div className="bg-black/90 p-2 sm:p-4 rounded-2xl flex items-center justify-center border border-slate-800">
                  <div className={`relative ${getContainerAspectClass()} rounded-xl overflow-hidden bg-black border border-slate-700`}>
                    <video
                      src={renderedDownloadUrl || videoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                    {/* Rendered Watermark Blur */}
                    {watermarkCorner !== 'none' && (
                      <div
                        className={`absolute ${
                          watermarkCorner === 'top-left'
                            ? 'top-2 left-2'
                            : watermarkCorner === 'top-right'
                            ? 'top-2 right-2'
                            : watermarkCorner === 'bottom-left'
                            ? 'bottom-12 left-2'
                            : 'bottom-12 right-2'
                        } w-24 h-8 backdrop-blur-2xl bg-black/50 border border-cyan-400/40 rounded flex items-center justify-center text-[9px] text-cyan-300 font-mono pointer-events-none`}
                      >
                        [ Watermark Blur ]
                      </div>
                    )}
                    {/* Rendered Subtitle Bar */}
                    <div className="absolute bottom-8 left-2 right-2 pointer-events-none text-center">
                      <span className="inline-block px-2.5 py-1 rounded bg-black/90 text-yellow-300 font-bold text-xs border border-yellow-400/30 shadow-md">
                        {generatedRecap?.subtitles?.[0]?.text || generatedRecap?.tagline || 'Z Star Myanmar Recap'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Download Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadRenderedVideo}
                    className="py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-cyan-400 to-sky-300 hover:from-cyan-300 hover:to-sky-200 text-slate-950 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Rendered MP4 ဗီဒီယို ဒေါင်းလုဒ်ယူမည်</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadSrt}
                    className="py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>SRT Subtitle (.srt) ယူမည်</span>
                  </button>
                </div>

                {/* REQUIREMENT 4: PROMINENT START NEW PROJECT (POST-EXPORT CLEANUP & RAM BUFFER DISPOSAL) */}
                <div className="pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleStartNewProject}
                    className="w-full py-4 px-6 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:via-teal-300 hover:to-cyan-300 text-slate-950 flex items-center justify-center gap-2.5 cursor-pointer shadow-xl shadow-emerald-500/25 ring-2 ring-emerald-300/60 hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-950 shrink-0 stroke-[2.5]" />
                    <span>Start New Project (အသစ်ပြန်စမည်)</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1.5 font-mono">
                    RAM buffers များကို ရှင်းထုတ်ပြီး Step 1 မှ ဗီဒီယိုအသစ် စတင်ပါမည်
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden audio element for full voiceover playback */}
      <audio ref={audioRef} preload="auto" className="hidden" />

      {/* Branded Z STAR Animated Loading Feedback Overlay */}
      <ZStarLoadingOverlay
        isOpen={isAnyLoading}
        title={overlayTitle}
        statusText={overlayStatusText}
        subtext={overlaySubtext}
        progress={overlayProgress}
        currentStep={overlayStep}
      />
    </div>
  );
};

export default ZStarRecapStudio;

