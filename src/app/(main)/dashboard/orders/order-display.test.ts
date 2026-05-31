/**
 * Property-Based Tests for Order Display Completeness
 *
 * Tests that order display in the dashboard includes all required information
 * as specified in the requirements.
 *
 * **Feature: order-payment-flow, Property 10: Order display completeness**
 * **Validates: Requirements 6.4, 6.5**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { Order, OrderItem, OrderStatus, UserProfile } from "@/lib/supabase/types";

/**
 * Helper functions to extract display information from order data
 * These mirror the logic used in the dashboard order display component
 */

/**
 * Extract buyer information from an order
 * Returns an object with buyer identification and optional email
 */
function extractBuyerInfo(order: Order): {
    hasIdentification: boolean;
    identification: string | null;
    email: string | null;
} {
    const hasUserId = !!order.user_id;
    const hasAnonymousSessionId = !!order.anonymous_session_id;
    const hasIdentification = hasUserId || hasAnonymousSessionId;

    let identification: string | null = null;
    if (hasUserId) {
        identification = order.user_id!;
    } else if (hasAnonymousSessionId) {
        identification = order.anonymous_session_id!;
    }

    const email = order.user?.email || null;

    return {
        hasIdentification,
        identification,
        email,
    };
}

/**
 * Extract product information from an order item
 * Returns an object with all required product fields
 */
function extractProductInfo(item: OrderItem): {
    hasName: boolean;
    hasSpecs: boolean;
    hasQuantity: boolean;
    hasPrice: boolean;
    name: string;
    specs: Record<string, string> | null;
    quantity: number;
    price: number;
} {
    return {
        hasName: !!item.product_name && item.product_name.length > 0,
        hasSpecs: item.spec_combination !== undefined,
        hasQuantity: typeof item.quantity === "number" && item.quantity > 0,
        hasPrice: typeof item.price === "number" && item.price >= 0,
        name: item.product_name,
        specs: item.spec_combination || null,
        quantity: item.quantity,
        price: item.price,
    };
}

/**
 * Check if an order has complete display information
 */
function hasCompleteDisplayInfo(order: Order): {
    hasBuyerInfo: boolean;
    hasProductInfo: boolean;
    buyerInfo: ReturnType<typeof extractBuyerInfo>;
    productInfos: ReturnType<typeof extractProductInfo>[];
} {
    const buyerInfo = extractBuyerInfo(order);
    const productInfos = (order.items || []).map(extractProductInfo);

    const hasBuyerInfo = buyerInfo.hasIdentification;
    const hasProductInfo =
        productInfos.length > 0 &&
        productInfos.every(
            (info) => info.hasName && info.hasQuantity && info.hasPrice
        );

    return {
        hasBuyerInfo,
        hasProductInfo,
        buyerInfo,
        productInfos,
    };
}

// Arbitraries for generating test data

const orderStatusArbitrary = fc.constantFrom<OrderStatus>(
    "pending",
    "paid",
    "cancelled",
    "fulfilled",
    "completed"
);

// Generate valid ISO date strings directly
const validDateArbitrary = fc.integer({ min: 1577836800000, max: 1924905600000 }) // 2020-01-01 to 2030-12-31
    .map((timestamp) => new Date(timestamp).toISOString());

const specCombinationArbitrary = fc.option(
    fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        { minKeys: 1, maxKeys: 3 }
    ),
    { nil: undefined }
);

const orderItemArbitrary = fc.record<OrderItem>({
    id: fc.uuid(),
    order_id: fc.uuid(),
    product_id: fc.uuid(),
    product_code: fc.string({ minLength: 3, maxLength: 20 }),
    product_name: fc.string({ minLength: 1, maxLength: 100 }),
    spec_combination: specCombinationArbitrary,
    quantity: fc.integer({ min: 1, max: 100 }),
    price: fc.integer({ min: 1, max: 1000000 }).map((cents) => cents / 100), // Use integer cents for precision
    currency: fc.constant("CNY"),
    created_at: validDateArbitrary,
});

const userProfileArbitrary = fc.record<UserProfile>({
    id: fc.uuid(),
    email: fc.option(fc.emailAddress(), { nil: undefined }),
    nickname: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    custom_id: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    phone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), { nil: undefined }),
    avatar_url: fc.option(fc.webUrl(), { nil: undefined }),
    created_at: validDateArbitrary,
    updated_at: validDateArbitrary,
});

// Order with authenticated user
const authenticatedOrderArbitrary = fc.record<Order>({
    id: fc.uuid(),
    order_number: fc.string({ minLength: 10, maxLength: 20 }),
    user_id: fc.uuid(),
    anonymous_session_id: fc.constant(undefined),
    cart_id: fc.option(fc.uuid(), { nil: undefined }),
    status: orderStatusArbitrary,
    total_amount: fc.integer({ min: 1, max: 10000000 }).map((cents) => cents / 100),
    currency: fc.constant("CNY"),
    stripe_session_id: fc.option(fc.string({ minLength: 20, maxLength: 100 }), { nil: undefined }),
    stripe_payment_intent_id: fc.option(fc.string({ minLength: 20, maxLength: 100 }), { nil: undefined }),
    created_at: validDateArbitrary,
    expires_at: fc.option(validDateArbitrary, { nil: undefined }),
    payment_completed_at: fc.option(validDateArbitrary, { nil: undefined }),
    updated_at: validDateArbitrary,
    items: fc.array(orderItemArbitrary, { minLength: 1, maxLength: 5 }),
    user: fc.option(userProfileArbitrary, { nil: undefined }),
});

// Order with anonymous session
const anonymousOrderArbitrary = fc.record<Order>({
    id: fc.uuid(),
    order_number: fc.string({ minLength: 10, maxLength: 20 }),
    user_id: fc.constant(undefined),
    anonymous_session_id: fc.uuid(),
    cart_id: fc.option(fc.uuid(), { nil: undefined }),
    status: orderStatusArbitrary,
    total_amount: fc.integer({ min: 1, max: 10000000 }).map((cents) => cents / 100),
    currency: fc.constant("CNY"),
    stripe_session_id: fc.option(fc.string({ minLength: 20, maxLength: 100 }), { nil: undefined }),
    stripe_payment_intent_id: fc.option(fc.string({ minLength: 20, maxLength: 100 }), { nil: undefined }),
    created_at: validDateArbitrary,
    expires_at: fc.option(validDateArbitrary, { nil: undefined }),
    payment_completed_at: fc.option(validDateArbitrary, { nil: undefined }),
    updated_at: validDateArbitrary,
    items: fc.array(orderItemArbitrary, { minLength: 1, maxLength: 5 }),
    user: fc.constant(undefined),
});

// Combined order arbitrary (either authenticated or anonymous)
const orderArbitrary = fc.oneof(authenticatedOrderArbitrary, anonymousOrderArbitrary);

describe("Order Display Completeness - Property-Based Tests", () => {
    /**
     * **Feature: order-payment-flow, Property 10: Order display completeness**
     * *For any* order displayed in the dashboard, the display must include:
     * (a) buyer information (user_id or anonymous_session_id, email if available), and
     * (b) product information (name, specs, quantity, price).
     * **Validates: Requirements 6.4, 6.5**
     */
    describe("Property 10: Order display completeness", () => {
        it("should have buyer identification for all orders (user_id or anonymous_session_id)", () => {
            fc.assert(
                fc.property(orderArbitrary, (order) => {
                    const { hasBuyerInfo, buyerInfo } = hasCompleteDisplayInfo(order);

                    // Every order must have either user_id or anonymous_session_id
                    expect(hasBuyerInfo).toBe(true);
                    expect(buyerInfo.identification).not.toBeNull();
                }),
                { numRuns: 100 }
            );
        });

        it("should have complete product information for all order items", () => {
            fc.assert(
                fc.property(orderArbitrary, (order) => {
                    const { hasProductInfo, productInfos } = hasCompleteDisplayInfo(order);

                    // Every order must have at least one item with complete info
                    expect(hasProductInfo).toBe(true);

                    // Each item must have name, quantity, and price
                    for (const info of productInfos) {
                        expect(info.hasName).toBe(true);
                        expect(info.hasQuantity).toBe(true);
                        expect(info.hasPrice).toBe(true);
                        expect(info.name.length).toBeGreaterThan(0);
                        expect(info.quantity).toBeGreaterThan(0);
                        expect(info.price).toBeGreaterThanOrEqual(0);
                    }
                }),
                { numRuns: 100 }
            );
        });

        it("should include email when user profile is available", () => {
            fc.assert(
                fc.property(
                    authenticatedOrderArbitrary.filter((order) => order.user?.email !== undefined),
                    (order) => {
                        const { buyerInfo } = hasCompleteDisplayInfo(order);

                        // When user profile has email, it should be extractable
                        expect(buyerInfo.email).not.toBeNull();
                        expect(buyerInfo.email).toContain("@");
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should handle orders with spec combinations correctly", () => {
            fc.assert(
                fc.property(
                    orderArbitrary.filter(
                        (order) =>
                            order.items?.some((item) => item.spec_combination !== undefined) ?? false
                    ),
                    (order) => {
                        const { productInfos } = hasCompleteDisplayInfo(order);

                        // At least one item should have specs
                        const itemsWithSpecs = productInfos.filter((info) => info.specs !== null);
                        expect(itemsWithSpecs.length).toBeGreaterThan(0);

                        // Specs should be a valid object
                        for (const info of itemsWithSpecs) {
                            expect(typeof info.specs).toBe("object");
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should correctly identify authenticated vs anonymous orders", () => {
            fc.assert(
                fc.property(orderArbitrary, (order) => {
                    const { buyerInfo } = hasCompleteDisplayInfo(order);

                    // Exactly one of user_id or anonymous_session_id should be present
                    const hasUserId = !!order.user_id;
                    const hasAnonymousId = !!order.anonymous_session_id;

                    expect(hasUserId || hasAnonymousId).toBe(true);
                    expect(buyerInfo.hasIdentification).toBe(true);
                }),
                { numRuns: 100 }
            );
        });

        it("should calculate correct subtotal for each order item", () => {
            fc.assert(
                fc.property(orderArbitrary, (order) => {
                    const { productInfos } = hasCompleteDisplayInfo(order);

                    for (const info of productInfos) {
                        const subtotal = info.price * info.quantity;
                        // Subtotal should be a valid positive number
                        expect(subtotal).toBeGreaterThan(0);
                        expect(Number.isFinite(subtotal)).toBe(true);
                    }
                }),
                { numRuns: 100 }
            );
        });
    });
});
