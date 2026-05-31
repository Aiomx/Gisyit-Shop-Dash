/**
 * Property-Based Tests for File Size Validation
 *
 * Tests the file size validation logic using fast-check for property-based testing.
 *
 * **Feature: product-detail-enhancement, Property 4: Video file size validation**
 * **Feature: product-detail-enhancement, Property 7: File size error messages contain limit info**
 * **Validates: Requirements 3.4, 4.3**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
    MAX_VIDEO_FILE_SIZE_BYTES,
    MAX_APP_FILE_SIZE_BYTES,
    MAX_IMAGE_FILE_SIZE_BYTES,
    MAX_FILE_SIZE_BYTES,
    validateFileSize,
    formatFileSize,
    getFileCategory,
    getMaxFileSizeForCategory,
    type FileCategory,
} from "./types";

/**
 * Helper to create a mock File object with specified size and type
 */
function createMockFile(size: number, type: string, name = "test-file"): File {
    // Create a minimal File-like object for testing
    return {
        size,
        type,
        name,
    } as File;
}

describe("File Size Validation - Property-Based Tests", () => {
    /**
     * **Feature: product-detail-enhancement, Property 4: Video file size validation**
     * *For any* video file, if file size exceeds 500MB, the upload should be rejected
     * with an appropriate error message.
     * **Validates: Requirements 3.4**
     */
    describe("Property 4: Video file size validation", () => {
        it("should reject video files exceeding 500MB limit", () => {
            fc.assert(
                fc.property(
                    // Generate file sizes larger than 500MB (up to 2GB for testing)
                    fc.integer({ min: MAX_VIDEO_FILE_SIZE_BYTES + 1, max: 2 * 1024 * 1024 * 1024 }),
                    // Generate video MIME types
                    fc.constantFrom("video/mp4", "video/webm", "video/quicktime"),
                    (fileSize, mimeType) => {
                        const file = createMockFile(fileSize, mimeType);
                        const error = validateFileSize(file, "video");

                        // Should return an error message
                        expect(error).not.toBeNull();
                        expect(typeof error).toBe("string");
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should accept video files within 500MB limit", () => {
            fc.assert(
                fc.property(
                    // Generate file sizes within the limit (1 byte to 500MB)
                    fc.integer({ min: 1, max: MAX_VIDEO_FILE_SIZE_BYTES }),
                    // Generate video MIME types
                    fc.constantFrom("video/mp4", "video/webm", "video/quicktime"),
                    (fileSize, mimeType) => {
                        const file = createMockFile(fileSize, mimeType);
                        const error = validateFileSize(file, "video");

                        // Should not return an error
                        expect(error).toBeNull();
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should auto-detect video category from MIME type", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: MAX_VIDEO_FILE_SIZE_BYTES + 1, max: 2 * 1024 * 1024 * 1024 }),
                    fc.constantFrom("video/mp4", "video/webm", "video/quicktime"),
                    (fileSize, mimeType) => {
                        const file = createMockFile(fileSize, mimeType);
                        // Without explicit category, should auto-detect from MIME type
                        const error = validateFileSize(file);

                        expect(error).not.toBeNull();
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * **Feature: product-detail-enhancement, Property 7: File size error messages contain limit info**
     * *For any* file that exceeds the size limit, the error message should contain
     * the maximum allowed size.
     * **Validates: Requirements 4.3**
     */
    describe("Property 7: File size error messages contain limit info", () => {
        it("should include max size in error message for oversized video files", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: MAX_VIDEO_FILE_SIZE_BYTES + 1, max: 2 * 1024 * 1024 * 1024 }),
                    (fileSize) => {
                        const file = createMockFile(fileSize, "video/mp4");
                        const error = validateFileSize(file, "video");

                        expect(error).not.toBeNull();
                        // Error message should contain the formatted max size
                        const maxSizeFormatted = formatFileSize(MAX_VIDEO_FILE_SIZE_BYTES);
                        expect(error).toContain(maxSizeFormatted);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should include max size in error message for oversized app files", () => {
            fc.assert(
                fc.property(
                    // Generate sizes larger than 10GB (up to 15GB for testing)
                    fc.integer({ min: MAX_APP_FILE_SIZE_BYTES + 1, max: 15 * 1024 * 1024 * 1024 }),
                    (fileSize) => {
                        const file = createMockFile(fileSize, "application/octet-stream");
                        const error = validateFileSize(file, "app");

                        expect(error).not.toBeNull();
                        const maxSizeFormatted = formatFileSize(MAX_APP_FILE_SIZE_BYTES);
                        expect(error).toContain(maxSizeFormatted);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should include max size in error message for oversized image files", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: MAX_IMAGE_FILE_SIZE_BYTES + 1, max: 50 * 1024 * 1024 }),
                    (fileSize) => {
                        const file = createMockFile(fileSize, "image/png");
                        const error = validateFileSize(file, "image");

                        expect(error).not.toBeNull();
                        const maxSizeFormatted = formatFileSize(MAX_IMAGE_FILE_SIZE_BYTES);
                        expect(error).toContain(maxSizeFormatted);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should include actual file size in error message", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: MAX_VIDEO_FILE_SIZE_BYTES + 1, max: 2 * 1024 * 1024 * 1024 }),
                    (fileSize) => {
                        const file = createMockFile(fileSize, "video/mp4");
                        const error = validateFileSize(file, "video");

                        expect(error).not.toBeNull();
                        // Error message should contain the actual file size
                        const fileSizeFormatted = formatFileSize(fileSize);
                        expect(error).toContain(fileSizeFormatted);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should include both actual and max size for any file category", () => {
            const categories: FileCategory[] = ["app", "video", "image", "general"];
            const categoryLimits: Record<FileCategory, number> = {
                app: MAX_APP_FILE_SIZE_BYTES,
                video: MAX_VIDEO_FILE_SIZE_BYTES,
                image: MAX_IMAGE_FILE_SIZE_BYTES,
                general: MAX_FILE_SIZE_BYTES,
            };

            fc.assert(
                fc.property(
                    fc.constantFrom(...categories),
                    (category) => {
                        const maxSize = categoryLimits[category];
                        // Generate a file size that exceeds the limit
                        const fileSize = maxSize + 1024 * 1024; // 1MB over limit
                        const file = createMockFile(fileSize, "application/octet-stream");
                        const error = validateFileSize(file, category);

                        expect(error).not.toBeNull();
                        // Should contain max size
                        expect(error).toContain(formatFileSize(maxSize));
                        // Should contain actual file size
                        expect(error).toContain(formatFileSize(fileSize));
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe("File category detection", () => {
        it("should correctly identify video MIME types", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom("video/mp4", "video/webm", "video/quicktime"),
                    (mimeType) => {
                        const category = getFileCategory(mimeType);
                        expect(category).toBe("video");
                    }
                ),
                { numRuns: 50 }
            );
        });

        it("should correctly identify image MIME types", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom("image/jpeg", "image/png", "image/gif", "image/webp"),
                    (mimeType) => {
                        const category = getFileCategory(mimeType);
                        expect(category).toBe("image");
                    }
                ),
                { numRuns: 50 }
            );
        });

        it("should return correct max size for each category", () => {
            expect(getMaxFileSizeForCategory("app")).toBe(MAX_APP_FILE_SIZE_BYTES);
            expect(getMaxFileSizeForCategory("video")).toBe(MAX_VIDEO_FILE_SIZE_BYTES);
            expect(getMaxFileSizeForCategory("image")).toBe(MAX_IMAGE_FILE_SIZE_BYTES);
            expect(getMaxFileSizeForCategory("general")).toBe(MAX_FILE_SIZE_BYTES);
        });
    });

    describe("formatFileSize utility", () => {
        it("should format bytes correctly", () => {
            expect(formatFileSize(0)).toBe("0 B");
            expect(formatFileSize(1024)).toBe("1 KB");
            expect(formatFileSize(1024 * 1024)).toBe("1 MB");
            expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
        });

        it("should handle arbitrary byte values", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 15 * 1024 * 1024 * 1024 }),
                    (bytes) => {
                        const formatted = formatFileSize(bytes);
                        // Should return a non-empty string
                        expect(formatted.length).toBeGreaterThan(0);
                        // Should contain a unit
                        expect(formatted).toMatch(/\d+(\.\d+)?\s*(B|KB|MB|GB|TB)/);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
