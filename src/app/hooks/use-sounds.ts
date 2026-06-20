/**
 * Sound effects system using Web Audio API.
 * Generates pleasant, organic sounds without external files.
 * Each sound is designed to be subtle and satisfying.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

/** Soft click — for button presses */
export function playClick() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  filter.type = 'lowpass';
  filter.frequency.value = 2000;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.05);
  gain.gain.setValueAtTime(0.06, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
  osc.start();
  osc.stop(c.currentTime + 0.07);
}

/** Paper rustle — for page turns and book interactions */
export function playPageTurn() {
  const c = getCtx();
  // White noise burst shaped like paper
  const bufSize = c.sampleRate * 0.15;
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2);
  }
  const source = c.createBufferSource();
  source.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3000;
  filter.Q.value = 0.5;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.08, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  source.start();
}

/** Soft whoosh — for navigation transitions */
export function playWhoosh() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, c.currentTime);
  filter.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.2);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(150, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, c.currentTime + 0.2);
  gain.gain.setValueAtTime(0.04, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
  osc.start();
  osc.stop(c.currentTime + 0.25);
}

/** Chime — for success actions (book created, saved) */
export function playChime() {
  const c = getCtx();
  const notes = [523, 659, 784]; // C5, E5, G5 — major chord
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = c.currentTime + i * 0.08;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.04, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
    osc.start(start);
    osc.stop(start + 0.55);
  });
}

/** Typewriter key — realistic mechanical click */
export function playTypeKey() {
  const c = getCtx();
  // Impact
  const osc1 = c.createOscillator();
  const g1 = c.createGain();
  const flt = c.createBiquadFilter();
  osc1.connect(g1);
  g1.connect(flt);
  flt.connect(c.destination);
  flt.type = 'lowpass';
  flt.frequency.value = 2500;
  osc1.type = 'square';
  osc1.frequency.setValueAtTime(900 + Math.random() * 300, c.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.025);
  g1.gain.setValueAtTime(0.1, c.currentTime);
  g1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04);
  osc1.start();
  osc1.stop(c.currentTime + 0.05);
  // Thud
  const osc2 = c.createOscillator();
  const g2 = c.createGain();
  osc2.connect(g2);
  g2.connect(c.destination);
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(140 + Math.random() * 40, c.currentTime);
  g2.gain.setValueAtTime(0.04, c.currentTime);
  g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.07);
  osc2.start();
  osc2.stop(c.currentTime + 0.08);
}

/** Carriage return bell */
export function playBell() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2200, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1600, c.currentTime + 0.4);
  gain.gain.setValueAtTime(0.06, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
  osc.start();
  osc.stop(c.currentTime + 0.45);
}

/** Hover — very subtle tonal blip */
export function playHover() {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = 'sine';
  osc.frequency.value = 440;
  gain.gain.setValueAtTime(0.015, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04);
  osc.start();
  osc.stop(c.currentTime + 0.05);
}

/** Ambient forest — continuous gentle background (returns stop function) */
export function startAmbientForest(): () => void {
  const c = getCtx();
  // Wind-like filtered noise
  const bufSize = c.sampleRate * 2;
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const source = c.createBufferSource();
  source.buffer = buf;
  source.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  const gain = c.createGain();
  gain.gain.value = 0.015;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  source.start();
  return () => { gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5); setTimeout(() => source.stop(), 600); };
}

/** Ambient ocean — rolling waves */
export function startAmbientOcean(): () => void {
  const c = getCtx();
  const osc = c.createOscillator();
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  lfo.frequency.value = 0.15;
  lfoGain.gain.value = 100;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  filter.type = 'lowpass';
  filter.frequency.value = 300;
  osc.type = 'sawtooth';
  osc.frequency.value = 60;
  osc.connect(filter);
  filter.connect(gain);
  gain.gain.value = 0.012;
  gain.connect(c.destination);
  osc.start();
  lfo.start();
  return () => { gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5); setTimeout(() => { osc.stop(); lfo.stop(); }, 600); };
}
