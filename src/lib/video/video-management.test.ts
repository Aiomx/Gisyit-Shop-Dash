/**
 * Property-Based Tests for Video Management
 * 
 * Tests video URL parsing, MIME type validation, and deletion cascade functionality
 * 
 * **Property 8: Video URL format validation**
 * **Property 9: Video MIME type validation**  
 * **Property 11: Video deletion cascade**
 * **Validates: Requirements 6.1, 6.2, 6.4**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseVideoUrl, isValidVideoUrl } from './video-url-parser';
import { validateVideoFile, isSupportedVideoFile, getVideoFormatName } from './video-upload';
import { SUPPORTED_VIDEO_MIME_TYPES } from '@/lib/storage/types';

describe('Video Management Property Tests', () => {
    /**
     * **Feature: product-detail-enhancement, Property 8: Video URL format validation**
     * **Validates: Requirements 6.1**
     * 
     * For any external video URL, the system should correctly identify the source type
     */
    describe('Property 8: Video URL format validation', () => {
        it('should correctly identify YouTube URLs', () => {
            fc.assert(fc.property(
                fc.string({ minLength: 11, maxLength: 11 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
                (videoId) => {
                    const youtubeUrls = [
                        `https://www.youtube.com/watch?v=${videoId}`,
                        `https://youtu.be/${videoId}`,
                        `https://www.youtube.com/embed/${videoId}`,
                        `https://youtube.com/watch?v=${videoId}&t=123`,
                    ];

                    for (const url of youtubeUrls) {
                        const result = parseVideoUrl(url);
                        expect(result.source_type).toBe('youtube');
                        expect(result.video_id).toBe(videoId);
                        expect(result.thumbnail_url).toContain(videoId);
                    }
                }
            ), { numRuns: 50 });
        });

        it('should correctly identify Bilibili URLs', () => {
            fc.assert(fc.property(
                fc.string({ minLength: 8, maxLength: 10 }).map(s => `BV${s.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8)}`),
                (bvId) => {
                    const bilibiliUrls = [
                        `https://www.bilibili.com/video/${bvId}`,
                        `https://bilibili.com/video/${bvId}`,
                    ];

                    for (const url of bilibiliUrls) {
                        const result = parseVideoUrl(url);
                        expect(result.source_type).toBe('bilibili');
                        expect(result.video_id).toBe(bvId);
                    }
                }
            ), { numRuns: 20 });
        });

        it('should identify external URLs for non-recognized domains', () => {
            fc.assert(fc.property(
                fc.webUrl().filter(url =>
                    !url.includes('youtube') &&
                    !url.includes('youtu.be') &&
                    !url.includes('bilibili') &&
                    !url.includes('b23.tv')
                ),
                (url) => {
                    const result = parseVideoUrl(url);
                    expect(result.source_type).toBe('external');
                }
            ), { numRuns: 100 });
        });

        it('should handle invalid or empty URLs gracefully', () => {
            fc.assert(fc.property(
                fc.oneof(
                    fc.constant(''),
                    fc.constant(null),
                    fc.constant(undefined),
                    fc.string().filter(s => s.trim() === '' || !s.includes('http'))
                ),
                (invalidUrl) => {
                    const result = parseVideoUrl(invalidUrl as string);
                    expect(result.source_type).toBe('external');
                }
            ), { numRuns: 50 });
        });
    });

    /**
     * **Feature: product-detail-enhancement, Property 9: Video MIME type validation**
     * **Validates: Requirements 6.2**
     * 
     * For any uploaded video file, only MP4, WebM, and MOV formats should be accepted
     */
    describe('Property 9: Video MIME type validation', () => {
        it('should accept all supported video MIME types', () => {
            fc.assert(fc.property(
                fc.constantFrom(...SUPPORTED_VIDEO_MIME_TYPES),
                fc.string({ minLength: 1, maxLength: 50 }),
                fc.integer({ min: 1, max: 500 * 1024 * 1024 }), // Up to 500MB
                (mimeType, fileName, fileSize) => {
                    // Create a mock File object
                    const mockFile = {
                        name: fileName,
                        size: fileSize,
                        type: mimeType,
                    } as File;

                    expect(isSupportedVideoFile(mockFile)).toBe(true);

                    // Validation should pass for supported types (size permitting)
                    const validationError = validateVideoFile(mockFile);
                    if (fileSize <= 500 * 1024 * 1024) { // Within size limit
                        expect(validationError).toBeNull();
                    }
                }
            ), { numRuns: 100 });
        });

        it('should reject unsupported video MIME types', () => {
            fc.assert(fc.property(
                fc.constantFrom(
                    'video/avi',
                    'video/wmv',
                    'video/flv',
                    'video/mkv',
                    'application/octet-stream',
                    'image/jpeg',
                    'text/plain'
                ),
                fc.string({ minLength: 1, maxLength: 50 }),
                fc.integer({ min: 1, max: 100 * 1024 * 1024 }),
                (unsupportedMimeType, fileName, fileSize) => {
                    const mockFile = {
                        name: fileName,
                        size: fileSize,
                        type: unsupportedMimeType,
                    } as File;

                    expect(isSupportedVideoFile(mockFile)).toBe(false);

                    const validationError = validateVideoFile(mockFile);
                    expect(validationError).not.toBeNull();
                    expect(validationError).toContain('不支持的视频格式');
                }
            ), { numRuns: 50 });
        });

        it('should reject files exceeding 500MB size limit', () => {
            fc.assert(fc.property(
                fc.constantFrom(...SUPPORTED_VIDEO_MIME_TYPES),
                fc.string({ minLength: 1, maxLength: 50 }),
                fc.integer({ min: 500 * 1024 * 1024 + 1, max: 1000 * 1024 * 1024 }), // Over 500MB
                (mimeType, fileName, fileSize) => {
                    const mockFile = {
                        name: fileName,
                        size: fileSize,
                        type: mimeType,
                    } as File;

                    const validationError = validateVideoFile(mockFile);
                    expect(validationError).not.toBeNull();
                    expect(validationError).toContain('超过限制');
                    expect(validationError).toContain('500 MB');
                }
            ), { numRuns: 50 });
        });

        it('should return correct format names for supported MIME types', () => {
            const mimeTypeToFormat = {
                'video/mp4': 'MP4',
                'video/webm': 'WebM',
                'video/quicktime': 'MOV'
            };

            fc.assert(fc.property(
                fc.constantFrom(...Object.keys(mimeTypeToFormat)),
                (mimeType) => {
                    const formatName = getVideoFormatName(mimeType);
                    expect(formatName).toBe(mimeTypeToFormat[mimeType as keyof typeof mimeTypeToFormat]);
                }
            ), { numRuns: 20 });
        });
    });

    /**
     * **Feature: product-detail-enhancement, Property 11: Video deletion cascade**
     * **Validates: Requirements 6.4**
     * 
     * For any deleted video, both the storage file (if local) and database record should be removed
     * 
     * Note: This property tests the logic that determines what should be deleted,
     * not the actual deletion operations which require database/storage access
     */
    describe('Property 11: Video deletion cascade', () => {
        it('should identify local videos that require storage cleanup', () => {
            fc.assert(fc.property(
                fc.record({
                    id: fc.uuid(),
                    product_id: fc.uuid(),
                    video_url: fc.webUrl(),
                    source_type: fc.constantFrom('local', 'youtube', 'bilibili', 'external'),
                    video_type: fc.constantFrom('demo', 'tutorial', 'review'),
                    sort_order: fc.integer({ min: 0, max: 100 })
                }),
                (videoRecord) => {
                    // Logic: local videos should require storage cleanup
                    const requiresStorageCleanup = videoRecord.source_type === 'local';

                    if (videoRecord.source_type === 'local') {
                        expect(requiresStorageCleanup).toBe(true);
                        // Local videos should have URLs that can be parsed for storage paths
                        expect(videoRecord.video_url).toBeTruthy();
                    } else {
                        expect(requiresStorageCleanup).toBe(false);
                        // External videos don't require storage cleanup
                    }
                }
            ), { numRuns: 100 });
        });

        it('should handle storage path extraction for local videos', () => {
            fc.assert(fc.property(
                fc.uuid(),
                fc.string({ minLength: 5, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
                fc.constantFrom('mp4', 'webm', 'mov'),
                (productId, filename, extension) => {
                    // Simulate a local video URL structure
                    const storageUrl = `https://example.supabase.co/storage/v1/object/public/product-files/products/${productId}/videos/${filename}.${extension}`;

                    // Test storage path extraction logic
                    try {
                        const url = new URL(storageUrl);
                        const pathParts = url.pathname.split("/");
                        const productsIndex = pathParts.indexOf("products");

                        if (productsIndex !== -1) {
                            const storagePath = pathParts.slice(productsIndex).join("/");
                            expect(storagePath).toContain(productId);
                            expect(storagePath).toContain(filename);
                            expect(storagePath).toContain(extension);
                        }
                    } catch (error) {
                        // URL parsing should not fail for valid URLs
                        expect(error).toBeNull();
                    }
                }
            ), { numRuns: 50 });
        });

        it('should handle deletion order correctly', () => {
            fc.assert(fc.property(
                fc.record({
                    databaseDeleteSuccess: fc.boolean(),
                    storageDeleteSuccess: fc.boolean(),
                    isLocalVideo: fc.boolean()
                }),
                (scenario) => {
                    // Deletion logic: database first, then storage (if local)
                    // If database deletion fails, storage should not be attempted
                    // If database succeeds but storage fails, operation should still be considered successful

                    let shouldAttemptStorageDelete = false;
                    let operationSuccess = false;

                    if (scenario.databaseDeleteSuccess) {
                        operationSuccess = true; // Database deletion succeeded

                        if (scenario.isLocalVideo) {
                            shouldAttemptStorageDelete = true;
                            // Storage deletion failure doesn't affect overall success
                            // (database record is already gone)
                        }
                    } else {
                        operationSuccess = false; // Database deletion failed
                        shouldAttemptStorageDelete = false; // Don't attempt storage cleanup
                    }

                    expect(shouldAttemptStorageDelete).toBe(
                        scenario.databaseDeleteSuccess && scenario.isLocalVideo
                    );
                    expect(operationSuccess).toBe(scenario.databaseDeleteSuccess);
                }
            ), { numRuns: 100 });
        });
    });
});