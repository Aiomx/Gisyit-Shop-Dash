/**
 * Property Tests for Behavior Analyzer
 *
 * Feature: typing-training-engine
 *
 * Property 14: Session Metrics Calculation
 * Property 15: Error Frequency Analysis
 *
 * Validates: Requirements 9.1, 9.2
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type {
  InputSession,
  Keystroke,
  TrainingMode,
} from "@/types/typing-training";
import {
  calculateAccuracy,
  calculateSpeed,
  analyzeErrorFrequency,
  calculateSessionMetrics,
} from "./behavior-analyzer";

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/** Valid training modes */
const trainingModes: TrainingMode[] = ["word", "sentence", "article"];

/** Arbitrary for generating valid TrainingMode */
const trainingModeArb: fc.Arbitrary<TrainingMode> = fc.constantFrom(
  ...trainingModes
);

/** Arbitrary for generating a single printable character */
const singleCharArb: fc.Arbitrary<string> = fc.string({
  minLength: 1,
  maxLength: 1,
});

/** Arbitrary for generating a Keystroke */
const keystrokeArb: fc.Arbitrary<Keystroke> = fc
  .record({
    timestamp: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
    expected: singleCharArb,
    actual: singleCharArb,
  })
  .map((k) => ({
    ...k,
    isCorrect: k.expected === k.actual,
  }));

/** Arbitrary for generating an incorrect Keystroke (for error testing) */
const incorrectKeystrokeArb: fc.Arbitrary<Keystroke> = fc
  .tuple(singleCharArb, singleCharArb)
  .filter(([expected, actual]) => expected !== actual)
  .map(([expected, actual]) => ({
    timestamp: Date.now(),
    expected,
    actual,
    isCorrect: false,
  }));

/** Arbitrary for generating a correct Keystroke */
const correctKeystrokeArb: fc.Arbitrary<Keystroke> = singleCharArb.map(
  (char) => ({
    timestamp: Date.now(),
    expected: char,
    actual: char,
    isCorrect: true,
  })
);

/** Arbitrary for generating an array of keystrokes with controlled error count */
const keystrokesWithErrorsArb = (
  minErrors: number,
  maxErrors: number
): fc.Arbitrary<Keystroke[]> =>
  fc
    .tuple(
      fc.array(incorrectKeystrokeArb, { minLength: minErrors, maxLength: maxErrors }),
      fc.array(correctKeystrokeArb, { minLength: 0, maxLength: 20 })
    )
    .map(([errors, correct]) => [...errors, ...correct]);

/** Arbitrary for generating a valid InputSession */
const inputSessionArb: fc.Arbitrary<InputSession> = fc
  .record({
    id: fc.uuid(),
    mode: trainingModeArb,
    materialId: fc.uuid(),
    totalCharacters: fc.integer({ min: 1, max: 1000 }),
    keystrokes: fc.array(keystrokeArb, { minLength: 0, maxLength: 100 }),
  })
  .chain((base) => {
    // Calculate correct/incorrect based on keystrokes
    const correctCount = base.keystrokes.filter((k) => k.isCorrect).length;
    const incorrectCount = base.keystrokes.filter((k) => !k.isCorrect).length;

    return fc
      .record({
        startTime: fc.date({
          min: new Date("2020-01-01"),
          max: new Date("2024-01-01"),
        }),
        durationMs: fc.integer({ min: 1000, max: 600000 }), // 1 second to 10 minutes
      })
      .map(({ startTime, durationMs }) => ({
        ...base,
        startTime,
        endTime: new Date(startTime.getTime() + durationMs),
        correctCharacters: correctCount,
        incorrectCharacters: incorrectCount,
        totalCharacters: Math.max(base.totalCharacters, correctCount + incorrectCount),
      }));
  });

// ============================================================================
// Property Tests - Property 14: Session Metrics Calculation
// ============================================================================

describe("Property 14: Session Metrics Calculation", () => {
  /**
   * Feature: typing-training-engine, Property 14: Session Metrics Calculation
   * Validates: Requirements 9.1
   *
   * For any completed input session, the accuracy should equal
   * (correctCharacters / totalCharacters) * 100
   */
  it("accuracy equals (correctCharacters / totalCharacters) * 100", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (correct, total) => {
          const accuracy = calculateAccuracy(correct, total);

          // Clamp correct to valid range
          const clampedCorrect = Math.min(Math.max(0, correct), total);
          const expectedAccuracy = (clampedCorrect / total) * 100;

          expect(accuracy).toBeCloseTo(expectedAccuracy, 10);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: typing-training-engine, Property 14: Session Metrics Calculation
   * Validates: Requirements 9.1
   *
   * Speed should equal (totalCharacters / totalTimeInMinutes)
   */
  it("speed equals (totalCharacters / totalTimeInMinutes)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 600000 }), // 1ms to 10 minutes
        (characters, timeInMs) => {
          const speed = calculateSpeed(characters, timeInMs);

          const timeInMinutes = timeInMs / 60000;
          const expectedSpeed = characters / timeInMinutes;

          expect(speed).toBeCloseTo(expectedSpeed, 10);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("accuracy is always between 0 and 100", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 2000 }),
        fc.integer({ min: 1, max: 1000 }),
        (correct, total) => {
          const accuracy = calculateAccuracy(correct, total);

          expect(accuracy).toBeGreaterThanOrEqual(0);
          expect(accuracy).toBeLessThanOrEqual(100);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("speed is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 1000 }),
        fc.integer({ min: -100, max: 600000 }),
        (characters, timeInMs) => {
          const speed = calculateSpeed(characters, timeInMs);

          expect(speed).toBeGreaterThanOrEqual(0);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("calculateSessionMetrics returns correct accuracy and speed", () => {
    fc.assert(
      fc.property(inputSessionArb, (session) => {
        const result = calculateSessionMetrics(session);

        // Verify accuracy calculation
        if (session.totalCharacters > 0) {
          const expectedAccuracy =
            (session.correctCharacters / session.totalCharacters) * 100;
          expect(result.accuracy).toBeCloseTo(expectedAccuracy, 10);
        }

        // Verify speed calculation
        if (session.endTime) {
          const totalTimeMs =
            session.endTime.getTime() - session.startTime.getTime();
          if (totalTimeMs > 0) {
            const timeInMinutes = totalTimeMs / 60000;
            const expectedSpeed = session.totalCharacters / timeInMinutes;
            expect(result.speed).toBeCloseTo(expectedSpeed, 10);
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("calculateSessionMetrics preserves session metadata", () => {
    fc.assert(
      fc.property(inputSessionArb, (session) => {
        const result = calculateSessionMetrics(session);

        expect(result.totalCharacters).toBe(session.totalCharacters);
        expect(result.correctCharacters).toBe(session.correctCharacters);
        expect(result.incorrectCharacters).toBe(session.incorrectCharacters);
        expect(result.mode).toBe(session.mode);
        expect(result.materialId).toBe(session.materialId);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("accuracy is 0 when totalCharacters is 0 or negative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: -100, max: 0 }),
        (correct, total) => {
          const accuracy = calculateAccuracy(correct, total);
          expect(accuracy).toBe(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("speed is 0 when time is 0 or negative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: -100, max: 0 }),
        (characters, timeInMs) => {
          const speed = calculateSpeed(characters, timeInMs);
          expect(speed).toBe(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property Tests - Property 15: Error Frequency Analysis
// ============================================================================

describe("Property 15: Error Frequency Analysis", () => {
  /**
   * Feature: typing-training-engine, Property 15: Error Frequency Analysis
   * Validates: Requirements 9.2
   *
   * For any completed session with errors, the frequent errors list should be
   * sorted by count in descending order
   */
  it("error list is sorted by count in descending order", () => {
    fc.assert(
      fc.property(keystrokesWithErrorsArb(1, 50), (keystrokes) => {
        const errors = analyzeErrorFrequency(keystrokes);

        // Verify descending order by count
        for (let i = 1; i < errors.length; i++) {
          expect(errors[i - 1].count).toBeGreaterThanOrEqual(errors[i].count);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: typing-training-engine, Property 15: Error Frequency Analysis
   * Validates: Requirements 9.2
   *
   * Each error entry should have valid expected/actual character pairs
   */
  it("each error entry has valid expected/actual character pairs", () => {
    fc.assert(
      fc.property(keystrokesWithErrorsArb(1, 50), (keystrokes) => {
        const errors = analyzeErrorFrequency(keystrokes);

        for (const error of errors) {
          // Expected and actual should be non-empty strings
          expect(typeof error.expected).toBe("string");
          expect(typeof error.actual).toBe("string");
          expect(error.expected.length).toBeGreaterThan(0);
          expect(error.actual.length).toBeGreaterThan(0);

          // Expected and actual should be different (it's an error)
          expect(error.expected).not.toBe(error.actual);

          // Count should be positive
          expect(error.count).toBeGreaterThan(0);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("error count matches actual occurrences in keystrokes", () => {
    fc.assert(
      fc.property(keystrokesWithErrorsArb(1, 30), (keystrokes) => {
        const errors = analyzeErrorFrequency(keystrokes);

        // Count errors manually
        const manualCounts = new Map<string, number>();
        for (const k of keystrokes) {
          if (!k.isCorrect) {
            const key = `${k.expected}|${k.actual}`;
            manualCounts.set(key, (manualCounts.get(key) || 0) + 1);
          }
        }

        // Verify each error's count matches
        for (const error of errors) {
          const key = `${error.expected}|${error.actual}`;
          expect(error.count).toBe(manualCounts.get(key));
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("returns empty array when no errors exist", () => {
    fc.assert(
      fc.property(
        fc.array(correctKeystrokeArb, { minLength: 0, maxLength: 50 }),
        (keystrokes) => {
          const errors = analyzeErrorFrequency(keystrokes);
          expect(errors).toEqual([]);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("total error count equals sum of all error counts", () => {
    fc.assert(
      fc.property(keystrokesWithErrorsArb(1, 50), (keystrokes) => {
        const errors = analyzeErrorFrequency(keystrokes);

        // Sum of all error counts
        const totalFromErrors = errors.reduce((sum, e) => sum + e.count, 0);

        // Count of incorrect keystrokes
        const totalFromKeystrokes = keystrokes.filter((k) => !k.isCorrect).length;

        expect(totalFromErrors).toBe(totalFromKeystrokes);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("calculateSessionMetrics includes frequentErrors sorted by count", () => {
    fc.assert(
      fc.property(inputSessionArb, (session) => {
        const result = calculateSessionMetrics(session);

        // Verify frequentErrors is sorted by count descending
        for (let i = 1; i < result.frequentErrors.length; i++) {
          expect(result.frequentErrors[i - 1].count).toBeGreaterThanOrEqual(
            result.frequentErrors[i].count
          );
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("handles empty keystrokes array", () => {
    const errors = analyzeErrorFrequency([]);
    expect(errors).toEqual([]);
  });

  it("aggregates duplicate error pairs correctly", () => {
    // Create keystrokes with known duplicate errors
    const keystrokes: Keystroke[] = [
      { timestamp: 1, expected: "a", actual: "b", isCorrect: false },
      { timestamp: 2, expected: "a", actual: "b", isCorrect: false },
      { timestamp: 3, expected: "a", actual: "b", isCorrect: false },
      { timestamp: 4, expected: "c", actual: "d", isCorrect: false },
    ];

    const errors = analyzeErrorFrequency(keystrokes);

    // Should have 2 unique error types
    expect(errors.length).toBe(2);

    // First error should be a->b with count 3
    expect(errors[0].expected).toBe("a");
    expect(errors[0].actual).toBe("b");
    expect(errors[0].count).toBe(3);

    // Second error should be c->d with count 1
    expect(errors[1].expected).toBe("c");
    expect(errors[1].actual).toBe("d");
    expect(errors[1].count).toBe(1);
  });
});
