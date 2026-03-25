// Darts Tracker Audio System
// Simplified from Pitchle to focus on UI feedback (clicks, chimes, buzzes)

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

let currentVolume = 0.5;
let autoCleanupTimer: number | null = null;
const AUTO_CLEANUP_DELAY_MS = 3000;

let activeOscillators: OscillatorNode[] = [];

export function setVolume(v: number) {
  currentVolume = v;
  if (masterGain && audioCtx) {
    masterGain.gain.setTargetAtTime(currentVolume, audioCtx.currentTime, 0.05);
  }
}

export function getVolume() {
  return currentVolume;
}

function cancelAutoCleanup() {
  if (autoCleanupTimer !== null) {
    window.clearTimeout(autoCleanupTimer);
    autoCleanupTimer = null;
  }
}

function scheduleAutoCleanup() {
  cancelAutoCleanup();
  autoCleanupTimer = window.setTimeout(() => {
    forceStopAndResetAudio();
  }, AUTO_CLEANUP_DELAY_MS);
}

export async function forceStopAndResetAudio() {
  cancelAutoCleanup();
  if (audioCtx) {
    const now = audioCtx.currentTime;
    activeOscillators.forEach((osc) => {
      try {
        osc.stop(now + 0.05);
      } catch (e) {
        /* Already stopped */
      }
    });
  }
  activeOscillators = [];

  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = "none";
  }

  if (audioCtx) {
    try {
      await audioCtx.close();
    } catch (e) {
      console.warn("Failed to close audio context:", e);
    }
    audioCtx = null;
    masterGain = null;
  }
}

export async function initAudio() {
  cancelAutoCleanup();
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = currentVolume;
    masterGain.connect(audioCtx.destination);

    // Bypass iOS silent switch
    if ("audioSession" in navigator) {
      try {
        // @ts-ignore
        (navigator as any).audioSession.type = "playback";
      } catch (e) {
        console.warn("Failed to set audio session type:", e);
      }
    }

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "none";
    }
  }
  
  if (audioCtx!.state === "suspended") {
    await audioCtx!.resume();
  }
}

export async function playClick() {
  if (currentVolume <= 0) return;
  await initAudio();
  const now = audioCtx!.currentTime;

  // Short, percussive click using a noise burst + lowpass filter
  const bufferSize = audioCtx!.sampleRate * 0.02; // 20ms
  const buffer = audioCtx!.createBuffer(1, bufferSize, audioCtx!.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noiseSource = audioCtx!.createBufferSource();
  noiseSource.buffer = buffer;

  const bandpass = audioCtx!.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.setValueAtTime(1200, now); // Wooden click tone

  const clickGain = audioCtx!.createGain();
  clickGain.gain.setValueAtTime(0, now);
  clickGain.gain.linearRampToValueAtTime(0.8, now + 0.002);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

  noiseSource.connect(bandpass);
  bandpass.connect(clickGain);
  clickGain.connect(masterGain!);

  noiseSource.start(now);
  scheduleAutoCleanup();
}

export async function playSuccessChime() {
  if (currentVolume <= 0) return;
  await initAudio();
  const now = audioCtx!.currentTime;
  const duration = 1.0;

  // Bright checkout chord (C major: C5, E5, G5)
  const freqs = [523.25, 659.25, 783.99];

  freqs.forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);

    osc.connect(gain);
    gain.connect(masterGain!);

    // Slight staggering of the arpeggio
    const offset = i * 0.05;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3 / freqs.length, now + offset + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.start(now);
    osc.stop(now + duration);

    activeOscillators.push(osc);
    osc.onended = () => {
      activeOscillators = activeOscillators.filter((n) => n !== osc);
    };
  });

  scheduleAutoCleanup();
}

export async function playErrorBuzz() {
  if (currentVolume <= 0) return;
  await initAudio();
  const now = audioCtx!.currentTime;
  const duration = 0.3;

  // Dissonant, low-frequency buzz for a "bust" or invalid input
  const osc1 = audioCtx!.createOscillator();
  const osc2 = audioCtx!.createOscillator();
  const gain = audioCtx!.createGain();

  osc1.type = "sawtooth";
  osc2.type = "square";
  
  osc1.frequency.setValueAtTime(100, now);
  osc2.frequency.setValueAtTime(105, now); // 5Hz detune makes it grumble

  osc1.connect(gain);
  osc2.connect(gain);
  
  const filter = audioCtx!.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(800, now); // keep it muddy
  
  gain.connect(filter);
  filter.connect(masterGain!);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);

  activeOscillators.push(osc1, osc2);
  osc1.onended = () => {
    activeOscillators = activeOscillators.filter((n) => n !== osc1 && n !== osc2);
  };

  scheduleAutoCleanup();
}
