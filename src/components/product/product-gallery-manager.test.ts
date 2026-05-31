/**
 * Property-Based Tests for Product Gallery Manager
 * 
 * Tests the correctness properties for image management functionality.
 * 
 * **Feature: product-detail-enhancement, Property 5: Image order persistence**
 * **Feature: product-detail-enhancement, Property 6: Single primary image constraint**
 * **Feature: product-detail-enhancement, Property 10: Image deletion cascade**
 * **Validates: Requirements 3.2, 5.3, 5.4**
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import fc from "fast-check";

// Mock types for testing
interface MockProductImage {
    id: string;
    product_id: string;
    image_url: string;
    alt_text?: string;
    is_primary: boolean;
    sort_order: number;
    created_at: string;
}

// Helper functions for testing image management logic
function reorderImages(images: MockProductImage[], fromIndex: number, toIndex: number): MockProductImage[] {
    const newImages = [...images];
    const draggedImage = newImages[fromIndex];
    newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, draggedImage);

    // Update sort_order for all images
    return newImages.map((img, index) => ({
        ...img,
        sort_order: index
    }));
}

function setPrimaryImage(images: MockProductImage[], targetId: string): MockProductImage[] {
    return images.map(img => ({
        ...img,
        is_primary: img.id === targetId
    }));
}

function deleteImage(images: MockProductImage[], targetId: string): MockProductImage[] {
    const filtered = images.filter(img => img.id !== targetId);

    // If deleted image was primary and there are remaining images, set first as primary
    const deletedImage = images.find(img => img.id === targetId);
    if (deletedImage?.is_primary && filtered.length > 0) {
        const sortedRemaining = filtered.sort((a, b) => a.sort_order - b.sort_order);
        return filtered.map(img => ({
            ...img,
            is_primary: img.id === sortedRemaining[0].id
        }));
    }

    return filtered;
}

// Generators for property-based testing
const imageIdArb = fc.string({ minLength: 1, maxLength: 36 });
const productIdArb = fc.string({ minLength: 1, maxLength: 36 });
const urlArb = fc.webUrl();
const sortOrderArb = fc.integer({ min: 0, max: 100 });

const productImageArb = fc.record({
    id: imageIdArb,
    product_id: productIdArb,
    image_url: urlArb,
    alt_text: fc.option(fc.string({ maxLength: 200 })),
    is_primary: fc.boolean(),
    sort_order: sortOrderArb,
    created_at: fc.constant('2024-01-01T00:00:00.000Z') // Use fixed date for testing
});

const imageListArb = fc.array(productImageArb, { minLength: 1, maxLength: 10 })
    .map(images => images.map((img, index) => ({
        ...img,
        sort_order: index,
        id: `img_${index}` // Ensure unique IDs for testing
    })));

describe("Product Gallery Manager Properties", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Property 5: Image order persistence", () => {
        it("should maintain consistent sort_order values after reordering", () => {
            fc.assert(fc.property(
                imageListArb,
                fc.integer({ min: 0, max: 9 }),
                fc.integer({ min: 0, max: 9 }),
                (images, fromIndex, toIndex) => {
                    // Ensure indices are valid
                    const validFromIndex = fromIndex % images.length;
                    const validToIndex = toIndex % images.length;

                    const reordered = reorderImages(images, validFromIndex, validToIndex);

                    // Property: After reordering, sort_order should be sequential from 0
                    const sortOrders = reordered.map(img => img.sort_order).sort((a, b) => a - b);
                    const expectedOrders = Array.from({ length: reordered.length }, (_, i) => i);

                    expect(sortOrders).toEqual(expectedOrders);

                    // Property: All original images should still be present
                    expect(reordered.length).toBe(images.length);

                    // Property: Each image should have a unique sort_order
                    const uniqueSortOrders = new Set(reordered.map(img => img.sort_order));
                    expect(uniqueSortOrders.size).toBe(reordered.length);
                }
            ), { numRuns: 100 });
        });

        it("should preserve image identity during reordering", () => {
            fc.assert(fc.property(
                imageListArb,
                fc.integer({ min: 0, max: 9 }),
                fc.integer({ min: 0, max: 9 }),
                (images, fromIndex, toIndex) => {
                    const validFromIndex = fromIndex % images.length;
                    const validToIndex = toIndex % images.length;

                    const reordered = reorderImages(images, validFromIndex, validToIndex);

                    // Property: All original image IDs should be preserved
                    const originalIds = new Set(images.map(img => img.id));
                    const reorderedIds = new Set(reordered.map(img => img.id));

                    expect(reorderedIds).toEqual(originalIds);

                    // Property: Non-sort_order properties should remain unchanged
                    for (const reorderedImg of reordered) {
                        const originalImg = images.find(img => img.id === reorderedImg.id);
                        expect(originalImg).toBeDefined();
                        expect(reorderedImg.id).toBe(originalImg!.id);
                        expect(reorderedImg.product_id).toBe(originalImg!.product_id);
                        expect(reorderedImg.image_url).toBe(originalImg!.image_url);
                        expect(reorderedImg.alt_text).toBe(originalImg!.alt_text);
                        expect(reorderedImg.created_at).toBe(originalImg!.created_at);
                    }
                }
            ), { numRuns: 100 });
        });
    });

    describe("Property 6: Single primary image constraint", () => {
        it("should ensure at most one image is primary at any time", () => {
            fc.assert(fc.property(
                imageListArb,
                imageIdArb,
                (images, targetId) => {
                    // Use an existing image ID if available, otherwise use the generated one
                    const actualTargetId = images.length > 0 ? images[0].id : targetId;

                    const updated = setPrimaryImage(images, actualTargetId);

                    // Property: At most one image should be primary
                    const primaryImages = updated.filter(img => img.is_primary);
                    expect(primaryImages.length).toBeLessThanOrEqual(1);

                    // Property: If target image exists, it should be the only primary
                    const targetExists = updated.some(img => img.id === actualTargetId);
                    if (targetExists) {
                        expect(primaryImages.length).toBe(1);
                        expect(primaryImages[0].id).toBe(actualTargetId);
                    }
                }
            ), { numRuns: 100 });
        });

        it("should unset all other primary images when setting a new primary", () => {
            fc.assert(fc.property(
                imageListArb.filter(images => images.length >= 2),
                (images) => {
                    // Set multiple images as primary initially
                    const multiPrimary = images.map((img, index) => ({
                        ...img,
                        is_primary: index < 2 // First two images are primary
                    }));

                    // Set the last image as primary
                    const lastImageId = multiPrimary[multiPrimary.length - 1].id;
                    const updated = setPrimaryImage(multiPrimary, lastImageId);

                    // Property: Only the target image should be primary
                    const primaryImages = updated.filter(img => img.is_primary);
                    expect(primaryImages.length).toBe(1);
                    expect(primaryImages[0].id).toBe(lastImageId);
                }
            ), { numRuns: 100 });
        });
    });

    describe("Property 10: Image deletion cascade", () => {
        it("should remove the target image completely", () => {
            fc.assert(fc.property(
                imageListArb,
                (images) => {
                    if (images.length === 0) return; // Skip empty arrays

                    const targetId = images[0].id;
                    const remaining = deleteImage(images, targetId);

                    // Property: Target image should be completely removed
                    expect(remaining.some(img => img.id === targetId)).toBe(false);

                    // Property: Remaining count should be one less
                    expect(remaining.length).toBe(images.length - 1);

                    // Property: All other images should be preserved
                    const otherImages = images.filter(img => img.id !== targetId);
                    const remainingIds = new Set(remaining.map(img => img.id));
                    const otherIds = new Set(otherImages.map(img => img.id));
                    expect(remainingIds).toEqual(otherIds);
                }
            ), { numRuns: 100 });
        });

        it("should handle primary image deletion correctly", () => {
            fc.assert(fc.property(
                imageListArb.filter(images => images.length >= 2),
                (images) => {
                    // Set first image as primary
                    const withPrimary = images.map((img, index) => ({
                        ...img,
                        is_primary: index === 0
                    }));

                    const primaryId = withPrimary[0].id;
                    const remaining = deleteImage(withPrimary, primaryId);

                    // Property: If there are remaining images, exactly one should be primary
                    if (remaining.length > 0) {
                        const primaryCount = remaining.filter(img => img.is_primary).length;
                        expect(primaryCount).toBe(1);

                        // Property: The new primary should be the first in sort order
                        const sortedRemaining = remaining.sort((a, b) => a.sort_order - b.sort_order);
                        expect(sortedRemaining[0].is_primary).toBe(true);
                    }
                }
            ), { numRuns: 100 });
        });

        it("should handle deletion of non-primary images without affecting primary status", () => {
            fc.assert(fc.property(
                imageListArb.filter(images => images.length >= 2),
                (images) => {
                    // Set first image as primary
                    const withPrimary = images.map((img, index) => ({
                        ...img,
                        is_primary: index === 0
                    }));

                    // Delete a non-primary image (second image)
                    const nonPrimaryId = withPrimary[1].id;
                    const remaining = deleteImage(withPrimary, nonPrimaryId);

                    // Property: Primary image should remain unchanged
                    const primaryImages = remaining.filter(img => img.is_primary);
                    expect(primaryImages.length).toBe(1);
                    expect(primaryImages[0].id).toBe(withPrimary[0].id);
                }
            ), { numRuns: 100 });
        });
    });
});