/**
 * Property Tests for Typing Training Types
 *
 * Feature: typing-training-engine, Property 3: Word Metadata Completeness
 * Validates: Requirements 3.2
 *
 * Property 3: Word Metadata Completeness
 * For any word in a Word_Set returned from the database, it must have both
 * a valid word type and a difficulty level between 1 and 5.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { WordMeta, WordType, DifficultyLevel } from "./typing-training";

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/** Valid word types as defined in the type system */
const validWordTypes: WordType[] = [
  "high-frequency",
  "academic",
  "workplace",
  "verb",
  "adjective",
  "noun",
];

/** Valid difficulty levels (1-5) */
const validDifficultyLevels: DifficultyLevel[] = [1, 2, 3, 4, 5];

/** Arbitrary for generating valid WordType */
const wordTypeArb: fc.Arbitrary<WordType> = fc.constantFrom(...validWordTypes);

/** Arbitrary for generating valid DifficultyLevel */
const difficultyLevelArb: fc.Arbitrary<DifficultyLevel> = fc.constantFrom(
  ...validDifficultyLevels
);

/** Arbitrary for generating valid WordMeta */
const wordMetaArb: fc.Arbitrary<WordMeta> = fc.record({
  id: fc.uuid(),
  word: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  type: wordTypeArb,
  difficulty: difficultyLevelArb,
});

/** Arbitrary for generating a Word_Set (array of WordMeta) */
const wordSetArb: fc.Arbitrary<WordMeta[]> = fc.array(wordMetaArb, {
  minLength: 0,
  maxLength: 100,
});

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates that a WordType is one of the allowed values
 */
function isValidWordType(type: unknown): type is WordType {
  return validWordTypes.includes(type as WordType);
}

/**
 * Validates that a DifficultyLevel is between 1 and 5
 */
function isValidDifficultyLevel(level: unknown): level is DifficultyLevel {
  return (
    typeof level === "number" &&
    Number.isInteger(level) &&
    level >= 1 &&
    level <= 5
  );
}

/**
 * Validates that a WordMeta object has complete and valid metadata
 */
function hasCompleteMetadata(word: WordMeta): boolean {
  return (
    typeof word.id === "string" &&
    word.id.length > 0 &&
    typeof word.word === "string" &&
    word.word.length > 0 &&
    isValidWordType(word.type) &&
    isValidDifficultyLevel(word.difficulty)
  );
}

// ============================================================================
// Property Tests
// ============================================================================

describe("Property 3: Word Metadata Completeness", () => {
  /**
   * Feature: typing-training-engine, Property 3: Word Metadata Completeness
   * Validates: Requirements 3.2
   *
   * For any word in a Word_Set, it must have both a valid word type
   * and a difficulty level between 1 and 5.
   */
  it("every word in a Word_Set has valid type and difficulty level", () => {
    fc.assert(
      fc.property(wordSetArb, (wordSet) => {
        // For all words in the set
        for (const word of wordSet) {
          // Must have a valid word type
          expect(isValidWordType(word.type)).toBe(true);

          // Must have a difficulty level between 1 and 5
          expect(isValidDifficultyLevel(word.difficulty)).toBe(true);

          // Must have complete metadata
          expect(hasCompleteMetadata(word)).toBe(true);
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("WordType must be one of the six allowed values", () => {
    fc.assert(
      fc.property(wordTypeArb, (wordType) => {
        expect(validWordTypes).toContain(wordType);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("DifficultyLevel must be an integer between 1 and 5", () => {
    fc.assert(
      fc.property(difficultyLevelArb, (difficulty) => {
        expect(difficulty).toBeGreaterThanOrEqual(1);
        expect(difficulty).toBeLessThanOrEqual(5);
        expect(Number.isInteger(difficulty)).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("WordMeta id must be a non-empty string", () => {
    fc.assert(
      fc.property(wordMetaArb, (wordMeta) => {
        expect(typeof wordMeta.id).toBe("string");
        expect(wordMeta.id.length).toBeGreaterThan(0);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("WordMeta word must be a non-empty string", () => {
    fc.assert(
      fc.property(wordMetaArb, (wordMeta) => {
        expect(typeof wordMeta.word).toBe("string");
        expect(wordMeta.word.trim().length).toBeGreaterThan(0);
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
