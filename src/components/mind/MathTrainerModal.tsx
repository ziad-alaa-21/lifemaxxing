"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Brain,
  X,
  Play,
  RotateCcw,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Target,
  ChevronRight,
  Loader2,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  MathMode,
  MathOperation,
  MathDifficulty,
  MathProblem,
  MathAttempt,
  generateMathProblem,
  calculateMathSessionScore,
  evaluatePersonalBest,
  PersonalBestRecord,
  MathSessionSummary,
} from "@/lib/mathTrainer";
import { feedbackManager } from "@/lib/telemetryFeedback";

interface MathTrainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionSaved?: (summary: MathSessionSummary) => void;
}

export function MathTrainerModal({
  isOpen,
  onClose,
  onSessionSaved,
}: MathTrainerModalProps) {
  // Config state
  const [mode, setMode] = useState<MathMode>("sprint");
  const [operation, setOperation] = useState<MathOperation>("mixed");
  const [difficulty, setDifficulty] = useState<MathDifficulty>("medium");

  // Game state
  const [gameState, setGameState] = useState<"idle" | "running" | "finished">("idle");
  const [currentProblem, setCurrentProblem] = useState<MathProblem | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [attempts, setAttempts] = useState<MathAttempt[]>([]);
  const [problemStartTime, setProblemStartTime] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [sprintRemainingSeconds, setSprintRemainingSeconds] = useState<number>(60);
  const [personalBest, setPersonalBest] = useState<PersonalBestRecord | null>(null);
  const [isNewPB, setIsNewPB] = useState<boolean>(false);
  const [savingSession, setSavingSession] = useState<boolean>(false);
  const [finalSummary, setFinalSummary] = useState<MathSessionSummary | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(feedbackManager.soundEnabled);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load PB from localStorage on config change
  useEffect(() => {
    try {
      const pbKey = `life_math_pb_${mode}_${operation}_${difficulty}`;
      const saved = localStorage.getItem(pbKey);
      if (saved) {
        setPersonalBest(JSON.parse(saved));
      } else {
        setPersonalBest(null);
      }
    } catch {
      setPersonalBest(null);
    }
  }, [mode, operation, difficulty]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    feedbackManager.setSoundEnabled(next);
  };

  // Start a new session
  const startSession = () => {
    setGameState("running");
    setAttempts([]);
    setUserAnswer("");
    setIsNewPB(false);
    setFinalSummary(null);

    const now = Date.now();
    setSessionStartTime(now);
    setProblemStartTime(now);

    const firstProblem = generateMathProblem(operation, difficulty);
    setCurrentProblem(firstProblem);

    if (mode === "sprint") {
      setSprintRemainingSeconds(60);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSprintRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            finishSession(now, 60);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Finish session
  const finishSession = useCallback(
    async (startMs: number, forcedDurationSec?: number) => {
      if (timerRef.current) clearInterval(timerRef.current);

      const endMs = Date.now();
      const startedAt = new Date(startMs).toISOString();
      const endedAt = new Date(endMs).toISOString();

      setAttempts((currentAttempts) => {
        // Evaluate score
        const verification = calculateMathSessionScore(
          mode,
          operation,
          difficulty,
          startedAt,
          endedAt,
          currentAttempts
        );

        if (verification.valid && verification.summary) {
          const summary = verification.summary;
          if (forcedDurationSec) summary.duration_seconds = forcedDurationSec;

          setFinalSummary(summary);
          setGameState("finished");

          // Check PB
          const pbKey = `life_math_pb_${mode}_${operation}_${difficulty}`;
          const currentSavedPB = personalBest;
          const { isNewPB: pbStatus, record: updatedRecord } = evaluatePersonalBest(
            currentSavedPB,
            summary
          );

          if (pbStatus) {
            setIsNewPB(true);
            setPersonalBest(updatedRecord);
            try {
              localStorage.setItem(pbKey, JSON.stringify(updatedRecord));
            } catch {}
          }

          // Submit to server route asynchronously
          saveToServer(summary, currentAttempts);
        } else {
          // If no attempts or invalid, just return to idle
          setGameState("idle");
        }

        return currentAttempts;
      });
    },
    [mode, operation, difficulty, personalBest]
  );

  const saveToServer = async (summary: MathSessionSummary, sessionAttempts: MathAttempt[]) => {
    setSavingSession(true);
    try {
      const res = await fetch("/api/mind/math/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: summary.mode,
          operation: summary.operation,
          difficulty: summary.difficulty,
          started_at: summary.started_at,
          ended_at: summary.ended_at,
          attempts: sessionAttempts,
        }),
      });

      if (res.ok) {
        if (onSessionSaved) onSessionSaved(summary);
      } else {
        const data = await res.json();
        console.warn("Server math submit notice:", data.error);
      }
    } catch (err) {
      console.warn("Network error saving math session:", err);
    } finally {
      setSavingSession(false);
    }
  };

  // Submit single answer
  const submitAnswer = () => {
    if (!currentProblem || userAnswer.trim() === "") return;

    const parsedAns = parseInt(userAnswer.trim(), 10);
    if (isNaN(parsedAns)) return;

    const now = Date.now();
    const responseTime = Math.max(50, now - problemStartTime);
    const isCorrect = parsedAns === currentProblem.expectedAnswer;

    if (isCorrect) {
      feedbackManager.playCorrect();
    } else {
      feedbackManager.playIncorrect();
    }

    const newAttempt: MathAttempt = {
      operation: currentProblem.operation,
      question: currentProblem.questionText,
      answer: currentProblem.expectedAnswer,
      user_answer: parsedAns,
      correct: isCorrect,
      response_time_ms: responseTime,
    };

    const nextAttempts = [...attempts, newAttempt];
    setAttempts(nextAttempts);
    setUserAnswer("");
    setProblemStartTime(now);

    // If precision mode: check if 20 questions reached
    if (mode === "precision" && nextAttempts.length >= 20) {
      finishSession(sessionStartTime);
      return;
    }

    // Next problem
    setCurrentProblem(generateMathProblem(operation, difficulty));
  };

  // Keypad click handler
  const handleKeypadPress = (val: string) => {
    if (val === "BACK") {
      setUserAnswer((prev) => prev.slice(0, -1));
    } else if (val === "SUBMIT") {
      submitAnswer();
    } else if (val === "-") {
      if (userAnswer === "") setUserAnswer("-");
    } else {
      if (userAnswer.length < 6) {
        setUserAnswer((prev) => prev + val);
      }
    }
  };

  // Physical keyboard listener
  useEffect(() => {
    if (gameState !== "running") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleKeypadPress(e.key);
      } else if (e.key === "Backspace") {
        handleKeypadPress("BACK");
      } else if (e.key === "Enter") {
        submitAnswer();
      } else if (e.key === "-") {
        handleKeypadPress("-");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, currentProblem, userAnswer, attempts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-surface-dim/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-surface-container rounded-3xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-lime/10 border border-primary-lime/30 flex items-center justify-center text-primary-lime">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-on-surface">
                Mental Math Trainer
              </h2>
              <p className="text-[11px] font-mono text-on-surface-variant">
                Cognitive speed & precision
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className="p-2 rounded-xl text-text-muted hover:text-on-surface bg-surface-container-high border border-border-subtle cursor-pointer transition-colors"
              title={soundEnabled ? "Mute audio" : "Enable audio"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                if (gameState === "running") {
                  if (confirm("Quit current session? Unfinished sessions are not saved.")) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setGameState("idle");
                    onClose();
                  }
                } else {
                  onClose();
                }
              }}
              className="p-2 rounded-xl text-text-muted hover:text-on-surface bg-surface-container-high border border-border-subtle cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-5">
          {/* STATE 1: IDLE CONFIG */}
          {gameState === "idle" && (
            <div className="space-y-4">
              {/* Mode Selector */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5 block">
                  Training Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode("sprint")}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      mode === "sprint"
                        ? "bg-primary-lime/10 border-primary-lime/40 text-on-surface"
                        : "bg-surface-container-low border-border-subtle text-text-muted hover:border-border-default"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold font-mono">60s Sprint</span>
                      <Zap className="w-3.5 h-3.5 text-primary-lime" />
                    </div>
                    <p className="text-[10px] text-on-surface-variant">
                      Score = correct answers in 60s
                    </p>
                  </button>

                  <button
                    onClick={() => setMode("precision")}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      mode === "precision"
                        ? "bg-primary-lime/10 border-primary-lime/40 text-on-surface"
                        : "bg-surface-container-low border-border-subtle text-text-muted hover:border-border-default"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold font-mono">20 Precision</span>
                      <Target className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                    <p className="text-[10px] text-on-surface-variant">
                      Accuracy % and total time
                    </p>
                  </button>
                </div>
              </div>

              {/* Operation Selector */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5 block">
                  Operation
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(
                    [
                      { id: "add", label: "+" },
                      { id: "sub", label: "-" },
                      { id: "mul", label: "×" },
                      { id: "div", label: "÷" },
                      { id: "mixed", label: "Mix" },
                    ] as const
                  ).map((op) => (
                    <button
                      key={op.id}
                      onClick={() => setOperation(op.id)}
                      className={`py-2 rounded-xl border text-center font-mono font-bold text-xs cursor-pointer transition-all ${
                        operation === op.id
                          ? "bg-primary-lime text-surface border-primary-lime"
                          : "bg-surface-container-low border-border-subtle text-text-muted hover:text-on-surface"
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Selector */}
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5 block">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "medium", "hard"] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`py-2 rounded-xl border capitalize font-mono text-xs font-medium cursor-pointer transition-all ${
                        difficulty === diff
                          ? "bg-primary-lime/10 border-primary-lime/40 text-primary-lime"
                          : "bg-surface-container-low border-border-subtle text-text-muted hover:text-on-surface"
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal Best Display */}
              <div className="p-3.5 rounded-2xl bg-surface-container-low border border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-4 h-4 text-amber-core" />
                  <span className="text-xs font-mono text-on-surface-variant">Personal Best</span>
                </div>
                <div className="text-xs font-mono font-bold text-primary-lime">
                  {personalBest ? (
                    mode === "sprint" ? (
                      `${personalBest.bestScore} correct`
                    ) : (
                      `${personalBest.bestAccuracyPct}% (${personalBest.bestDurationSeconds}s)`
                    )
                  ) : (
                    <span className="text-text-muted font-normal">None recorded</span>
                  )}
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={startSession}
                className="w-full py-3.5 rounded-2xl bg-primary-lime text-surface font-mono font-bold text-sm uppercase tracking-wider hover:bg-primary-lime-dim shadow-[0_0_20px_rgba(198,255,61,0.25)] flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Play className="w-4 h-4 fill-surface" />
                <span>Start Training</span>
              </button>
            </div>
          )}

          {/* STATE 2: RUNNING GAME */}
          {gameState === "running" && currentProblem && (
            <div className="space-y-4">
              {/* Telemetry Bar */}
              <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-surface-container-low border border-border-subtle text-xs font-mono">
                <div className="flex items-center gap-1.5 text-text-muted">
                  <Clock className="w-3.5 h-3.5" />
                  {mode === "sprint" ? (
                    <span className="text-amber-core font-bold">{sprintRemainingSeconds}s remaining</span>
                  ) : (
                    <span>Question {attempts.length + 1} / 20</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-success font-semibold">
                    {attempts.filter((a) => a.correct).length} correct
                  </span>
                  <span className="text-text-muted">({attempts.length} done)</span>
                </div>
              </div>

              {/* Problem Screen */}
              <div className="p-6 rounded-3xl bg-surface-container-high border border-border-subtle text-center space-y-2">
                <div className="text-4xl sm:text-5xl font-mono font-extrabold tracking-wider text-on-surface">
                  {currentProblem.questionText}
                </div>
                <div className="h-10 flex items-center justify-center">
                  <span className="text-2xl font-mono font-bold text-primary-lime min-w-[3ch] border-b-2 border-primary-lime/40 px-3">
                    {userAnswer || "?"}
                  </span>
                </div>
              </div>

              {/* Numeric Keypad for Mobile and Touch */}
              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "0", "BACK"].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKeypadPress(key)}
                    className="py-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-border-subtle text-on-surface font-mono text-lg font-bold cursor-pointer active:scale-95 transition-all"
                  >
                    {key === "BACK" ? "⌫" : key}
                  </button>
                ))}
              </div>

              {/* Submit Button */}
              <button
                onClick={submitAnswer}
                disabled={userAnswer.trim() === ""}
                className="w-full py-3.5 rounded-2xl bg-primary-lime text-surface font-mono font-bold text-sm uppercase tracking-wider hover:bg-primary-lime-dim shadow-[0_0_16px_rgba(198,255,61,0.2)] disabled:opacity-40 cursor-pointer transition-all"
              >
                Submit Answer
              </button>
            </div>
          )}

          {/* STATE 3: FINISHED SUMMARY */}
          {gameState === "finished" && finalSummary && (
            <div className="space-y-4 text-center">
              {isNewPB && (
                <div className="p-3 rounded-2xl bg-amber-core/10 border border-amber-core/30 flex items-center justify-center gap-2 text-amber-core font-mono text-xs font-bold animate-pulse">
                  <Trophy className="w-4 h-4" />
                  <span>NEW PERSONAL BEST ACHIEVED!</span>
                </div>
              )}

              {/* Main Score Display */}
              <div className="p-6 rounded-3xl bg-surface-container-high border border-border-subtle space-y-1">
                <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                  {finalSummary.mode === "sprint" ? "Sprint Score" : "Precision Score"}
                </div>
                <div className="text-4xl font-mono font-extrabold text-primary-lime">
                  {finalSummary.mode === "sprint"
                    ? `${finalSummary.score} Correct`
                    : `${finalSummary.score}% Accuracy`}
                </div>
                <p className="text-xs text-on-surface-variant font-mono">
                  {finalSummary.correct_answers} of {finalSummary.total_questions} questions correct
                </p>
              </div>

              {/* Accuracy & Speed Separated */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-border-subtle space-y-0.5">
                  <div className="text-[10px] font-mono uppercase text-text-muted">Accuracy</div>
                  <div className="text-base font-mono font-bold text-on-surface">
                    {finalSummary.accuracy_pct}%
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-border-subtle space-y-0.5">
                  <div className="text-[10px] font-mono uppercase text-text-muted">Avg Speed</div>
                  <div className="text-base font-mono font-bold text-on-surface">
                    {(finalSummary.avg_response_time_ms / 1000).toFixed(2)}s / item
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-border-subtle space-y-0.5">
                  <div className="text-[10px] font-mono uppercase text-text-muted">Total Time</div>
                  <div className="text-base font-mono font-bold text-on-surface">
                    {finalSummary.duration_seconds} seconds
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-border-subtle space-y-0.5">
                  <div className="text-[10px] font-mono uppercase text-text-muted">Database Trust</div>
                  <div className="text-base font-mono font-bold text-emerald-success flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  onClick={startSession}
                  className="flex-1 py-3 rounded-2xl bg-primary-lime text-surface font-mono font-bold text-xs uppercase tracking-wider hover:bg-primary-lime-dim cursor-pointer transition-all"
                >
                  Train Again
                </button>
                <button
                  onClick={() => {
                    setGameState("idle");
                    onClose();
                  }}
                  className="px-5 py-3 rounded-2xl bg-surface-container-high border border-border-subtle text-text-muted hover:text-on-surface font-mono font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
