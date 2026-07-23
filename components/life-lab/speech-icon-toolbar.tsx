"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AudioLines,
  Gauge,
  MessageCircleQuestion,
  MessageSquareText,
  MessagesSquare,
  Pause,
  Play,
  Settings2,
  Square,
  Volume2,
} from "lucide-react";

import {
  formatSpeechRate,
  SPEECH_AUTO_VOICE_ID,
  SPEECH_RATE_OPTIONS,
  type ListedSelectableSpeechVoice,
  type SpeechDiagnostics,
  type SpeechRate,
} from "@/lib/life-lab/speech";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

export type SpeechToolbarPrimaryAction = {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
};

type SpeechIconButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
};

function SpeechIconButton({
  label,
  onClick,
  disabled = false,
  active = false,
  children,
}: SpeechIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      {...passwordManagerSafeControlProps}
      className={`ui-icon-action-quiet relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-accent-cream/50 text-foreground" : ""
      }`}
    >
      {children}
      <span className="ui-tooltip-bubble" role="tooltip">
        {label}
      </span>
    </button>
  );
}

function SpeechPopover({
  label,
  icon,
  children,
  active = false,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <SpeechIconButton
        label={label}
        active={active || open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {icon}
      </SpeechIconButton>
      {open ? (
        <div
          id={menuId}
          role="dialog"
          aria-label={label}
          className="absolute end-0 z-30 mt-2 w-[min(100vw-1.5rem,16rem)] rounded-xl border border-border/70 bg-background p-2 shadow-lg"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

type SpeechIconToolbarProps = {
  primaryActions: SpeechToolbarPrimaryAction[];
  voices: ListedSelectableSpeechVoice[];
  selectedVoiceId: string;
  setSelectedVoiceId: (voiceId: string) => void;
  rate: SpeechRate;
  setRate: (rate: SpeechRate) => void;
  rateDisabled?: boolean;
  voiceDisabled?: boolean;
  notices?: ReactNode;
  developerMode?: boolean;
  diagnostics?: SpeechDiagnostics | null;
  className?: string;
};

export function SpeechIconToolbar({
  primaryActions,
  voices,
  selectedVoiceId,
  setSelectedVoiceId,
  rate,
  setRate,
  rateDisabled = false,
  voiceDisabled = false,
  notices = null,
  developerMode = false,
  diagnostics = null,
  className = "",
}: SpeechIconToolbarProps) {
  function cycleRate() {
    const index = SPEECH_RATE_OPTIONS.indexOf(rate);
    const next =
      SPEECH_RATE_OPTIONS[(index + 1) % SPEECH_RATE_OPTIONS.length] ??
      SPEECH_RATE_OPTIONS[0];
    setRate(next);
  }

  const selectedVoiceLabel =
    selectedVoiceId === SPEECH_AUTO_VOICE_ID
      ? "Auto"
      : (voices.find((voice) => voice.id === selectedVoiceId)?.label ?? "Voice");

  return (
    <div
      className={`speech-icon-toolbar flex flex-col gap-1.5 ${className}`.trim()}
      data-speech-toolbar="icon"
    >
      <div className="flex flex-wrap items-center gap-0.5">
        {primaryActions.map((action) => (
          <SpeechIconButton
            key={action.id}
            label={action.label}
            onClick={action.onClick}
            disabled={action.disabled}
            active={action.active}
          >
            {action.icon}
          </SpeechIconButton>
        ))}

        <SpeechPopover
          label={`Voice: ${selectedVoiceLabel}`}
          icon={<AudioLines className="h-4 w-4" aria-hidden="true" />}
          disabled={voiceDisabled}
        >
          <label className="block space-y-1.5 px-1 py-1">
            <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-light">
              Voice
            </span>
            <select
              value={selectedVoiceId}
              onChange={(event) => setSelectedVoiceId(event.target.value)}
              disabled={voiceDisabled}
              className="w-full rounded-lg border border-border/70 bg-background px-2 py-2 text-sm text-foreground"
              aria-label="Select speech voice"
            >
              <option value={SPEECH_AUTO_VOICE_ID}>Auto</option>
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.label}
                </option>
              ))}
            </select>
          </label>
        </SpeechPopover>

        <SpeechPopover
          label={`Speed: ${formatSpeechRate(rate)}`}
          icon={
            <span className="relative inline-flex items-center justify-center">
              <Gauge className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{formatSpeechRate(rate)}</span>
            </span>
          }
          disabled={rateDisabled}
        >
          <div className="space-y-1.5 px-1 py-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-light">
                Speed
              </span>
              <button
                type="button"
                className="text-xs font-medium text-muted transition-colors hover:text-foreground"
                onClick={cycleRate}
                disabled={rateDisabled}
              >
                Cycle · {formatSpeechRate(rate)}
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {SPEECH_RATE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRate(option)}
                  disabled={rateDisabled}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    rate === option
                      ? "bg-accent-cream text-foreground"
                      : "border border-border/70 text-muted hover:text-foreground"
                  }`}
                  aria-pressed={rate === option}
                >
                  {formatSpeechRate(option)}
                </button>
              ))}
            </div>
          </div>
        </SpeechPopover>

        <SpeechPopover
          label="Speech settings"
          icon={<Settings2 className="h-4 w-4" aria-hidden="true" />}
        >
          <div className="space-y-2 px-1 py-1 text-xs text-muted">
            <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-light">
              Settings
            </p>
            {developerMode && diagnostics ? (
              <p className="font-mono text-[10px] leading-relaxed text-muted/80">
                speech: {diagnostics.browserName} · supported=
                {diagnostics.isSupported ? "yes" : "no"} · voices=
                {diagnostics.voiceCount}
                {diagnostics.lastError ? ` · last=${diagnostics.lastError}` : ""}
              </p>
            ) : (
              <p className="leading-relaxed">
                Voice and speed controls are in this toolbar. Diagnostics appear
                here in developer mode.
              </p>
            )}
          </div>
        </SpeechPopover>
      </div>
      {notices}
    </div>
  );
}

const iconClass = "h-4 w-4";

export const SPEECH_TOOLBAR_ICONS = {
  read: <Volume2 className={iconClass} aria-hidden="true" />,
  question: <MessageCircleQuestion className={iconClass} aria-hidden="true" />,
  answer: <MessageSquareText className={iconClass} aria-hidden="true" />,
  both: <MessagesSquare className={iconClass} aria-hidden="true" />,
  stop: <Square className={iconClass} aria-hidden="true" />,
  pause: <Pause className={iconClass} aria-hidden="true" />,
  resume: <Play className={iconClass} aria-hidden="true" />,
} as const;
