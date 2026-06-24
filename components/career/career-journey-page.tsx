"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";

import {
  addCareerSessionToTodayAction,
  createCareerCheckInAction,
  createCareerSessionAction,
  generateCareerReflectionAction,
  updateCareerCurrentFocusAction,
  updateCareerPillarTargetAction,
  updateCareerSessionStatusAction,
  updateCareerTargetRolesAction,
} from "@/app/(app)/career/actions";
import type {
  CareerJourneyPageData,
  SerializedCareerSession,
} from "@/lib/career-journey/career-journey";
import type { CareerJobSummary } from "@/lib/career-journey/job-summary";
import {
  GENTLE_DAILY_OPTIONS,
  PRACTICE_MODE_LABELS,
  PRACTICE_STATUS_LABELS,
  PRACTICE_TYPE_LABELS,
} from "@/lib/career-journey/constants";
import { getAllTinyStepPresets } from "@/lib/career-journey/tiny-steps";
import { passwordManagerSafeControlProps } from "@/lib/password-manager-ignore";

type CareerJourneyPageProps = {
  initialData: CareerJourneyPageData;
  jobSummary: CareerJobSummary | null;
  canUseCoaching: boolean;
  canUseJobTracker: boolean;
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="ui-card-padded space-y-4 border border-border-soft">
      <div>
        <h2 className="text-base font-medium text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function PillarProgressBar({
  done,
  target,
  name,
}: {
  done: number;
  target: number;
  name: string;
}) {
  const ratio = target > 0 ? Math.min(done / target, 1) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-foreground">{name}</span>
        <span className="tabular-nums text-muted">
          {done} / {target}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-muted"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-accent/70 transition-all"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function CareerJourneyPage({
  initialData,
  jobSummary,
  canUseCoaching,
  canUseJobTracker,
}: CareerJourneyPageProps) {
  const [data, setData] = useState(initialData);
  const [roleInput, setRoleInput] = useState("");
  const [focusInput, setFocusInput] = useState(
    initialData.profile.currentFocus ?? "",
  );
  const [showTinySteps, setShowTinySteps] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [showReflect, setShowReflect] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [checkInNote, setCheckInNote] = useState("");
  const [energyBefore, setEnergyBefore] = useState("3");
  const [energyAfter, setEnergyAfter] = useState("3");
  const [reflection, setReflection] = useState<string | null>(null);
  const [nextKindAction, setNextKindAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(action: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  function handleAddRole() {
    const trimmed = roleInput.trim();
    if (!trimmed) return;

    const nextRoles = [...data.profile.targetRoles, trimmed];
    runAction(async () => {
      const result = await updateCareerTargetRolesAction(nextRoles);
      if (result.success) {
        setData((current) => ({
          ...current,
          profile: { ...current.profile, targetRoles: nextRoles },
        }));
        setRoleInput("");
      }
      return result;
    });
  }

  function handleRemoveRole(role: string) {
    const nextRoles = data.profile.targetRoles.filter((entry) => entry !== role);
    if (nextRoles.length === 0) {
      setError("Keep at least one target role.");
      return;
    }

    runAction(async () => {
      const result = await updateCareerTargetRolesAction(nextRoles);
      if (result.success) {
        setData((current) => ({
          ...current,
          profile: { ...current.profile, targetRoles: nextRoles },
        }));
      }
      return result;
    });
  }

  function handleSaveFocus() {
    runAction(async () =>
      updateCareerCurrentFocusAction(focusInput),
    );
  }

  function handlePillarTargetChange(pillarId: string, value: string) {
    const weeklyTarget = Number.parseInt(value, 10);
    if (Number.isNaN(weeklyTarget)) return;

    runAction(async () => {
      const result = await updateCareerPillarTargetAction(
        pillarId,
        weeklyTarget,
      );
      if (result.success) {
        setData((current) => ({
          ...current,
          pillars: current.pillars.map((pillar) =>
            pillar.id === pillarId ? { ...pillar, weeklyTarget } : pillar,
          ),
        }));
      }
      return result;
    });
  }

  function handleCreateSession(input: {
    type: SerializedCareerSession["type"];
    mode: SerializedCareerSession["mode"];
    title: string;
  }) {
    runAction(async () => {
      const result = await createCareerSessionAction({
        ...input,
        date: data.todayDate,
      });
      if (result.success) {
        window.location.reload();
      }
      return result;
    });
  }

  function handleSessionStatus(
    sessionId: string,
    status: SerializedCareerSession["status"],
  ) {
    runAction(async () => {
      const result = await updateCareerSessionStatusAction(sessionId, status);
      if (result.success) {
        setData((current) => ({
          ...current,
          todaySessions: current.todaySessions.map((session) =>
            session.id === sessionId ? { ...session, status } : session,
          ),
          pillars: current.pillars.map((pillar) => {
            const session = current.todaySessions.find(
              (entry) => entry.id === sessionId,
            );
            if (!session || status !== "DONE") {
              return pillar;
            }
            return pillar;
          }),
        }));
        window.location.reload();
      }
      return result;
    });
  }

  function handleAddToToday(sessionId: string) {
    runAction(async () => addCareerSessionToTodayAction(sessionId));
  }

  function handleCheckIn() {
    runAction(async () => {
      const result = await createCareerCheckInAction({
        energyBefore: Number.parseInt(energyBefore, 10),
        energyAfter: Number.parseInt(energyAfter, 10),
        note: checkInNote,
      });
      if (result.success) {
        setShowReflect(false);
        setCheckInNote("");
      }
      return result;
    });
  }

  function handleGenerateReflection() {
    setError(null);
    startTransition(async () => {
      const result = await generateCareerReflectionAction();
      if (!result.success) {
        setReflection(null);
        setNextKindAction(null);
        setError(result.error);
        return;
      }

      setReflection(result.reflection);
      setNextKindAction(result.nextKindAction);
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {error ? (
        <p className="rounded-xl border border-border-soft bg-surface-muted/50 px-3 py-2 text-sm text-muted">
          {error}
        </p>
      ) : null}

      <SectionCard
        title="Role focus"
        description="What you're moving toward — without pressure to pick just one path."
      >
        <div className="flex flex-wrap gap-2">
          {data.profile.targetRoles.map((role) => (
            <span
              key={role}
              className="inline-flex items-center gap-1 rounded-full bg-accent-cream/70 px-3 py-1 text-sm text-foreground"
            >
              {role}
              <button
                type="button"
                className="text-muted hover:text-foreground"
                aria-label={`Remove ${role}`}
                onClick={() => handleRemoveRole(role)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            id="career-role-input"
            name="careerRole"
            value={roleInput}
            onChange={(event) => setRoleInput(event.target.value)}
            placeholder="Add a target role"
            className="ui-input flex-1"
            {...passwordManagerSafeControlProps}
          />
          <button
            type="button"
            className="ui-button-secondary shrink-0"
            onClick={handleAddRole}
            disabled={isPending}
          >
            Add role
          </button>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Current focus (optional)</span>
          <input
            id="career-current-focus"
            name="careerCurrentFocus"
            value={focusInput}
            onChange={(event) => setFocusInput(event.target.value)}
            placeholder="What feels most alive right now?"
            className="ui-input w-full"
            {...passwordManagerSafeControlProps}
          />
        </label>
        <button
          type="button"
          className="ui-button-secondary"
          onClick={handleSaveFocus}
          disabled={isPending}
        >
          Save focus
        </button>
      </SectionCard>

      <SectionCard
        title="This week"
        description="Gentle progress — enough counts."
      >
        <div className="space-y-4">
          {data.pillars
            .filter((pillar) => pillar.isActive)
            .map((pillar) => (
              <div key={pillar.id} className="space-y-2">
                <PillarProgressBar
                  name={pillar.name}
                  done={pillar.doneThisWeek}
                  target={pillar.weeklyTarget}
                />
                <label className="flex items-center gap-2 text-xs text-muted">
                  <span>Weekly target</span>
                  <input
                    id={`career-pillar-target-${pillar.id}`}
                    name={`careerPillarTarget-${pillar.id}`}
                    type="number"
                    min={0}
                    max={50}
                    value={pillar.weeklyTarget}
                    onChange={(event) =>
                      handlePillarTargetChange(pillar.id, event.target.value)
                    }
                    className="ui-input w-16 px-2 py-1 text-sm"
                  />
                </label>
              </div>
            ))}
        </div>
      </SectionCard>

      {canUseJobTracker && jobSummary ? (
        <SectionCard
          title="Applications snapshot"
          description="A small look at your job tracker this week."
        >
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">This week</dt>
              <dd className="font-medium text-foreground">
                {jobSummary.applicationsThisWeek}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Saved</dt>
              <dd className="font-medium text-foreground">
                {jobSummary.saved}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Applied</dt>
              <dd className="font-medium text-foreground">
                {jobSummary.applied}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Interviewing</dt>
              <dd className="font-medium text-foreground">
                {jobSummary.interviewing}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Rejected</dt>
              <dd className="font-medium text-foreground">
                {jobSummary.rejected}
              </dd>
            </div>
          </dl>
          <Link href="/jobs" className="ui-button-secondary inline-flex">
            Open job tracker
          </Link>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Today's gentle options"
        description="Pick one tiny step — or skip without guilt."
      >
        <div className="flex flex-wrap gap-2">
          {GENTLE_DAILY_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="rounded-full border border-border-soft px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent-cream/60"
              disabled={isPending}
              onClick={() =>
                handleCreateSession({
                  type: option.type,
                  mode: option.mode,
                  title: option.title,
                })
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Today's sessions">
        {data.todaySessions.length === 0 ? (
          <p className="text-sm text-muted">
            No sessions yet. A tiny step is enough for today.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.todaySessions.map((session) => (
              <li
                key={session.id}
                className="rounded-xl border border-border-soft/80 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {session.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {PRACTICE_TYPE_LABELS[session.type]} ·{" "}
                      {PRACTICE_MODE_LABELS[session.mode]} ·{" "}
                      {PRACTICE_STATUS_LABELS[session.status]}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {session.status !== "DONE" ? (
                      <button
                        type="button"
                        className="ui-button-secondary px-2 py-1 text-xs"
                        disabled={isPending}
                        onClick={() =>
                          handleSessionStatus(session.id, "DONE")
                        }
                      >
                        Done
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="ui-button-secondary px-2 py-1 text-xs"
                      disabled={isPending}
                      onClick={() => handleAddToToday(session.id)}
                    >
                      Add to today
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="ui-button-secondary"
            onClick={() => setShowAddSession((value) => !value)}
          >
            Add session
          </button>
          <button
            type="button"
            className="ui-button-secondary"
            onClick={() => setShowTinySteps((value) => !value)}
          >
            Tiny step
          </button>
          <button
            type="button"
            className="ui-button-secondary"
            onClick={() => setShowReflect((value) => !value)}
          >
            Reflect
          </button>
        </div>

        {showAddSession ? (
          <div className="space-y-2 rounded-xl border border-border-soft/70 bg-surface-muted/30 p-3">
            <input
              id="career-session-title"
              name="careerSessionTitle"
              value={sessionTitle}
              onChange={(event) => setSessionTitle(event.target.value)}
              placeholder="Session title"
              className="ui-input w-full"
            />
            <button
              type="button"
              className="ui-button-primary"
              disabled={isPending || !sessionTitle.trim()}
              onClick={() => {
                handleCreateSession({
                  type: "PROJECT",
                  mode: "MODERATE",
                  title: sessionTitle,
                });
                setSessionTitle("");
                setShowAddSession(false);
              }}
            >
              Save session
            </button>
          </div>
        ) : null}

        {showTinySteps ? (
          <div className="space-y-2 rounded-xl border border-border-soft/70 bg-surface-muted/30 p-3">
            <p className="text-xs text-muted">
              Preset tiny steps — pick one kind action.
            </p>
            <div className="flex flex-wrap gap-2">
              {getAllTinyStepPresets().map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="rounded-full border border-border-soft px-3 py-1.5 text-xs text-foreground hover:bg-accent-cream/60"
                  disabled={isPending}
                  onClick={() => {
                    handleCreateSession({
                      type: preset.type,
                      mode: "TINY",
                      title: preset.title,
                    });
                    setShowTinySteps(false);
                  }}
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showReflect ? (
          <div className="space-y-3 rounded-xl border border-border-soft/70 bg-surface-muted/30 p-3">
            <p className="text-sm text-muted">
              Protect your energy. No grades, no streaks.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-xs text-muted">
                Energy before
                <select
                  id="career-energy-before"
                  name="careerEnergyBefore"
                  value={energyBefore}
                  onChange={(event) => setEnergyBefore(event.target.value)}
                  className="ui-input w-full"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted">
                Energy after
                <select
                  id="career-energy-after"
                  name="careerEnergyAfter"
                  value={energyAfter}
                  onChange={(event) => setEnergyAfter(event.target.value)}
                  className="ui-input w-full"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <textarea
              id="career-check-in-note"
              name="careerCheckInNote"
              value={checkInNote}
              onChange={(event) => setCheckInNote(event.target.value)}
              placeholder="Optional note"
              rows={3}
              className="ui-input w-full resize-y"
            />
            <button
              type="button"
              className="ui-button-primary"
              disabled={isPending}
              onClick={handleCheckIn}
            >
              Save check-in
            </button>
          </div>
        ) : null}
      </SectionCard>

      {canUseCoaching ? (
        <SectionCard
          title="Career reflection"
          description="Gentle feedback based on your journey — not medical or therapy advice."
        >
          <button
            type="button"
            className="ui-button-primary"
            disabled={isPending}
            onClick={handleGenerateReflection}
          >
            Generate gentle career feedback
          </button>
          {reflection ? (
            <div className="space-y-3 rounded-xl border border-border-soft/70 bg-surface-muted/30 p-3">
              <p className="text-sm leading-relaxed text-foreground" dir="auto">
                {reflection}
              </p>
              {nextKindAction ? (
                <p className="text-sm text-muted">
                  <span className="font-medium text-foreground">
                    Next kind action:
                  </span>{" "}
                  {nextKindAction}
                </p>
              ) : null}
            </div>
          ) : null}
        </SectionCard>
      ) : null}
    </div>
  );
}
