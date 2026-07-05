"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  chunkSpeechText,
  createSpeechUtterance,
  detectSpeechBrowserName,
  getSpeechVoiceCount,
  isSpeechSynthesisSupported,
  logSpeechSynthesisError,
  pickSpeechVoice,
  primeSpeechSynthesis,
  SPEECH_START_TIMEOUT_MS,
  type SpeechCancelReason,
  type SpeechDiagnostics,
  type SpeechRate,
} from "@/lib/life-lab/speech";

type UseSpeechSynthesisOptions = {
  rate?: SpeechRate;
  usePreferredVoice?: boolean;
};

// Uses browser-native speechSynthesis only. macOS Safari is the most reliable target;
// Chrome on macOS may list voices without producing audible speech.
let activeSpeechOwnerId: string | null = null;

export function useSpeechSynthesis(options: UseSpeechSynthesisOptions = {}) {
  const instanceId = useId();
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [voiceCount, setVoiceCount] = useState(0);
  const [browserName] = useState(() => detectSpeechBrowserName());
  const [rate, setRate] = useState<SpeechRate>(options.rate ?? 1);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const usePreferredVoiceRef = useRef(options.usePreferredVoice ?? false);
  const rateRef = useRef<SpeechRate>(rate);
  const sequenceIndexRef = useRef(0);
  const sequenceRef = useRef<string[]>([]);
  const speakGenerationRef = useRef(0);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const intentionalCancelRef = useRef<SpeechCancelReason>(null);
  const startTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const clearStartTimeout = useCallback(() => {
    if (startTimeoutRef.current !== null) {
      window.clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
  }, []);

  const recordSpeechFailure = useCallback(
    (error: string) => {
      if (!isMountedRef.current) {
        return;
      }

      setPlaybackFailed(true);
      setLastError(error);
    },
    [],
  );

  const recordSpeechSuccess = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }

    setPlaybackFailed(false);
    setLastError(null);
  }, []);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    usePreferredVoiceRef.current = options.usePreferredVoice ?? false;
  }, [options.usePreferredVoice]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!isSpeechSynthesisSupported()) {
      return;
    }

    setIsSupported(true);

    function loadVoices(): void {
      const voices = window.speechSynthesis.getVoices();
      setVoiceCount(voices.length);

      if (voices.length > 0) {
        preferredVoiceRef.current = pickSpeechVoice(voices);
      }
    }

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      isMountedRef.current = false;
      clearStartTimeout();
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);

      if (activeSpeechOwnerId === instanceId) {
        intentionalCancelRef.current = "unmount";
        window.speechSynthesis.cancel();
        activeSpeechOwnerId = null;
        activeUtteranceRef.current = null;
        intentionalCancelRef.current = null;
      }
    };
  }, [clearStartTimeout, instanceId]);

  const clearSpeakingState = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }

    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    if (!isSpeechSynthesisSupported()) {
      return;
    }

    clearStartTimeout();
    intentionalCancelRef.current = "stop";
    speakGenerationRef.current += 1;
    sequenceRef.current = [];
    sequenceIndexRef.current = 0;
    activeUtteranceRef.current = null;

    if (activeSpeechOwnerId === instanceId) {
      window.speechSynthesis.cancel();
      activeSpeechOwnerId = null;
    }

    intentionalCancelRef.current = null;
    clearSpeakingState();
  }, [clearSpeakingState, clearStartTimeout, instanceId]);

  const speakChunk = useCallback(
    (
      text: string,
      generation: number,
      assignVoice: boolean,
      onComplete?: () => void,
      allowVoiceRetry = true,
    ) => {
      if (
        !isSpeechSynthesisSupported() ||
        speakGenerationRef.current !== generation ||
        activeSpeechOwnerId !== instanceId
      ) {
        return;
      }

      const voice =
        assignVoice && usePreferredVoiceRef.current
          ? preferredVoiceRef.current
          : null;

      const utterance = createSpeechUtterance(text, {
        rate: rateRef.current,
        voice,
      });

      activeUtteranceRef.current = utterance;
      let chunkStarted = false;

      clearStartTimeout();
      startTimeoutRef.current = window.setTimeout(() => {
        if (
          speakGenerationRef.current !== generation ||
          activeSpeechOwnerId !== instanceId ||
          chunkStarted
        ) {
          return;
        }

        recordSpeechFailure("Speech did not start");
        activeUtteranceRef.current = null;
        activeSpeechOwnerId = null;
        window.speechSynthesis.cancel();
        clearSpeakingState();
      }, SPEECH_START_TIMEOUT_MS);

      utterance.onstart = () => {
        if (
          speakGenerationRef.current !== generation ||
          activeSpeechOwnerId !== instanceId ||
          !isMountedRef.current
        ) {
          return;
        }

        chunkStarted = true;
        clearStartTimeout();
        recordSpeechSuccess();
        setIsSpeaking(true);
        setIsPaused(false);
      };

      utterance.onend = () => {
        if (
          speakGenerationRef.current !== generation ||
          activeSpeechOwnerId !== instanceId
        ) {
          return;
        }

        clearStartTimeout();
        activeUtteranceRef.current = null;
        onComplete?.();
      };

      utterance.onerror = (event) => {
        if (
          speakGenerationRef.current !== generation ||
          activeSpeechOwnerId !== instanceId
        ) {
          return;
        }

        clearStartTimeout();
        const cancelReason = intentionalCancelRef.current;
        logSpeechSynthesisError(event, text, voice, cancelReason);

        if (event.error === "canceled" && cancelReason) {
          intentionalCancelRef.current = null;
          return;
        }

        if (voice && allowVoiceRetry) {
          speakChunk(text, generation, false, onComplete, false);
          return;
        }

        recordSpeechFailure(event.error || "Speech failed");
        activeUtteranceRef.current = null;
        activeSpeechOwnerId = null;
        clearSpeakingState();
      };

      window.speechSynthesis.speak(utterance);
    },
    [
      clearSpeakingState,
      clearStartTimeout,
      instanceId,
      recordSpeechFailure,
      recordSpeechSuccess,
    ],
  );

  const speakNextInSequence = useCallback(
    (generation: number) => {
      const nextText = sequenceRef.current[sequenceIndexRef.current];

      if (
        !nextText ||
        speakGenerationRef.current !== generation ||
        activeSpeechOwnerId !== instanceId
      ) {
        if (
          speakGenerationRef.current === generation &&
          activeSpeechOwnerId === instanceId
        ) {
          activeSpeechOwnerId = null;
          clearSpeakingState();
        }

        return;
      }

      const assignVoice =
        sequenceIndexRef.current === 0 && usePreferredVoiceRef.current;

      speakChunk(
        nextText,
        generation,
        assignVoice,
        () => {
          sequenceIndexRef.current += 1;
          speakNextInSequence(generation);
        },
        true,
      );
    },
    [clearSpeakingState, instanceId, speakChunk],
  );

  const beginSpeechSession = useCallback(
    (segments: string[]) => {
      clearStartTimeout();
      intentionalCancelRef.current = "replace";

      if (activeSpeechOwnerId && activeSpeechOwnerId !== instanceId) {
        window.speechSynthesis.cancel();
      }

      speakGenerationRef.current += 1;
      const generation = speakGenerationRef.current;
      activeSpeechOwnerId = instanceId;
      sequenceRef.current = segments;
      sequenceIndexRef.current = 0;
      activeUtteranceRef.current = null;
      window.speechSynthesis.cancel();

      window.setTimeout(() => {
        intentionalCancelRef.current = null;
        speakNextInSequence(generation);
      }, 0);
    },
    [clearStartTimeout, instanceId, speakNextInSequence],
  );

  const speak = useCallback(
    (text: string | string[]) => {
      if (!isSpeechSynthesisSupported()) {
        return;
      }

      const segments = (Array.isArray(text) ? text : [text])
        .flatMap((segment) => chunkSpeechText(segment))
        .map((segment) => segment.trim())
        .filter(Boolean);

      if (segments.length === 0) {
        return;
      }

      primeSpeechSynthesis();
      beginSpeechSession(segments);
    },
    [beginSpeechSession],
  );

  const pause = useCallback(() => {
    if (
      !isSpeechSynthesisSupported() ||
      activeSpeechOwnerId !== instanceId ||
      !window.speechSynthesis.speaking
    ) {
      return;
    }

    if (!window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [instanceId]);

  const resume = useCallback(() => {
    if (
      !isSpeechSynthesisSupported() ||
      activeSpeechOwnerId !== instanceId ||
      !window.speechSynthesis.paused
    ) {
      return;
    }

    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [instanceId]);

  const diagnostics: SpeechDiagnostics = {
    browserName,
    isSupported,
    voiceCount: voiceCount || getSpeechVoiceCount(),
    lastError,
  };

  return {
    isSupported,
    isSpeaking,
    isPaused,
    playbackFailed,
    lastError,
    diagnostics,
    rate,
    setRate,
    speak,
    stop,
    pause,
    resume,
  };
}
