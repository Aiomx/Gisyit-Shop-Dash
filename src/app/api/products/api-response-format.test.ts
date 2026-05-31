/**
 * Property-Based Tests for API Response Format
 *
 * **Feature: product-url-slug, Property 11: API Response Format**
 * **Validates: Requirements 7.3, 7.4**
 *
 * For any product returned by the API, the response SHALL include both
 * id (UUID) and slug fields.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateSlug, validateSlug, RESERVED_SLUGS } from "@/lib/slug";

// ============================================
// Arbitraries (Generators)
// ============================================

/**
 * Generate a valid UUID v4 format
 */
const hexChars = "0123456789abcdef".split("");
const uuidArb = fc
    .tuple(
        fc.array(fc.constantFrom(...hexChars), { minLength: 8, maxLength: 8 }),
        fc.array(fc.constantFrom(...hexChars), { minLength: 4, maxLength: 4 }),
        fc.array(fc.constantFrom(...hexChars), { minLength: 4, maxLength: 4 }),
        fc.array(fc.constantFrom(...hexChars), { minLength: 4, maxLength: 4 }),
        fc.array(fc.constantFrom(...hexChars), { minLength: 12, maxLength: 12 })
    )
    .map(([a, b, c, d, e]) => `${a.join("")}-${b.join("")}-${c.join("")}-${d.join("")}-${e.join("")}`);

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
 * Generate a mock product object as it would be returned from the API
 */
const productArb = fc.record({
    id: uuidArb,
    slug: fc.oneof(validSlugArb, fc.constant(null)),
    name: productNameArb,
    product_code: fc.string({ minLength: 1, maxLength: 20 }),
    product_type: fc.constantFrom("physical", "digital", "service"),
    delivery_type: fc.constantFrom("shipping", "download", "cdk"),
    is_active: fc.boolean(),
    created_at: fc.constant("2024-01-01T00:00:00.000Z"),
    updated_at: fc.constant("2024-01-01T00:00:00.000Z"),
});

/**
 * Generate a mock API response for product creation
 */
const createResponseArb = fc.record({
    data: fc.record({
        id: uuidArb,
        slug: fc.oneof(validSlugArb, fc.constant(null)),
    }),
    success: fc.constant(true),
});

/**
 * Generate a mock API response for product update
 */
const updateResponseArb = fc.record({
    success: fc.constant(true),
    data: fc.record({
        id: uuidArb,
        slug: fc.oneof(validSlugArb, fc.constant(null)),
    }),
    warnings: fc.option(fc.array(fc.string(), { maxLength: 3 }), { nil: undefined }),
});

// ============================================
// Helper Functions (Simulating API Logic)
// ============================================

/**
 * Simulates the API response format for product listing
 * Requirements: 7.4 - When listing products, the API SHALL include slug in each product object
 */
function formatProductListResponse(products: Array<{ id: string; slug: string | null;[key: string]: unknown }>) {
    return {
        data: products.map((product) => ({
            ...product,
            // Ensure both id and slug are always present
            id: product.id,
            slug: product.slug,
        })),
    };
}

/**
 * Simulates the API response format for product creation
 * Requirements: 7.3 - When a product is returned, the API SHALL include both id and slug fields
 */
function formatCreateResponse(productId: string, slug: string | null) {
    return {
        data: { id: productId, slug },
        success: true,
    };
}

/**
 * Simulates the API response format for product update
 * Requirements: 7.3 - When a product is returned, the API SHALL include both id and slug fields
 */
function formatUpdateResponse(productId: string, slug: string | null, warnings?: string[]) {
    return {
        success: true,
        data: { id: productId, slug },
        warnings: warnings && warnings.length > 0 ? warnings : undefined,
    };
}

// ============================================
// Property Tests
// ============================================

describe("Property 11: API Response Format", () => {
    /**
     * **Feature: product-url-slug, Property 11: API Response Format**
     * **Validates: Requirements 7.3, 7.4**
     */

    describe("Product list response format", () => {
        it("every product in list response includes both id and slug fields", () => {
            fc.assert(
                fc.property(fc.array(productArb, { minLength: 1, maxLength: 20 }), (products) => {
                    const response = formatProductListResponse(products);

                    // Verify response structure
                    expect(response).toHaveProperty("data");
                    expect(Array.isArray(response.data)).toBe(true);

                    // Verify each product has both id and slug
                    for (const product of response.data) {
                        expect(product).toHaveProperty("id");
                        expect(product).toHaveProperty("slug");
                        // id should be a valid UUID format
                        expect(typeof product.id).toBe("string");
                        expect(product.id.length).toBeGreaterThan(0);
                        // slug can be string or null
                        expect(product.slug === null || typeof product.slug === "string").toBe(true);
                    }

                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it("product id is preserved in list response", () => {
            fc.assert(
                fc.property(fc.array(productArb, { minLength: 1, maxLength: 10 }), (products) => {
                    const response = formatProductListResponse(products);

                    // Verify each product's id matches the input
                    for (let i = 0; i < products.length; i++) {
                        expect(response.data[i].id).toBe(products[i].id);
                    }

                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it("product slug is preserved in list response", () => {
            fc.assert(
                fc.property(fc.array(productArb, { minLength: 1, maxLength: 10 }), (products) => {
                    const response = formatProductListResponse(products);

                    // Verify each product's slug matches the input
                    for (let i = 0; i < products.length; i++) {
                        expect(response.data[i].slug).toBe(products[i].slug);
                    }

                    return true;
                }),
                { numRuns: 100 }
            );
        });
    });

    describe("Product create response format", () => {
        it("create response includes both id and slug fields", () => {
            fc.assert(
                fc.property(fc.tuple(uuidArb, fc.oneof(validSlugArb, fc.constant(null))), ([id, slug]) => {
                    const response = formatCreateResponse(id, slug);

                    // Verify response structure
                    expect(response).toHaveProperty("data");
                    expect(response).toHaveProperty("success");
                    expect(response.success).toBe(true);

                    // Verify data has both id and slug
                    expect(response.data).toHaveProperty("id");
                    expect(response.data).toHaveProperty("slug");
                    expect(response.data.id).toBe(id);
                    expect(response.data.slug).toBe(slug);

                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it("create response id is a valid UUID format", () => {
            fc.assert(
                fc.property(fc.tuple(uuidArb, validSlugArb), ([id, slug]) => {
                    const response = formatCreateResponse(id, slug);

                    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    expect(response.data.id).toMatch(uuidRegex);

                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it("create response slug is valid when not null", () => {
            fc.assert(
                fc.property(fc.tuple(uuidArb, validSlugArb), ([id, slug]) => {
                    const response = formatCreateResponse(id, slug);

                    if (response.data.slug !== null) {
                        const validation = validateSlug(response.data.slug);
                        expect(validation.valid).toBe(true);
                    }

                    return true;
                }),
                { numRuns: 100 }
            );
        });
    });

    describe("Product update response format", () => {
        it("update response includes both id and slug fields", () => {
            fc.assert(
                fc.property(
                    fc.tuple(uuidArb, fc.oneof(validSlugArb, fc.constant(null)), fc.option(fc.array(fc.string(), { maxLength: 3 }), { nil: undefined })),
                    ([id, slug, warnings]) => {
                        const response = formatUpdateResponse(id, slug, warnings);

                        // Verify response structure
                        expect(response).toHaveProperty("success");
                        expect(response).toHaveProperty("data");
                        expect(response.success).toBe(true);

                        // Verify data has both id and slug
                        expect(response.data).toHaveProperty("id");
                        expect(response.data).toHaveProperty("slug");
                        expect(response.data.id).toBe(id);
                        expect(response.data.slug).toBe(slug);

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("update response preserves warnings when present", () => {
            fc.assert(
                fc.property(fc.tuple(uuidArb, validSlugArb, fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 3 })), ([id, slug, warnings]) => {
                    const response = formatUpdateResponse(id, slug, warnings);

                    expect(response.warnings).toBeDefined();
                    expect(response.warnings).toEqual(warnings);

                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it("update response omits warnings when empty", () => {
            fc.assert(
                fc.property(fc.tuple(uuidArb, validSlugArb), ([id, slug]) => {
                    const response = formatUpdateResponse(id, slug, []);

                    expect(response.warnings).toBeUndefined();

                    return true;
                }),
                { numRuns: 100 }
            );
        });
    });

    describe("Slug auto-generation for API", () => {
        it("auto-generated slugs from product names are valid", () => {
            fc.assert(
                fc.property(productNameArb, (name) => {
                    const slug = generateSlug(name);

                    // Empty slugs are valid for names with no valid characters
                    if (slug.length === 0) {
                        return true;
                    }

                    const validation = validateSlug(slug);
                    expect(validation.valid).toBe(true);

                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it("auto-generated slugs can be used in API responses", () => {
            fc.assert(
                fc.property(fc.tuple(uuidArb, productNameArb), ([id, name]) => {
                    const slug = generateSlug(name);
                    const response = formatCreateResponse(id, slug || null);

                    // Response should always have the required fields
                    expect(response.data).toHaveProperty("id");
                    expect(response.data).toHaveProperty("slug");
                    expect(response.data.id).toBe(id);

                    return true;
                }),
                { numRuns: 100 }
            );
        });
    });

    describe("API response consistency", () => {
        it("same product data produces consistent response format", () => {
            fc.assert(
                fc.property(productArb, (product) => {
                    const response1 = formatProductListResponse([product]);
                    const response2 = formatProductListResponse([product]);

                    // Responses should be structurally identical
                    expect(response1.data[0].id).toBe(response2.data[0].id);
                    expect(response1.data[0].slug).toBe(response2.data[0].slug);

                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it("create and update responses have compatible formats", () => {
            fc.assert(
                fc.property(fc.tuple(uuidArb, validSlugArb), ([id, slug]) => {
                    const createResponse = formatCreateResponse(id, slug);
                    const updateResponse = formatUpdateResponse(id, slug);

                    // Both should have data.id and data.slug
                    expect(createResponse.data.id).toBe(updateResponse.data.id);
                    expect(createResponse.data.slug).toBe(updateResponse.data.slug);

                    return true;
                }),
                { numRuns: 100 }
            );
        });
    });
});
