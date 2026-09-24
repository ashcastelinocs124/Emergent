let context: AudioContext | null = null;
let gain: GainNode | null = null;
export function startCityAudio(): void {
  if (context) { void context.resume(); return; }
  context = new AudioContext(); gain = context.createGain(); gain.gain.value = .055; gain.connect(context.destination);
  const hum = context.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 57;
  const lowpass = context.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 110;
  hum.connect(lowpass).connect(gain); hum.start();
}
export function uiBeep(): void {
  if (!context || !gain) return;
  const oscillator = context.createOscillator(); const volume = context.createGain();
  oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(620, context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(340, context.currentTime + .08);
  volume.gain.setValueAtTime(.17, context.currentTime); volume.gain.exponentialRampToValueAtTime(.001, context.currentTime + .1);
  oscillator.connect(volume).connect(gain); oscillator.start(); oscillator.stop(context.currentTime + .11);
}
