"use client";

export type NotificationSoundPreference = {
  sound: string;
  volume: number;
  customDataUrl?: string;
};

const soundPatterns: Record<string, Array<[number, number, number]>> = {
  classic: [[880, 0, 0.18], [660, 0.22, 0.18], [880, 0.48, 0.18]],
  pulse: [[720, 0, 0.12], [720, 0.2, 0.12], [720, 0.4, 0.12]],
  chime: [[523, 0, 0.18], [659, 0.2, 0.18], [784, 0.4, 0.24]],
  digital: [[1046, 0, 0.08], [1318, 0.12, 0.08], [1046, 0.24, 0.08], [1568, 0.36, 0.12]],
  soft: [[440, 0, 0.25], [554, 0.32, 0.25], [659, 0.64, 0.25]],
  urgent: [[980, 0, 0.1], [980, 0.14, 0.1], [780, 0.32, 0.16], [980, 0.54, 0.18]],
  bell: [[784, 0, 0.2], [1046, 0.28, 0.28]],
  pop: [[660, 0, 0.08], [880, 0.1, 0.08]],
  spark: [[1200, 0, 0.06], [1600, 0.09, 0.08], [1000, 0.2, 0.08]],
  tone: [[587, 0, 0.25], [587, 0.32, 0.2]],
};

export function playNotificationSound({ sound, volume, customDataUrl }: NotificationSoundPreference) {
  if (typeof window === "undefined" || sound === "silent" || volume <= 0) return;

  if (sound === "custom" && customDataUrl) {
    const audio = new Audio(customDataUrl);
    audio.volume = Math.min(1, Math.max(0, volume));
    void audio.play().catch(() => undefined);
    window.setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, 3000);
    return;
  }

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const gain = context.createGain();
  gain.gain.value = Math.min(1, Math.max(0, volume));
  gain.connect(context.destination);
  const pattern = soundPatterns[sound] || soundPatterns.chime;

  for (const [frequency, offset, duration] of pattern) {
    const oscillator = context.createOscillator();
    const noteGain = context.createGain();
    oscillator.type = sound === "digital" ? "square" : "sine";
    oscillator.frequency.value = frequency;
    noteGain.gain.setValueAtTime(0.0001, context.currentTime + offset);
    noteGain.gain.exponentialRampToValueAtTime(Math.max(0.05, volume), context.currentTime + offset + 0.02);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + offset + duration);
    oscillator.connect(noteGain);
    noteGain.connect(gain);
    oscillator.start(context.currentTime + offset);
    oscillator.stop(context.currentTime + offset + duration + 0.03);
  }

  window.setTimeout(() => void context.close().catch(() => undefined), 1300);
}
