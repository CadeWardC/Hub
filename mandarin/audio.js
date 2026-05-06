import { state } from './state.js';

let audioCtx = null;
let analyser = null;
let micStream = null;
let isRecording = false;
let pitchSamples = [];
let recog = null;
let recogResult = '';
let rafId = null;

export function getRecordingState() { return { isRecording, pitchSamples, recogResult }; }
export function setRecogResult(val) { recogResult = val; }

export function say(text, cb) {
  if (!window.speechSynthesis) { if (cb) cb(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 0.9;
  if (cb) u.onend = cb;
  window.speechSynthesis.speak(u);
}

export function setupRecognition() {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!R) return null;
  const r = new R();
  r.lang = 'zh-CN';
  r.continuous = false;
  r.interimResults = true;
  r.onresult = (e) => {
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript;
    }
    if (final) recogResult = final;
  };
  r.onerror = () => { isRecording = false; };
  r.onend = () => { isRecording = false; };
  return r;
}

function autoCorrelate(buf, sampleRate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) { const v = (buf[i] - 128) / 128.0; rms += v * v; }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;
  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) { if (Math.abs((buf[i] - 128) / 128.0) < thres) { r1 = i; break; } }
  for (let i = 1; i < SIZE / 2; i++) { if (Math.abs((buf[SIZE - i] - 128) / 128.0) < thres) { r2 = SIZE - i; break; } }
  const newSize = r2 - r1;
  if (newSize <= 0) return -1;
  const c = new Float32Array(newSize);
  for (let i = 0; i < newSize; i++) {
    for (let j = 0; j < newSize - i; j++) {
      const v1 = (buf[r1 + j] - 128) / 128.0;
      const v2 = (buf[r1 + j + i] - 128) / 128.0;
      c[i] += v1 * v2;
    }
  }
  let d = 0;
  while (d < newSize - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < newSize; i++) { if (c[i] > maxval) { maxval = c[i]; maxpos = i; } }
  let T0 = maxpos;
  if (T0 > 0 && T0 < newSize - 1) {
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a2 = (x1 + x3 - 2 * x2) / 2;
    const b2 = (x3 - x1) / 2;
    if (a2) T0 = T0 - b2 / (2 * a2);
  }
  return sampleRate / T0;
}

export function startPitchTracking(stream) {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  const source = audioCtx.createMediaStreamSource(stream);
  source.connect(analyser);
  pitchSamples = [];
  const buffer = new Uint8Array(analyser.fftSize);
  function loop() {
    if (!isRecording) return;
    analyser.getByteTimeDomainData(buffer);
    const pitch = autoCorrelate(buffer, audioCtx.sampleRate);
    if (pitch > 50 && pitch < 600) pitchSamples.push(pitch);
    drawPitch();
    rafId = requestAnimationFrame(loop);
  }
  loop();
}

export function stopPitchTracking() {
  isRecording = false;
  if (rafId) cancelAnimationFrame(rafId);
  if (audioCtx) audioCtx.close();
  audioCtx = null;
  analyser = null;
}

export function releaseMic() {
  stopPitchTracking();
  if (micStream) micStream.getTracks().forEach(t => t.stop());
  micStream = null;
}

export async function getMicStream() {
  if (!micStream) {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }
  return micStream;
}

export function setRecording(val) { isRecording = val; }
export function getRecog() { return recog; }
export function setRecog(val) { recog = val; }

export function drawPitch() {
  const canvas = document.getElementById('pitch-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (pitchSamples.length < 2) return;
  const min = Math.min(...pitchSamples);
  const max = Math.max(...pitchSamples);
  const range = max - min || 1;
  ctx.beginPath();
  ctx.strokeStyle = '#c62828';
  ctx.lineWidth = 2;
  pitchSamples.forEach((p, i) => {
    const x = (i / (pitchSamples.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 20) - 10;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

export function classifyTone(pitches) {
  const valid = pitches.filter(p => p > 0);
  if (valid.length < 6) return null;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const norm = valid.map(p => (p - min) / range);
  const third = Math.floor(norm.length / 3);
  const first = norm.slice(0, third);
  const mid = norm.slice(third, third * 2);
  const last = norm.slice(third * 2);
  const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
  const avgMid = mid.reduce((a, b) => a + b, 0) / mid.length;
  const avgLast = last.reduce((a, b) => a + b, 0) / last.length;
  const diff = avgLast - avgFirst;
  const midDiff = avgMid - avgFirst;
  const endDiff = avgLast - avgMid;
  if (Math.abs(diff) < 0.18) return 1;
  if (diff > 0.22 && avgMid > avgFirst) return 2;
  if (diff < -0.22 && avgLast < avgMid) return 4;
  if (midDiff < -0.08 && endDiff > 0.08) return 3;
  if (diff > 0.1) return 2;
  if (diff < -0.1) return 4;
  return 1;
}
