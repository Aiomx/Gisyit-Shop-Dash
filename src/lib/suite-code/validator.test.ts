/**
 * Property-Based Tests for Suite Code Validator
 *
 * Tests for Requirements 1.3, 4.1, 5.1, 5.2, 5.5:
 * - Property 4: Credits Amount Validation
 * - Property 7: Activation Validation
 *
 * **Feature: suite-code, Property 4: Credits Amount Validation**
 * **Validates: Requirements 1.3**
 *
 * **Feature: suite-code, Property 7: Activation Validation**
 * **Validates: Requirements 4.1, 5.1, 5.2, 5.5**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
    validateCreditsAmount,
    validateForActivation,
    validateCodeFormat,
    validateCodeStatus,
    validateExpiration,
} from "./validator";
import { generateCode } from "./generator";
import type { SuiteCode, CodeStatus, CodeType, MembershipTier } from "../supabase/suite-code-types";

// ============================================
// Property 4: Credits Amount Validation
// ============================================

describe("Property 4: Credits Amount Validation", () => {
    /**
     * **Feature: suite-code, Property 4: Credits Amount Validation**
     * **Validates: Requirements 1.3**
     *
     * For any credits code generation request, the credits_amount SHALL be >= 100,
     * and requests with amounts < 100 SHALL be rejected.
     */

    /**
     * Valid amounts (>= 100) should be accepted
     */
    it("accepts all amounts >= 100", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 100, max: 1_000_000 }),
                (amount) => {
                    const result = validateCreditsAmount(amount);

                    expect(result.valid).toBe(true);
                    expect(result.errorCode).toBeUndefined();
                    expect(result.errorMessage).toBeUndefined();

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Invalid amounts (< 100) should be rejected
     */
    it("rejects all amounts < 100", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -1_000_000, max: 99 }),
                (amount) => {
                    const result = validateCreditsAmount(amount);

                    expect(result.valid).toBe(false);
                    expect(result.errorCode).toBe("INVALID_AMOUNT");
                    expect(result.errorMessage).toBeDefined();

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Boundary test: exactly 100 should be accepted
     */
    it("accepts exactly 100 (minimum valid amount)", () => {
        const result = validateCreditsAmount(100);

        expect(result.valid).toBe(true);
        expect(result.errorCode).toBeUndefined();
    });

    /**
     * Boundary test: 99 should be rejected
     */
    it("rejects 99 (just below minimum)", () => {
        const result = validateCreditsAmount(99);

        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe("INVALID_AMOUNT");
    });

    /**
     * Large amounts should be accepted (no upper limit per requirements)
     */
    it("accepts very large amounts (no upper limit)", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 100, max: Number.MAX_SAFE_INTEGER }),
                (amount) => {
                    const result = validateCreditsAmount(amount);

                    expect(result.valid).toBe(true);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Non-number values should be rejected
     */
    it("rejects NaN values", () => {
        const result = validateCreditsAmount(NaN);

        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe("INVALID_AMOUNT");
    });

    /**
     * Zero should be rejected
     */
    it("rejects zero", () => {
        const result = validateCreditsAmount(0);

        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe("INVALID_AMOUNT");
    });

    /**
     * Negative amounts should be rejected
     */
    it("rejects negative amounts", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -1_000_000, max: -1 }),
                (amount) => {
                    const result = validateCreditsAmount(amount);

                    expect(result.valid).toBe(false);
                    expect(result.errorCode).toBe("INVALID_AMOUNT");

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});


// ============================================
// Arbitraries for Property 7
// ============================================

/**
 * Arbitrary for generating valid code types and tiers
 */
const codeTypeArb = fc.constantFrom<CodeType>("membership", "credits");
const membershipTierArb = fc.constantFrom<MembershipTier>("plus", "pro", "ultra");
const codeStatusArb = fc.constantFrom<CodeStatus>("unused", "used", "expired", "disabled");

/**
 * Helper to generate a safe ISO date string from days offset
 */
const generateDateString = (daysFromNow: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString();
};

/**
 * Arbitrary for generating a valid SuiteCode entity
 */
const suiteCodeArb = (overrides: Partial<SuiteCode> = {}): fc.Arbitrary<SuiteCode> =>
    fc.record({
        id: fc.uuid(),
        code: fc.tuple(codeTypeArb, membershipTierArb).map(([type, tier]) =>
            generateCode(type, type === "membership" ? tier : undefined)
        ),
        code_type: codeTypeArb,
        membership_tier: fc.option(membershipTierArb, { nil: null }),
        credits_amount: fc.option(fc.integer({ min: 100, max: 100000 }), { nil: null }),
        membership_days: fc.option(fc.integer({ min: 1, max: 365 }), { nil: null }),
        status: codeStatusArb,
        // Use integer-based date generation to avoid invalid date issues
        expires_at: fc.integer({ min: -365, max: 365 }).map(days => generateDateString(days)),
        created_at: fc.integer({ min: -365, max: 0 }).map(days => generateDateString(days)),
        activated_at: fc.constant(null),
        activated_by: fc.constant(null),
        activation_ip: fc.constant(null),
        activation_device: fc.constant(null),
        batch_id: fc.option(fc.uuid(), { nil: null }),
        notes: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
    }).map(code => ({ ...code, ...overrides }));

/**
 * Arbitrary for generating a valid unused code that has not expired
 */
const validUnusedCodeArb = (): fc.Arbitrary<SuiteCode> =>
    fc.record({
        id: fc.uuid(),
        code: fc.tuple(codeTypeArb, membershipTierArb).map(([type, tier]) =>
            generateCode(type, type === "membership" ? tier : undefined)
        ),
        code_type: codeTypeArb,
        membership_tier: fc.option(membershipTierArb, { nil: null }),
        credits_amount: fc.option(fc.integer({ min: 100, max: 100000 }), { nil: null }),
        membership_days: fc.option(fc.integer({ min: 1, max: 365 }), { nil: null }),
        status: fc.constant<CodeStatus>("unused"),
        // Future expiration date (1 day to 1 year from now)
        expires_at: fc.integer({ min: 1, max: 365 }).map(days => generateDateString(days)),
        created_at: fc.integer({ min: -365, max: 0 }).map(days => generateDateString(days)),
        activated_at: fc.constant(null),
        activated_by: fc.constant(null),
        activation_ip: fc.constant(null),
        activation_device: fc.constant(null),
        batch_id: fc.option(fc.uuid(), { nil: null }),
        notes: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
    });

/**
 * Arbitrary for generating an expired code
 */
const expiredCodeArb = (): fc.Arbitrary<SuiteCode> =>
    fc.record({
        id: fc.uuid(),
        code: fc.tuple(codeTypeArb, membershipTierArb).map(([type, tier]) =>
            generateCode(type, type === "membership" ? tier : undefined)
        ),
        code_type: codeTypeArb,
        membership_tier: fc.option(membershipTierArb, { nil: null }),
        credits_amount: fc.option(fc.integer({ min: 100, max: 100000 }), { nil: null }),
        membership_days: fc.option(fc.integer({ min: 1, max: 365 }), { nil: null }),
        status: fc.constant<CodeStatus>("unused"),
        // Past expiration date (1 day to 1 year ago)
        expires_at: fc.integer({ min: 1, max: 365 }).map(days => generateDateString(-days)),
        created_at: fc.integer({ min: -730, max: -365 }).map(days => generateDateString(days)),
        activated_at: fc.constant(null),
        activated_by: fc.constant(null),
        activation_ip: fc.constant(null),
        activation_device: fc.constant(null),
        batch_id: fc.option(fc.uuid(), { nil: null }),
        notes: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
    });

// ============================================
// Property 7: Activation Validation
// ============================================

describe("Property 7: Activation Validation", () => {
    /**
     * **Feature: suite-code, Property 7: Activation Validation**
     * **Validates: Requirements 4.1, 5.1, 5.2, 5.5**
     *
     * For any activation attempt, the system SHALL only succeed if:
     * 1. The code exists
     * 2. The code has status 'unused'
     * 3. The code has not expired
     * All other cases SHALL return an appropriate error.
     */

    /**
     * Valid activation: code exists, status is 'unused', not expired
     * Should succeed
     */
    it("accepts activation for valid unused non-expired codes", () => {
        fc.assert(
            fc.property(validUnusedCodeArb(), (codeEntity) => {
                const result = validateForActivation(codeEntity.code, codeEntity);

                expect(result.valid).toBe(true);
                expect(result.errorCode).toBeUndefined();
                expect(result.code).toBeDefined();

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Code does not exist (null entity)
     * Should fail with CODE_NOT_FOUND
     */
    it("rejects activation when code does not exist", () => {
        fc.assert(
            fc.property(
                fc.tuple(codeTypeArb, membershipTierArb).map(([type, tier]) =>
                    generateCode(type, type === "membership" ? tier : undefined)
                ),
                (codeString) => {
                    const result = validateForActivation(codeString, null);

                    expect(result.valid).toBe(false);
                    expect(result.errorCode).toBe("CODE_NOT_FOUND");
                    expect(result.errorMessage).toBeDefined();

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Code exists but status is 'used'
     * Should fail with CODE_ALREADY_USED
     */
    it("rejects activation for already used codes", () => {
        fc.assert(
            fc.property(
                suiteCodeArb({ status: "used" }),
                (codeEntity) => {
                    const result = validateForActivation(codeEntity.code, codeEntity);

                    expect(result.valid).toBe(false);
                    expect(result.errorCode).toBe("CODE_ALREADY_USED");
                    expect(result.errorMessage).toBeDefined();

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Code exists but status is 'disabled'
     * Should fail with CODE_DISABLED
     */
    it("rejects activation for disabled codes", () => {
        fc.assert(
            fc.property(
                suiteCodeArb({ status: "disabled" }),
                (codeEntity) => {
                    const result = validateForActivation(codeEntity.code, codeEntity);

                    expect(result.valid).toBe(false);
                    expect(result.errorCode).toBe("CODE_DISABLED");
                    expect(result.errorMessage).toBeDefined();

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Code exists but status is 'expired'
     * Should fail with CODE_EXPIRED
     */
    it("rejects activation for codes with expired status", () => {
        fc.assert(
            fc.property(
                suiteCodeArb({ status: "expired" }),
                (codeEntity) => {
                    const result = validateForActivation(codeEntity.code, codeEntity);

                    expect(result.valid).toBe(false);
                    expect(result.errorCode).toBe("CODE_EXPIRED");
                    expect(result.errorMessage).toBeDefined();

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Code exists, status is 'unused', but expiration date has passed
     * Should fail with CODE_EXPIRED
     */
    it("rejects activation for unused codes that have expired by date", () => {
        fc.assert(
            fc.property(expiredCodeArb(), (codeEntity) => {
                const result = validateForActivation(codeEntity.code, codeEntity);

                expect(result.valid).toBe(false);
                expect(result.errorCode).toBe("CODE_EXPIRED");
                expect(result.errorMessage).toBeDefined();

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Invalid code format should be rejected
     * Should fail with INVALID_FORMAT
     */
    it("rejects activation for invalid code format", () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 20 }).filter(s =>
                    !/^(SPLUS|SPRO|SULTRA|SCRED)-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(s)
                ),
                (invalidCode) => {
                    const result = validateForActivation(invalidCode, null);

                    expect(result.valid).toBe(false);
                    expect(result.errorCode).toBe("INVALID_FORMAT");
                    expect(result.errorMessage).toBeDefined();

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Comprehensive property: activation succeeds IFF all conditions are met
     * This tests the complete validation logic
     */
    it("activation succeeds if and only if code exists, is unused, and not expired", () => {
        fc.assert(
            fc.property(
                suiteCodeArb(),
                // Generate a date within a reasonable range using integer offset
                fc.integer({ min: -365, max: 365 }).map(days => {
                    const date = new Date();
                    date.setDate(date.getDate() + days);
                    return date;
                }),
                (codeEntity, currentTime) => {
                    const result = validateForActivation(codeEntity.code, codeEntity, currentTime);

                    const isUnused = codeEntity.status === "unused";
                    // Match the validator logic: code is expired if currentTime > expirationDate
                    // So code is NOT expired if currentTime <= expirationDate
                    const isNotExpired = currentTime <= new Date(codeEntity.expires_at);
                    const shouldSucceed = isUnused && isNotExpired;

                    if (shouldSucceed) {
                        expect(result.valid).toBe(true);
                    } else {
                        expect(result.valid).toBe(false);
                        expect(result.errorCode).toBeDefined();
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Error codes are appropriate for each failure case
     */
    it("returns appropriate error codes for each failure case", () => {
        // Test each status that should fail
        const statusErrorMap: Record<CodeStatus, string | undefined> = {
            unused: undefined, // Should succeed (if not expired)
            used: "CODE_ALREADY_USED",
            expired: "CODE_EXPIRED",
            disabled: "CODE_DISABLED",
        };

        for (const [status, expectedError] of Object.entries(statusErrorMap)) {
            if (expectedError) {
                const codeEntity: SuiteCode = {
                    id: "test-id",
                    code: "SPLUS-AAAA-BBBB",
                    code_type: "membership",
                    membership_tier: "plus",
                    credits_amount: null,
                    membership_days: 30,
                    status: status as CodeStatus,
                    expires_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                    created_at: new Date().toISOString(),
                    activated_at: null,
                    activated_by: null,
                    activation_ip: null,
                    activation_device: null,
                    batch_id: null,
                    notes: null,
                };

                const result = validateForActivation(codeEntity.code, codeEntity);
                expect(result.errorCode).toBe(expectedError);
            }
        }
    });
});
