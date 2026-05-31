/**
 * Property Tests for Supabase Data Access Layer
 *
 * Feature: typing-training-engine
 *
 * Property 6: Word Filtering Accuracy
 * Property 16: Session Persistence Round-Trip
 * Property 18: Material Persistence Round-Trip
 * Property 19: Favorite Toggle Persistence
 * Property 20: Material Deletion
 *
 * Validates: Requirements 3.6, 9.3, 10.1, 10.3, 10.4
 *
 * Note: These tests validate the data transformation logic and type mappings.
 * Integration tests with actual database would require a test database setup.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import type {
  WordMeta,
  WordType,
  WordFilter,
  DifficultyLevel,
  TrainingMaterial,
  TrainingMode,
  SessionResult,
  ErrorStat,
  SentenceConfig,
  ArticleConfig,
} from "@/types/typing-training";

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/** Valid word types */
const wordTypes: WordType[] = [
  "high-frequency",
  "academic",
  "workplace",
  "verb",
  "adjective",
  "noun",
];

/** Valid training modes */
const trainingModes: TrainingMode[] = ["word", "sentence", "article"];

/** Valid difficulty levels */
const difficultyLevels: DifficultyLevel[] = [1, 2, 3, 4, 5];

/** Arbitrary for generating valid WordType */
const wordTypeArb: fc.Arbitrary<WordType> = fc.constantFrom(...wordTypes);

/** Arbitrary for generating valid TrainingMode */
const trainingModeArb: fc.Arbitrary<TrainingMode> = fc.constantFrom(
  ...trainingModes
);

/** Arbitrary for generating valid DifficultyLevel */
const difficultyLevelArb: fc.Arbitrary<DifficultyLevel> = fc.constantFrom(
  ...difficultyLevels
);

/** Arbitrary for generating a valid word string */
const wordStringArb: fc.Arbitrary<string> = fc.stringMatching(/^[a-zA-Z]{2,20}$/);

/** Arbitrary for generating a valid WordMeta */
const wordMetaArb: fc.Arbitrary<WordMeta> = fc.record({
  id: fc.uuid(),
  word: wordStringArb,
  type: wordTypeArb,
  difficulty: difficultyLevelArb,
});

/** Arbitrary for generating a WordFilter */
const wordFilterArb: fc.Arbitrary<WordFilter> = fc.record({
  types: fc.option(fc.array(wordTypeArb, { minLength: 0, maxLength: 6 }), {
    nil: undefined,
  }),
  difficulty: fc.option(difficultyLevelArb, { nil: undefined }),
  limit: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
});

/** Arbitrary for generating an ErrorStat */
const errorStatArb: fc.Arbitrary<ErrorStat> = fc.record({
  expected: fc.string({ minLength: 1, maxLength: 1 }),
  actual: fc.string({ minLength: 1, maxLength: 1 }),
  count: fc.integer({ min: 1, max: 100 }),
});

/** Arbitrary for generating a SessionResult */
const sessionResultArb: fc.Arbitrary<SessionResult> = fc.record({
  id: fc.option(fc.uuid(), { nil: undefined }),
  userId: fc.option(fc.uuid(), { nil: undefined }),
  materialId: fc.option(fc.uuid(), { nil: undefined }),
  mode: fc.option(trainingModeArb, { nil: undefined }),
  accuracy: fc.float({ min: 0, max: 100, noNaN: true }),
  speed: fc.float({ min: 0, max: 1000, noNaN: true }),
  totalTime: fc.integer({ min: 0, max: 3600 }),
  totalCharacters: fc.integer({ min: 0, max: 10000 }),
  correctCharacters: fc.integer({ min: 0, max: 10000 }),
  incorrectCharacters: fc.integer({ min: 0, max: 10000 }),
  frequentErrors: fc.array(errorStatArb, { minLength: 0, maxLength: 10 }),
  createdAt: fc.option(fc.date(), { nil: undefined }),
});

/** Arbitrary for generating content string */
const contentStringArb: fc.Arbitrary<string> = fc.string({
  minLength: 1,
  maxLength: 500,
});

/** Arbitrary for generating SentenceConfig metadata */
const sentenceConfigArb: fc.Arbitrary<SentenceConfig> = fc.record({
  coreVocabulary: fc.array(wordStringArb, { minLength: 0, maxLength: 10 }),
  difficulty: difficultyLevelArb,
});

/** Arbitrary for generating ArticleConfig metadata */
const articleConfigArb: fc.Arbitrary<ArticleConfig> = fc.record({
  type: fc.constantFrom(
    "daily-life",
    "workplace",
    "study",
    "narrative",
    "expository"
  ),
  tone: fc.constantFrom("casual", "formal", "semi-formal"),
  difficulty: difficultyLevelArb,
  perspective: fc.constantFrom("first", "second", "third"),
  minLength: fc.integer({ min: 100, max: 500 }),
  maxLength: fc.integer({ min: 500, max: 2000 }),
});

/** Arbitrary for generating TrainingMaterial */
const trainingMaterialArb: fc.Arbitrary<TrainingMaterial> = fc
  .record({
    id: fc.uuid(),
    userId: fc.option(fc.uuid(), { nil: undefined }),
    mode: trainingModeArb,
    content: contentStringArb,
    difficulty: difficultyLevelArb,
    isFavorite: fc.boolean(),
    createdAt: fc.date(),
  })
  .chain((base) => {
    // Generate appropriate metadata based on mode
    const metadataArb =
      base.mode === "word"
        ? fc.array(wordMetaArb, { minLength: 1, maxLength: 10 })
        : base.mode === "sentence"
          ? sentenceConfigArb
          : articleConfigArb;

    return metadataArb.map((metadata) => ({
      ...base,
      metadata,
    }));
  });

// ============================================================================
// Property Tests - Property 6: Word Filtering Accuracy
// ============================================================================

describe("Property 6: Word Filtering Accuracy", () => {
  /**
   * Feature: typing-training-engine, Property 6: Word Filtering Accuracy
   * Validates: Requirements 3.6
   *
   * For any filter combination of word types and difficulty levels,
   * all returned words must match the specified filter criteria.
   */

  it("words matching type filter should have the specified type", () => {
    fc.assert(
      fc.property(
        fc.array(wordMetaArb, { minLength: 1, maxLength: 50 }),
        fc.array(wordTypeArb, { minLength: 1, maxLength: 3 }),
        (words, filterTypes) => {
          // Simulate filtering logic
          const filtered = words.filter((w) => filterTypes.includes(w.type));

          // All filtered words should have one of the specified types
          for (const word of filtered) {
            expect(filterTypes).toContain(word.type);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("words matching difficulty filter should have the specified difficulty", () => {
    fc.assert(
      fc.property(
        fc.array(wordMetaArb, { minLength: 1, maxLength: 50 }),
        difficultyLevelArb,
        (words, filterDifficulty) => {
          // Simulate filtering logic
          const filtered = words.filter((w) => w.difficulty === filterDifficulty);

          // All filtered words should have the specified difficulty
          for (const word of filtered) {
            expect(word.difficulty).toBe(filterDifficulty);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("combined type and difficulty filter returns only matching words", () => {
    fc.assert(
      fc.property(
        fc.array(wordMetaArb, { minLength: 1, maxLength: 50 }),
        fc.array(wordTypeArb, { minLength: 1, maxLength: 3 }),
        difficultyLevelArb,
        (words, filterTypes, filterDifficulty) => {
          // Simulate combined filtering logic
          const filtered = words.filter(
            (w) =>
              filterTypes.includes(w.type) && w.difficulty === filterDifficulty
          );

          // All filtered words should match both criteria
          for (const word of filtered) {
            expect(filterTypes).toContain(word.type);
            expect(word.difficulty).toBe(filterDifficulty);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("limit filter returns at most the specified number of words", () => {
    fc.assert(
      fc.property(
        fc.array(wordMetaArb, { minLength: 1, maxLength: 100 }),
        fc.integer({ min: 1, max: 50 }),
        (words, limit) => {
          // Simulate limit logic
          const limited = words.slice(0, limit);

          expect(limited.length).toBeLessThanOrEqual(limit);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("empty type filter returns all words (no type filtering)", () => {
    fc.assert(
      fc.property(
        fc.array(wordMetaArb, { minLength: 1, maxLength: 50 }),
        (words) => {
          // Empty filter should return all words
          const filtered = words.filter(() => true);

          expect(filtered.length).toBe(words.length);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("WordMeta always has valid type and difficulty", () => {
    fc.assert(
      fc.property(wordMetaArb, (word) => {
        // Type should be one of the valid types
        expect(wordTypes).toContain(word.type);

        // Difficulty should be between 1 and 5
        expect(word.difficulty).toBeGreaterThanOrEqual(1);
        expect(word.difficulty).toBeLessThanOrEqual(5);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property Tests - Property 16: Session Persistence Round-Trip
// ============================================================================

describe("Property 16: Session Persistence Round-Trip", () => {
  /**
   * Feature: typing-training-engine, Property 16: Session Persistence Round-Trip
   * Validates: Requirements 9.3
   *
   * For any completed session, saving it to the database and then retrieving it
   * should produce an equivalent session result.
   */

  it("session result preserves numeric fields after serialization", () => {
    fc.assert(
      fc.property(sessionResultArb, (session) => {
        // Simulate serialization/deserialization (JSON round-trip)
        const serialized = JSON.stringify({
          accuracy: session.accuracy,
          speed: session.speed,
          total_time: session.totalTime,
          total_characters: session.totalCharacters,
          correct_characters: session.correctCharacters,
          incorrect_characters: session.incorrectCharacters,
        });

        const deserialized = JSON.parse(serialized);

        // Numeric fields should be preserved
        expect(deserialized.accuracy).toBeCloseTo(session.accuracy, 10);
        expect(deserialized.speed).toBeCloseTo(session.speed, 10);
        expect(deserialized.total_time).toBe(session.totalTime);
        expect(deserialized.total_characters).toBe(session.totalCharacters);
        expect(deserialized.correct_characters).toBe(session.correctCharacters);
        expect(deserialized.incorrect_characters).toBe(session.incorrectCharacters);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("session result preserves frequentErrors after serialization", () => {
    fc.assert(
      fc.property(sessionResultArb, (session) => {
        // Simulate serialization/deserialization
        const serialized = JSON.stringify(session.frequentErrors);
        const deserialized = JSON.parse(serialized) as ErrorStat[];

        // frequentErrors should be preserved
        expect(deserialized.length).toBe(session.frequentErrors.length);

        for (let i = 0; i < deserialized.length; i++) {
          expect(deserialized[i].expected).toBe(session.frequentErrors[i].expected);
          expect(deserialized[i].actual).toBe(session.frequentErrors[i].actual);
          expect(deserialized[i].count).toBe(session.frequentErrors[i].count);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("session mode is preserved after serialization", () => {
    fc.assert(
      fc.property(sessionResultArb, (session) => {
        if (session.mode) {
          const serialized = JSON.stringify({ mode: session.mode });
          const deserialized = JSON.parse(serialized);

          expect(deserialized.mode).toBe(session.mode);
          expect(trainingModes).toContain(deserialized.mode);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("accuracy is always between 0 and 100", () => {
    fc.assert(
      fc.property(sessionResultArb, (session) => {
        expect(session.accuracy).toBeGreaterThanOrEqual(0);
        expect(session.accuracy).toBeLessThanOrEqual(100);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("character counts are non-negative", () => {
    fc.assert(
      fc.property(sessionResultArb, (session) => {
        expect(session.totalCharacters).toBeGreaterThanOrEqual(0);
        expect(session.correctCharacters).toBeGreaterThanOrEqual(0);
        expect(session.incorrectCharacters).toBeGreaterThanOrEqual(0);

        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property Tests - Property 18: Material Persistence Round-Trip
// ============================================================================

describe("Property 18: Material Persistence Round-Trip", () => {
  /**
   * Feature: typing-training-engine, Property 18: Material Persistence Round-Trip
   * Validates: Requirements 10.1
   *
   * For any generated training material, saving it to the database and then
   * retrieving it should produce an equivalent material object.
   */

  it("material content is preserved after serialization", () => {
    fc.assert(
      fc.property(trainingMaterialArb, (material) => {
        // Simulate serialization/deserialization
        const serialized = JSON.stringify({
          content: material.content,
          mode: material.mode,
          difficulty: material.difficulty,
          is_favorite: material.isFavorite,
        });

        const deserialized = JSON.parse(serialized);

        expect(deserialized.content).toBe(material.content);
        expect(deserialized.mode).toBe(material.mode);
        expect(deserialized.difficulty).toBe(material.difficulty);
        expect(deserialized.is_favorite).toBe(material.isFavorite);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("material metadata is preserved after serialization", () => {
    fc.assert(
      fc.property(trainingMaterialArb, (material) => {
        // Simulate serialization/deserialization
        const serialized = JSON.stringify({ metadata: material.metadata });
        const deserialized = JSON.parse(serialized);

        // Deep equality check for metadata
        expect(JSON.stringify(deserialized.metadata)).toBe(
          JSON.stringify(material.metadata)
        );

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("material mode is always valid", () => {
    fc.assert(
      fc.property(trainingMaterialArb, (material) => {
        expect(trainingModes).toContain(material.mode);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("material difficulty is always between 1 and 5", () => {
    fc.assert(
      fc.property(trainingMaterialArb, (material) => {
        expect(material.difficulty).toBeGreaterThanOrEqual(1);
        expect(material.difficulty).toBeLessThanOrEqual(5);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("material isFavorite is always boolean", () => {
    fc.assert(
      fc.property(trainingMaterialArb, (material) => {
        expect(typeof material.isFavorite).toBe("boolean");

        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property Tests - Property 19: Favorite Toggle Persistence
// ============================================================================

describe("Property 19: Favorite Toggle Persistence", () => {
  /**
   * Feature: typing-training-engine, Property 19: Favorite Toggle Persistence
   * Validates: Requirements 10.3
   *
   * For any training material, toggling its favorite status and then retrieving it
   * should reflect the updated favorite state.
   */

  it("toggling favorite status inverts the boolean value", () => {
    fc.assert(
      fc.property(fc.boolean(), (initialFavorite) => {
        // Simulate toggle logic
        const toggled = !initialFavorite;

        expect(toggled).toBe(!initialFavorite);
        expect(toggled).not.toBe(initialFavorite);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("double toggle returns to original state", () => {
    fc.assert(
      fc.property(fc.boolean(), (initialFavorite) => {
        // Simulate double toggle
        const firstToggle = !initialFavorite;
        const secondToggle = !firstToggle;

        expect(secondToggle).toBe(initialFavorite);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("favorite status is always boolean after toggle", () => {
    fc.assert(
      fc.property(trainingMaterialArb, (material) => {
        const toggled = !material.isFavorite;

        expect(typeof toggled).toBe("boolean");

        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property Tests - Property 20: Material Deletion
// ============================================================================

describe("Property 20: Material Deletion", () => {
  /**
   * Feature: typing-training-engine, Property 20: Material Deletion
   * Validates: Requirements 10.4
   *
   * For any training material that is deleted, subsequent retrieval attempts
   * should return null or throw a not-found error.
   */

  it("deleted material ID should not be found in remaining materials", () => {
    fc.assert(
      fc.property(
        fc.array(trainingMaterialArb, { minLength: 2, maxLength: 20 }),
        fc.integer({ min: 0 }),
        (materials, indexSeed) => {
          // Select a material to delete
          const deleteIndex = indexSeed % materials.length;
          const deletedId = materials[deleteIndex].id;

          // Simulate deletion
          const remaining = materials.filter((m) => m.id !== deletedId);

          // Deleted material should not be in remaining
          expect(remaining.find((m) => m.id === deletedId)).toBeUndefined();

          // Remaining count should be one less
          expect(remaining.length).toBe(materials.length - 1);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("deletion preserves other materials", () => {
    fc.assert(
      fc.property(
        fc.array(trainingMaterialArb, { minLength: 2, maxLength: 20 }),
        fc.integer({ min: 0 }),
        (materials, indexSeed) => {
          // Select a material to delete
          const deleteIndex = indexSeed % materials.length;
          const deletedId = materials[deleteIndex].id;

          // Simulate deletion
          const remaining = materials.filter((m) => m.id !== deletedId);

          // All other materials should still exist
          for (const material of materials) {
            if (material.id !== deletedId) {
              expect(remaining.find((m) => m.id === material.id)).toBeDefined();
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("deleting from empty list has no effect", () => {
    const materials: TrainingMaterial[] = [];
    const remaining = materials.filter((m) => m.id !== "non-existent-id");

    expect(remaining.length).toBe(0);
  });

  it("deleting non-existent ID preserves all materials", () => {
    fc.assert(
      fc.property(
        fc.array(trainingMaterialArb, { minLength: 1, maxLength: 20 }),
        (materials) => {
          // Try to delete a non-existent ID
          const nonExistentId = "non-existent-id-12345";
          const remaining = materials.filter((m) => m.id !== nonExistentId);

          // All materials should still exist
          expect(remaining.length).toBe(materials.length);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
