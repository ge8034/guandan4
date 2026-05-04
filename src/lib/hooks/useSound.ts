'use client';

import { useCallback, useRef } from 'react';

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/** 播放一个简单音调 */
function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.12,
  delay = 0,
) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

/** 播放噪声（短促打击声） */
function playNoise(duration: number, volume = 0.06) {
  const ctx = getCtx();
  if (!ctx) return;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
  }
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  return source;
}

export function useSound() {
  const lastPlay = useRef(0);

  const throttle = useCallback((minGap = 60) => {
    const now = Date.now();
    if (now - lastPlay.current < minGap) return false;
    lastPlay.current = now;
    return true;
  }, []);

  const playCard = useCallback(() => {
    if (!throttle()) return;
    playTone(800, 0.08, 'sine', 0.1);
    playNoise(0.04, 0.04);
  }, [throttle]);

  const playPass = useCallback(() => {
    if (!throttle(100)) return;
    playTone(300, 0.12, 'triangle', 0.06);
  }, [throttle]);

  const playBomb = useCallback(() => {
    playTone(200, 0.3, 'sawtooth', 0.08);
    playTone(300, 0.3, 'sawtooth', 0.06, 0.05);
    playTone(400, 0.3, 'sawtooth', 0.05, 0.1);
    playNoise(0.1, 0.08);
  }, []);

  const playVictory = useCallback(() => {
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      playTone(freq, 0.25, 'triangle', 0.1, i * 0.12);
    });
  }, []);

  const playSelect = useCallback(() => {
    playTone(1200, 0.05, 'sine', 0.06);
  }, []);

  return { playCard, playPass, playBomb, playVictory, playSelect };
}
