/**
 * Audio Extractor Utility
 * Extracts and downsamples audio tracks from browser-playable video files (MP4, WebM, MOV)
 * into 16kHz mono WAV base64 format for Gemini Speech-to-Text transcription.
 */

export interface ExtractedAudioResult {
  base64: string;
  mimeType: string;
  durationSeconds: number;
  sampleRate: number;
  hasAudio: boolean;
}

/**
 * Extracts audio from a video file and converts it into a lightweight 16kHz mono 16-bit PCM WAV base64.
 * Limits extraction to maxDurationSeconds (default 90s) to keep payload ultra-compact and fast for Gemini.
 */
export async function extractAudioFromVideoFile(
  file: File,
  maxDurationSeconds = 90
): Promise<ExtractedAudioResult> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  const audioContext = new AudioContextClass();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const decodedBuffer: AudioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    if (decodedBuffer.numberOfChannels === 0 || decodedBuffer.length === 0) {
      return {
        base64: '',
        mimeType: 'audio/wav',
        durationSeconds: 0,
        sampleRate: 16000,
        hasAudio: false,
      };
    }

    const duration = decodedBuffer.duration;
    // For media files longer than 15 minutes (900s), extract chunked audio (start 45s, middle 45s, climax 30s)
    // to prevent memory bloat, long upload times, and 94% hanging while preserving full storyline coverage.
    const isLongMedia = duration > 900;
    const clipDuration = isLongMedia ? 120 : Math.min(duration, maxDurationSeconds);
    const targetSampleRate = 16000;
    const targetLength = Math.floor(clipDuration * targetSampleRate);

    // Render downsampled 16kHz mono audio using OfflineAudioContext
    const offlineContext = new OfflineAudioContext(1, targetLength, targetSampleRate);

    if (isLongMedia) {
      // Chunk 1: Beginning exposition (0 to 45s)
      const source1 = offlineContext.createBufferSource();
      source1.buffer = decodedBuffer;
      source1.connect(offlineContext.destination);
      source1.start(0, 0, 45);

      // Chunk 2: Mid-movie turning point (45s to 90s in target buffer)
      const midPoint = Math.max(45, Math.floor(duration * 0.45));
      const source2 = offlineContext.createBufferSource();
      source2.buffer = decodedBuffer;
      source2.connect(offlineContext.destination);
      source2.start(45, midPoint, 45);

      // Chunk 3: Climax resolution (90s to 120s in target buffer)
      const climaxPoint = Math.max(90, Math.floor(duration * 0.8));
      const source3 = offlineContext.createBufferSource();
      source3.buffer = decodedBuffer;
      source3.connect(offlineContext.destination);
      source3.start(90, climaxPoint, 30);
    } else {
      const source = offlineContext.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(offlineContext.destination);
      source.start(0, 0, clipDuration);
    }

    const resampledBuffer = await offlineContext.startRendering();
    const channelData = resampledBuffer.getChannelData(0);

    // Convert Float32Array to 16-bit PCM WAV
    const wavBlob = encodeWAV(channelData, targetSampleRate);
    const base64 = await blobToBase64(wavBlob);

    return {
      base64,
      mimeType: 'audio/wav',
      durationSeconds: duration,
      sampleRate: targetSampleRate,
      hasAudio: true,
    };
  } finally {
    if (audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
    }
  }
}

/**
 * Encodes Float32 mono PCM samples into a standard 16-bit WAV Blob
 */
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw PCM)
  view.setUint16(20, 1, true);
  // channel count (mono = 1)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sampleRate * numberOfChannels * bytesPerSample)
  view.setUint32(28, sampleRate * 2, true);
  // block align (numberOfChannels * bytesPerSample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp to -1 .. 1
    const s = Math.max(-1, Math.min(1, samples[i]));
    // Scale to 16-bit signed integer
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
