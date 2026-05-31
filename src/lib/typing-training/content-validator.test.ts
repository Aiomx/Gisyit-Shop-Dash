/**
 * Property Tests for Content Validator
 *
 * Feature: typing-training-engine
 *
 * Property 5: Word Integrity
 * Property 10: Content Quality Validation
 *
 * Validates: Requirements 3.4, 3.5, 6.2, 6.3, 6.5, 6.6, 7.2, 7.3, 7.4
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  validateWordIntegrity,
  validateContentQuality,
  hasValidationError,
  OBSCURE_SYMBOLS,
  TIME_SENSITIVE_WORDS,
  CONVERSATIONAL_PHRASES,
  AMBIGUOUS_ABBREVIATIONS,
  OPTIONAL_HYPHEN_PATTERNS,
} from "./content-validator";

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/** Arbitrary for generating clean words (no leading/trailing spaces, no punctuation) */
const cleanWordArb: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-zA-Z]{3,}$/)
  .filter((s) => {
    const lower = s.toLowerCase();
    // Avoid words that might accidentally match blocklists
    return (
      s.length >= 3 &&
      s.length <= 30 &&
      !AMBIGUOUS_ABBREVIATIONS.some((abbr) => lower === abbr.toLowerCase()) &&
      !TIME_SENSITIVE_WORDS.some((w) => lower.includes(w.toLowerCase())) &&
      !CONVERSATIONAL_PHRASES.some((p) => lower.includes(p.toLowerCase()))
    );
  });

/** Arbitrary for generating spaces string */
const spacesArb: fc.Arbitrary<string> = fc
  .integer({ min: 1, max: 5 })
  .map((n) => " ".repeat(n));

/** Arbitrary for generating words with leading spaces */
const wordWithLeadingSpaceArb: fc.Arbitrary<string> = fc
  .tuple(spacesArb, cleanWordArb)
  .map(([spaces, word]) => spaces + word);

/** Arbitrary for generating words with trailing spaces */
const wordWithTrailingSpaceArb: fc.Arbitrary<string> = fc
  .tuple(cleanWordArb, spacesArb)
  .map(([word, spaces]) => word + spaces);

/** Arbitrary for generating words with added punctuation */
const wordWithPunctuationArb: fc.Arbitrary<string> = fc
  .tuple(cleanWordArb, fc.constantFrom(".", ",", "!", "?", ";", ":"))
  .map(([word, punct]) => word + punct);

/** Arbitrary for generating clean content (no forbidden elements) */
const cleanContentArb: fc.Arbitrary<string> = fc
  .array(cleanWordArb, { minLength: 3, maxLength: 20 })
  .map((words) => words.join(" "));

/** Arbitrary for generating content with obscure symbols */
const contentWithObscureSymbolArb: fc.Arbitrary<string> = fc
  .tuple(cleanContentArb, fc.constantFrom(...OBSCURE_SYMBOLS))
  .map(([content, symbol]) => {
    const words = content.split(" ");
    const insertIndex = Math.floor(words.length / 2);
    words.splice(insertIndex, 0, symbol);
    return words.join(" ");
  });

/** Arbitrary for generating content with list markers */
const contentWithListMarkerArb: fc.Arbitrary<string> = fc
  .tuple(
    cleanContentArb,
    fc.constantFrom("- item", "* item", "1. item", "a) item", "(1) item")
  )
  .map(([content, marker]) => marker + " " + content);

/** Arbitrary for generating content with code blocks */
const contentWithCodeBlockArb: fc.Arbitrary<string> = fc
  .tuple(cleanContentArb, cleanWordArb)
  .map(([content, code]) => content + " `" + code + "` more text");

/** Arbitrary for generating content with markdown formatting */
const contentWithMarkdownArb: fc.Arbitrary<string> = fc
  .tuple(cleanContentArb, cleanWordArb)
  .map(([content, word]) => content + " **" + word + "** more text");

/** Arbitrary for generating content with time-sensitive words */
const contentWithTimeSensitiveArb: fc.Arbitrary<string> = fc
  .tuple(
    cleanContentArb,
    fc.constantFrom(...TIME_SENSITIVE_WORDS.slice(0, 10))
  )
  .map(([content, timeWord]) => {
    const words = content.split(" ");
    const insertIndex = Math.floor(words.length / 2);
    words.splice(insertIndex, 0, timeWord);
    return words.join(" ");
  });

/** Arbitrary for generating content with conversational phrases */
const contentWithConversationalArb: fc.Arbitrary<string> = fc
  .tuple(
    cleanContentArb,
    fc.constantFrom(...CONVERSATIONAL_PHRASES.slice(0, 10))
  )
  .map(([content, phrase]) => phrase + " " + content);

/** Arbitrary for generating content with ambiguous abbreviations */
const contentWithAbbreviationArb: fc.Arbitrary<string> = fc
  .tuple(
    cleanContentArb,
    // Use abbreviations without periods that are more likely to match word boundaries
    fc.constantFrom("btw", "fyi", "asap", "imo", "imho", "tbh", "idk", "lol", "omg")
  )
  .map(([content, abbr]) => {
    const words = content.split(" ");
    const insertIndex = Math.floor(words.length / 2);
    words.splice(insertIndex, 0, abbr);
    return words.join(" ");
  });

/** Arbitrary for generating content with optional hyphen words */
const contentWithOptionalHyphenArb: fc.Arbitrary<string> = fc
  .tuple(
    cleanContentArb,
    fc.constantFrom("e-mail", "on-line", "web-site", "data-base", "co-operate")
  )
  .map(([content, word]) => {
    const words = content.split(" ");
    const insertIndex = Math.floor(words.length / 2);
    words.splice(insertIndex, 0, word);
    return words.join(" ");
  });

// ============================================================================
// Property Tests - Property 5: Word Integrity
// ============================================================================

describe("Property 5: Word Integrity", () => {
  /**
   * Feature: typing-training-engine, Property 5: Word Integrity
   * Validates: Requirements 3.4, 3.5
   *
   * For any word displayed in word training mode, it should match the original
   * word exactly with no modifications, no leading/trailing spaces, and no
   * added punctuation.
   */
  it("identical words pass integrity check", () => {
    fc.assert(
      fc.property(cleanWordArb, (word) => {
        const result = validateWordIntegrity(word, word);
        expect(result).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("words with leading spaces fail integrity check", () => {
    fc.assert(
      fc.property(wordWithLeadingSpaceArb, cleanWordArb, (wordWithSpace, original) => {
        // Only test when the trimmed version matches original
        if (wordWithSpace.trim() === original) {
          const result = validateWordIntegrity(wordWithSpace, original);
          expect(result).toBe(false);
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("words with trailing spaces fail integrity check", () => {
    fc.assert(
      fc.property(wordWithTrailingSpaceArb, cleanWordArb, (wordWithSpace, original) => {
        // Only test when the trimmed version matches original
        if (wordWithSpace.trim() === original) {
          const result = validateWordIntegrity(wordWithSpace, original);
          expect(result).toBe(false);
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("modified words fail integrity check", () => {
    fc.assert(
      fc.property(
        cleanWordArb,
        cleanWordArb.filter((w) => w.length > 0),
        (word1, word2) => {
          // Only test when words are different
          if (word1 !== word2) {
            const result = validateWordIntegrity(word1, word2);
            expect(result).toBe(false);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("original word with spaces fails integrity check", () => {
    fc.assert(
      fc.property(cleanWordArb, (word) => {
        const originalWithSpace = " " + word;
        const result = validateWordIntegrity(originalWithSpace, originalWithSpace);
        expect(result).toBe(false);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("empty strings pass integrity check when both are empty", () => {
    const result = validateWordIntegrity("", "");
    expect(result).toBe(true);
  });

  it("case sensitivity is preserved", () => {
    fc.assert(
      fc.property(cleanWordArb.filter((w) => w.length > 0), (word) => {
        const upperWord = word.toUpperCase();
        const lowerWord = word.toLowerCase();
        
        // If the word has mixed case potential, test case sensitivity
        if (upperWord !== lowerWord) {
          const result = validateWordIntegrity(upperWord, lowerWord);
          expect(result).toBe(false);
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property Tests - Property 10: Content Quality Validation
// ============================================================================

describe("Property 10: Content Quality Validation", () => {
  /**
   * Feature: typing-training-engine, Property 10: Content Quality Validation
   * Validates: Requirements 6.2, 6.3, 6.5, 6.6, 7.2, 7.3, 7.4
   *
   * For any generated training material (sentence or article), it should:
   * - Not contain obscure symbols (from defined blocklist)
   * - Not contain list markers, code blocks, or markdown formatting
   * - Not contain time-sensitive phrases
   * - Not contain conversational phrases
   * - Not contain ambiguous abbreviations
   * - Not contain optional hyphen patterns
   */
  it("clean content passes validation", () => {
    fc.assert(
      fc.property(cleanContentArb, (content) => {
        const result = validateContentQuality(content);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("content with obscure symbols fails validation (Requirement 6.2)", () => {
    fc.assert(
      fc.property(contentWithObscureSymbolArb, (content) => {
        const result = validateContentQuality(content);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.type === "obscure_symbol")).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("content with list markers fails validation (Requirement 6.3)", () => {
    fc.assert(
      fc.property(contentWithListMarkerArb, (content) => {
        const result = validateContentQuality(content);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.type === "list_marker")).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("content with code blocks fails validation (Requirement 6.3)", () => {
    fc.assert(
      fc.property(contentWithCodeBlockArb, (content) => {
        const result = validateContentQuality(content);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.type === "code_block")).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("content with markdown formatting fails validation (Requirement 6.3)", () => {
    fc.assert(
      fc.property(contentWithMarkdownArb, (content) => {
        const result = validateContentQuality(content);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.type === "markdown_formatting")).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("content with time-sensitive words fails validation (Requirement 6.5)", () => {
    fc.assert(
      fc.property(contentWithTimeSensitiveArb, (content) => {
        const result = validateContentQuality(content);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.type === "time_sensitive")).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("content with conversational phrases fails validation (Requirement 6.6, 7.4)", () => {
    fc.assert(
      fc.property(contentWithConversationalArb, (content) => {
        const result = validateContentQuality(content);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.type === "conversational")).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("content with ambiguous abbreviations fails validation (Requirement 7.2)", () => {
    fc.assert(
      fc.property(contentWithAbbreviationArb, (content) => {
        const result = validateContentQuality(content);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.type === "ambiguous_abbreviation")).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("content with optional hyphen words fails validation (Requirement 7.3)", () => {
    fc.assert(
      fc.property(contentWithOptionalHyphenArb, (content) => {
        const result = validateContentQuality(content);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.type === "optional_hyphen")).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("validation errors include position information", () => {
    fc.assert(
      fc.property(contentWithObscureSymbolArb, (content) => {
        const result = validateContentQuality(content);
        
        for (const error of result.errors) {
          if (error.type === "obscure_symbol") {
            expect(typeof error.position).toBe("number");
            expect(error.position).toBeGreaterThanOrEqual(0);
          }
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("validation errors include descriptive messages", () => {
    fc.assert(
      fc.property(contentWithObscureSymbolArb, (content) => {
        const result = validateContentQuality(content);
        
        for (const error of result.errors) {
          expect(typeof error.message).toBe("string");
          expect(error.message.length).toBeGreaterThan(0);
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("hasValidationError correctly identifies specific error types", () => {
    fc.assert(
      fc.property(contentWithObscureSymbolArb, (content) => {
        const hasObscure = hasValidationError(content, "obscure_symbol");
        expect(hasObscure).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("empty content passes validation", () => {
    const result = validateContentQuality("");
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("multiple validation errors are all reported", () => {
    // Create content with multiple issues
    const content = "- list item today please `code` **bold**";
    const result = validateContentQuality(content);
    
    expect(result.isValid).toBe(false);
    // Should have multiple error types
    const errorTypes = new Set(result.errors.map((e) => e.type));
    expect(errorTypes.size).toBeGreaterThan(1);
  });
});

