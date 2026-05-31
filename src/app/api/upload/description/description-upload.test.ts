/**
 * Property-Based Tests for Description Media Upload
 *
 * Tests the media upload validation logic using fast-check for property-based testing.
 *
 * **Feature: product-verification-description, Property 6: Supported Media Format Validation**
 * **Feature: product-verification-description, Property 7: Media File Size Validation**
 * **Feature: product-verification-description, Property 8: Storage Path Structure**
 * **Validates: Requirements 5.5, 5.6, 8.1, 8.2, 8.4**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
    isValidFileType,
    isValidFileSize,
    generateStoragePath,
} from "./route";

// Constants for testing
const IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const VIDEO_MAX_SIZE = 100 * 1024 * 1024; // 100MB

// Supported MIME types
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const SUPPORTED_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES];

// Unsupported MIME types for testing
const UNSUPPORTED_TYPES = [
    "application/pdf",
    "application/zip",
    "text/plain",
    "text/html",
    "audio/mp3",
    "audio/wav",
    "video/avi",
    "video/mkv",
    "image/bmp",
    "image/tiff",
    "application/octet-stream",
];

describe("Description Media Upload - Property-Based Tests", () => {
    /**
     * **Feature: product-verification-description, Property 6: Supported Media Format Validation**
     * *For any* file upload attempt, the system SHALL accept files with extensions in
     * {jpg, jpeg, png, gif, webp, mp4, webm} and reject files with other extensions.
     * **Validates: Requirements 5.5, 5.6**
     */
    describe("Property 6: Supported Media Format Validation", () => {
        it("should accept all supported image formats", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...SUPPORTED_IMAGE_TYPES),
                    (mimeType) => {
                        const result = isValidFileType(mimeType);
                        expect(result).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should accept all supported video formats", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...SUPPORTED_VIDEO_TYPES),
                    (mimeType) => {
                        const result = isValidFileType(mimeType);
                        expect(result).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should reject unsupported file formats", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...UNSUPPORTED_TYPES),
                    (mimeType) => {
                        const result = isValidFileType(mimeType);
                        expect(result).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should reject arbitrary MIME types not in supported list", () => {
            fc.assert(
                fc.property(
                    // Generate random MIME types that are not in our supported list
                    fc.string({ minLength: 1, maxLength: 50 }).filter(
                        (s) => !SUPPORTED_TYPES.includes(s)
                    ),
                    (mimeType) => {
                        const result = isValidFileType(mimeType);
                        expect(result).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * **Feature: product-verification-description, Property 7: Media File Size Validation**
     * *For any* file upload attempt, the system SHALL accept image files up to 10MB
     * and video files up to 100MB, and reject files exceeding these limits.
     * **Validates: Requirements 8.4**
     */
    describe("Property 7: Media File Size Validation", () => {
        it("should accept image files within 10MB limit", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...SUPPORTED_IMAGE_TYPES),
                    fc.integer({ min: 1, max: IMAGE_MAX_SIZE }),
                    (mimeType, fileSize) => {
                        const result = isValidFileSize(mimeType, fileSize);
                        expect(result).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should reject image files exceeding 10MB limit", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...SUPPORTED_IMAGE_TYPES),
                    fc.integer({ min: IMAGE_MAX_SIZE + 1, max: IMAGE_MAX_SIZE * 2 }),
                    (mimeType, fileSize) => {
                        const result = isValidFileSize(mimeType, fileSize);
                        expect(result).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should accept video files within 100MB limit", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...SUPPORTED_VIDEO_TYPES),
                    fc.integer({ min: 1, max: VIDEO_MAX_SIZE }),
                    (mimeType, fileSize) => {
                        const result = isValidFileSize(mimeType, fileSize);
                        expect(result).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should reject video files exceeding 100MB limit", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...SUPPORTED_VIDEO_TYPES),
                    fc.integer({ min: VIDEO_MAX_SIZE + 1, max: VIDEO_MAX_SIZE * 2 }),
                    (mimeType, fileSize) => {
                        const result = isValidFileSize(mimeType, fileSize);
                        expect(result).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should reject unsupported file types regardless of size", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...UNSUPPORTED_TYPES),
                    fc.integer({ min: 1, max: 1024 * 1024 }), // Small file size
                    (mimeType, fileSize) => {
                        const result = isValidFileSize(mimeType, fileSize);
                        expect(result).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should handle boundary cases for image files", () => {
            // Exactly at limit should be accepted
            SUPPORTED_IMAGE_TYPES.forEach((mimeType) => {
                expect(isValidFileSize(mimeType, IMAGE_MAX_SIZE)).toBe(true);
                expect(isValidFileSize(mimeType, IMAGE_MAX_SIZE + 1)).toBe(false);
            });
        });

        it("should handle boundary cases for video files", () => {
            // Exactly at limit should be accepted
            SUPPORTED_VIDEO_TYPES.forEach((mimeType) => {
                expect(isValidFileSize(mimeType, VIDEO_MAX_SIZE)).toBe(true);
                expect(isValidFileSize(mimeType, VIDEO_MAX_SIZE + 1)).toBe(false);
            });
        });
    });

    /**
     * **Feature: product-verification-description, Property 8: Storage Path Structure**
     * *For any* uploaded media file, the storage path SHALL follow the pattern
     * `product-descriptions/{product_id}/{unique_filename}`.
     * **Validates: Requirements 8.1, 8.2**
     */
    describe("Property 8: Storage Path Structure", () => {
        it("should generate paths following the correct pattern", () => {
            fc.assert(
                fc.property(
                    // Generate random product IDs (UUID-like strings)
                    fc.uuid(),
                    fc.constantFrom(...SUPPORTED_TYPES),
                    (productId, mimeType) => {
                        const path = generateStoragePath(productId, mimeType);

                        // Path should start with product-descriptions/
                        expect(path.startsWith("product-descriptions/")).toBe(true);

                        // Path should contain the product ID
                        expect(path.includes(productId)).toBe(true);

                        // Path should follow pattern: product-descriptions/{productId}/{filename}
                        const parts = path.split("/");
                        expect(parts.length).toBe(3);
                        expect(parts[0]).toBe("product-descriptions");
                        expect(parts[1]).toBe(productId);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should generate unique filenames for the same product", () => {
            fc.assert(
                fc.property(
                    fc.uuid(),
                    fc.constantFrom(...SUPPORTED_TYPES),
                    (productId, mimeType) => {
                        const path1 = generateStoragePath(productId, mimeType);
                        const path2 = generateStoragePath(productId, mimeType);

                        // Paths should be different (unique filenames)
                        expect(path1).not.toBe(path2);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should use correct file extension based on MIME type", () => {
            const mimeToExtension: Record<string, string> = {
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/gif": "gif",
                "image/webp": "webp",
                "video/mp4": "mp4",
                "video/webm": "webm",
            };

            fc.assert(
                fc.property(
                    fc.uuid(),
                    fc.constantFrom(...SUPPORTED_TYPES),
                    (productId, mimeType) => {
                        const path = generateStoragePath(productId, mimeType);
                        const expectedExtension = mimeToExtension[mimeType];

                        // Path should end with the correct extension
                        expect(path.endsWith(`.${expectedExtension}`)).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should generate valid UUID-based filenames", () => {
            fc.assert(
                fc.property(
                    fc.uuid(),
                    fc.constantFrom(...SUPPORTED_TYPES),
                    (productId, mimeType) => {
                        const path = generateStoragePath(productId, mimeType);
                        const parts = path.split("/");
                        const filename = parts[2];

                        // Filename should contain a UUID pattern
                        // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\./i;
                        expect(uuidPattern.test(filename)).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
