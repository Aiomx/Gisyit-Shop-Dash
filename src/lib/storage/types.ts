/**
 * Storage Type Definitions
 *
 * Types for file upload and storage operations in the dash admin panel.
 *
 * Requirements: 1.1
 */

import type { ProductFile } from "@/lib/supabase/types";

// ============================================
// File Upload Types
// ============================================

/**
 * File upload request data
 *
 * Used when uploading a file for a product.
 *
 * Requirements: 1.1
 */
export interface FileUploadRequest {
    product_id: string;
    file: File;
}

/**
 * File upload response
 *
 * Returned after a successful or failed file upload.
 *
 * Requirements: 1.1, 1.3
 */
export interface FileUploadResponse {
    success: boolean;
    file?: ProductFile;
    error?: string;
    error_code?: UploadErrorCode;
}

/**
 * File delete response
 *
 * Returned after a file deletion attempt.
 *
 * Requirements: 1.5
 */
export interface FileDeleteResponse {
    success: boolean;
    error?: string;
    error_code?: UploadErrorCode;
}

// ============================================
// Error Codes
// ============================================

/**
 * Error codes for upload operations
 */
export const UploadErrorCodes = {
    FILE_TOO_LARGE: "FILE_TOO_LARGE",
    UPLOAD_FAILED: "UPLOAD_FAILED",
    INVALID_PRODUCT: "INVALID_PRODUCT",
    STORAGE_ERROR: "STORAGE_ERROR",
    DATABASE_ERROR: "DATABASE_ERROR",
    FILE_NOT_FOUND: "FILE_NOT_FOUND",
} as const;

export type UploadErrorCode = typeof UploadErrorCodes[keyof typeof UploadErrorCodes];

// ============================================
// Configuration
// ============================================

/**
 * Maximum file size in bytes (500 GB) - default for general files
 *
 * Requirements: 1.6
 */
export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024 * 1024;

/**
 * Maximum app file size in bytes (10 GB)
 *
 * Requirements: 4.1
 */
export const MAX_APP_FILE_SIZE_BYTES = 10 * 1024 * 1024 * 1024;

/**
 * Maximum video file size in bytes (500 MB)
 *
 * Requirements: 4.2
 */
export const MAX_VIDEO_FILE_SIZE_BYTES = 500 * 1024 * 1024;

/**
 * Maximum image file size in bytes (5 MB)
 */
export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * File type categories for size limit determination
 */
export type FileCategory = "app" | "video" | "image" | "general";

/**
 * Supported video MIME types
 *
 * Requirements: 6.2
 */
export const SUPPORTED_VIDEO_MIME_TYPES = [
    "video/mp4",
    "video/webm",
    "video/quicktime", // MOV format
] as const;

/**
 * Supported image MIME types
 */
export const SUPPORTED_IMAGE_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
] as const;

/**
 * Get the file category based on MIME type
 *
 * @param mimeType - The MIME type of the file
 * @returns The file category
 */
export function getFileCategory(mimeType: string): FileCategory {
    if (SUPPORTED_VIDEO_MIME_TYPES.includes(mimeType as typeof SUPPORTED_VIDEO_MIME_TYPES[number])) {
        return "video";
    }
    if (SUPPORTED_IMAGE_MIME_TYPES.includes(mimeType as typeof SUPPORTED_IMAGE_MIME_TYPES[number])) {
        return "image";
    }
    // Application files (executables, archives, etc.)
    if (
        mimeType.startsWith("application/") ||
        mimeType === "application/octet-stream" ||
        mimeType.includes("zip") ||
        mimeType.includes("tar") ||
        mimeType.includes("rar") ||
        mimeType.includes("executable")
    ) {
        return "app";
    }
    return "general";
}

/**
 * Get the maximum file size for a given category
 *
 * @param category - The file category
 * @returns The maximum file size in bytes
 *
 * Requirements: 4.1, 4.2
 */
export function getMaxFileSizeForCategory(category: FileCategory): number {
    switch (category) {
        case "app":
            return MAX_APP_FILE_SIZE_BYTES;
        case "video":
            return MAX_VIDEO_FILE_SIZE_BYTES;
        case "image":
            return MAX_IMAGE_FILE_SIZE_BYTES;
        case "general":
        default:
            return MAX_FILE_SIZE_BYTES;
    }
}

/**
 * Format bytes to human-readable string
 *
 * @param bytes - The number of bytes
 * @returns Human-readable string (e.g., "10 GB", "500 MB")
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Validate file size against category limit
 *
 * @param file - The file to validate
 * @param category - Optional category override (auto-detected if not provided)
 * @returns Error message if validation fails, null if valid
 *
 * Requirements: 4.3
 */
export function validateFileSize(file: File, category?: FileCategory): string | null {
    const fileCategory = category ?? getFileCategory(file.type);
    const maxSize = getMaxFileSizeForCategory(fileCategory);

    if (file.size > maxSize) {
        const maxSizeFormatted = formatFileSize(maxSize);
        const fileSizeFormatted = formatFileSize(file.size);
        return `文件大小 (${fileSizeFormatted}) 超过限制，最大允许 ${maxSizeFormatted}`;
    }

    return null;
}

/**
 * Storage bucket name for product files
 */
export const PRODUCT_FILES_BUCKET = "product-files";

// Note: generateStoragePath is exported from upload-utils.ts
