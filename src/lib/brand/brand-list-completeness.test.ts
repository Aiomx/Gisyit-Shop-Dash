/**
 * Property-Based Tests for Brand List Completeness
 *
 * **Feature: brand-management, Property 7: Brand List Completeness**
 * **Validates: Requirements 1.8, 7.4**
 *
 * For any brand list API response, each brand object SHALL contain:
 * id, name, slug, logo_url, brand_group, sort_order, is_active, created_at, and product_count.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { Brand, BrandWithCount, BrandGroup } from "@/lib/supabase/types";

// ============================================
// Required Fields Definition
// ============================================

/**
 * Required fields for a brand object in API responses
 * Requirements: 1.8, 7.4
 * Note: logo_url is optional (can be null/undefined)
 */
const REQUIRED_BRAND_FIELDS = [
    "id",
    "name",
    "slug",
    "brand_group",
    "sort_order",
    "is_active",
    "created_at",
] as const;

/**
 * Optional fields that can be null/undefined
 */
const OPTIONAL_BRAND_FIELDS = [
    "logo_url",
    "description",
    "updated_at",
] as const;

/**
 * Additional required field for BrandWithCount (admin list response)
 */
const REQUIRED_BRAND_WITH_COUNT_FIELDS = [
    ...REQUIRED_BRAND_FIELDS,
    "product_count",
] as const;

// ============================================
// Validation Functions
// ============================================

/**
 * Validates that a brand object contains all required fields
 * @param brand - The brand object to validate
 * @returns Object with validation result and missing fields
 */
export function validateBrandFields(brand: Record<string, unknown>): {
    valid: boolean;
    missingFields: string[];
} {
    const missingFields: string[] = [];

    for (const field of REQUIRED_BRAND_FIELDS) {
        // Check if field exists and is not undefined
        if (!(field in brand) || brand[field] === undefined) {
            missingFields.push(field);
        }
    }

    return {
        valid: missingFields.length === 0,
        missingFields,
    };
}

/**
 * Validates that a BrandWithCount object contains all required fields including product_count
 * @param brand - The brand object to validate
 * @returns Object with validation result and missing fields
 */
export function validateBrandWithCountFields(brand: Record<string, unknown>): {
    valid: boolean;
    missingFields: string[];
} {
    const missingFields: string[] = [];

    for (const field of REQUIRED_BRAND_WITH_COUNT_FIELDS) {
        // Check if field exists and is not undefined
        if (!(field in brand) || brand[field] === undefined) {
            missingFields.push(field);
        }
    }

    return {
        valid: missingFields.length === 0,
        missingFields,
    };
}

/**
 * Validates field types for a brand object
 * @param brand - The brand object to validate
 * @returns Object with validation result and type errors
 */
export function validateBrandFieldTypes(brand: BrandWithCount): {
    valid: boolean;
    typeErrors: string[];
} {
    const typeErrors: string[] = [];

    // id should be a string (UUID)
    if (typeof brand.id !== "string") {
        typeErrors.push(`id should be string, got ${typeof brand.id}`);
    }

    // name should be a string
    if (typeof brand.name !== "string") {
        typeErrors.push(`name should be string, got ${typeof brand.name}`);
    }

    // slug should be a string
    if (typeof brand.slug !== "string") {
        typeErrors.push(`slug should be string, got ${typeof brand.slug}`);
    }

    // logo_url should be string or null/undefined
    if (brand.logo_url !== null && brand.logo_url !== undefined && typeof brand.logo_url !== "string") {
        typeErrors.push(`logo_url should be string or null, got ${typeof brand.logo_url}`);
    }

    // brand_group should be a valid BrandGroup
    const validBrandGroups: BrandGroup[] = ["os", "platform", "store", "other"];
    if (!validBrandGroups.includes(brand.brand_group)) {
        typeErrors.push(`brand_group should be one of ${validBrandGroups.join(", ")}, got ${brand.brand_group}`);
    }

    // sort_order should be a number
    if (typeof brand.sort_order !== "number") {
        typeErrors.push(`sort_order should be number, got ${typeof brand.sort_order}`);
    }

    // is_active should be a boolean
    if (typeof brand.is_active !== "boolean") {
        typeErrors.push(`is_active should be boolean, got ${typeof brand.is_active}`);
    }

    // created_at should be a string (ISO date)
    if (typeof brand.created_at !== "string") {
        typeErrors.push(`created_at should be string, got ${typeof brand.created_at}`);
    }

    // product_count should be a number
    if (typeof brand.product_count !== "number") {
        typeErrors.push(`product_count should be number, got ${typeof brand.product_count}`);
    }

    return {
        valid: typeErrors.length === 0,
        typeErrors,
    };
}

// ============================================
// Arbitraries (Generators)
// ============================================

/**
 * Generate a valid UUID string
 */
const uuidArb = fc.uuid();

/**
 * Generate a valid brand name (1-100 chars)
 */
const brandNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

/**
 * Generate a valid slug
 */
const slugArb = fc
    .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789-".split("")), {
        minLength: 1,
        maxLength: 50,
    })
    .map((chars) => chars.join(""))
    .filter((slug) => /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug));

/**
 * Generate a valid brand group
 */
const brandGroupArb = fc.constantFrom<BrandGroup>("os", "platform", "store", "other");

/**
 * Generate a valid logo URL or null
 */
const logoUrlArb = fc.oneof(
    fc.constant(null),
    fc.constant(undefined),
    fc.webUrl().map((url) => `${url}/logo.png`)
);

/**
 * Generate a valid sort order
 */
const sortOrderArb = fc.integer({ min: 0, max: 1000 });

/**
 * Generate a valid product count
 */
const productCountArb = fc.integer({ min: 0, max: 10000 });

/**
 * Generate a valid ISO date string
 * Use integer timestamps to avoid Invalid Date errors
 */
const isoDateArb = fc.integer({
    min: new Date("2020-01-01").getTime(),
    max: new Date("2030-12-31").getTime(),
}).map((timestamp) => new Date(timestamp).toISOString());

/**
 * Generate a complete BrandWithCount object
 */
const brandWithCountArb: fc.Arbitrary<BrandWithCount> = fc.record({
    id: uuidArb,
    name: brandNameArb,
    slug: slugArb,
    logo_url: logoUrlArb.map((url) => url ?? undefined),
    brand_group: brandGroupArb,
    sort_order: sortOrderArb,
    is_active: fc.boolean(),
    description: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
    created_at: isoDateArb,
    updated_at: isoDateArb,
    product_count: productCountArb,
});

/**
 * Generate a brand object with some required fields missing
 * Note: logo_url is optional, so we don't count it as a required field
 */
const incompleteBrandArb = fc.record({
    id: fc.option(uuidArb, { nil: undefined }),
    name: fc.option(brandNameArb, { nil: undefined }),
    slug: fc.option(slugArb, { nil: undefined }),
    logo_url: logoUrlArb,
    brand_group: fc.option(brandGroupArb, { nil: undefined }),
    sort_order: fc.option(sortOrderArb, { nil: undefined }),
    is_active: fc.option(fc.boolean(), { nil: undefined }),
    created_at: fc.option(isoDateArb, { nil: undefined }),
    product_count: fc.option(productCountArb, { nil: undefined }),
}).filter((brand) => {
    // Ensure at least one required field is missing (excluding logo_url which is optional)
    const requiredFields = ["id", "name", "slug", "brand_group", "sort_order", "is_active", "created_at", "product_count"] as const;
    const missingCount = requiredFields.filter((field) => brand[field] === undefined).length;
    return missingCount > 0;
});

// ============================================
// Property Tests
// ============================================

describe("Property 7: Brand List Completeness", () => {
    /**
     * **Feature: brand-management, Property 7: Brand List Completeness**
     * **Validates: Requirements 1.8, 7.4**
     */

    it("complete brand objects pass field validation", () => {
        fc.assert(
            fc.property(brandWithCountArb, (brand) => {
                const result = validateBrandWithCountFields(brand as unknown as Record<string, unknown>);
                expect(result.valid).toBe(true);
                expect(result.missingFields).toHaveLength(0);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("complete brand objects pass type validation", () => {
        fc.assert(
            fc.property(brandWithCountArb, (brand) => {
                const result = validateBrandFieldTypes(brand);
                expect(result.valid).toBe(true);
                expect(result.typeErrors).toHaveLength(0);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("incomplete brand objects fail field validation", () => {
        fc.assert(
            fc.property(incompleteBrandArb, (brand) => {
                const result = validateBrandWithCountFields(brand as unknown as Record<string, unknown>);
                expect(result.valid).toBe(false);
                expect(result.missingFields.length).toBeGreaterThan(0);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("brand list with all complete brands passes validation", () => {
        fc.assert(
            fc.property(fc.array(brandWithCountArb, { minLength: 0, maxLength: 20 }), (brands) => {
                for (const brand of brands) {
                    const fieldResult = validateBrandWithCountFields(brand as unknown as Record<string, unknown>);
                    const typeResult = validateBrandFieldTypes(brand);
                    expect(fieldResult.valid).toBe(true);
                    expect(typeResult.valid).toBe(true);
                }
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("product_count is always a non-negative integer", () => {
        fc.assert(
            fc.property(brandWithCountArb, (brand) => {
                expect(typeof brand.product_count).toBe("number");
                expect(brand.product_count).toBeGreaterThanOrEqual(0);
                expect(Number.isInteger(brand.product_count)).toBe(true);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("sort_order is always a non-negative integer", () => {
        fc.assert(
            fc.property(brandWithCountArb, (brand) => {
                expect(typeof brand.sort_order).toBe("number");
                expect(brand.sort_order).toBeGreaterThanOrEqual(0);
                expect(Number.isInteger(brand.sort_order)).toBe(true);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("brand_group is always a valid enum value", () => {
        fc.assert(
            fc.property(brandWithCountArb, (brand) => {
                const validGroups: BrandGroup[] = ["os", "platform", "store", "other"];
                expect(validGroups).toContain(brand.brand_group);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("is_active is always a boolean", () => {
        fc.assert(
            fc.property(brandWithCountArb, (brand) => {
                expect(typeof brand.is_active).toBe("boolean");
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("created_at is always a valid ISO date string", () => {
        fc.assert(
            fc.property(brandWithCountArb, (brand) => {
                expect(typeof brand.created_at).toBe("string");
                // Verify it can be parsed as a date
                const date = new Date(brand.created_at);
                expect(date.toString()).not.toBe("Invalid Date");
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("slug matches the required format (lowercase, numbers, hyphens)", () => {
        fc.assert(
            fc.property(brandWithCountArb, (brand) => {
                expect(brand.slug).toMatch(/^[a-z0-9-]+$/);
                return true;
            }),
            { numRuns: 100 }
        );
    });
});
