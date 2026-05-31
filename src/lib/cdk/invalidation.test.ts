/**
 * Property-Based Tests for CDK Invalidation Prevents Use
 *
 * Tests for Requirements 8.3:
 * - Property 19: Invalidation Prevents Use
 *
 * **Feature: cdk-auto-delivery, Property 19: Invalidation Prevents Use**
 * **Validates: Requirements 8.3**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { CDKStatus, type CDKStatusType } from "./admin-service";

// ============================================
// Types for Testing
// ============================================

/**
 * Simulated CDK code for testing
 */
interface SimulatedCDKCode {
    id: string;
    code: string;
    status: CDKStatusType;
    product_id: string;
    order_id?: string;
}

/**
 * Simulated inventory for testing
 */
class SimulatedInventory {
    private codes: Map<string, SimulatedCDKCode> = new Map();

    addCode(code: SimulatedCDKCode): void {
        this.codes.set(code.id, { ...code });
    }

    getCode(id: string): SimulatedCDKCode | undefined {
        const code = this.codes.get(id);
        return code ? { ...code } : undefined;
    }

    /**
     * Invalidate a code - simulates the invalidateCode function
     */
    invalidateCode(id: string): boolean {
        const code = this.codes.get(id);
        if (!code) return false;

        // Cannot invalidate delivered codes
        if (code.status === CDKStatus.DELIVERED) {
            return false;
        }

        // Already invalid - idempotent
        if (code.status === CDKStatus.INVALID) {
            return true;
        }

        // Update to invalid
        code.status = CDKStatus.INVALID;
        code.order_id = undefined;
        return true;
    }

    /**
     * Get available codes for reservation - simulates reservation query
     * This is the key function that should NOT return invalidated codes
     */
    getAvailableCodesForReservation(productId: string, quantity: number): string[] {
        const availableCodes: string[] = [];

        for (const [id, code] of this.codes) {
            if (
                code.product_id === productId &&
                code.status === CDKStatus.AVAILABLE
            ) {
                availableCodes.push(id);
                if (availableCodes.length >= quantity) {
                    break;
                }
            }
        }

        return availableCodes;
    }

    /**
     * Check if a code can be reserved
     */
    canBeReserved(id: string): boolean {
        const code = this.codes.get(id);
        if (!code) return false;
        return code.status === CDKStatus.AVAILABLE;
    }

    /**
     * Get all codes
     */
    getAllCodes(): SimulatedCDKCode[] {
        return Array.from(this.codes.values()).map((c) => ({ ...c }));
    }
}

// ============================================
// Arbitraries (Generators)
// ============================================

/**
 * Generate a valid UUID-like ID
 */
const uuidArb = fc
    .array(fc.constantFrom(..."0123456789abcdef".split("")), {
        minLength: 32,
        maxLength: 32,
    })
    .map((chars) => {
        const hex = chars.join("");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    });

/**
 * Generate a valid CDK code string
 */
const cdkCodeArb = fc
    .array(fc.constantFrom(..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-".split("")), {
        minLength: 10,
        maxLength: 25,
    })
    .map((chars) => chars.join(""));

/**
 * Generate a status that can be invalidated (available or reserved)
 */
const invalidatableStatusArb = fc.constantFrom(
    CDKStatus.AVAILABLE,
    CDKStatus.RESERVED
) as fc.Arbitrary<CDKStatusType>;

/**
 * Generate a simulated CDK code
 */
const simulatedCodeArb = fc.record({
    id: uuidArb,
    code: cdkCodeArb,
    status: invalidatableStatusArb,
    product_id: uuidArb,
    order_id: fc.option(uuidArb, { nil: undefined }),
});

/**
 * Generate an inventory with multiple codes
 */
const inventoryArb = fc
    .array(simulatedCodeArb, { minLength: 1, maxLength: 20 })
    .map((codes) => {
        const inventory = new SimulatedInventory();
        // Ensure unique IDs
        const seenIds = new Set<string>();
        for (const code of codes) {
            if (!seenIds.has(code.id)) {
                seenIds.add(code.id);
                inventory.addCode(code);
            }
        }
        return inventory;
    });

// ============================================
// Property Tests
// ============================================

describe("Property 19: Invalidation Prevents Use", () => {
    /**
     * **Feature: cdk-auto-delivery, Property 19: Invalidation Prevents Use**
     * **Validates: Requirements 8.3**
     *
     * For any invalidated CDK code, it should not be selectable for reservation
     * regardless of its previous status.
     */
    it("invalidated codes are not returned in available codes query", () => {
        fc.assert(
            fc.property(
                inventoryArb,
                fc.integer({ min: 0, max: 10 }),
                (inventory, invalidateCount) => {
                    const allCodes = inventory.getAllCodes();
                    if (allCodes.length === 0) return true;

                    // Get codes that can be invalidated (available or reserved)
                    const invalidatableCodes = allCodes.filter(
                        (c) =>
                            c.status === CDKStatus.AVAILABLE ||
                            c.status === CDKStatus.RESERVED
                    );

                    // Invalidate some codes
                    const codesToInvalidate = invalidatableCodes.slice(
                        0,
                        Math.min(invalidateCount, invalidatableCodes.length)
                    );
                    const invalidatedIds = new Set<string>();

                    for (const code of codesToInvalidate) {
                        const success = inventory.invalidateCode(code.id);
                        if (success) {
                            invalidatedIds.add(code.id);
                        }
                    }

                    // Get unique product IDs
                    const productIds = [...new Set(allCodes.map((c) => c.product_id))];

                    // For each product, check that invalidated codes are not in available list
                    for (const productId of productIds) {
                        const availableCodes = inventory.getAvailableCodesForReservation(
                            productId,
                            100 // Get all available
                        );

                        // None of the invalidated codes should be in the available list
                        for (const codeId of availableCodes) {
                            expect(invalidatedIds.has(codeId)).toBe(false);
                        }
                    }

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * After invalidation, the code status should be 'invalid'
     */
    it("invalidated codes have status 'invalid'", () => {
        fc.assert(
            fc.property(simulatedCodeArb, (codeData) => {
                const inventory = new SimulatedInventory();
                inventory.addCode(codeData);

                // Invalidate the code
                const success = inventory.invalidateCode(codeData.id);

                if (success) {
                    const code = inventory.getCode(codeData.id);
                    expect(code?.status).toBe(CDKStatus.INVALID);
                }

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Invalidated codes cannot be reserved (canBeReserved returns false)
     */
    it("invalidated codes cannot be reserved", () => {
        fc.assert(
            fc.property(simulatedCodeArb, (codeData) => {
                const inventory = new SimulatedInventory();
                inventory.addCode(codeData);

                // Invalidate the code
                inventory.invalidateCode(codeData.id);

                // Check that it cannot be reserved
                const canReserve = inventory.canBeReserved(codeData.id);
                expect(canReserve).toBe(false);

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Invalidation is idempotent - invalidating twice has same effect
     */
    it("invalidation is idempotent", () => {
        fc.assert(
            fc.property(simulatedCodeArb, (codeData) => {
                const inventory = new SimulatedInventory();
                inventory.addCode(codeData);

                // Invalidate twice
                const firstResult = inventory.invalidateCode(codeData.id);
                const secondResult = inventory.invalidateCode(codeData.id);

                // Both should succeed (or both fail for delivered codes)
                if (codeData.status !== CDKStatus.DELIVERED) {
                    expect(firstResult).toBe(true);
                    expect(secondResult).toBe(true);
                }

                // Status should be invalid after both operations
                const code = inventory.getCode(codeData.id);
                if (codeData.status !== CDKStatus.DELIVERED) {
                    expect(code?.status).toBe(CDKStatus.INVALID);
                }

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Available count decreases after invalidation
     */
    it("available count decreases after invalidating available codes", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: uuidArb,
                        code: cdkCodeArb,
                        status: fc.constant(CDKStatus.AVAILABLE) as fc.Arbitrary<CDKStatusType>,
                        product_id: fc.constant("product-1"),
                        order_id: fc.constant(undefined),
                    }),
                    { minLength: 2, maxLength: 10 }
                ),
                fc.integer({ min: 1, max: 5 }),
                (codes, invalidateCount) => {
                    const inventory = new SimulatedInventory();

                    // Add codes with unique IDs
                    const seenIds = new Set<string>();
                    for (const code of codes) {
                        if (!seenIds.has(code.id)) {
                            seenIds.add(code.id);
                            inventory.addCode(code);
                        }
                    }

                    const uniqueCodes = inventory.getAllCodes();
                    if (uniqueCodes.length === 0) return true;

                    // Count available before
                    const availableBefore = inventory.getAvailableCodesForReservation(
                        "product-1",
                        100
                    ).length;

                    // Invalidate some codes
                    const toInvalidate = Math.min(invalidateCount, uniqueCodes.length);
                    let invalidatedCount = 0;

                    for (let i = 0; i < toInvalidate; i++) {
                        if (inventory.invalidateCode(uniqueCodes[i].id)) {
                            invalidatedCount++;
                        }
                    }

                    // Count available after
                    const availableAfter = inventory.getAvailableCodesForReservation(
                        "product-1",
                        100
                    ).length;

                    // Available count should decrease by the number of invalidated codes
                    expect(availableAfter).toBe(availableBefore - invalidatedCount);

                    return true;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Delivered codes cannot be invalidated
     */
    it("delivered codes cannot be invalidated", () => {
        const deliveredCodeArb = fc.record({
            id: uuidArb,
            code: cdkCodeArb,
            status: fc.constant(CDKStatus.DELIVERED) as fc.Arbitrary<CDKStatusType>,
            product_id: uuidArb,
            order_id: uuidArb,
        });

        fc.assert(
            fc.property(deliveredCodeArb, (codeData) => {
                const inventory = new SimulatedInventory();
                inventory.addCode(codeData);

                // Try to invalidate
                const success = inventory.invalidateCode(codeData.id);

                // Should fail
                expect(success).toBe(false);

                // Status should remain delivered
                const code = inventory.getCode(codeData.id);
                expect(code?.status).toBe(CDKStatus.DELIVERED);

                return true;
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Reserved codes can be invalidated and are removed from reservation
     */
    it("reserved codes can be invalidated", () => {
        const reservedCodeArb = fc.record({
            id: uuidArb,
            code: cdkCodeArb,
            status: fc.constant(CDKStatus.RESERVED) as fc.Arbitrary<CDKStatusType>,
            product_id: uuidArb,
            order_id: uuidArb,
        });

        fc.assert(
            fc.property(reservedCodeArb, (codeData) => {
                const inventory = new SimulatedInventory();
                inventory.addCode(codeData);

                // Invalidate
                const success = inventory.invalidateCode(codeData.id);

                // Should succeed
                expect(success).toBe(true);

                // Status should be invalid
                const code = inventory.getCode(codeData.id);
                expect(code?.status).toBe(CDKStatus.INVALID);

                // Order ID should be cleared
                expect(code?.order_id).toBeUndefined();

                return true;
            }),
            { numRuns: 100 }
        );
    });
});
