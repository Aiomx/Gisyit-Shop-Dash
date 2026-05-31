/**
 * Property-Based Tests for Brand Utility Functions
 *
 * Tests for:
 * - Property 2: Slug Auto-Generation (Requirements 1.2)
 * - Property 4: Logo File Type Validation (Requirements 1.4, 7.3)
 * - Property 11: Brand Name Validation (Requirements 7.1)
 * - Property 12: Slug Format Validation (Requirements 7.2)
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
    validateSlug,
    generateSlug,
    validateBrandName,
    validateLogoFile,
    ALLOWED_LOGO_MIME_TYPES,
    MAX_LOGO_FILE_SIZE,
} from "./brand-utils";

// ============================================
// Arbitraries (Generators)
// ============================================

/**
 * Generate a valid slug (lowercase letters, numbers, and hyphens)
 */
const validSlugArb = fc
    .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789-".split("")), {
        minLength: 1,
        maxLength: 100,
    })
    .map((chars) => chars.join(""))
    // Filter out slugs that are only hyphens or start/end with hyphens
    .filter((slug) => /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug));

/**
 * Generate an invalid slug containing uppercase letters
 */
const uppercaseSlugArb = fc
    .tuple(
        fc.array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789-".split("")), { minLength: 0, maxLength: 10 }),
        fc.array(fc.constantFrom(..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")), { minLength: 1, maxLength: 5 }),
        fc.array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789-".split("")), { minLength: 0, maxLength: 10 })
    )
    .map(([prefix, upper, suffix]) => prefix.join("") + upper.join("") + suffix.join(""));

/**
 * Generate an invalid slug containing special characters
 */
const specialCharSlugArb = fc
    .tuple(
        fc.array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789".split("")), { minLength: 0, maxLength: 10 }),
        fc.array(fc.constantFrom(..."!@#$%^&*()+=[]{}|;:,./<>?~ ".split("")), { minLength: 1, maxLength: 3 }),
        fc.array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789".split("")), { minLength: 0, maxLength: 10 })
    )
    .map(([prefix, special, suffix]) => prefix.join("") + special.join("") + suffix.join(""));

/**
 * Generate a brand name for slug generation testing
 */
const brandNameArb = fc.string({ minLength: 1, maxLength: 100 });

// ============================================
// Property Tests
// ============================================

describe("Property 12: Slug Format Validation", () => {
    /**
     * **Feature: brand-management, Property 12: Slug Format Validation**
     * **Validates: Requirements 7.2**
     *
     * For any brand slug (auto-generated or user-provided), it SHALL match
     * the pattern ^[a-z0-9-]+$ (lowercase letters, numbers, and hyphens only).
     */
    it("valid slugs containing only lowercase letters, numbers, and hyphens pass validation", () => {
        fc.assert(
            fc.property(validSlugArb, (slug) => {
                const isValid = validateSlug(slug);
                expect(isValid).toBe(true);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("slugs containing uppercase letters fail validation", () => {
        fc.assert(
            fc.property(uppercaseSlugArb, (slug) => {
                const isValid = validateSlug(slug);
                expect(isValid).toBe(false);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("slugs containing special characters fail validation", () => {
        fc.assert(
            fc.property(specialCharSlugArb, (slug) => {
                const isValid = validateSlug(slug);
                expect(isValid).toBe(false);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("empty strings fail validation", () => {
        expect(validateSlug("")).toBe(false);
    });

    it("auto-generated slugs always pass validation", () => {
        fc.assert(
            fc.property(brandNameArb, (name) => {
                const slug = generateSlug(name);
                // Empty slugs are valid output for empty/whitespace-only names
                if (slug.length === 0) {
                    return true;
                }
                const isValid = validateSlug(slug);
                expect(isValid).toBe(true);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("generated slugs contain only valid characters", () => {
        fc.assert(
            fc.property(brandNameArb, (name) => {
                const slug = generateSlug(name);
                // Check that slug only contains valid characters
                if (slug.length > 0) {
                    expect(slug).toMatch(/^[a-z0-9-]+$/);
                }
                return true;
            }),
            { numRuns: 100 }
        );
    });
});


// ============================================
// Property 2: Slug Auto-Generation
// ============================================

describe("Property 2: Slug Auto-Generation", () => {
    /**
     * **Feature: brand-management, Property 2: Slug Auto-Generation**
     * **Validates: Requirements 1.2**
     *
     * For any brand name, when a brand is created without specifying a slug,
     * the system SHALL generate a slug that is lowercase, contains only letters,
     * numbers, and hyphens, and is unique across all brands.
     */

    /**
     * Generate non-empty brand names
     */
    const nonEmptyBrandNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

    it("generated slugs are always lowercase", () => {
        fc.assert(
            fc.property(nonEmptyBrandNameArb, (name) => {
                const slug = generateSlug(name);
                if (slug.length === 0) return true;
                expect(slug).toBe(slug.toLowerCase());
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("generated slugs contain only valid characters (letters, numbers, hyphens)", () => {
        fc.assert(
            fc.property(nonEmptyBrandNameArb, (name) => {
                const slug = generateSlug(name);
                if (slug.length === 0) return true;
                expect(slug).toMatch(/^[a-z0-9-]+$/);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("generated slugs do not have leading or trailing hyphens", () => {
        fc.assert(
            fc.property(nonEmptyBrandNameArb, (name) => {
                const slug = generateSlug(name);
                if (slug.length === 0) return true;
                expect(slug).not.toMatch(/^-/);
                expect(slug).not.toMatch(/-$/);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("generated slugs do not have consecutive hyphens", () => {
        fc.assert(
            fc.property(nonEmptyBrandNameArb, (name) => {
                const slug = generateSlug(name);
                if (slug.length === 0) return true;
                expect(slug).not.toMatch(/--/);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("same input always produces same slug (deterministic)", () => {
        fc.assert(
            fc.property(nonEmptyBrandNameArb, (name) => {
                const slug1 = generateSlug(name);
                const slug2 = generateSlug(name);
                expect(slug1).toBe(slug2);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("spaces in names are converted to hyphens", () => {
        fc.assert(
            fc.property(
                fc.tuple(
                    fc.array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split("")), { minLength: 1, maxLength: 20 }).map((arr) => arr.join("")),
                    fc.array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split("")), { minLength: 1, maxLength: 20 }).map((arr) => arr.join(""))
                ),
                ([word1, word2]) => {
                    const nameWithSpace = `${word1} ${word2}`;
                    const slug = generateSlug(nameWithSpace);
                    // The slug should contain a hyphen where the space was
                    expect(slug).toContain("-");
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});

// ============================================
// Property 11: Brand Name Validation
// ============================================

describe("Property 11: Brand Name Validation", () => {
    /**
     * **Feature: brand-management, Property 11: Brand Name Validation**
     * **Validates: Requirements 7.1**
     *
     * For any brand creation or update, the name SHALL be non-empty and
     * contain between 1 and 100 characters. Names outside this range SHALL be rejected.
     */

    /**
     * Generate valid brand names (1-100 non-whitespace characters)
     */
    const validBrandNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length >= 1 && s.trim().length <= 100);

    /**
     * Generate names that are too long (> 100 characters after trim)
     */
    const tooLongNameArb = fc.string({ minLength: 101, maxLength: 200 }).filter((s) => s.trim().length > 100);

    /**
     * Generate empty or whitespace-only strings
     */
    const emptyOrWhitespaceArb = fc.constantFrom("", " ", "  ", "\t", "\n", "   \t\n   ");

    it("valid names (1-100 chars) pass validation", () => {
        fc.assert(
            fc.property(validBrandNameArb, (name) => {
                const isValid = validateBrandName(name);
                expect(isValid).toBe(true);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("names longer than 100 characters fail validation", () => {
        fc.assert(
            fc.property(tooLongNameArb, (name) => {
                const isValid = validateBrandName(name);
                expect(isValid).toBe(false);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("empty or whitespace-only names fail validation", () => {
        fc.assert(
            fc.property(emptyOrWhitespaceArb, (name) => {
                const isValid = validateBrandName(name);
                expect(isValid).toBe(false);
                return true;
            }),
            { numRuns: 10 }
        );
    });

    it("null and undefined values fail validation", () => {
        // @ts-expect-error - Testing invalid input
        expect(validateBrandName(null)).toBe(false);
        // @ts-expect-error - Testing invalid input
        expect(validateBrandName(undefined)).toBe(false);
    });
});

// ============================================
// Property 4: Logo File Type Validation
// ============================================

describe("Property 4: Logo File Type Validation", () => {
    /**
     * **Feature: brand-management, Property 4: Logo File Type Validation**
     * **Validates: Requirements 1.4, 7.3**
     *
     * For any file upload attempt, the system SHALL accept only files with
     * MIME type `image/svg+xml` or `image/png` and file size under 2MB.
     * All other file types or sizes SHALL be rejected.
     */

    /**
     * Helper to create a mock File object
     */
    function createMockFile(name: string, size: number, type: string): File {
        const content = new Array(size).fill("a").join("");
        const blob = new Blob([content], { type });
        return new File([blob], name, { type });
    }

    /**
     * Generate valid file sizes (1 byte to 2MB)
     */
    const validFileSizeArb = fc.integer({ min: 1, max: MAX_LOGO_FILE_SIZE });

    /**
     * Generate invalid file sizes (> 2MB)
     */
    const invalidFileSizeArb = fc.integer({ min: MAX_LOGO_FILE_SIZE + 1, max: MAX_LOGO_FILE_SIZE * 2 });

    /**
     * Generate valid MIME types
     */
    const validMimeTypeArb = fc.constantFrom(...ALLOWED_LOGO_MIME_TYPES);

    /**
     * Generate invalid MIME types
     */
    const invalidMimeTypeArb = fc.constantFrom(
        "image/jpeg",
        "image/gif",
        "image/webp",
        "application/pdf",
        "text/plain",
        "application/octet-stream",
        "image/bmp",
        "video/mp4"
    );

    /**
     * Generate file names
     */
    const fileNameArb = fc.constantFrom("logo.svg", "logo.png", "brand.svg", "brand.png", "image.svg", "image.png");

    it("valid MIME types (SVG, PNG) with valid size pass validation", () => {
        fc.assert(
            fc.property(fc.tuple(fileNameArb, validFileSizeArb, validMimeTypeArb), ([name, size, type]) => {
                const file = createMockFile(name, size, type);
                const result = validateLogoFile(file);
                expect(result.valid).toBe(true);
                expect(result.error).toBeUndefined();
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("invalid MIME types fail validation regardless of size", () => {
        fc.assert(
            fc.property(fc.tuple(fileNameArb, validFileSizeArb, invalidMimeTypeArb), ([name, size, type]) => {
                const file = createMockFile(name, size, type);
                const result = validateLogoFile(file);
                expect(result.valid).toBe(false);
                expect(result.error).toBeDefined();
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("files larger than 2MB fail validation regardless of type", () => {
        fc.assert(
            fc.property(fc.tuple(fileNameArb, invalidFileSizeArb, validMimeTypeArb), ([name, size, type]) => {
                const file = createMockFile(name, size, type);
                const result = validateLogoFile(file);
                expect(result.valid).toBe(false);
                expect(result.error).toBeDefined();
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("files with both invalid type and size fail validation", () => {
        fc.assert(
            fc.property(fc.tuple(fileNameArb, invalidFileSizeArb, invalidMimeTypeArb), ([name, size, type]) => {
                const file = createMockFile(name, size, type);
                const result = validateLogoFile(file);
                expect(result.valid).toBe(false);
                expect(result.error).toBeDefined();
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("null file fails validation", () => {
        // @ts-expect-error - Testing invalid input
        const result = validateLogoFile(null);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
    });

    it("undefined file fails validation", () => {
        // @ts-expect-error - Testing invalid input
        const result = validateLogoFile(undefined);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
    });
});
