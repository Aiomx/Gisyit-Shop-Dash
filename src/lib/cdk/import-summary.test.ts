/**
 * Property-Based Tests for CDK Import Summary Consistency
 *
 * Tests for Requirements 1.6:
 * - Property 3: Import Summary Consistency
 *
 * **Feature: cdk-auto-delivery, Property 3: Import Summary Consistency**
 * **Validates: Requirements 1.6**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseTextInput, deduplicateCodes, validateCode } from "./utils";
import type { CDKImportError } from "./types";

// ============================================
// Arbitraries (Generators)
// ============================================

/**
 * Generate a valid CDK code string (non-empty, no newlines)
 */
const validCdkCodeArb = fc
    .array(fc.constantFrom(..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-".split("")), {
        minLength: 5,
        maxLength: 25,
    })
    .map((chars) => chars.join(""));

/**
 * Generate an invalid CDK code (empty or whitespace only)
 */
const invalidCdkCodeArb = fc.constantFrom("", "   ", "\t", "  \t  ");

/**
 * Generate a mix of valid and invalid codes
 */
const mixedCodesArb = fc.array(
    fc.oneof(
        { weight: 3, arbitrary: validCdkCodeArb },
        { weight: 1, arbitrary: invalidCdkCodeArb }
    ),
    { minLength: 1, maxLength: 30 }
);

/**
 * Generate codes with some duplicates
 */
const codesWithDuplicatesArb = fc
    .array(validCdkCodeArb, { minLength: 2, maxLength: 15 })
    .chain((uniqueCodes) => {
        // Add some duplicates from the existing codes
        return fc
            .array(fc.integer({ min: 0, max: uniqueCodes.length - 1 }), {
                minLength: 0,
                maxLength: 5,
            })
            .map((indices) => {
                const duplicates = indices.map((i) => uniqueCodes[i]);
                // Shuffle the combined array
                const combined = [...uniqueCodes, ...duplicates];
                return fc.shuffledSubarray(combined, { minLength: combined.length, maxLength: combined.length });
            })
            .chain((shuffled) => shuffled);
    });

// ============================================
// Helper Functions for Testing
// ============================================

/**
 * Simulate the import process locally (without database)
 * to verify the summary consistency property
 */
function simulateImport(
    codes: string[],
    pattern?: string,
    existingHashes: Set<string> = new Set()
): {
    successCount: number;
    duplicateCount: number;
    invalidCount: number;
    totalCount: number;
} {
    const totalCount = codes.length;
    let invalidCount = 0;
    const validCodes: string[] = [];
    const errors: CDKImportError[] = [];

    // Step 1: Validate codes
    for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        const result = validateCode(code, pattern);

        if (result.valid && result.normalizedCode) {
            validCodes.push(result.normalizedCode);
        } else {
            invalidCount++;
            errors.push({
                line: i + 1,
                code: code.substring(0, 20),
                reason: result.error || "Validation failed",
            });
        }
    }

    // Step 2: Deduplicate valid codes (within batch)
    const { uniqueCodes, duplicateCount: inBatchDuplicates } =
        deduplicateCodes(validCodes);

    // Step 3: Check against existing codes (simulated database)
    let dbDuplicateCount = 0;
    const newCodes: string[] = [];

    for (const code of uniqueCodes) {
        // Simple hash for simulation
        const hash = code.toLowerCase();
        if (existingHashes.has(hash)) {
            dbDuplicateCount++;
        } else {
            newCodes.push(code);
        }
    }

    const totalDuplicates = inBatchDuplicates + dbDuplicateCount;
    const successCount = newCodes.length;

    return {
        successCount,
        duplicateCount: totalDuplicates,
        invalidCount,
        totalCount,
    };
}

// ============================================
// Property Tests
// ============================================

describe("Property 3: Import Summary Consistency", () => {
    /**
     * **Feature: cdk-auto-delivery, Property 3: Import Summary Consistency**
     * **Validates: Requirements 1.6**
     *
     * For any import operation, the sum of (success count + duplicate count + invalid count)
     * should equal the total input count.
     */
    it("sum of success + duplicate + invalid equals total count", () => {
        fc.assert(
            fc.property(mixedCodesArb, (codes) => {
                const result = simulateImport(codes);

                // Core property: sum must equal total
                const sum =
                    result.successCount +
                    result.duplicateCount +
                    result.invalidCount;

                expect(sum).toBe(result.totalCount);
                expect(result.totalCount).toBe(codes.length);

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * With duplicates in input, the property still holds
     */
    it("maintains consistency with duplicate codes in input", () => {
        fc.assert(
            fc.property(codesWithDuplicatesArb, (codes) => {
                const result = simulateImport(codes);

                const sum =
                    result.successCount +
                    result.duplicateCount +
                    result.invalidCount;

                expect(sum).toBe(result.totalCount);
                expect(result.totalCount).toBe(codes.length);

                // Duplicate count should be at least the number of duplicates
                const uniqueSet = new Set(codes.filter((c) => c.trim().length > 0));
                const validCodes = codes.filter((c) => c.trim().length > 0);
                const expectedMinDuplicates = validCodes.length - uniqueSet.size;

                expect(result.duplicateCount).toBeGreaterThanOrEqual(
                    expectedMinDuplicates
                );

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * With existing codes in database, the property still holds
     */
    it("maintains consistency with existing codes in database", () => {
        fc.assert(
            fc.property(
                fc.array(validCdkCodeArb, { minLength: 5, maxLength: 20 }),
                fc.integer({ min: 0, max: 4 }),
                (codes, existingCount) => {
                    // Simulate some codes already existing in database
                    const existingHashes = new Set(
                        codes.slice(0, existingCount).map((c) => c.toLowerCase())
                    );

                    const result = simulateImport(codes, undefined, existingHashes);

                    const sum =
                        result.successCount +
                        result.duplicateCount +
                        result.invalidCount;

                    expect(sum).toBe(result.totalCount);
                    expect(result.totalCount).toBe(codes.length);

                    // Database duplicates should be counted
                    expect(result.duplicateCount).toBeGreaterThanOrEqual(
                        existingCount
                    );

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * With pattern validation, the property still holds
     */
    it("maintains consistency with pattern validation", () => {
        // Pattern that only accepts codes starting with "CDK-"
        const pattern = "^CDK-[A-Z0-9]+$";

        const matchingCodeArb = fc
            .array(fc.constantFrom(..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")), {
                minLength: 5,
                maxLength: 15,
            })
            .map((chars) => "CDK-" + chars.join(""));

        const nonMatchingCodeArb = fc
            .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789".split("")), {
                minLength: 5,
                maxLength: 15,
            })
            .map((chars) => chars.join(""));

        fc.assert(
            fc.property(
                fc.array(
                    fc.oneof(
                        { weight: 1, arbitrary: matchingCodeArb },
                        { weight: 1, arbitrary: nonMatchingCodeArb }
                    ),
                    { minLength: 5, maxLength: 20 }
                ),
                (codes) => {
                    const result = simulateImport(codes, pattern);

                    const sum =
                        result.successCount +
                        result.duplicateCount +
                        result.invalidCount;

                    expect(sum).toBe(result.totalCount);
                    expect(result.totalCount).toBe(codes.length);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Empty input produces zero counts
     */
    it("handles empty input correctly", () => {
        const result = simulateImport([]);

        expect(result.successCount).toBe(0);
        expect(result.duplicateCount).toBe(0);
        expect(result.invalidCount).toBe(0);
        expect(result.totalCount).toBe(0);

        const sum =
            result.successCount + result.duplicateCount + result.invalidCount;
        expect(sum).toBe(result.totalCount);
    });

    /**
     * All valid unique codes results in success count = total count
     */
    it("all valid unique codes have success count equal to total", () => {
        fc.assert(
            fc.property(
                fc.array(validCdkCodeArb, { minLength: 1, maxLength: 20 }).filter(
                    (codes) => new Set(codes).size === codes.length
                ),
                (uniqueCodes) => {
                    const result = simulateImport(uniqueCodes);

                    expect(result.successCount).toBe(uniqueCodes.length);
                    expect(result.duplicateCount).toBe(0);
                    expect(result.invalidCount).toBe(0);
                    expect(result.totalCount).toBe(uniqueCodes.length);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * All invalid codes results in invalid count = total count
     */
    it("all invalid codes have invalid count equal to total", () => {
        fc.assert(
            fc.property(
                fc.array(invalidCdkCodeArb, { minLength: 1, maxLength: 10 }),
                (invalidCodes) => {
                    const result = simulateImport(invalidCodes);

                    expect(result.successCount).toBe(0);
                    expect(result.duplicateCount).toBe(0);
                    expect(result.invalidCount).toBe(invalidCodes.length);
                    expect(result.totalCount).toBe(invalidCodes.length);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Counts are always non-negative
     */
    it("all counts are non-negative", () => {
        fc.assert(
            fc.property(mixedCodesArb, (codes) => {
                const result = simulateImport(codes);

                expect(result.successCount).toBeGreaterThanOrEqual(0);
                expect(result.duplicateCount).toBeGreaterThanOrEqual(0);
                expect(result.invalidCount).toBeGreaterThanOrEqual(0);
                expect(result.totalCount).toBeGreaterThanOrEqual(0);

                return true;
            }),
            { numRuns: 100 }
        );
    });
});

describe("Import Summary - Text Parsing Integration", () => {
    /**
     * When parsing text and then simulating import,
     * the summary should be consistent
     */
    it("text parsing followed by import maintains consistency", () => {
        const newlineArb = fc.constantFrom("\n", "\r\n", "\r");

        fc.assert(
            fc.property(
                fc.array(
                    fc.oneof(
                        { weight: 3, arbitrary: validCdkCodeArb },
                        { weight: 1, arbitrary: fc.constant("") }
                    ),
                    { minLength: 1, maxLength: 20 }
                ),
                newlineArb,
                (codes, newline) => {
                    // Parse text input
                    const text = codes.join(newline);
                    const parsed = parseTextInput(text);

                    // Simulate import with parsed codes
                    const result = simulateImport(parsed.codes);

                    // The sum should equal the number of non-empty parsed codes
                    const sum =
                        result.successCount +
                        result.duplicateCount +
                        result.invalidCount;

                    expect(sum).toBe(result.totalCount);
                    expect(result.totalCount).toBe(parsed.codes.length);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});
