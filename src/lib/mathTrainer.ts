/**
 * Mental Math Trainer Engine (Stage 7b)
 * Pure generator, honest score math, personal bests, and validation guards
 */

export type MathMode = "sprint" | "precision";
export type MathOperation = "add" | "sub" | "mul" | "div" | "mixed";
export type MathDifficulty = "easy" | "medium" | "hard";

export interface MathProblem {
  id: string;
  operation: "add" | "sub" | "mul" | "div";
  operandA: number;
  operandB: number;
  questionText: string;
  expectedAnswer: number;
}

export interface MathAttempt {
  operation: "add" | "sub" | "mul" | "div";
  question: string;
  answer: number; // expected answer
  user_answer: number;
  correct: boolean;
  response_time_ms: number;
}

export interface MathSessionSummary {
  mode: MathMode;
  operation: MathOperation;
  difficulty: MathDifficulty;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  total_questions: number;
  correct_answers: number;
  accuracy_pct: number;
  avg_response_time_ms: number;
  score: number;
}

export interface PersonalBestRecord {
  mode: MathMode;
  operation: MathOperation;
  difficulty: MathDifficulty;
  bestScore: number;
  bestAccuracyPct: number;
  bestDurationSeconds: number;
  totalSessions: number;
  updatedAt: string;
}

/**
 * Generate a cryptographically / pseudo-random integer between min and max inclusive
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a single math problem guaranteed to have:
 * 1. Strictly non-zero divisor for division
 * 2. Strict integer result for division (dividend = divisor * quotient)
 * 3. Non-negative results for easy subtraction
 */
export function generateMathProblem(
  selectedOp: MathOperation,
  difficulty: MathDifficulty
): MathProblem {
  let op: "add" | "sub" | "mul" | "div";
  if (selectedOp === "mixed") {
    const ops: Array<"add" | "sub" | "mul" | "div"> = ["add", "sub", "mul", "div"];
    op = ops[Math.floor(Math.random() * ops.length)];
  } else {
    op = selectedOp;
  }

  let operandA = 0;
  let operandB = 0;
  let expectedAnswer = 0;
  let symbol = "+";

  switch (op) {
    case "add": {
      symbol = "+";
      if (difficulty === "easy") {
        operandA = randomInt(2, 20);
        operandB = randomInt(2, 20);
      } else if (difficulty === "medium") {
        operandA = randomInt(15, 99);
        operandB = randomInt(15, 99);
      } else {
        // hard
        operandA = randomInt(60, 499);
        operandB = randomInt(60, 499);
      }
      expectedAnswer = operandA + operandB;
      break;
    }
    case "sub": {
      symbol = "-";
      if (difficulty === "easy") {
        operandA = randomInt(5, 30);
        operandB = randomInt(1, operandA); // keep positive
      } else if (difficulty === "medium") {
        operandA = randomInt(25, 120);
        operandB = randomInt(5, operandA);
      } else {
        // hard
        operandA = randomInt(100, 600);
        operandB = randomInt(15, operandA);
      }
      expectedAnswer = operandA - operandB;
      break;
    }
    case "mul": {
      symbol = "×";
      if (difficulty === "easy") {
        operandA = randomInt(2, 9);
        operandB = randomInt(2, 9);
      } else if (difficulty === "medium") {
        operandA = randomInt(4, 15);
        operandB = randomInt(3, 12);
      } else {
        // hard
        operandA = randomInt(11, 35);
        operandB = randomInt(7, 25);
      }
      expectedAnswer = operandA * operandB;
      break;
    }
    case "div": {
      symbol = "÷";
      // CRITICAL: b must never be 0, result must always be an integer
      if (difficulty === "easy") {
        operandB = randomInt(2, 9); // divisor > 0
        expectedAnswer = randomInt(2, 9); // quotient
      } else if (difficulty === "medium") {
        operandB = randomInt(3, 14); // divisor > 0
        expectedAnswer = randomInt(3, 15); // quotient
      } else {
        // hard
        operandB = randomInt(6, 25); // divisor > 0
        expectedAnswer = randomInt(8, 30); // quotient
      }
      operandA = operandB * expectedAnswer; // dividend
      break;
    }
  }

  return {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    operation: op,
    operandA,
    operandB,
    questionText: `${operandA} ${symbol} ${operandB}`,
    expectedAnswer,
  };
}

/**
 * Validate and calculate honest score for a finished session.
 * Rejects impossible values (avg response time < 300ms, correct > attempted).
 */
export function calculateMathSessionScore(
  mode: MathMode,
  operation: MathOperation,
  difficulty: MathDifficulty,
  startedAt: string,
  endedAt: string,
  attempts: MathAttempt[]
): {
  valid: boolean;
  error?: string;
  summary?: MathSessionSummary;
} {
  if (!attempts || attempts.length === 0) {
    return { valid: false, error: "No attempts submitted. Incomplete sessions are not saved." };
  }

  const totalQuestions = attempts.length;
  const correctCount = attempts.filter((a) => a.correct).length;

  // Guard: correct cannot exceed attempted
  if (correctCount > totalQuestions) {
    return { valid: false, error: "Impossible submission: correct answers exceed attempted questions." };
  }

  // Calculate duration
  const startTime = new Date(startedAt).getTime();
  const endTime = new Date(endedAt).getTime();
  let durationSeconds = Math.max(1, Math.round((endTime - startTime) / 1000));

  const totalAttemptTimeMs = attempts.reduce((acc, a) => acc + (a.response_time_ms || 0), 0);
  const avgResponseTimeMs = Math.round(totalAttemptTimeMs / totalQuestions);

  // Guard: human impossibility check (under 300ms average response time)
  if (avgResponseTimeMs < 300) {
    return {
      valid: false,
      error: `Impossible average response time (${avgResponseTimeMs}ms). Minimum human cognitive threshold is 300ms.`,
    };
  }

  const accuracyPct = Math.round((correctCount / totalQuestions) * 100);

  // Score Formula per Mode:
  // Sprint (60s): score = correct answers
  // Precision (20 questions): score = accuracy percentage (with total time displayed)
  let score = 0;
  if (mode === "sprint") {
    score = correctCount;
  } else {
    // precision
    score = accuracyPct;
  }

  return {
    valid: true,
    summary: {
      mode,
      operation,
      difficulty,
      started_at: startedAt,
      ended_at: endedAt,
      duration_seconds: durationSeconds,
      total_questions: totalQuestions,
      correct_answers: correctCount,
      accuracy_pct: accuracyPct,
      avg_response_time_ms: avgResponseTimeMs,
      score,
    },
  };
}

/**
 * Determine if a finished session sets a new Personal Best
 */
export function evaluatePersonalBest(
  currentPB: PersonalBestRecord | null,
  newSummary: MathSessionSummary
): { isNewPB: boolean; record: PersonalBestRecord } {
  if (!currentPB) {
    return {
      isNewPB: true,
      record: {
        mode: newSummary.mode,
        operation: newSummary.operation,
        difficulty: newSummary.difficulty,
        bestScore: newSummary.score,
        bestAccuracyPct: newSummary.accuracy_pct,
        bestDurationSeconds: newSummary.duration_seconds,
        totalSessions: 1,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  let isNewPB = false;
  let bestScore = currentPB.bestScore;
  let bestAccuracyPct = currentPB.bestAccuracyPct;
  let bestDurationSeconds = currentPB.bestDurationSeconds;

  if (newSummary.mode === "sprint") {
    // Sprint: higher score (correct count) wins
    if (newSummary.score > currentPB.bestScore) {
      isNewPB = true;
      bestScore = newSummary.score;
      bestAccuracyPct = Math.max(bestAccuracyPct, newSummary.accuracy_pct);
    }
  } else {
    // Precision: higher accuracy wins; tie-breaker: lower duration
    if (
      newSummary.accuracy_pct > currentPB.bestAccuracyPct ||
      (newSummary.accuracy_pct === currentPB.bestAccuracyPct &&
        newSummary.duration_seconds < currentPB.bestDurationSeconds)
    ) {
      isNewPB = true;
      bestScore = Math.max(bestScore, newSummary.score);
      bestAccuracyPct = newSummary.accuracy_pct;
      bestDurationSeconds = newSummary.duration_seconds;
    }
  }

  return {
    isNewPB,
    record: {
      mode: newSummary.mode,
      operation: newSummary.operation,
      difficulty: newSummary.difficulty,
      bestScore,
      bestAccuracyPct,
      bestDurationSeconds,
      totalSessions: currentPB.totalSessions + 1,
      updatedAt: isNewPB ? new Date().toISOString() : currentPB.updatedAt,
    },
  };
}
