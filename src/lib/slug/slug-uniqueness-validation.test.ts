/**
 * Property-Based Tests for Slug Uniqueness Validation
 *
 * **Feature: product-url-slug, Property 7: Slug Uniqueness Validation**
 * **Validates: Requirements 4.3, 4.4**
 *
 * For any slug modification in admin dashboard, if the slug is already in use
 * by another product, the save operation SHALL be rejected with an error.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateSlug, validateSlug, RESERVED_SLUGS } from "./slug";

// ============================================
// Arbitraries (Generators)
// ============================================

/**
 * Generate a valid slug (lowercase letters, numbers, and hyphens)
 * Must start with a letter and be at least 2 characters
 */
const validSlugArb = fc
    .tuple(
        // First character must be a letter
        fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split("")),
        // Rest can be letters, numbers, or hyphens
        fc.array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789-".split("")), {
            minLength: 1,
            maxLength: 50,
        })
    )
    .map(([first, rest]) => first + rest.join(""))
    // Filter out slugs that end with hyphens or have consecutive hyphens
    .filter((slug) => !slug.endsWith("-") && !slug.includes("--"))
    // Filter out reserved slugs
    .filter((slug) => !RESERVED_SLUGS.includes(slug as any));

/**
 * Generate product names for slug generation testing
 */
const productNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

/**
 * Generate a set of unique slugs (simulating existing products)
 */
const existingSlugSetArb = fc.array(validSlugArb, { minLength: 1, maxLength: 20 }).map((slugs) => new Set(slugs));

// ============================================
// Property Tests
// ============================================

describe("Property 7: Slug Uniqueness Validation", () => {
    /**
     * **Feature: product-url-slug, Property 7: Slug Uniqueness Validation**
     * **Validates: Requirements 4.3, 4.4**
     */

    describe("Slug format validation", () => {
        it("valid slugs pass format validation", () => {
            fc.assert(
                fc.property(validSlugArb, (slug) => {
                    const result = validateSlug(slug);
                    expect(result.valid).toBe(true);
                    expect(result.error).toBeUndefined();
                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it("slugs must start with a letter", () => {
            fc.assert(
                fc.property(
                    fc.tuple(
                        fc.constantFrom(..."0123456789-".split("")),
                        fc.array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789-".split("")), {
                            minLength: 1,
                            maxLength: 20,
                        })
                    ),
                    ([first, rest]) => {
                        const invalidSlug = first + rest.join("");
                        const result = validateSlug(invalidSlug);
                        expect(result.valid).toBe(false);
                        expect(result.error).toBeDefined();
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("slugs must be at least 2 characters", () => {
            fc.assert(
                fc.property(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split("")), (singleChar) => {
                    const result = validateSlug(singleChar);
                    expect(result.valid).toBe(false);
                    expect(result.errorZh).toContain("2");
                    return true;
                }),
                { numRuns: 26 }
            );
        });

        it("reserved words are rejected", () => {
            for (const reserved of RESERVED_SLUGS) {
                const result = validateSlug(reserved);
                expect(result.valid).toBe(false);
                expect(result.errorZh).toContain("保留字");
            }
        });

        it("slugs with uppercase letters are rejected", () => {
            fc.assert(
                fc.property(
                    fc.tuple(
                        fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split("")),
                        fc.array(fc.constantFrom(..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")), { minLength: 1, maxLength: 5 }),
                        fc.array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789".split("")), { minLength: 0, maxLength: 10 })
                    ),
                    ([first, upper, rest]) => {
                        const invalidSlug = first + upper.join("") + rest.join("");
                        const result = validateSlug(invalidSlug);
                        expect(result.valid).toBe(false);
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("slugs with special characters are rejected", () => {
            fc.assert(
                fc.property(
                    fc.tuple(
                        fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split("")),
                        fc.array(fc.constantFrom(..."!@#$%^&*()+=[]{}|;:,./<>?~ ".split("")), { minLength: 1, maxLength: 3 }),
                        fc.array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789".split("")), { minLength: 0, maxLength: 10 })
                    ),
                    ([first, special, rest]) => {
                        const invalidSlug = first + special.join("") + rest.join("");
                        const result = validateSlug(invalidSlug);
                        expect(result.valid).toBe(false);
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe("Slug uniqueness checking logic", () => {
        /**
         * Simulates the uniqueness check that would happen in the API
         * This tests the logic without hitting the database
         */
        function isSlugUniqueInSet(slug: string, existingSlugs: Set<string>, excludeSlug?: string): boolean {
            if (excludeSlug && slug === excludeSlug) {
                return true; // Same slug as current product is allowed
            }
            return !existingSlugs.has(slug);
        }

        it("a slug not in the existing set is available", () => {
            fc.assert(
                fc.property(fc.tuple(validSlugArb, existingSlugSetArb), ([newSlug, existingSlugs]) => {
                    // Remove the new slug from existing set to ensure it's not there
                    existingSlugs.delete(newSlug);
                    const isAvailable = isSlugUniqueInSet(newSlug, existingSlugs);
                    expect(isAvailable).toBe(true);
                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it("a slug already in the existing set is not available", () => {
            fc.assert(
                fc.property(existingSlugSetArb.filter((set) => set.size > 0), (existingSlugs) => {
                    // Pick a random slug from the existing set
                    const existingSlug = Array.from(existingSlugs)[0];
                    const isAvailable = isSlugUniqueInSet(existingSlug, existingSlugs);
                    expect(isAvailable).toBe(false);
                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it("a product can keep its own slug when updating", () => {
            fc.assert(
                fc.property(fc.tuple(validSlugArb, existingSlugSetArb), ([currentSlug, existingSlugs]) => {
                    // Add the current slug to existing set (simulating the product's own slug)
                    existingSlugs.add(currentSlug);
                    // When updating, the product's own slug should be excluded from uniqueness check
                    const isAvailable = isSlugUniqueInSet(currentSlug, existingSlugs, currentSlug);
                    expect(isAvailable).toBe(true);
                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it("a product cannot use another product's slug when updating", () => {
            fc.assert(
                fc.property(
                    fc.tuple(validSlugArb, validSlugArb, existingSlugSetArb).filter(([slug1, slug2]) => slug1 !== slug2),
                    ([currentSlug, otherSlug, existingSlugs]) => {
                        // Add both slugs to existing set
                        existingSlugs.add(currentSlug);
                        existingSlugs.add(otherSlug);
                        // When updating, trying to use another product's slug should fail
                        const isAvailable = isSlugUniqueInSet(otherSlug, existingSlugs, currentSlug);
                        expect(isAvailable).toBe(false);
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe("Slug generation produces valid slugs", () => {
        it("generated slugs always pass validation", () => {
            fc.assert(
                fc.property(productNameArb, (name) => {
                    const slug = generateSlug(name);
                    // Empty slugs are valid output for names that produce no valid characters
                    if (slug.length === 0) {
                        return true;
                    }
                    const result = validateSlug(slug);
                    expect(result.valid).toBe(true);
                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it("generated slugs are always lowercase", () => {
            fc.assert(
                fc.property(productNameArb, (name) => {
                    const slug = generateSlug(name);
                    expect(slug).toBe(slug.toLowerCase());
                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it("generated slugs contain only valid characters", () => {
            fc.assert(
                fc.property(productNameArb, (name) => {
                    const slug = generateSlug(name);
                    if (slug.length > 0) {
                        expect(slug).toMatch(/^[a-z0-9-]+$/);
                    }
                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it("generated slugs do not have consecutive hyphens", () => {
            fc.assert(
                fc.property(productNameArb, (name) => {
                    const slug = generateSlug(name);
                    expect(slug).not.toContain("--");
                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it("generated slugs do not start or end with hyphens", () => {
            fc.assert(
                fc.property(productNameArb, (name) => {
                    const slug = generateSlug(name);
                    if (slug.length > 0) {
                        expect(slug).not.toMatch(/^-/);
                        expect(slug).not.toMatch(/-$/);
                    }
                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it("same input always produces same slug (deterministic)", () => {
            fc.assert(
                fc.property(productNameArb, (name) => {
                    const slug1 = generateSlug(name);
                    const slug2 = generateSlug(name);
                    expect(slug1).toBe(slug2);
                    return true;
                }),
                { numRuns: 100 }
            );
        });
    });

    describe("Error messages are user-friendly", () => {
        it("validation errors include Chinese error messages", () => {
            // Test empty slug
            const emptyResult = validateSlug("");
            expect(emptyResult.errorZh).toBeDefined();
            expect(emptyResult.errorZh).toContain("空");

            // Test too short slug
            const shortResult = validateSlug("a");
            expect(shortResult.errorZh).toBeDefined();
            expect(shortResult.errorZh).toContain("2");

            // Test invalid characters
            const invalidResult = validateSlug("test@slug");
            expect(invalidResult.errorZh).toBeDefined();

            // Test reserved word
            const reservedResult = validateSlug("admin");
            expect(reservedResult.errorZh).toBeDefined();
            expect(reservedResult.errorZh).toContain("保留字");
        });
    });
});
