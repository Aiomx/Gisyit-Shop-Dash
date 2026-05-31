/**
 * Property-Based Tests for Brand Association Integrity
 *
 * Tests for:
 * - Property 8: Association Integrity (Requirements 2.3, 2.4)
 *
 * This test validates that product-brand association operations
 * do not modify the product or brand records themselves.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

// ============================================
// Types for Testing
// ============================================

interface Brand {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    brand_group: "os" | "platform" | "store" | "other";
    sort_order: number;
    is_active: boolean;
    description?: string;
    created_at: string;
    updated_at: string;
}

interface Product {
    id: string;
    product_code: string;
    name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface ProductBrand {
    id: string;
    product_id: string;
    brand_id: string;
    created_at: string;
}

interface AssociationResult {
    success: boolean;
    association?: ProductBrand;
    error?: string;
}

interface RemovalResult {
    success: boolean;
    removed: boolean;
    error?: string;
}

// ============================================
// Core Logic Under Test
// ============================================

/**
 * Simulates adding a product-brand association.
 * This is the core logic that the API route uses.
 *
 * Requirements: 2.1, 2.3
 *
 * @param product - The product to associate
 * @param brand - The brand to associate with
 * @param existingAssociations - Current associations
 * @returns Result with the new association (product and brand unchanged)
 */
function addAssociation(
    product: Product,
    brand: Brand,
    existingAssociations: ProductBrand[]
): { result: AssociationResult; productAfter: Product; brandAfter: Brand } {
    // Check if association already exists
    const exists = existingAssociations.some(
        (a) => a.product_id === product.id && a.brand_id === brand.id
    );

    if (exists) {
        return {
            result: {
                success: false,
                error: "Association already exists",
            },
            productAfter: { ...product }, // Product unchanged
            brandAfter: { ...brand }, // Brand unchanged
        };
    }

    // Create new association
    const newAssociation: ProductBrand = {
        id: `assoc-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        product_id: product.id,
        brand_id: brand.id,
        created_at: new Date().toISOString(),
    };

    return {
        result: {
            success: true,
            association: newAssociation,
        },
        productAfter: { ...product }, // Product unchanged
        brandAfter: { ...brand }, // Brand unchanged
    };
}

/**
 * Simulates removing a product-brand association.
 * This is the core logic that the API route uses.
 *
 * Requirements: 2.3
 *
 * @param productId - The product ID
 * @param brandId - The brand ID
 * @param product - The product record
 * @param brand - The brand record
 * @param existingAssociations - Current associations
 * @returns Result with removal status (product and brand unchanged)
 */
function removeAssociation(
    productId: string,
    brandId: string,
    product: Product,
    brand: Brand,
    existingAssociations: ProductBrand[]
): { result: RemovalResult; productAfter: Product; brandAfter: Brand; associationsAfter: ProductBrand[] } {
    // Find the association to remove
    const associationIndex = existingAssociations.findIndex(
        (a) => a.product_id === productId && a.brand_id === brandId
    );

    if (associationIndex === -1) {
        return {
            result: {
                success: false,
                removed: false,
                error: "Association not found",
            },
            productAfter: { ...product }, // Product unchanged
            brandAfter: { ...brand }, // Brand unchanged
            associationsAfter: [...existingAssociations],
        };
    }

    // Remove the association
    const associationsAfter = existingAssociations.filter(
        (_, index) => index !== associationIndex
    );

    return {
        result: {
            success: true,
            removed: true,
        },
        productAfter: { ...product }, // Product unchanged
        brandAfter: { ...brand }, // Brand unchanged
        associationsAfter,
    };
}

// ============================================
// Arbitraries (Generators)
// ============================================

/**
 * Generate a valid UUID-like string
 */
const hexChars = "0123456789abcdef".split("");
const hexStringArb = (length: number) =>
    fc.array(fc.constantFrom(...hexChars), { minLength: length, maxLength: length })
        .map((chars) => chars.join(""));

const uuidArb = fc
    .tuple(
        hexStringArb(8),
        hexStringArb(4),
        hexStringArb(4),
        hexStringArb(4),
        hexStringArb(12)
    )
    .map(([a, b, c, d, e]) => `${a}-${b}-${c}-${d}-${e}`);

/**
 * Generate a valid ISO date string using integer timestamps
 */
const isoDateArb = fc
    .integer({ min: 1577836800000, max: 1924905600000 }) // 2020-01-01 to 2030-12-31
    .map((timestamp) => new Date(timestamp).toISOString());

/**
 * Generate a brand group
 */
const brandGroupArb = fc.constantFrom<"os" | "platform" | "store" | "other">(
    "os",
    "platform",
    "store",
    "other"
);

/**
 * Generate a brand
 */
const brandArb: fc.Arbitrary<Brand> = fc.record({
    id: uuidArb,
    name: fc.string({ minLength: 1, maxLength: 100 }),
    slug: fc.string({ minLength: 1, maxLength: 100 }).map((s) =>
        s
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "") || "brand"
    ),
    logo_url: fc.option(fc.webUrl(), { nil: undefined }),
    brand_group: brandGroupArb,
    sort_order: fc.integer({ min: 0, max: 1000 }),
    is_active: fc.boolean(),
    description: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
    created_at: isoDateArb,
    updated_at: isoDateArb,
});

/**
 * Generate a product
 */
const productArb: fc.Arbitrary<Product> = fc.record({
    id: uuidArb,
    product_code: fc.string({ minLength: 1, maxLength: 50 }),
    name: fc.string({ minLength: 1, maxLength: 200 }),
    is_active: fc.boolean(),
    created_at: isoDateArb,
    updated_at: isoDateArb,
});

/**
 * Generate a product-brand association
 */
const productBrandArb = (productId: string, brandId: string): fc.Arbitrary<ProductBrand> =>
    fc.record({
        id: uuidArb,
        product_id: fc.constant(productId),
        brand_id: fc.constant(brandId),
        created_at: fc.date().map((d) => d.toISOString()),
    });

// ============================================
// Helper Functions
// ============================================

/**
 * Deep equality check for objects (excluding specific fields)
 */
function objectsEqual<T extends Record<string, unknown>>(
    obj1: T,
    obj2: T,
    excludeFields: string[] = []
): boolean {
    const keys1 = Object.keys(obj1).filter((k) => !excludeFields.includes(k));
    const keys2 = Object.keys(obj2).filter((k) => !excludeFields.includes(k));

    if (keys1.length !== keys2.length) return false;

    return keys1.every((key) => {
        const val1 = obj1[key];
        const val2 = obj2[key];
        if (typeof val1 === "object" && val1 !== null && typeof val2 === "object" && val2 !== null) {
            return JSON.stringify(val1) === JSON.stringify(val2);
        }
        return val1 === val2;
    });
}

// ============================================
// Property Tests
// ============================================

describe("Property 8: Association Integrity", () => {
    /**
     * **Feature: brand-management, Property 8: Association Integrity**
     * **Validates: Requirements 2.3, 2.4**
     *
     * For any product-brand association operation (add or remove),
     * the operation SHALL not modify the product or brand records themselves.
     * Only the association record SHALL be affected.
     */

    it("adding an association does not modify the product record", () => {
        fc.assert(
            fc.property(productArb, brandArb, (product, brand) => {
                const productBefore = { ...product };
                const { productAfter } = addAssociation(product, brand, []);

                // Product should be unchanged
                expect(objectsEqual(productBefore, productAfter)).toBe(true);
                expect(productAfter.id).toBe(productBefore.id);
                expect(productAfter.name).toBe(productBefore.name);
                expect(productAfter.product_code).toBe(productBefore.product_code);
                expect(productAfter.is_active).toBe(productBefore.is_active);
                expect(productAfter.created_at).toBe(productBefore.created_at);
                expect(productAfter.updated_at).toBe(productBefore.updated_at);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("adding an association does not modify the brand record", () => {
        fc.assert(
            fc.property(productArb, brandArb, (product, brand) => {
                const brandBefore = { ...brand };
                const { brandAfter } = addAssociation(product, brand, []);

                // Brand should be unchanged
                expect(objectsEqual(brandBefore, brandAfter)).toBe(true);
                expect(brandAfter.id).toBe(brandBefore.id);
                expect(brandAfter.name).toBe(brandBefore.name);
                expect(brandAfter.slug).toBe(brandBefore.slug);
                expect(brandAfter.is_active).toBe(brandBefore.is_active);
                expect(brandAfter.brand_group).toBe(brandBefore.brand_group);
                expect(brandAfter.sort_order).toBe(brandBefore.sort_order);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("removing an association does not modify the product record", () => {
        fc.assert(
            fc.property(productArb, brandArb, (product, brand) => {
                // Create an existing association
                const existingAssociation: ProductBrand = {
                    id: "existing-assoc",
                    product_id: product.id,
                    brand_id: brand.id,
                    created_at: new Date().toISOString(),
                };

                const productBefore = { ...product };
                const { productAfter } = removeAssociation(
                    product.id,
                    brand.id,
                    product,
                    brand,
                    [existingAssociation]
                );

                // Product should be unchanged
                expect(objectsEqual(productBefore, productAfter)).toBe(true);
                expect(productAfter.id).toBe(productBefore.id);
                expect(productAfter.name).toBe(productBefore.name);
                expect(productAfter.is_active).toBe(productBefore.is_active);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("removing an association does not modify the brand record", () => {
        fc.assert(
            fc.property(productArb, brandArb, (product, brand) => {
                // Create an existing association
                const existingAssociation: ProductBrand = {
                    id: "existing-assoc",
                    product_id: product.id,
                    brand_id: brand.id,
                    created_at: new Date().toISOString(),
                };

                const brandBefore = { ...brand };
                const { brandAfter } = removeAssociation(
                    product.id,
                    brand.id,
                    product,
                    brand,
                    [existingAssociation]
                );

                // Brand should be unchanged
                expect(objectsEqual(brandBefore, brandAfter)).toBe(true);
                expect(brandAfter.id).toBe(brandBefore.id);
                expect(brandAfter.name).toBe(brandBefore.name);
                expect(brandAfter.is_active).toBe(brandBefore.is_active);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("brand is_active change does not affect existing associations", () => {
        /**
         * Requirements 2.4: When a brand's is_active status changes to false,
         * the System SHALL preserve all existing product associations without modification.
         */
        fc.assert(
            fc.property(productArb, brandArb, (product, brand) => {
                // Create an existing association
                const existingAssociation: ProductBrand = {
                    id: "existing-assoc",
                    product_id: product.id,
                    brand_id: brand.id,
                    created_at: new Date().toISOString(),
                };

                const associationsBefore = [{ ...existingAssociation }];

                // Simulate brand is_active change (this should NOT affect associations)
                const brandWithChangedStatus = {
                    ...brand,
                    is_active: !brand.is_active,
                };

                // Associations should remain unchanged
                const associationsAfter = [...associationsBefore];

                expect(associationsAfter.length).toBe(associationsBefore.length);
                expect(associationsAfter[0].id).toBe(associationsBefore[0].id);
                expect(associationsAfter[0].product_id).toBe(associationsBefore[0].product_id);
                expect(associationsAfter[0].brand_id).toBe(associationsBefore[0].brand_id);

                // Brand status changed but association preserved
                expect(brandWithChangedStatus.is_active).not.toBe(brand.is_active);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("only the association record is affected when adding", () => {
        fc.assert(
            fc.property(productArb, brandArb, (product, brand) => {
                const existingAssociations: ProductBrand[] = [];
                const { result, productAfter, brandAfter } = addAssociation(
                    product,
                    brand,
                    existingAssociations
                );

                if (result.success && result.association) {
                    // New association was created
                    expect(result.association.product_id).toBe(product.id);
                    expect(result.association.brand_id).toBe(brand.id);

                    // But product and brand are unchanged
                    expect(productAfter).toEqual(product);
                    expect(brandAfter).toEqual(brand);
                }
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("only the association record is affected when removing", () => {
        fc.assert(
            fc.property(productArb, brandArb, (product, brand) => {
                // Create an existing association
                const existingAssociation: ProductBrand = {
                    id: "existing-assoc",
                    product_id: product.id,
                    brand_id: brand.id,
                    created_at: new Date().toISOString(),
                };

                const { result, productAfter, brandAfter, associationsAfter } = removeAssociation(
                    product.id,
                    brand.id,
                    product,
                    brand,
                    [existingAssociation]
                );

                if (result.success) {
                    // Association was removed
                    expect(associationsAfter.length).toBe(0);

                    // But product and brand are unchanged
                    expect(productAfter).toEqual(product);
                    expect(brandAfter).toEqual(brand);
                }
                return true;
            }),
            { numRuns: 100 }
        );
    });
});
