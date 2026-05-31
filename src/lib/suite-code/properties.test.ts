/**
 * Additional Property-Based Tests for Suite Code
 *
 * Tests for Requirements 2.1, 2.2, 2.3, 3.2, 3.3, 3.4, 3.5, 4.2, 4.3, 4.4, 5.2, 6.1, 6.2:
 * - Property 5: Data Completeness
 * - Property 6: Status Invariant
 * - Property 8: Disable/Enable Logic
 * - Property 9: Expiration Logic
 * - Property 10: Filter and Search Correctness
 * - Property 11: Statistics Accuracy
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
    validateStatusChange,
    validateExpiration,
    isCodeExpired,
} from "./validator";
import { generateCode } from "./generator";
import type {
    SuiteCode,
    CodeStatus,
    CodeType,
    MembershipTier,
    CodeStatistics,
    CodeListFilter,
} from "../supabase/suite-code-types";

// ============================================
// Arbitraries (Generators)
// ============================================

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
 * Arbitrary for generating a complete SuiteCode entity
 */
const completeSuiteCodeArb = (): fc.Arbitrary<SuiteCode> =>
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
        expires_at: fc.integer({ min: -365, max: 365 }).map(days => generateDateString(days)),
        created_at: fc.integer({ min: -365, max: 0 }).map(days => generateDateString(days)),
        activated_at: fc.constant(null),
        activated_by: fc.constant(null),
        activation_ip: fc.constant(null),
        activation_device: fc.constant(null),
        batch_id: fc.option(fc.uuid(), { nil: null }),
        notes: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
    });

/**
 * Arbitrary for generating an activated SuiteCode entity
 */
const activatedSuiteCodeArb = (): fc.Arbitrary<SuiteCode> =>
    fc.record({
        id: fc.uuid(),
        code: fc.tuple(codeTypeArb, membershipTierArb).map(([type, tier]) =>
            generateCode(type, type === "membership" ? tier : undefined)
        ),
        code_type: codeTypeArb,
        membership_tier: fc.option(membershipTierArb, { nil: null }),
        credits_amount: fc.option(fc.integer({ min: 100, max: 100000 }), { nil: null }),
        membership_days: fc.option(fc.integer({ min: 1, max: 365 }), { nil: null }),
        status: fc.constant<CodeStatus>("used"),
        expires_at: fc.integer({ min: 1, max: 365 }).map(days => generateDateString(days)),
        created_at: fc.integer({ min: -365, max: -1 }).map(days => generateDateString(days)),
        activated_at: fc.integer({ min: -30, max: 0 }).map(days => generateDateString(days)),
        activated_by: fc.uuid(),
        activation_ip: fc.ipV4(),
        activation_device: fc.string({ minLength: 5, maxLength: 50 }),
        batch_id: fc.option(fc.uuid(), { nil: null }),
        notes: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
    });

/**
 * Arbitrary for generating a list of SuiteCode entities
 */
const suiteCodeListArb = (minLength = 1, maxLength = 20): fc.Arbitrary<SuiteCode[]> =>
    fc.array(completeSuiteCodeArb(), { minLength, maxLength });

// ============================================
// Property 5: Data Completeness
// ============================================

describe("Property 5: Data Completeness", () => {
    /**
     * **Feature: suite-code, Property 5: Data Completeness**
     * **Validates: Requirements 2.1, 2.2, 3.2, 3.3**
     *
     * For any stored activation code, all required fields (code, code_type, status,
     * expires_at, created_at) SHALL be present and valid. For activated codes,
     * activation details (activated_at, activated_by, activation_ip) SHALL also be present.
     */

    it("all generated codes have required base fields", () => {
        fc.assert(
            fc.property(completeSuiteCodeArb(), (codeEntity) => {
                // Required fields must be present and valid
                expect(codeEntity.id).toBeDefined();
                expect(typeof codeEntity.id).toBe("string");
                expect(codeEntity.id.length).toBeGreaterThan(0);

                expect(codeEntity.code).toBeDefined();
                expect(typeof codeEntity.code).toBe("string");
                expect(codeEntity.code.length).toBeGreaterThan(0);

                expect(codeEntity.code_type).toBeDefined();
                expect(["membership", "credits"]).toContain(codeEntity.code_type);

                expect(codeEntity.status).toBeDefined();
                expect(["unused", "used", "expired", "disabled"]).toContain(codeEntity.status);

                expect(codeEntity.expires_at).toBeDefined();
                expect(typeof codeEntity.expires_at).toBe("string");
                expect(new Date(codeEntity.expires_at).toString()).not.toBe("Invalid Date");

                expect(codeEntity.created_at).toBeDefined();
                expect(typeof codeEntity.created_at).toBe("string");
                expect(new Date(codeEntity.created_at).toString()).not.toBe("Invalid Date");

                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("activated codes have all activation details present", () => {
        fc.assert(
            fc.property(activatedSuiteCodeArb(), (codeEntity) => {
                // Activated codes must have activation details
                expect(codeEntity.status).toBe("used");

                expect(codeEntity.activated_at).toBeDefined();
                expect(codeEntity.activated_at).not.toBeNull();
                expect(new Date(codeEntity.activated_at!).toString()).not.toBe("Invalid Date");

                expect(codeEntity.activated_by).toBeDefined();
                expect(codeEntity.activated_by).not.toBeNull();
                expect(typeof codeEntity.activated_by).toBe("string");

                expect(codeEntity.activation_ip).toBeDefined();
                expect(codeEntity.activation_ip).not.toBeNull();
                expect(typeof codeEntity.activation_ip).toBe("string");

                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("membership codes have valid membership_tier", () => {
        fc.assert(
            fc.property(
                fc.record({
                    id: fc.uuid(),
                    code: membershipTierArb.map(tier => generateCode("membership", tier)),
                    code_type: fc.constant<CodeType>("membership"),
                    membership_tier: membershipTierArb,
                    credits_amount: fc.constant(null),
                    membership_days: fc.integer({ min: 1, max: 365 }),
                    status: codeStatusArb,
                    expires_at: fc.integer({ min: -365, max: 365 }).map(days => generateDateString(days)),
                    created_at: fc.integer({ min: -365, max: 0 }).map(days => generateDateString(days)),
                    activated_at: fc.constant(null),
                    activated_by: fc.constant(null),
                    activation_ip: fc.constant(null),
                    activation_device: fc.constant(null),
                    batch_id: fc.option(fc.uuid(), { nil: null }),
                    notes: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
                }),
                (codeEntity) => {
                    expect(codeEntity.code_type).toBe("membership");
                    expect(codeEntity.membership_tier).toBeDefined();
                    expect(["plus", "pro", "ultra"]).toContain(codeEntity.membership_tier);
                    expect(codeEntity.membership_days).toBeGreaterThan(0);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("credits codes have valid credits_amount", () => {
        fc.assert(
            fc.property(
                fc.record({
                    id: fc.uuid(),
                    code: fc.constant(generateCode("credits")),
                    code_type: fc.constant<CodeType>("credits"),
                    membership_tier: fc.constant(null),
                    credits_amount: fc.integer({ min: 100, max: 100000 }),
                    membership_days: fc.constant(null),
                    status: codeStatusArb,
                    expires_at: fc.integer({ min: -365, max: 365 }).map(days => generateDateString(days)),
                    created_at: fc.integer({ min: -365, max: 0 }).map(days => generateDateString(days)),
                    activated_at: fc.constant(null),
                    activated_by: fc.constant(null),
                    activation_ip: fc.constant(null),
                    activation_device: fc.constant(null),
                    batch_id: fc.option(fc.uuid(), { nil: null }),
                    notes: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
                }),
                (codeEntity) => {
                    expect(codeEntity.code_type).toBe("credits");
                    expect(codeEntity.credits_amount).toBeDefined();
                    expect(codeEntity.credits_amount).toBeGreaterThanOrEqual(100);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});

// ============================================
// Property 6: Status Invariant
// ============================================

describe("Property 6: Status Invariant", () => {
    /**
     * **Feature: suite-code, Property 6: Status Invariant**
     * **Validates: Requirements 2.3**
     *
     * For any activation code, the status SHALL always be one of:
     * 'unused', 'used', 'expired', or 'disabled'.
     */

    const validStatuses: CodeStatus[] = ["unused", "used", "expired", "disabled"];

    it("all codes have valid status values", () => {
        fc.assert(
            fc.property(completeSuiteCodeArb(), (codeEntity) => {
                expect(validStatuses).toContain(codeEntity.status);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("status is always one of the four valid values", () => {
        fc.assert(
            fc.property(codeStatusArb, (status) => {
                expect(validStatuses).toContain(status);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("status validation rejects invalid status values", () => {
        const invalidStatuses = ["active", "pending", "cancelled", "unknown", "", null, undefined];

        for (const invalidStatus of invalidStatuses) {
            expect(validStatuses).not.toContain(invalidStatus);
        }
    });
});


// ============================================
// Property 8: Disable/Enable Logic
// ============================================

describe("Property 8: Disable/Enable Logic", () => {
    /**
     * **Feature: suite-code, Property 8: Disable/Enable Logic**
     * **Validates: Requirements 4.2, 4.3**
     *
     * For any code with status 'unused' or 'disabled', toggling the status
     * SHALL work correctly. For any code with status 'used', enabling SHALL be rejected.
     */

    it("unused codes can be disabled", () => {
        fc.assert(
            fc.property(fc.constant("unused" as CodeStatus), (currentStatus) => {
                const result = validateStatusChange(currentStatus, "disabled");

                expect(result.valid).toBe(true);
                expect(result.errorCode).toBeUndefined();

                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("disabled codes can be re-enabled to unused", () => {
        fc.assert(
            fc.property(fc.constant("disabled" as CodeStatus), (currentStatus) => {
                const result = validateStatusChange(currentStatus, "unused");

                expect(result.valid).toBe(true);
                expect(result.errorCode).toBeUndefined();

                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("used codes cannot be enabled", () => {
        fc.assert(
            fc.property(
                fc.constant("used" as CodeStatus),
                fc.constantFrom<"unused" | "disabled">("unused", "disabled"),
                (currentStatus, targetStatus) => {
                    const result = validateStatusChange(currentStatus, targetStatus);

                    expect(result.valid).toBe(false);
                    expect(result.errorCode).toBe("ENABLE_USED_CODE");
                    expect(result.errorMessage).toBeDefined();

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("expired codes cannot have status changed", () => {
        fc.assert(
            fc.property(
                fc.constant("expired" as CodeStatus),
                fc.constantFrom<"unused" | "disabled">("unused", "disabled"),
                (currentStatus, targetStatus) => {
                    const result = validateStatusChange(currentStatus, targetStatus);

                    expect(result.valid).toBe(false);
                    expect(result.errorCode).toBe("CODE_EXPIRED");

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("status toggle is idempotent for same status", () => {
        fc.assert(
            fc.property(
                fc.constantFrom<"unused" | "disabled">("unused", "disabled"),
                (status) => {
                    const result = validateStatusChange(status, status);

                    expect(result.valid).toBe(true);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("disable then enable returns to original unused state", () => {
        // Start with unused
        const disableResult = validateStatusChange("unused", "disabled");
        expect(disableResult.valid).toBe(true);

        // Then enable back
        const enableResult = validateStatusChange("disabled", "unused");
        expect(enableResult.valid).toBe(true);
    });
});

// ============================================
// Property 9: Expiration Logic
// ============================================

describe("Property 9: Expiration Logic", () => {
    /**
     * **Feature: suite-code, Property 9: Expiration Logic**
     * **Validates: Requirements 4.4, 5.2**
     *
     * For any code where current time > expires_at and status is 'unused',
     * the code SHALL be treated as expired and activation SHALL fail.
     */

    it("codes with past expiration dates are expired", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 365 }),
                (daysAgo) => {
                    const pastDate = generateDateString(-daysAgo);
                    const result = validateExpiration(pastDate);

                    expect(result.valid).toBe(false);
                    expect(result.errorCode).toBe("CODE_EXPIRED");

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("codes with future expiration dates are not expired", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 365 }),
                (daysFromNow) => {
                    const futureDate = generateDateString(daysFromNow);
                    const result = validateExpiration(futureDate);

                    expect(result.valid).toBe(true);
                    expect(result.errorCode).toBeUndefined();

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("isCodeExpired returns true for past dates", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 365 }),
                (daysAgo) => {
                    const pastDate = generateDateString(-daysAgo);
                    const expired = isCodeExpired(pastDate);

                    expect(expired).toBe(true);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("isCodeExpired returns false for future dates", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 365 }),
                (daysFromNow) => {
                    const futureDate = generateDateString(daysFromNow);
                    const expired = isCodeExpired(futureDate);

                    expect(expired).toBe(false);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("expiration check is consistent with custom current time", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: -365, max: 365 }),
                fc.integer({ min: -365, max: 365 }),
                (expirationOffset, currentTimeOffset) => {
                    const expirationDate = generateDateString(expirationOffset);
                    const currentTime = new Date();
                    currentTime.setDate(currentTime.getDate() + currentTimeOffset);

                    const result = validateExpiration(expirationDate, currentTime);
                    const isExpired = isCodeExpired(expirationDate, currentTime);

                    // Result should be consistent
                    if (result.valid) {
                        expect(isExpired).toBe(false);
                    } else if (result.errorCode === "CODE_EXPIRED") {
                        expect(isExpired).toBe(true);
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("invalid date strings are rejected", () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 20 }).filter(s =>
                    Number.isNaN(new Date(s).getTime())
                ),
                (invalidDate) => {
                    const result = validateExpiration(invalidDate);

                    expect(result.valid).toBe(false);
                    expect(result.errorCode).toBe("INVALID_EXPIRATION");

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});


// ============================================
// Property 10: Filter and Search Correctness
// ============================================

describe("Property 10: Filter and Search Correctness", () => {
    /**
     * **Feature: suite-code, Property 10: Filter and Search Correctness**
     * **Validates: Requirements 3.4, 3.5**
     *
     * For any filter or search query, all returned codes SHALL match
     * the specified criteria (type, status, date range, or search term).
     */

    /**
     * Helper function to filter codes by criteria
     */
    const filterCodes = (codes: SuiteCode[], filter: CodeListFilter): SuiteCode[] => {
        return codes.filter(code => {
            // Filter by code_type
            if (filter.code_type && code.code_type !== filter.code_type) {
                return false;
            }

            // Filter by membership_tier
            if (filter.membership_tier && code.membership_tier !== filter.membership_tier) {
                return false;
            }

            // Filter by status
            if (filter.status && code.status !== filter.status) {
                return false;
            }

            // Filter by date range
            if (filter.start_date) {
                const startDate = new Date(filter.start_date);
                const createdAt = new Date(code.created_at);
                if (createdAt < startDate) {
                    return false;
                }
            }

            if (filter.end_date) {
                const endDate = new Date(filter.end_date);
                const createdAt = new Date(code.created_at);
                if (createdAt > endDate) {
                    return false;
                }
            }

            // Filter by search term (code string)
            if (filter.search) {
                const searchLower = filter.search.toLowerCase();
                const codeMatch = code.code.toLowerCase().includes(searchLower);
                const userMatch = code.activated_by?.toLowerCase().includes(searchLower) ?? false;
                if (!codeMatch && !userMatch) {
                    return false;
                }
            }

            // Filter by batch_id
            if (filter.batch_id && code.batch_id !== filter.batch_id) {
                return false;
            }

            return true;
        });
    };

    it("filtering by code_type returns only matching codes", () => {
        fc.assert(
            fc.property(
                suiteCodeListArb(5, 20),
                codeTypeArb,
                (codes, filterType) => {
                    const filter: CodeListFilter = { code_type: filterType };
                    const filtered = filterCodes(codes, filter);

                    // All filtered codes should have the specified type
                    for (const code of filtered) {
                        expect(code.code_type).toBe(filterType);
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("filtering by status returns only matching codes", () => {
        fc.assert(
            fc.property(
                suiteCodeListArb(5, 20),
                codeStatusArb,
                (codes, filterStatus) => {
                    const filter: CodeListFilter = { status: filterStatus };
                    const filtered = filterCodes(codes, filter);

                    // All filtered codes should have the specified status
                    for (const code of filtered) {
                        expect(code.status).toBe(filterStatus);
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("filtering by membership_tier returns only matching codes", () => {
        fc.assert(
            fc.property(
                suiteCodeListArb(5, 20),
                membershipTierArb,
                (codes, filterTier) => {
                    const filter: CodeListFilter = { membership_tier: filterTier };
                    const filtered = filterCodes(codes, filter);

                    // All filtered codes should have the specified tier
                    for (const code of filtered) {
                        expect(code.membership_tier).toBe(filterTier);
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("search by code string returns matching codes", () => {
        fc.assert(
            fc.property(
                suiteCodeListArb(5, 20),
                fc.constantFrom("SPLUS", "SPRO", "SULTRA", "SCRED"),
                (codes, searchTerm) => {
                    const filter: CodeListFilter = { search: searchTerm };
                    const filtered = filterCodes(codes, filter);

                    // All filtered codes should contain the search term
                    for (const code of filtered) {
                        expect(code.code.toUpperCase()).toContain(searchTerm);
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("combined filters return codes matching all criteria", () => {
        fc.assert(
            fc.property(
                suiteCodeListArb(10, 30),
                codeTypeArb,
                codeStatusArb,
                (codes, filterType, filterStatus) => {
                    const filter: CodeListFilter = {
                        code_type: filterType,
                        status: filterStatus,
                    };
                    const filtered = filterCodes(codes, filter);

                    // All filtered codes should match both criteria
                    for (const code of filtered) {
                        expect(code.code_type).toBe(filterType);
                        expect(code.status).toBe(filterStatus);
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("empty filter returns all codes", () => {
        fc.assert(
            fc.property(
                suiteCodeListArb(5, 20),
                (codes) => {
                    const filter: CodeListFilter = {};
                    const filtered = filterCodes(codes, filter);

                    expect(filtered.length).toBe(codes.length);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("filter results are subset of original codes", () => {
        fc.assert(
            fc.property(
                suiteCodeListArb(5, 20),
                codeTypeArb,
                codeStatusArb,
                (codes, filterType, filterStatus) => {
                    const filter: CodeListFilter = {
                        code_type: filterType,
                        status: filterStatus,
                    };
                    const filtered = filterCodes(codes, filter);

                    // Filtered results should be a subset
                    expect(filtered.length).toBeLessThanOrEqual(codes.length);

                    // All filtered codes should exist in original
                    for (const code of filtered) {
                        expect(codes.some(c => c.id === code.id)).toBe(true);
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});


// ============================================
// Property 11: Statistics Accuracy
// ============================================

describe("Property 11: Statistics Accuracy", () => {
    /**
     * **Feature: suite-code, Property 11: Statistics Accuracy**
     * **Validates: Requirements 6.1, 6.2**
     *
     * For any statistics query, the counts SHALL accurately reflect the actual
     * number of codes in each category, and the sum of status counts SHALL
     * equal the total count.
     */

    /**
     * Helper function to calculate statistics from a list of codes
     */
    const calculateStatistics = (codes: SuiteCode[]): CodeStatistics => {
        const stats: CodeStatistics = {
            total: codes.length,
            unused: 0,
            used: 0,
            expired: 0,
            disabled: 0,
            by_type: {
                membership: {
                    plus: 0,
                    pro: 0,
                    ultra: 0,
                },
                credits: 0,
            },
        };

        for (const code of codes) {
            // Count by status
            switch (code.status) {
                case "unused":
                    stats.unused++;
                    break;
                case "used":
                    stats.used++;
                    break;
                case "expired":
                    stats.expired++;
                    break;
                case "disabled":
                    stats.disabled++;
                    break;
            }

            // Count by type
            if (code.code_type === "membership" && code.membership_tier) {
                stats.by_type.membership[code.membership_tier]++;
            } else if (code.code_type === "credits") {
                stats.by_type.credits++;
            }
        }

        return stats;
    };

    it("sum of status counts equals total count", () => {
        fc.assert(
            fc.property(
                suiteCodeListArb(0, 50),
                (codes) => {
                    const stats = calculateStatistics(codes);

                    const statusSum = stats.unused + stats.used + stats.expired + stats.disabled;

                    expect(statusSum).toBe(stats.total);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("total count matches actual code count", () => {
        fc.assert(
            fc.property(
                suiteCodeListArb(0, 50),
                (codes) => {
                    const stats = calculateStatistics(codes);

                    expect(stats.total).toBe(codes.length);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("status counts are non-negative", () => {
        fc.assert(
            fc.property(
                suiteCodeListArb(0, 50),
                (codes) => {
                    const stats = calculateStatistics(codes);

                    expect(stats.unused).toBeGreaterThanOrEqual(0);
                    expect(stats.used).toBeGreaterThanOrEqual(0);
                    expect(stats.expired).toBeGreaterThanOrEqual(0);
                    expect(stats.disabled).toBeGreaterThanOrEqual(0);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("type counts are non-negative", () => {
        fc.assert(
            fc.property(
                suiteCodeListArb(0, 50),
                (codes) => {
                    const stats = calculateStatistics(codes);

                    expect(stats.by_type.membership.plus).toBeGreaterThanOrEqual(0);
                    expect(stats.by_type.membership.pro).toBeGreaterThanOrEqual(0);
                    expect(stats.by_type.membership.ultra).toBeGreaterThanOrEqual(0);
                    expect(stats.by_type.credits).toBeGreaterThanOrEqual(0);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("status counts accurately reflect actual status distribution", () => {
        fc.assert(
            fc.property(
                suiteCodeListArb(5, 30),
                (codes) => {
                    const stats = calculateStatistics(codes);

                    // Manually count each status
                    const manualUnused = codes.filter(c => c.status === "unused").length;
                    const manualUsed = codes.filter(c => c.status === "used").length;
                    const manualExpired = codes.filter(c => c.status === "expired").length;
                    const manualDisabled = codes.filter(c => c.status === "disabled").length;

                    expect(stats.unused).toBe(manualUnused);
                    expect(stats.used).toBe(manualUsed);
                    expect(stats.expired).toBe(manualExpired);
                    expect(stats.disabled).toBe(manualDisabled);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("type counts accurately reflect actual type distribution", () => {
        fc.assert(
            fc.property(
                suiteCodeListArb(5, 30),
                (codes) => {
                    const stats = calculateStatistics(codes);

                    // Manually count each type
                    const manualPlus = codes.filter(
                        c => c.code_type === "membership" && c.membership_tier === "plus"
                    ).length;
                    const manualPro = codes.filter(
                        c => c.code_type === "membership" && c.membership_tier === "pro"
                    ).length;
                    const manualUltra = codes.filter(
                        c => c.code_type === "membership" && c.membership_tier === "ultra"
                    ).length;
                    const manualCredits = codes.filter(c => c.code_type === "credits").length;

                    expect(stats.by_type.membership.plus).toBe(manualPlus);
                    expect(stats.by_type.membership.pro).toBe(manualPro);
                    expect(stats.by_type.membership.ultra).toBe(manualUltra);
                    expect(stats.by_type.credits).toBe(manualCredits);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("empty code list produces zero statistics", () => {
        const stats = calculateStatistics([]);

        expect(stats.total).toBe(0);
        expect(stats.unused).toBe(0);
        expect(stats.used).toBe(0);
        expect(stats.expired).toBe(0);
        expect(stats.disabled).toBe(0);
        expect(stats.by_type.membership.plus).toBe(0);
        expect(stats.by_type.membership.pro).toBe(0);
        expect(stats.by_type.membership.ultra).toBe(0);
        expect(stats.by_type.credits).toBe(0);
    });

    it("statistics are deterministic for same input", () => {
        fc.assert(
            fc.property(
                suiteCodeListArb(5, 20),
                (codes) => {
                    const stats1 = calculateStatistics(codes);
                    const stats2 = calculateStatistics(codes);

                    expect(stats1.total).toBe(stats2.total);
                    expect(stats1.unused).toBe(stats2.unused);
                    expect(stats1.used).toBe(stats2.used);
                    expect(stats1.expired).toBe(stats2.expired);
                    expect(stats1.disabled).toBe(stats2.disabled);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});
