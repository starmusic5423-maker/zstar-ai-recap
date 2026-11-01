import JSZip from 'jszip';
import { MovieRecap, SubtitleCue } from '../types';

/**
 * Format a number to 2 digits
 */
const pad2 = (n: number) => n.toString().padStart(2, '0');
const pad3 = (n: number) => n.toString().padStart(3, '0');

/**
 * Convert seconds into SRT timestamp HH:MM:SS,mmm
 */
export const secondsToSrtTime = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 1000);
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)},${pad3(milliseconds)}`;
};

/**
 * Convert seconds into WebVTT timestamp HH:MM:SS.mmm
 */
export const secondsToVttTime = (totalSeconds: number): string => {
  return secondsToSrtTime(totalSeconds).replace(',', '.');
};

/**
 * Format Subtitle cues into .srt format
 */
export const generateSrtContent = (movie: MovieRecap): string => {
  let cues: SubtitleCue[] = movie.subtitles || [];

  // Fallback: If no subtitles exist, synthesize cues from voiceover or scenes
  if (!cues || cues.length === 0) {
    const rawText = movie.voiceoverScript?.fullScript || movie.overview || '';
    // Split into sentences / meaningful phrases
    const sentences = rawText
      .split(/(?<=[.!?။၊\n])\s+/)
      .map((s) => s.trim().replace(/^\[.*?\]\s*/, ''))
      .filter((s) => s.length > 5);

    let currentTime = 2.0;
    cues = (sentences.length > 0 ? sentences : [movie.title, movie.logline || '']).map((sentence, idx) => {
      // Calculate realistic duration based on word length (~4-7 seconds per cue)
      const duration = Math.min(8, Math.max(3.5, sentence.length * 0.08));
      const startTime = secondsToSrtTime(currentTime);
      const endTime = secondsToSrtTime(currentTime + duration);
      const cue: SubtitleCue = {
        id: idx + 1,
        startTime,
        endTime,
        startSeconds: currentTime,
        endSeconds: currentTime + duration,
        text: sentence,
      };
      currentTime += duration + 0.4;
      return cue;
    });
  }

  let srt = '';
  cues.forEach((cue, index) => {
    srt += `${index + 1}\n`;
    srt += `${cue.startTime} --> ${cue.endTime}\n`;
    srt += `${cue.text}\n\n`;
  });
  return srt;
};

/**
 * Format Subtitle cues into .vtt (WebVTT) format
 */
export const generateVttContent = (movie: MovieRecap): string => {
  const srt = generateSrtContent(movie);
  const vtt = 'WEBVTT - Z Star AI Movie Recap Subtitles\n\n' +
    srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return vtt;
};

/**
 * Generate human-readable complete production script (.txt)
 */
export const generateScriptText = (movie: MovieRecap): string => {
  const title = movie.title || 'Movie Recap';
  const burmeseTitle = movie.burmeseTitle ? ` (${movie.burmeseTitle})` : '';

  const divider = '====================================================================';
  const subDivider = '--------------------------------------------------------------------';

  const lines = [
    divider,
    `Z STAR AI MOVIE RECAP STUDIO - MASTER PRODUCTION SCRIPT`,
    divider,
    `MOVIE TITLE       : ${title}${burmeseTitle}`,
    `RELEASE YEAR      : ${movie.year || 'N/A'}`,
    `GENRE             : ${movie.genre?.join(', ') || 'Cinema'}`,
    `DIRECTOR          : ${movie.director || 'N/A'}`,
    `IMDb RATING       : ${movie.imdbRating || 'N/A'}`,
    `ESTIMATED DURATION: ${movie.voiceoverScript?.estimatedNarrationTime || movie.duration || '10-15 MIN'}`,
    `RECOMMENDED TONE  : ${movie.voiceoverScript?.toneRecommendation || 'Dramatic Cinema'}`,
    divider,
    '',
    `[VIRAL HOOK / နိဒါန်းဆွဲဆောင်ချက်]`,
    subDivider,
    movie.voiceoverScript?.hook || movie.tagline || movie.logline || 'N/A',
    '',
    `[COMPLETE VOICEOVER NARRATION SCRIPT / မြန်မာဘာသာ ဇာတ်လမ်းပြော ဇာတ်ညွှန်း]`,
    subDivider,
    movie.voiceoverScript?.fullScript || movie.overview || 'N/A',
    '',
    `[SCENE-BY-SCENE BREAKDOWN / အဓိကဇာတ်ကွက် အချိန်မှတ်များနှင့် ပြကွက်များ]`,
    subDivider,
    ...(movie.scenes && movie.scenes.length > 0
      ? movie.scenes.map(
          (s, i) =>
            `[${i + 1}] [${s.timestamp}] ${s.title} (Intensity: ${s.intensity || 'Normal'})\nMood: ${s.mood || 'N/A'}\n${s.description}\n`
        )
      : ['No scene breakdown available.']),
    '',
    `[TWIST ENDING & SPOILER EXPLANATION / ဇာတ်သိမ်းလှည့်ကွက်နှင့် သုံးသပ်ချက်]`,
    subDivider,
    movie.twistEnding?.twistSummary ? `Major Twist: ${movie.twistEnding.twistSummary}\n` : '',
    movie.twistEnding?.endingExplanation || 'No ending explanation available.',
    movie.twistEnding?.hiddenClues && movie.twistEnding.hiddenClues.length > 0
      ? `\nHidden Clues:\n` + movie.twistEnding.hiddenClues.map((c) => ` • ${c}`).join('\n')
      : '',
    '',
    `[CREATOR PACK / YOUTUBE & TIKTOK METADATA]`,
    subDivider,
    `Suggested Video Title: ${movie.creatorPack?.suggestedVideoTitle || movie.title}`,
    `Thumbnail Concept    : ${movie.creatorPack?.thumbnailConcept || 'N/A'}`,
    `Hashtags             : ${movie.creatorPack?.hashtags?.join(' ') || '#MovieRecap #ရုပ်ရှင်ဇာတ်လမ်းအကျဉ်း'}`,
    `Retention Tip        : ${movie.creatorPack?.retentionTip || 'N/A'}`,
    divider,
    `Exported from Z Star AI Recap Studio`,
    divider,
  ];

  return lines.join('\n');
};

/**
 * Sanitize folder/file name for safe file systems
 */
export const sanitizeFilename = (name: string): string => {
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim().slice(0, 60);
};

export interface BatchExportOptions {
  includeTxtScript?: boolean;
  includeSrtSubtitles?: boolean;
  includeVttSubtitles?: boolean;
  includeJsonMetadata?: boolean;
  onProgress?: (percent: number, currentItem: string) => void;
}

/**
 * Create and trigger download of batch ZIP containing scripts and subtitles
 */
export const exportRecapsAsZip = async (
  selectedRecaps: MovieRecap[],
  options: BatchExportOptions = {}
): Promise<{ success: boolean; filename: string }> => {
  const {
    includeTxtScript = true,
    includeSrtSubtitles = true,
    includeVttSubtitles = true,
    includeJsonMetadata = true,
    onProgress,
  } = options;

  if (!selectedRecaps || selectedRecaps.length === 0) {
    throw new Error('No recaps selected for export');
  }

  const zip = new JSZip();
  const total = selectedRecaps.length;

  // Root level Manifest / Readme
  const manifestDate = new Date().toLocaleString();
  const manifestLines = [
    '====================================================================',
    'Z STAR AI MOVIE RECAP STUDIO - BATCH EXPORT ARCHIVE',
    '====================================================================',
    `Exported on   : ${manifestDate}`,
    `Total Movies  : ${total}`,
    'Studio        : Z Star Creator Studio (Myanmar & Multilingual)',
    '====================================================================\n',
    'INCLUDED MOVIE RECAPS:',
    ...selectedRecaps.map((m, idx) => {
      const bTitle = m.burmeseTitle ? ` (${m.burmeseTitle})` : '';
      return `${idx + 1}. ${m.title} [${m.year || 'N/A'}]${bTitle} - Director: ${m.director || 'N/A'}`;
    }),
    '\n====================================================================',
    'HOW TO USE THE FILES IN VIDEO EDITORS:',
    '====================================================================',
    '1. SCRIPT (.txt):',
    '   Contains the complete narrated script, viral hooks, timing guidelines,',
    '   and scene-by-scene notes for voiceover recording or teleprompters.',
    '',
    '2. SUBTITLES (.srt / .vtt):',
    '   Drag-and-drop the .srt file directly onto the timeline in Adobe Premiere Pro,',
    '   CapCut, DaVinci Resolve, or Final Cut Pro for synchronized subtitles.',
    '',
    '3. METADATA (.json):',
    '   Complete structured data for archiving, CMS import, or re-editing.',
    '====================================================================',
  ];
  zip.file('README_BATCH_EXPORT.txt', manifestLines.join('\n'));

  // Iterate over each movie and create a clean subfolder
  selectedRecaps.forEach((movie, index) => {
    const rawFolderName = `${pad2(index + 1)}_${sanitizeFilename(movie.title)}_${movie.year || 'recap'}`;
    const folder = zip.folder(rawFolderName);

    if (folder) {
      const safeTitle = sanitizeFilename(movie.title);

      // 1. Script file
      if (includeTxtScript) {
        const scriptContent = generateScriptText(movie);
        folder.file(`${safeTitle}_Script.txt`, scriptContent);
      }

      // 2. SRT Subtitles
      if (includeSrtSubtitles) {
        const srtContent = generateSrtContent(movie);
        folder.file(`${safeTitle}_Subtitles.srt`, srtContent);
      }

      // 3. WebVTT Subtitles
      if (includeVttSubtitles) {
        const vttContent = generateVttContent(movie);
        folder.file(`${safeTitle}_Subtitles.vtt`, vttContent);
      }

      // 4. JSON Metadata
      if (includeJsonMetadata) {
        const jsonContent = JSON.stringify(movie, null, 2);
        folder.file(`${safeTitle}_Data.json`, jsonContent);
      }
    }

    if (onProgress) {
      const percent = Math.round(((index + 1) / total) * 70);
      onProgress(percent, movie.title);
    }
  });

  if (onProgress) {
    onProgress(85, 'Compressing ZIP package...');
  }

  // Generate the zip blob
  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        const compPercent = Math.min(99, 85 + Math.round(metadata.percent * 0.14));
        onProgress(compPercent, 'Finalizing download...');
      }
    }
  );

  const timestamp = new Date().toISOString().slice(0, 10);
  const zipFilename = `ZStar_MovieRecaps_Batch_${total}_Movies_${timestamp}.zip`;

  // Trigger browser download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  if (onProgress) {
    onProgress(100, 'Done!');
  }

  return { success: true, filename: zipFilename };
};
