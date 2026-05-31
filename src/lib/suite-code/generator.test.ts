/**
 * Property-Based Tests for Suite Code Generator
 *
 * Tests for Requirements 1.1, 1.6, 7.1, 7.2, 7.3, 7.5:
 * - Property 1: Code Format Validity
 * - Property 2: Code Uniqueness
 * - Property 3: Code Round-Trip
 *
 * **Feature: suite-code, Property 1: Code Format Validity**
 * **Validates: Requirements 1.1, 7.1, 7.2, 7.3**
 *
 * **Feature: suite-code, Property 2: Code Uniqueness**
 * **Validates: Requirements 1.6**
 *
 * **Feature: suite-code, Property 3: Code Round-Trip**
 * **Validates: Requirements 7.5**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
    generateCode,
    generateCodes,
    generateCodeSegment,
    parseCode,
    formatCode,
    isValidCodeFormat,
    getCodePrefix,
} from "./generator";
import {
    type CodeType,
    type MembershipTier,
    CODE_FORMAT_PATTERN,
    CODE_PREFIXES,
    CODE_CHARSET,
} from "../supabase/suite-code-types";

// ============================================
// Arbitraries (Generators)
// ============================================

/**
 * Generate a valid code type
 */
const codeTypeArb: fc.Arbitrary<CodeType> = fc.constantFrom("membership", "credits");

/**
 * Generate a valid membership tier
 */
const membershipTierArb: fc.Arbitrary<MembershipTier> = fc.constantFrom("plus", "pro", "ultra");

/**
 * Generate a valid type/tier combination for membership codes
 */
const membershipCodeParamsArb = fc.record({
    type: fc.constant("membership" as CodeType),
    tier: membershipTierArb,
});

/**
 * Generate a valid type/tier combination for credits codes
 */
const creditsCodeParamsArb = fc.record({
    type: fc.constant("credits" as CodeType),
    tier: fc.constant(undefined as MembershipTier | undefined),
});

/**
 * Generate any valid code generation parameters
 */
const validCodeParamsArb = fc.oneof(membershipCodeParamsArb, creditsCodeParamsArb);

/**
 * Generate a segment length for testing
 */
const segmentLengthArb = fc.integer({ min: 1, max: 10 });

/**
 * Generate a batch quantity for testing
 */
const batchQuantityArb = fc.integer({ min: 1, max: 50 });

// ============================================
// Property Tests
// ============================================

describe("Property 1: Code Format Validity", () => {
    /**
     * **Feature: suite-code, Property 1: Code Format Validity**
     * **Validates: Requirements 1.1, 7.1, 7.2, 7.3**
     *
     * For any generated activation code, the code SHALL match the pattern
     * ^(SPLUS|SPRO|SULTRA|SCRED)-[A-Z0-9]{4}-[A-Z0-9]{4}$ and the prefix
     * SHALL correspond to the correct code type and membership tier.
     */
    it("generated codes match the required format pattern", () => {
        fc.assert(
            fc.property(validCodeParamsArb, ({ type, tier }) => {
                const code = generateCode(type, tier);

                // Code should match the format pattern
                expect(CODE_FORMAT_PATTERN.test(code)).toBe(true);

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Verify that the prefix corresponds to the correct code type and tier
     */
    it("generated codes have correct prefix for type and tier", () => {
        fc.assert(
            fc.property(validCodeParamsArb, ({ type, tier }) => {
                const code = generateCode(type, tier);
                const prefix = code.split("-")[0];

                // Get expected prefix
                const prefixKey = type === "membership" ? `membership_${tier}` : "credits";
                const expectedPrefix = CODE_PREFIXES[prefixKey];

                expect(prefix).toBe(expectedPrefix);

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Verify membership codes have correct prefixes
     * Requirements: 7.1
     */
    it("membership codes have correct tier-specific prefixes", () => {
        fc.assert(
            fc.property(membershipTierArb, (tier) => {
                const code = generateCode("membership", tier);
                const prefix = code.split("-")[0];

                const expectedPrefixes: Record<MembershipTier, string> = {
                    plus: "SPLUS",
                    pro: "SPRO",
                    ultra: "SULTRA",
                };

                expect(prefix).toBe(expectedPrefixes[tier]);

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Verify credits codes have SCRED prefix
     * Requirements: 7.1
     */
    it("credits codes have SCRED prefix", () => {
        fc.assert(
            fc.property(fc.constant(null), () => {
                const code = generateCode("credits");
                const prefix = code.split("-")[0];

                expect(prefix).toBe("SCRED");

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Verify code segments only contain valid characters
     * Requirements: 7.2
     */
    it("code segments only contain uppercase letters and numbers", () => {
        fc.assert(
            fc.property(validCodeParamsArb, ({ type, tier }) => {
                const code = generateCode(type, tier);
                const parts = code.split("-");

                // Should have 3 parts: prefix, segment1, segment2
                expect(parts.length).toBe(3);

                const segment1 = parts[1];
                const segment2 = parts[2];

                // Each segment should be 4 characters
                expect(segment1.length).toBe(4);
                expect(segment2.length).toBe(4);

                // Each character should be in the allowed charset
                const validCharPattern = /^[A-Z0-9]+$/;
                expect(validCharPattern.test(segment1)).toBe(true);
                expect(validCharPattern.test(segment2)).toBe(true);

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Verify generateCodeSegment produces valid segments
     * Requirements: 7.2
     */
    it("generateCodeSegment produces segments with valid characters", () => {
        fc.assert(
            fc.property(segmentLengthArb, (length) => {
                const segment = generateCodeSegment(length);

                // Segment should have correct length
                expect(segment.length).toBe(length);

                // All characters should be in the charset
                for (const char of segment) {
                    expect(CODE_CHARSET.includes(char)).toBe(true);
                }

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Verify code format follows {PREFIX}-{4CHARS}-{4CHARS} structure
     * Requirements: 7.3
     */
    it("codes follow {PREFIX}-{4CHARS}-{4CHARS} structure", () => {
        fc.assert(
            fc.property(validCodeParamsArb, ({ type, tier }) => {
                const code = generateCode(type, tier);

                // Should match the exact structure
                const structurePattern = /^[A-Z]+-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
                expect(structurePattern.test(code)).toBe(true);

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Verify isValidCodeFormat correctly validates generated codes
     */
    it("isValidCodeFormat returns true for all generated codes", () => {
        fc.assert(
            fc.property(validCodeParamsArb, ({ type, tier }) => {
                const code = generateCode(type, tier);

                expect(isValidCodeFormat(code)).toBe(true);

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Verify parseCode successfully parses all generated codes
     */
    it("parseCode successfully parses all generated codes", () => {
        fc.assert(
            fc.property(validCodeParamsArb, ({ type, tier }) => {
                const code = generateCode(type, tier);
                const parsed = parseCode(code);

                expect(parsed).not.toBeNull();
                expect(parsed?.type).toBe(type);

                if (type === "membership") {
                    expect(parsed?.tier).toBe(tier);
                } else {
                    expect(parsed?.tier).toBeUndefined();
                }

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Verify batch generation produces valid codes
     * Requirements: 1.1
     */
    it("batch generated codes all match the required format", () => {
        fc.assert(
            fc.property(validCodeParamsArb, batchQuantityArb, ({ type, tier }, quantity) => {
                const codes = generateCodes({ type, tier }, quantity);

                // Should generate requested quantity
                expect(codes.length).toBe(quantity);

                // All codes should match the format
                for (const code of codes) {
                    expect(CODE_FORMAT_PATTERN.test(code)).toBe(true);
                }

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Verify getCodePrefix returns correct prefix for all type/tier combinations
     */
    it("getCodePrefix returns correct prefix for all combinations", () => {
        fc.assert(
            fc.property(validCodeParamsArb, ({ type, tier }) => {
                const prefix = getCodePrefix(type, tier);

                const prefixKey = type === "membership" ? `membership_${tier}` : "credits";
                const expectedPrefix = CODE_PREFIXES[prefixKey];

                expect(prefix).toBe(expectedPrefix);

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Verify membership codes without tier throw error
     */
    it("membership codes without tier throw error", () => {
        expect(() => generateCode("membership")).toThrow(
            "Membership tier is required for membership codes"
        );
    });
});

// ============================================
// Property 2: Code Uniqueness
// ============================================

describe("Property 2: Code Uniqueness", () => {
    /**
     * **Feature: suite-code, Property 2: Code Uniqueness**
     * **Validates: Requirements 1.6**
     *
     * For any batch of generated codes, all codes within the batch
     * SHALL be unique.
     */
    it("all codes within a batch are unique", () => {
        fc.assert(
            fc.property(validCodeParamsArb, batchQuantityArb, ({ type, tier }, quantity) => {
                const codes = generateCodes({ type, tier }, quantity);

                // Create a Set to check uniqueness
                const uniqueCodes = new Set(codes);

                // The Set size should equal the array length (all unique)
                expect(uniqueCodes.size).toBe(codes.length);
                expect(codes.length).toBe(quantity);

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Verify multiple batch generations produce unique codes across batches
     */
    it("codes are unique across multiple batch generations", () => {
        fc.assert(
            fc.property(
                validCodeParamsArb,
                fc.integer({ min: 5, max: 20 }),
                fc.integer({ min: 2, max: 5 }),
                ({ type, tier }, batchSize, numBatches) => {
                    const allCodes: string[] = [];

                    // Generate multiple batches
                    for (let i = 0; i < numBatches; i++) {
                        const batch = generateCodes({ type, tier }, batchSize);
                        allCodes.push(...batch);
                    }

                    // Check uniqueness across all batches
                    const uniqueCodes = new Set(allCodes);

                    // All codes should be unique
                    expect(uniqueCodes.size).toBe(allCodes.length);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Verify individual code generation produces unique codes
     */
    it("individual code generations produce unique codes", () => {
        fc.assert(
            fc.property(
                validCodeParamsArb,
                fc.integer({ min: 10, max: 50 }),
                ({ type, tier }, count) => {
                    const codes: string[] = [];

                    // Generate codes individually
                    for (let i = 0; i < count; i++) {
                        codes.push(generateCode(type, tier));
                    }

                    // Check uniqueness
                    const uniqueCodes = new Set(codes);

                    // All codes should be unique
                    expect(uniqueCodes.size).toBe(codes.length);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Verify codes of different types are unique from each other
     */
    it("codes of different types are unique from each other", () => {
        fc.assert(
            fc.property(fc.integer({ min: 5, max: 15 }), (batchSize) => {
                const allCodes: string[] = [];

                // Generate codes for all types
                allCodes.push(...generateCodes({ type: "membership", tier: "plus" }, batchSize));
                allCodes.push(...generateCodes({ type: "membership", tier: "pro" }, batchSize));
                allCodes.push(...generateCodes({ type: "membership", tier: "ultra" }, batchSize));
                allCodes.push(...generateCodes({ type: "credits", tier: undefined }, batchSize));

                // Check uniqueness across all types
                const uniqueCodes = new Set(allCodes);

                // All codes should be unique
                expect(uniqueCodes.size).toBe(allCodes.length);

                return true;
            }),
            { numRuns: 100 }
        );
    });
});


// ============================================
// Property 3: Code Round-Trip
// ============================================

describe("Property 3: Code Round-Trip", () => {
    /**
     * **Feature: suite-code, Property 3: Code Round-Trip**
     * **Validates: Requirements 7.5**
     *
     * For any valid activation code, parsing the code and then formatting
     * it back SHALL produce an equivalent code string.
     */
    it("parsing then formatting produces equivalent code string", () => {
        fc.assert(
            fc.property(validCodeParamsArb, ({ type, tier }) => {
                // Generate a valid code
                const originalCode = generateCode(type, tier);

                // Parse the code
                const parsed = parseCode(originalCode);

                // Parsing should succeed
                expect(parsed).not.toBeNull();

                if (parsed) {
                    // Format the parsed components back into a code
                    const reformattedCode = formatCode(parsed.type, parsed.tier, parsed.segments);

                    // The reformatted code should equal the original
                    expect(reformattedCode).toBe(originalCode);
                }

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Verify round-trip for membership codes specifically
     */
    it("membership codes round-trip correctly", () => {
        fc.assert(
            fc.property(membershipTierArb, (tier) => {
                const originalCode = generateCode("membership", tier);
                const parsed = parseCode(originalCode);

                expect(parsed).not.toBeNull();
                expect(parsed?.type).toBe("membership");
                expect(parsed?.tier).toBe(tier);

                if (parsed) {
                    const reformattedCode = formatCode(parsed.type, parsed.tier, parsed.segments);
                    expect(reformattedCode).toBe(originalCode);
                }

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Verify round-trip for credits codes specifically
     */
    it("credits codes round-trip correctly", () => {
        fc.assert(
            fc.property(fc.constant(null), () => {
                const originalCode = generateCode("credits");
                const parsed = parseCode(originalCode);

                expect(parsed).not.toBeNull();
                expect(parsed?.type).toBe("credits");
                expect(parsed?.tier).toBeUndefined();

                if (parsed) {
                    const reformattedCode = formatCode(parsed.type, parsed.tier, parsed.segments);
                    expect(reformattedCode).toBe(originalCode);
                }

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Verify parsed segments are preserved correctly
     */
    it("parsed segments match original code segments", () => {
        fc.assert(
            fc.property(validCodeParamsArb, ({ type, tier }) => {
                const originalCode = generateCode(type, tier);
                const parts = originalCode.split("-");
                const originalSegment1 = parts[1];
                const originalSegment2 = parts[2];

                const parsed = parseCode(originalCode);

                expect(parsed).not.toBeNull();
                expect(parsed?.segments[0]).toBe(originalSegment1);
                expect(parsed?.segments[1]).toBe(originalSegment2);

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Verify batch generated codes all round-trip correctly
     */
    it("batch generated codes all round-trip correctly", () => {
        fc.assert(
            fc.property(validCodeParamsArb, batchQuantityArb, ({ type, tier }, quantity) => {
                const codes = generateCodes({ type, tier }, quantity);

                for (const originalCode of codes) {
                    const parsed = parseCode(originalCode);

                    expect(parsed).not.toBeNull();

                    if (parsed) {
                        const reformattedCode = formatCode(parsed.type, parsed.tier, parsed.segments);
                        expect(reformattedCode).toBe(originalCode);
                    }
                }

                return true;
            }),
            { numRuns: 100 }
        );
    });
});
