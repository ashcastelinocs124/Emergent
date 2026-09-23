import type { Vec3 } from '../shared/model';

export type CreatureCue = 'guardian-warning' | 'guardian-recognition' | 'grazer-alarm' | 'stalker-hunt';
let context: AudioContext | null = null;
let listener: Vec3 = { x: 0, y: 0, z: 0 };
const lastCue = new Map<string, number>();
let ambientStarted = false;

export function setAudioListener(position: Vec3): void { listener = position; }

export function unlockAudio(): void {
  context ??= new AudioContext();
  void context.resume();
  if (ambientStarted) return;
  ambientStarted = true;
  const length = context.sampleRate * 2;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 7141;
  for (let i = 0; i < length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = seed / 2147483648 - 1;
  }
  const wind = context.createBufferSource();
  wind.buffer = buffer;
  wind.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 280;
  const volume = context.createGain();
  volume.gain.value = .018;
  wind.connect(filter).connect(volume).connect(context.destination);
  wind.start();
}

export function playCreatureCue(id: string, cue: CreatureCue, position: Vec3): void {
  if (!context || context.state !== 'running') return;
  const now = context.currentTime;
  if (now - (lastCue.get(`${id}:${cue}`) ?? -100) < 2.5) return;
  lastCue.set(`${id}:${cue}`, now);
  const distance = Math.hypot(position.x - listener.x, position.z - listener.z);
  if (distance > 65) return;
  const gain = context.createGain();
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(.002, .13 * (1 - distance / 65)), now + .05);
  gain.gain.exponentialRampToValueAtTime(.0001, now + .95);
  const pan = context.createStereoPanner();
  pan.pan.value = Math.max(-.8, Math.min(.8, (position.x - listener.x) / 28));
  gain.connect(pan).connect(context.destination);
  const voice = context.createOscillator();
  const pitches: Record<CreatureCue, [number, number, OscillatorType]> = {
    'guardian-warning': [88, 53, 'sawtooth'],
    'guardian-recognition': [145, 79, 'triangle'],
    'grazer-alarm': [490, 930, 'sine'],
    'stalker-hunt': [220, 72, 'sawtooth'],
  };
  const [start, end, wave] = pitches[cue];
  voice.type = wave;
  voice.frequency.setValueAtTime(start, now);
  voice.frequency.exponentialRampToValueAtTime(end, now + .8);
  voice.connect(gain);
  voice.start(now);
  voice.stop(now + 1);
  voice.onended = () => { voice.disconnect(); gain.disconnect(); pan.disconnect(); };
}

export function playSuitAlert(air: number): void {
  if (!context || context.state !== 'running' || air >= .25) return;
  const now = context.currentTime;
  if (now - (lastCue.get('suit:air') ?? -100) < 4) return;
  lastCue.set('suit:air', now);
  const pulse = context.createOscillator();
  const gain = context.createGain();
  pulse.type = 'sine';
  pulse.frequency.value = 560;
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.linearRampToValueAtTime(.045, now + .04);
  gain.gain.linearRampToValueAtTime(.0001, now + .25);
  pulse.connect(gain).connect(context.destination);
  pulse.start(now);
  pulse.stop(now + .3);
  pulse.onended = () => { pulse.disconnect(); gain.disconnect(); };
}
