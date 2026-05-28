let isMutedState = false;
let audioCtx: AudioContext | null = null;

interface WebKitAudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

function getAudioContext(): AudioContext | null {
  if (isMutedState) return null;
  try {
    if (!audioCtx) {
      const AudioContextCtor = window.AudioContext || (window as WebKitAudioWindow).webkitAudioContext;
      if (!AudioContextCtor) return null;
      audioCtx = new AudioContextCtor();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.error('Failed to initialize Web Audio API', e);
    return null;
  }
}

export const playClick = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

  gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.05);
};

export const playChipDrop = (row: number = 5) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  // Pitch depends slightly on the row it lands in (deeper pitch for bottom rows)
  const baseFreq = 220 - (row * 15);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(baseFreq + 100, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(baseFreq, ctx.currentTime + 0.15);

  // Soft lowpass filter to make it sound organic and thick
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, ctx.currentTime);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.18);

  // Add a subtle metallic/plastic click at the very start
  setTimeout(() => {
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(1500, ctx.currentTime);
    clickOsc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.02);
    clickGain.gain.setValueAtTime(0.04, ctx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start();
    clickOsc.stop(ctx.currentTime + 0.02);
  }, 10);
};

export const playWin = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
    
    gainNode.gain.setValueAtTime(0, now + idx * 0.08);
    gainNode.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.42);
  });
};

export const playLoss = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [220.00, 207.65, 196.00, 164.81]; // A minor descent: A, G#, G, E

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now + idx * 0.15);
    
    // Lowpass filter to make the sawtooth sound synth-like and cyber
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now + idx * 0.15);

    gainNode.gain.setValueAtTime(0, now + idx * 0.15);
    gainNode.gain.linearRampToValueAtTime(0.1, now + idx * 0.15 + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.5);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + idx * 0.15);
    osc.stop(now + idx * 0.15 + 0.52);
  });
};

export const playAlert = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  // Detuned double wave for alarm warning effect
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(350, now);
  osc1.frequency.linearRampToValueAtTime(250, now + 0.25);
  
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(353, now);
  osc2.frequency.linearRampToValueAtTime(253, now + 0.25);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(600, now);

  gainNode.gain.setValueAtTime(0.12, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.25);
  osc2.stop(now + 0.25);
};

export const playUnlock = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Sparkly sci-fi chime
  const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
  
  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.05);
    
    gainNode.gain.setValueAtTime(0, now + idx * 0.05);
    gainNode.gain.linearRampToValueAtTime(0.08, now + idx * 0.05 + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.3);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + idx * 0.05);
    osc.stop(now + idx * 0.05 + 0.32);
  });
};

export const setMuted = (muted: boolean) => {
  isMutedState = muted;
  if (muted && audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
};

export const isMuted = () => isMutedState;
