/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const SoundContext = createContext(null);

const STORAGE_KEY = 'taskflow:sound-enabled';
const VOLUME_KEY = 'taskflow:sound-volume';
const CATEGORY_KEY = 'taskflow:sound-categories';

const STARTUP_SOUND = new URL('../assets/sounds/computerStart.opus', import.meta.url).href;
const BIOS_START_SOUND = new URL('../assets/sounds/biosStart.opus', import.meta.url).href;
const ERROR_SOUND = new URL('../assets/sounds/error.opus', import.meta.url).href;
const CLICK_SOUND = new URL('../assets/sounds/click.opus', import.meta.url).href;
const FOLDER_SOUND = new URL('../assets/sounds/folder.opus', import.meta.url).href;
const HOVER_SOUND = new URL('../assets/sounds/hover.opus', import.meta.url).href;
const SUCCESS_SOUND = new URL('../assets/sounds/success.opus', import.meta.url).href;
const WARNING_SOUND = new URL('../assets/sounds/warning.opus', import.meta.url).href;
const WINDOW_OPEN_SOUND = new URL('../assets/sounds/window-open.opus', import.meta.url).href;
const WINDOW_CLOSE_SOUND = new URL('../assets/sounds/window-close.opus', import.meta.url).href;

const SOUND_FILES = {
  startup: BIOS_START_SOUND || STARTUP_SOUND,
  taskNotification: FOLDER_SOUND,
  transfer: WINDOW_OPEN_SOUND,
  help: HOVER_SOUND,
  completion: SUCCESS_SOUND,
  success: SUCCESS_SOUND,
  error: ERROR_SOUND,
  warning: WARNING_SOUND,
  click: CLICK_SOUND,
  delete: WINDOW_CLOSE_SOUND,
};

const SOUND_PRESETS = {
  startup: [
    { frequency: 523.25, duration: 0.09, type: 'sine', gain: 0.06, delay: 0.00 },
    { frequency: 659.25, duration: 0.09, type: 'sine', gain: 0.06, delay: 0.08 },
    { frequency: 783.99, duration: 0.12, type: 'triangle', gain: 0.08, delay: 0.16 },
  ],
  taskNotification: [
    { frequency: 880, duration: 0.05, type: 'square', gain: 0.04, delay: 0.00 },
    { frequency: 1174.66, duration: 0.07, type: 'triangle', gain: 0.05, delay: 0.06 },
  ],
  transfer: [
    { frequency: 659.25, duration: 0.05, type: 'triangle', gain: 0.04, delay: 0.00 },
    { frequency: 523.25, duration: 0.08, type: 'triangle', gain: 0.05, delay: 0.07 },
    { frequency: 659.25, duration: 0.05, type: 'triangle', gain: 0.04, delay: 0.16 },
  ],
  help: [
    { frequency: 698.46, duration: 0.05, type: 'sine', gain: 0.04, delay: 0.00 },
    { frequency: 784, duration: 0.06, type: 'sine', gain: 0.05, delay: 0.06 },
  ],
  completion: [
    { frequency: 392, duration: 0.08, type: 'triangle', gain: 0.05, delay: 0.00 },
    { frequency: 523.25, duration: 0.08, type: 'triangle', gain: 0.05, delay: 0.09 },
    { frequency: 659.25, duration: 0.12, type: 'sine', gain: 0.06, delay: 0.18 },
  ],
  success: [
    { frequency: 440, duration: 0.06, type: 'triangle', gain: 0.04, delay: 0.00 },
    { frequency: 554.37, duration: 0.08, type: 'triangle', gain: 0.05, delay: 0.07 },
  ],
  error: [
    { frequency: 220, duration: 0.12, type: 'sawtooth', gain: 0.05, delay: 0.00 },
    { frequency: 174.61, duration: 0.16, type: 'sawtooth', gain: 0.05, delay: 0.12 },
  ],
  warning: [
    { frequency: 392, duration: 0.07, type: 'square', gain: 0.03, delay: 0.00 },
    { frequency: 349.23, duration: 0.08, type: 'square', gain: 0.03, delay: 0.08 },
  ],
  click: [
    { frequency: 1046.5, duration: 0.03, type: 'triangle', gain: 0.02, delay: 0.00 },
  ],
  delete: [
    { frequency: 164.81, duration: 0.06, type: 'square', gain: 0.04, delay: 0.00 },
    { frequency: 130.81, duration: 0.09, type: 'square', gain: 0.04, delay: 0.08 },
  ],
};

function getAudioContextCtor() {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

function readInitialEnabled() {
  if (typeof window === 'undefined') return true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored !== 'false';
  } catch {
    return true;
  }
}

function readInitialVolume() {
  if (typeof window === 'undefined') return 0.8;
  try {
    const stored = window.localStorage.getItem(VOLUME_KEY);
    if (stored === null) return 0.8;
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.8;
  } catch {
    return 0.8;
  }
}

function readInitialCategories() {
  const defaults = {
    task: true,
    transfer: true,
    help: true,
    completion: true,
  };

  if (typeof window === 'undefined') return defaults;
  try {
    const stored = window.localStorage.getItem(CATEGORY_KEY);
    if (!stored) return defaults;
    const parsed = JSON.parse(stored);
    return {
      ...defaults,
      ...Object.fromEntries(
        Object.entries(parsed || {}).filter(([, value]) => typeof value === 'boolean')
      ),
    };
  } catch {
    return defaults;
  }
}

function playAudioFile(src, volume = 0.7) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !src) {
      resolve(false);
      return;
    }

    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = volume;

    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
    };

    audio.onended = () => {
      cleanup();
      resolve(true);
    };

    audio.onerror = () => {
      cleanup();
      resolve(false);
    };

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.catch(() => {
        cleanup();
        resolve(false);
      });
    }
  });
}

export function SoundProvider({ children }) {
  const [enabled, setEnabled] = useState(readInitialEnabled);
  const [volume, setVolumeState] = useState(readInitialVolume);
  const [categories, setCategoriesState] = useState(readInitialCategories);
  const audioContextRef = useRef(null);
  const sessionStartupPlayedRef = useRef(false);

  const persistEnabled = useCallback((nextEnabled) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(nextEnabled));
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const persistVolume = useCallback((nextVolume) => {
    try {
      window.localStorage.setItem(VOLUME_KEY, String(nextVolume));
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const persistCategories = useCallback((nextCategories) => {
    try {
      window.localStorage.setItem(CATEGORY_KEY, JSON.stringify(nextCategories));
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const setVolume = useCallback((nextVolume) => {
    const normalized = Math.min(1, Math.max(0, Number(nextVolume) || 0));
    setVolumeState(normalized);
  }, []);

  const setCategoryEnabled = useCallback((category, nextValue) => {
    setCategoriesState((prev) => ({
      ...prev,
      [category]: Boolean(nextValue),
    }));
  }, []);

  const isCategoryEnabled = useCallback((category) => {
    return categories?.[category] !== false;
  }, [categories]);

  const ensureAudioContext = useCallback(async () => {
    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }

    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch {
        return audioContextRef.current;
      }
    }

    return audioContextRef.current;
  }, []);

  const playFallbackPattern = useCallback(async (cueName, { force = false } = {}) => {
    if ((!enabled && !force) || !SOUND_PRESETS[cueName]) {
      return false;
    }

    const context = await ensureAudioContext();
    if (!context) return false;

    const gainNode = context.createGain();
    gainNode.connect(context.destination);

    const baseTime = context.currentTime + 0.02;
    SOUND_PRESETS[cueName].forEach((step) => {
      const oscillator = context.createOscillator();
      oscillator.type = step.type;
      oscillator.frequency.setValueAtTime(step.frequency, baseTime + step.delay);

      const stepGain = context.createGain();
      const startTime = baseTime + step.delay;
      const endTime = startTime + step.duration;
      const volume = Math.max(0.0001, step.gain);

      stepGain.gain.setValueAtTime(0.0001, startTime);
      stepGain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
      stepGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      oscillator.connect(stepGain);
      stepGain.connect(gainNode);
      oscillator.start(startTime);
      oscillator.stop(endTime + 0.02);
    });

    return true;
  }, [enabled, ensureAudioContext]);

  const playCue = useCallback(async (cueName, { force = false } = {}) => {
    if (!enabled && !force) {
      return false;
    }

    const cueCategory = cueName === 'taskNotification'
      ? 'task'
      : cueName === 'transfer'
        ? 'transfer'
        : cueName === 'help'
          ? 'help'
          : cueName === 'completion'
            ? 'completion'
            : null;

    if (cueCategory && !isCategoryEnabled(cueCategory) && !force) {
      return false;
    }

    const file = SOUND_FILES[cueName];
    if (file) {
      const played = await playAudioFile(file, volume);
      if (played) {
        return true;
      }
    }

    return playFallbackPattern(cueName, { force });
  }, [enabled, isCategoryEnabled, playFallbackPattern, volume]);

  const playStartup = useCallback(async (force = false) => {
    if (!force && sessionStartupPlayedRef.current) return false;
    const played = await playCue('startup', { force });
    if (played || force) {
      sessionStartupPlayedRef.current = true;
    }
    return played;
  }, [playCue]);

  const playTaskNotification = useCallback((kind = 'taskNotification') => playCue(kind), [playCue]);
  const playSuccess = useCallback(() => playCue('success'), [playCue]);
  const playCompletion = useCallback(() => playCue('completion'), [playCue]);
  const playTransfer = useCallback(() => playCue('transfer'), [playCue]);
  const playHelp = useCallback(() => playCue('help'), [playCue]);
  const playError = useCallback(() => playCue('error'), [playCue]);
  const playWarning = useCallback(() => playCue('warning'), [playCue]);
  const playClick = useCallback(() => playCue('click'), [playCue]);
  const playDelete = useCallback(() => playCue('delete'), [playCue]);

  const playForNotification = useCallback((notificationType = '') => {
    const normalized = String(notificationType || '').toLowerCase();
    if (normalized.includes('help')) {
      return playHelp();
    }
    if (normalized.includes('transfer')) {
      return playTransfer();
    }
    if (normalized.includes('completion')) {
      return playCompletion();
    }
    if (normalized.includes('error') || normalized.includes('fail')) {
      return playError();
    }
    return playTaskNotification();
  }, [playCompletion, playError, playHelp, playTaskNotification, playTransfer]);

  useEffect(() => {
    persistEnabled(enabled);
  }, [enabled, persistEnabled]);

  useEffect(() => {
    persistVolume(volume);
  }, [persistVolume, volume]);

  useEffect(() => {
    persistCategories(categories);
  }, [categories, persistCategories]);

  useEffect(() => {
    const unlock = () => {
      ensureAudioContext();
      if (!sessionStartupPlayedRef.current) {
        void playStartup(true);
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [ensureAudioContext, playStartup]);

  const value = {
    enabled,
    setEnabled,
    volume,
    setVolume,
    categories,
    setCategoryEnabled,
    playStartup,
    playTaskNotification,
    playSuccess,
    playCompletion,
    playTransfer,
    playHelp,
    playError,
    playWarning,
    playClick,
    playDelete,
    playForNotification,
  };

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  return useContext(SoundContext);
}
