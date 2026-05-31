/**
 * Property-Based Tests for Brand Deletion Protection
 *
 * Tests for:
 * - Property 6: Brand Deletion Protection (Requirements 1.7)
 *
 * This test validates the core logic that brands with associated products
 * cannot be deleted.
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
}

interface ProductBrand {
    id: string;
    product_id: string;
    brand_id: string;
}

// ============================================
// Core Logic Under Test
// ============================================

/**
 * Determines if a brand can be deleted based on its product associations.
 * This is the core logic that the API route uses.
 *
 * Requirements: 1.7
 *
 * @param brandId - The ID of the brand to check
 * @param productBrands - All product-brand associations
 * @returns Object with canDelete flag and optional error
 */
function canDeleteBrand(
    brandId: string,
    productBrands: ProductBrand[]
): { canDelete: boolean; productCount: number; error?: string } {
    const associatedProducts = productBrands.filter(
        (pb) => pb.brand_id === brandId
    );
    const productCount = associatedProducts.length;

    if (productCount > 0) {
        return {
            canDelete: false,
            productCount,
            error: "该品牌下有关联商品，无法删除",
        };
    }

    return {
        canDelete: true,
        productCount: 0,
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
 * Generate a brand
 */
const brandArb = fc.record({
    id: uuidArb,
    name: fc.string({ minLength: 1, maxLength: 100 }),
    slug: fc.string({ minLength: 1, maxLength: 100 }).map((s) =>
        s
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "") || "brand"
    ),
});

/**
 * Generate a product-brand association
 */
const productBrandArb = (brandId: string) =>
    fc.record({
        id: uuidArb,
        product_id: uuidArb,
        brand_id: fc.constant(brandId),
    });

/**
 * Generate a list of product-brand associations for a specific brand
 */
const productBrandsForBrandArb = (brandId: string, minCount: number, maxCount: number) =>
    fc.array(productBrandArb(brandId), { minLength: minCount, maxLength: maxCount });

// ============================================
// Property Tests
// ============================================

describe("Property 6: Brand Deletion Protection", () => {
    /**
     * **Feature: brand-management, Property 6: Brand Deletion Protection**
     * **Validates: Requirements 1.7**
     *
     * For any brand that has associated products (entries in product_brands table),
     * deletion SHALL be prevented and an error SHALL be returned.
     */

    it("brands with associated products cannot be deleted", () => {
        fc.assert(
            fc.property(
                brandArb,
                fc.integer({ min: 1, max: 100 }),
                (brand, productCount) => {
                    // Generate associations for this brand
                    const associations: ProductBrand[] = [];
                    for (let i = 0; i < productCount; i++) {
                        associations.push({
                            id: `assoc-${i}`,
                            product_id: `product-${i}`,
                            brand_id: brand.id,
                        });
                    }

                    const result = canDeleteBrand(brand.id, associations);

                    // Brand with products should NOT be deletable
                    expect(result.canDelete).toBe(false);
                    expect(result.productCount).toBe(productCount);
                    expect(result.error).toBeDefined();
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("brands without associated products can be deleted", () => {
        fc.assert(
            fc.property(brandArb, (brand) => {
                // No associations for this brand
                const associations: ProductBrand[] = [];

                const result = canDeleteBrand(brand.id, associations);

                // Brand without products should be deletable
                expect(result.canDelete).toBe(true);
                expect(result.productCount).toBe(0);
                expect(result.error).toBeUndefined();
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("brands without associated products can be deleted even when other brands have associations", () => {
        fc.assert(
            fc.property(
                brandArb,
                brandArb,
                fc.integer({ min: 1, max: 50 }),
                (targetBrand, otherBrand, otherProductCount) => {
                    // Ensure brands have different IDs
                    if (targetBrand.id === otherBrand.id) {
                        return true; // Skip this case
                    }

                    // Generate associations only for the other brand
                    const associations: ProductBrand[] = [];
                    for (let i = 0; i < otherProductCount; i++) {
                        associations.push({
                            id: `assoc-${i}`,
                            product_id: `product-${i}`,
                            brand_id: otherBrand.id,
                        });
                    }

                    const result = canDeleteBrand(targetBrand.id, associations);

                    // Target brand should be deletable since it has no associations
                    expect(result.canDelete).toBe(true);
                    expect(result.productCount).toBe(0);
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("product count is accurately reported for brands with associations", () => {
        fc.assert(
            fc.property(
                brandArb,
                fc.integer({ min: 0, max: 100 }),
                (brand, expectedCount) => {
                    // Generate exact number of associations
                    const associations: ProductBrand[] = [];
                    for (let i = 0; i < expectedCount; i++) {
                        associations.push({
                            id: `assoc-${i}`,
                            product_id: `product-${i}`,
                            brand_id: brand.id,
                        });
                    }

                    const result = canDeleteBrand(brand.id, associations);

                    // Product count should match exactly
                    expect(result.productCount).toBe(expectedCount);
                    expect(result.canDelete).toBe(expectedCount === 0);
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    it("deletion protection is consistent across multiple checks", () => {
        fc.assert(
            fc.property(
                brandArb,
                fc.integer({ min: 0, max: 50 }),
                (brand, productCount) => {
                    // Generate associations
                    const associations: ProductBrand[] = [];
                    for (let i = 0; i < productCount; i++) {
                        associations.push({
                            id: `assoc-${i}`,
                            product_id: `product-${i}`,
                            brand_id: brand.id,
                        });
                    }

                    // Check multiple times - result should be consistent
                    const result1 = canDeleteBrand(brand.id, associations);
                    const result2 = canDeleteBrand(brand.id, associations);
                    const result3 = canDeleteBrand(brand.id, associations);

                    expect(result1.canDelete).toBe(result2.canDelete);
                    expect(result2.canDelete).toBe(result3.canDelete);
                    expect(result1.productCount).toBe(result2.productCount);
                    expect(result2.productCount).toBe(result3.productCount);
                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });
});
