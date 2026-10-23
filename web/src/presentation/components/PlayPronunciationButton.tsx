import { useEffect, useState } from 'react';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

const isFrench = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith('fr');

/** Prefers an on-device fr-FR voice: network voices can drop out mid-session and fall back to the default (English) one. */
function pickFrenchVoice(): SpeechSynthesisVoice | null {
  if (!synth) return null;
  const french = synth.getVoices().filter(isFrench);
  const rank = (v: SpeechSynthesisVoice) => (v.localService ? 0 : 2) + (v.lang.replace('_', '-').toLowerCase() === 'fr-fr' ? 0 : 1);
  return french.sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

const hasFrenchVoice = () => pickFrenchVoice() !== null;

// Chrome can garbage-collect an utterance mid-speech, which cuts it off or changes its voice.
let current: SpeechSynthesisUtterance | null = null;

/** Speaks the French word with the browser's text-to-speech. Renders nothing when no French voice is available. */
export function PlayPronunciationButton({ text }: { text: string }) {
  const [available, setAvailable] = useState(hasFrenchVoice);

  // Voices load asynchronously in most browsers.
  useEffect(() => {
    if (!synth) return;
    const update = () => setAvailable(hasFrenchVoice());
    synth.addEventListener('voiceschanged', update);
    return () => synth.removeEventListener('voiceschanged', update);
  }, []);

  if (!synth || !available) return null;

  const play = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.voice = pickFrenchVoice();
    if (synth.speaking || synth.pending) synth.cancel();
    current = utterance;
    synth.speak(utterance);
  };

  return (
    <button type="button" className="btn secondary play-pronunciation" onClick={play} aria-label={`Play pronunciation of ${text}`}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
      </svg>
      Listen
    </button>
  );
}
