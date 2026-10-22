import { useEffect, useState } from 'react';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

function hasFrenchVoice(): boolean {
  return !!synth && synth.getVoices().some((v) => v.lang.toLowerCase().startsWith('fr'));
}

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
    utterance.voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('fr')) ?? null;
    synth.cancel();
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
