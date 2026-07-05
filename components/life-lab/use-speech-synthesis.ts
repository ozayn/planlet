"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  chunkSpeechText,
  createSpeechUtterance,
  detectSpeechBrowserName,
  DEFAULT_SPEECH_RATE,
  getSpeechVoiceCount,
  isSpeechSynthesisSupported,
  listEnglishSpeechVoices,
  logSpeechSynthesisError,
  plainTextToSpeechText,
  primeSpeechSynthesis,
  readStoredSpeechVoiceId,
  resolveSpeechVoice,
  SPEECH_AUTO_VOICE_ID,
  SPEECH_START_TIMEOUT_MS,
  SPEECH_VOICE_SELECTION_FALLBACK_MESSAGE,
  writeStoredSpeechVoiceId,
  type SpeechCancelReason,
  type SpeechDiagnostics,
  type SpeechRate,
} from "@/lib/life-lab/speech";

type UseSpeechSynthesisOptions = {
  rate?: SpeechRate;
};

// Uses browser-native speechSynthesis only.
// Chrome on macOS may expose speechSynthesis voices but fail to start audio;
// Safari is more reliable for native speech.
let activeSpeechOwnerId: string | null = null;

export function useSpeechSynthesis(options: UseSpeechSynthesisOptions = {}) {
  const instanceId = useId();
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const [voiceFallbackNotice, setVoiceFallbackNotice] = useState<string | null>(
    null,
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const [voiceCount, setVoiceCount] = useState(0);
  const [englishVoices, setEnglishVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceIdState] = useState(
    SPEECH_AUTO_VOICE_ID,
  );
  const [browserName] = useState(() => detectSpeechBrowserName());
  const [rate, setRate] = useState<SpeechRate>(
    options.rate ?? DEFAULT_SPEECH_RATE,
  );
  const selectedVoiceIdRef = useRef(SPEECH_AUTO_VOICE_ID);
  const sessionVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const sessionUsesVoiceRef = useRef(false);
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

  const recordSpeechFailure = useCallback((error: string) => {
    if (!isMountedRef.current) {
      return;
    }

    setPlaybackFailed(true);
    setLastError(error);
  }, []);

  const recordSpeechSuccess = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }

    setPlaybackFailed(false);
    setLastError(null);
  }, []);

  const setSelectedVoiceId = useCallback((voiceId: string) => {
    selectedVoiceIdRef.current = voiceId;
    setSelectedVoiceIdState(voiceId);
    writeStoredSpeechVoiceId(voiceId);
    setVoiceFallbackNotice(null);
  }, []);

  const resetToAutoVoice = useCallback(() => {
    selectedVoiceIdRef.current = SPEECH_AUTO_VOICE_ID;
    setSelectedVoiceIdState(SPEECH_AUTO_VOICE_ID);
    writeStoredSpeechVoiceId(SPEECH_AUTO_VOICE_ID);
    setVoiceFallbackNotice(SPEECH_VOICE_SELECTION_FALLBACK_MESSAGE);
  }, []);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    const storedVoiceId = readStoredSpeechVoiceId();
    selectedVoiceIdRef.current = storedVoiceId;
    setSelectedVoiceIdState(storedVoiceId);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (!isSpeechSynthesisSupported()) {
      return;
    }

    setIsSupported(true);

    function loadVoices(): void {
      const voices = window.speechSynthesis.getVoices();
      setVoiceCount(voices.length);
      setEnglishVoices(listEnglishSpeechVoices(voices));
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
    sessionVoiceRef.current = null;
    sessionUsesVoiceRef.current = false;
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
      useAssignedVoice: boolean,
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
        useAssignedVoice && sessionUsesVoiceRef.current
          ? sessionVoiceRef.current
          : null;

      const utterance = createSpeechUtterance(text, {
        rate: rateRef.current,
        voice,
      });

      activeUtteranceRef.current = utterance;
      let chunkStarted = false;

      clearStartTimeout();
      // If onstart never fires, show the browser fallback. This is expected on Chrome/macOS.
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
          const usedManualVoice =
            selectedVoiceIdRef.current !== SPEECH_AUTO_VOICE_ID;

          sessionUsesVoiceRef.current = false;
          sessionVoiceRef.current = null;

          if (usedManualVoice) {
            resetToAutoVoice();
          }

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
      resetToAutoVoice,
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

      const useAssignedVoice =
        sequenceIndexRef.current === 0 && sessionUsesVoiceRef.current;

      speakChunk(
        nextText,
        generation,
        useAssignedVoice,
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

      const voices = window.speechSynthesis.getVoices();
      let voiceId = selectedVoiceIdRef.current;
      let resolvedVoice = resolveSpeechVoice(voices, voiceId);

      if (voiceId !== SPEECH_AUTO_VOICE_ID && !resolvedVoice) {
        resetToAutoVoice();
        voiceId = SPEECH_AUTO_VOICE_ID;
        resolvedVoice = resolveSpeechVoice(voices, voiceId);
      }

      sessionVoiceRef.current = resolvedVoice;
      sessionUsesVoiceRef.current = resolvedVoice !== null;

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
    [clearStartTimeout, instanceId, resetToAutoVoice, speakNextInSequence],
  );

  const speak = useCallback(
    (text: string | string[]) => {
      if (!isSpeechSynthesisSupported()) {
        return;
      }

      const segments = (Array.isArray(text) ? text : [text])
        .map((segment) => plainTextToSpeechText(segment))
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
    voiceFallbackNotice,
    lastError,
    diagnostics,
    englishVoices,
    selectedVoiceId,
    setSelectedVoiceId,
    rate,
    setRate,
    speak,
    stop,
    pause,
    resume,
  };
}
