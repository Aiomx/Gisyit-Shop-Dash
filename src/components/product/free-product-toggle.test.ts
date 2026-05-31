/**
 * Property-Based Tests for Free Product Toggle Component
 *
 * **Feature: free-product-download, Property 10: Admin Free Product Validation**
 * **Validates: Requirements 9.2, 9.3, 9.5**
 *
 * For any product save operation in admin dashboard where is_free = true,
 * the system SHALL validate that delivery_type = "download" AND display
 * a warning if delivery_type is different.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateFreeProductConfig } from "./free-product-toggle";
import type { DeliveryType } from "@/lib/supabase/types";

// ============================================
// Arbitraries (Generators)
// ============================================

/**
 * All valid delivery types
 */
const allDeliveryTypes: DeliveryType[] = [
    "download",
    "license_key",
    "cdk",
    "shipment",
    "manual",
];

/**
 * Generate any delivery type
 */
const deliveryTypeArb = fc.constantFrom<DeliveryType>(...allDeliveryTypes);

/**
 * Generate non-download delivery types (invalid for free products)
 */
const nonDownloadDeliveryTypeArb = fc.constantFrom<DeliveryType>(
    "license_key",
    "cdk",
    "shipment",
    "manual"
);

/**
 * Generate boolean values for is_free
 */
const isFreeArb = fc.boolean();

// ============================================
// Property Tests
// ============================================

describe("Property 10: Admin Free Product Validation", () => {
    /**
     * **Feature: free-product-download, Property 10: Admin Free Product Validation**
     * **Validates: Requirements 9.2, 9.3, 9.5**
     */

    it("free products with download delivery type pass validation", () => {
        fc.assert(
            fc.property(fc.constant(true), fc.constant<DeliveryType>("download"), (isFree, deliveryType) => {
                const result = validateFreeProductConfig(isFree, deliveryType);
                expect(result.valid).toBe(true);
                expect(result.error).toBeUndefined();
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("free products with non-download delivery type fail validation", () => {
        fc.assert(
            fc.property(fc.constant(true), nonDownloadDeliveryTypeArb, (isFree, deliveryType) => {
                const result = validateFreeProductConfig(isFree, deliveryType);
                expect(result.valid).toBe(false);
                expect(result.error).toBeDefined();
                expect(result.error).toContain("下载");
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("non-free products pass validation regardless of delivery type", () => {
        fc.assert(
            fc.property(fc.constant(false), deliveryTypeArb, (isFree, deliveryType) => {
                const result = validateFreeProductConfig(isFree, deliveryType);
                expect(result.valid).toBe(true);
                expect(result.error).toBeUndefined();
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("validation is consistent for same inputs (deterministic)", () => {
        fc.assert(
            fc.property(isFreeArb, deliveryTypeArb, (isFree, deliveryType) => {
                const result1 = validateFreeProductConfig(isFree, deliveryType);
                const result2 = validateFreeProductConfig(isFree, deliveryType);
                expect(result1.valid).toBe(result2.valid);
                expect(result1.error).toBe(result2.error);
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("validation result is always a boolean for valid field", () => {
        fc.assert(
            fc.property(isFreeArb, deliveryTypeArb, (isFree, deliveryType) => {
                const result = validateFreeProductConfig(isFree, deliveryType);
                expect(typeof result.valid).toBe("boolean");
                return true;
            }),
            { numRuns: 100 }
        );
    });

    it("error message is only present when validation fails", () => {
        fc.assert(
            fc.property(isFreeArb, deliveryTypeArb, (isFree, deliveryType) => {
                const result = validateFreeProductConfig(isFree, deliveryType);
                if (result.valid) {
                    expect(result.error).toBeUndefined();
                } else {
                    expect(result.error).toBeDefined();
                    expect(typeof result.error).toBe("string");
                    expect(result.error!.length).toBeGreaterThan(0);
                }
                return true;
            }),
            { numRuns: 100 }
        );
    });
});

describe("Free Product Validation Edge Cases", () => {
    it("validates correctly for all delivery type combinations when is_free is true", () => {
        for (const deliveryType of allDeliveryTypes) {
            const result = validateFreeProductConfig(true, deliveryType);
            if (deliveryType === "download") {
                expect(result.valid).toBe(true);
            } else {
                expect(result.valid).toBe(false);
            }
        }
    });

    it("validates correctly for all delivery type combinations when is_free is false", () => {
        for (const deliveryType of allDeliveryTypes) {
            const result = validateFreeProductConfig(false, deliveryType);
            expect(result.valid).toBe(true);
        }
    });
});
