/**
 * Property Tests for Input Comparator
 *
 * Feature: typing-training-engine
 * 
 * Property 11: Character Status Management
 * Property 13: Progress Calculation
 * 
 * Validates: Requirements 8.1, 8.2, 8.4
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { CharacterCell, CharacterStatus } from "@/types/typing-training";
import {
  compareCharacter,
  updateCharacterStatus,
  calculateProgress,
  initializeCharacterCells,
} from "./input-comparator";

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/** Valid character statuses */
const validStatuses: CharacterStatus[] = ["pending", "correct", "incorrect", "current"];

/** Arbitrary for generating valid CharacterStatus */
const characterStatusArb: fc.Arbitrary<CharacterStatus> = fc.constantFrom(...validStatuses);

/** Arbitrary for generating a single printable character */
const singleCharArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 1 });

/** Arbitrary for generating non-empty training content */
const trainingContentArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.length > 0);

/** Arbitrary for generating a CharacterCell */
const characterCellArb: fc.Arbitrary<CharacterCell> = fc.record({
  char: singleCharArb,
  status: characterStatusArb,
  typedChar: fc.option(singleCharArb, { nil: undefined }),
});

/** Arbitrary for generating an array of CharacterCells with valid initial state */
const characterCellsArb: fc.Arbitrary<CharacterCell[]> = trainingContentArb.map((content) =>
  initializeCharacterCells(content)
);

/** Arbitrary for generating valid index within array bounds */
const validIndexArb = (maxLength: number): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: Math.max(0, maxLength - 1) });

// ============================================================================
// Property Tests - Property 11: Character Status Management
// ============================================================================

describe("Property 11: Character Status Management", () => {
  /**
   * Feature: typing-training-engine, Property 11: Character Status Management
   * Validates: Requirements 8.1, 8.2
   *
   * For any keystroke during an input session, the system should immediately
   * update the character at the current index to either 'correct' or 'incorrect'
   * status, and each character should have exactly one valid status.
   */
  it("updates character status to correct or incorrect based on input match", () => {
    fc.assert(
      fc.property(
        trainingContentArb,
        singleCharArb,
        (content, typedChar) => {
          const characters = initializeCharacterCells(content);
          const index = 0; // First character is always 'current'
          
          const result = updateCharacterStatus(characters, index, typedChar);
          
          // The character at index should be updated to either 'correct' or 'incorrect'
          const updatedCell = result[index];
          expect(["correct", "incorrect"]).toContain(updatedCell.status);
          
          // The status should match the comparison result
          const expectedStatus = characters[index].char === typedChar ? "correct" : "incorrect";
          expect(updatedCell.status).toBe(expectedStatus);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("each character has exactly one valid status after update", () => {
    fc.assert(
      fc.property(
        trainingContentArb,
        singleCharArb,
        (content, typedChar) => {
          const characters = initializeCharacterCells(content);
          const result = updateCharacterStatus(characters, 0, typedChar);
          
          // Every character should have exactly one valid status
          for (const cell of result) {
            expect(validStatuses).toContain(cell.status);
            // Count how many statuses match - should be exactly 1
            const matchCount = validStatuses.filter((s) => s === cell.status).length;
            expect(matchCount).toBe(1);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("sets next character to current after updating current character", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 50 }).filter((s) => s.length >= 2),
        singleCharArb,
        (content, typedChar) => {
          const characters = initializeCharacterCells(content);
          const result = updateCharacterStatus(characters, 0, typedChar);
          
          // The next character (index 1) should now be 'current'
          expect(result[1].status).toBe("current");
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("preserves immutability - original array is not modified", () => {
    fc.assert(
      fc.property(
        trainingContentArb,
        singleCharArb,
        (content, typedChar) => {
          const characters = initializeCharacterCells(content);
          const originalFirstStatus = characters[0].status;
          
          updateCharacterStatus(characters, 0, typedChar);
          
          // Original array should not be modified
          expect(characters[0].status).toBe(originalFirstStatus);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("stores the typed character in the cell", () => {
    fc.assert(
      fc.property(
        trainingContentArb,
        singleCharArb,
        (content, typedChar) => {
          const characters = initializeCharacterCells(content);
          const result = updateCharacterStatus(characters, 0, typedChar);
          
          // The typed character should be stored
          expect(result[0].typedChar).toBe(typedChar);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("handles boundary case - index out of bounds returns original array", () => {
    fc.assert(
      fc.property(
        trainingContentArb,
        singleCharArb,
        fc.integer({ min: -100, max: -1 }),
        (content, typedChar, negativeIndex) => {
          const characters = initializeCharacterCells(content);
          const result = updateCharacterStatus(characters, negativeIndex, typedChar);
          
          // Should return the same array (by reference check on content)
          expect(result).toEqual(characters);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("handles boundary case - index beyond array length returns original array", () => {
    fc.assert(
      fc.property(
        trainingContentArb,
        singleCharArb,
        (content, typedChar) => {
          const characters = initializeCharacterCells(content);
          const outOfBoundsIndex = characters.length + 10;
          const result = updateCharacterStatus(characters, outOfBoundsIndex, typedChar);
          
          // Should return the same array
          expect(result).toEqual(characters);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property Tests - Property 13: Progress Calculation
// ============================================================================

describe("Property 13: Progress Calculation", () => {
  /**
   * Feature: typing-training-engine, Property 13: Progress Calculation
   * Validates: Requirements 8.4
   *
   * For any input session state, the progress percentage should equal
   * (currentIndex / totalCharacters) * 100.
   */
  it("progress equals (currentIndex / totalCharacters) * 100", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (currentIndex, totalCharacters) => {
          const progress = calculateProgress(currentIndex, totalCharacters);
          
          // Calculate expected progress
          const clampedIndex = Math.min(Math.max(0, currentIndex), totalCharacters);
          const expectedProgress = (clampedIndex / totalCharacters) * 100;
          
          expect(progress).toBeCloseTo(expectedProgress, 10);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("progress is always between 0 and 100", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 2000 }),
        fc.integer({ min: 1, max: 1000 }),
        (currentIndex, totalCharacters) => {
          const progress = calculateProgress(currentIndex, totalCharacters);
          
          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(100);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("progress is 0 when currentIndex is 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (totalCharacters) => {
          const progress = calculateProgress(0, totalCharacters);
          expect(progress).toBe(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("progress is 100 when currentIndex equals totalCharacters", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (totalCharacters) => {
          const progress = calculateProgress(totalCharacters, totalCharacters);
          expect(progress).toBe(100);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("progress is 100 when currentIndex exceeds totalCharacters", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 500 }),
        (totalCharacters, excess) => {
          const progress = calculateProgress(totalCharacters + excess, totalCharacters);
          expect(progress).toBe(100);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("progress is 0 when totalCharacters is 0 or negative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: -100, max: 0 }),
        (currentIndex, totalCharacters) => {
          const progress = calculateProgress(currentIndex, totalCharacters);
          expect(progress).toBe(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("progress is 0 when currentIndex is negative", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: -1 }),
        fc.integer({ min: 1, max: 1000 }),
        (currentIndex, totalCharacters) => {
          const progress = calculateProgress(currentIndex, totalCharacters);
          expect(progress).toBe(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("progress increases monotonically as currentIndex increases", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (totalCharacters) => {
          let previousProgress = -1;
          
          for (let i = 0; i <= totalCharacters; i++) {
            const progress = calculateProgress(i, totalCharacters);
            expect(progress).toBeGreaterThanOrEqual(previousProgress);
            previousProgress = progress;
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// Additional Unit Tests for compareCharacter
// ============================================================================

describe("compareCharacter", () => {
  it("returns true for matching characters", () => {
    fc.assert(
      fc.property(singleCharArb, (char) => {
        expect(compareCharacter(char, char)).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("returns false for non-matching characters", () => {
    fc.assert(
      fc.property(
        singleCharArb,
        singleCharArb.filter((c) => c !== "a"),
        (char1, char2) => {
          // Only test when characters are different
          if (char1 !== char2) {
            expect(compareCharacter(char1, char2)).toBe(false);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("is case-sensitive", () => {
    expect(compareCharacter("a", "A")).toBe(false);
    expect(compareCharacter("A", "a")).toBe(false);
    expect(compareCharacter("a", "a")).toBe(true);
    expect(compareCharacter("A", "A")).toBe(true);
  });
});

// ============================================================================
// Additional Unit Tests for initializeCharacterCells
// ============================================================================

describe("initializeCharacterCells", () => {
  it("creates correct number of cells", () => {
    fc.assert(
      fc.property(trainingContentArb, (content) => {
        const cells = initializeCharacterCells(content);
        expect(cells.length).toBe(content.length);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("first character has status 'current'", () => {
    fc.assert(
      fc.property(trainingContentArb, (content) => {
        const cells = initializeCharacterCells(content);
        expect(cells[0].status).toBe("current");
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("all other characters have status 'pending'", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 50 }).filter((s) => s.length >= 2),
        (content) => {
          const cells = initializeCharacterCells(content);
          for (let i = 1; i < cells.length; i++) {
            expect(cells[i].status).toBe("pending");
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("each cell contains the correct character", () => {
    fc.assert(
      fc.property(trainingContentArb, (content) => {
        const cells = initializeCharacterCells(content);
        for (let i = 0; i < content.length; i++) {
          expect(cells[i].char).toBe(content[i]);
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("all cells have undefined typedChar initially", () => {
    fc.assert(
      fc.property(trainingContentArb, (content) => {
        const cells = initializeCharacterCells(content);
        for (const cell of cells) {
          expect(cell.typedChar).toBeUndefined();
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
