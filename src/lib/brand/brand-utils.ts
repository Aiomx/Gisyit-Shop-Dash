/**
 * Brand Utility Functions
 *
 * Provides validation and generation utilities for brand management.
 * Requirements: 1.2, 7.1, 7.2, 1.4
 */

/**
 * Validates that a slug matches the required format.
 * Slugs must contain only lowercase letters, numbers, and hyphens.
 *
 * Requirements: 7.2
 *
 * @param slug - The slug to validate
 * @returns true if the slug is valid, false otherwise
 */
export function validateSlug(slug: string): boolean {
    if (!slug || slug.length === 0) {
        return false;
    }
    // Slug must match pattern: lowercase letters, numbers, and hyphens only
    const slugPattern = /^[a-z0-9-]+$/;
    return slugPattern.test(slug);
}

/**
 * Generates a URL-friendly slug from a brand name.
 * Converts to lowercase, replaces spaces and special characters with hyphens,
 * and removes consecutive hyphens.
 *
 * Requirements: 1.2
 *
 * @param name - The brand name to convert
 * @returns A valid slug string
 */
export function generateSlug(name: string): string {
    if (!name || name.trim().length === 0) {
        return "";
    }

    return name
        .toLowerCase()
        .trim()
        // Replace spaces and underscores with hyphens
        .replace(/[\s_]+/g, "-")
        // Remove any characters that aren't lowercase letters, numbers, or hyphens
        .replace(/[^a-z0-9-]/g, "")
        // Replace multiple consecutive hyphens with a single hyphen
        .replace(/-+/g, "-")
        // Remove leading and trailing hyphens
        .replace(/^-+|-+$/g, "");
}

/**
 * Validates that a brand name meets the required constraints.
 * Name must be non-empty and between 1-100 characters.
 *
 * Requirements: 7.1
 *
 * @param name - The brand name to validate
 * @returns true if the name is valid, false otherwise
 */
export function validateBrandName(name: string): boolean {
    if (!name || typeof name !== "string") {
        return false;
    }
    const trimmedName = name.trim();
    return trimmedName.length >= 1 && trimmedName.length <= 100;
}

/**
 * Allowed MIME types for brand logos
 */
export const ALLOWED_LOGO_MIME_TYPES = ["image/svg+xml", "image/png"];

/**
 * Maximum logo file size in bytes (2MB)
 */
export const MAX_LOGO_FILE_SIZE = 2 * 1024 * 1024;

/**
 * Validates a logo file for upload.
 * Checks file type (SVG or PNG) and size (max 2MB).
 *
 * Requirements: 1.4, 7.3
 *
 * @param file - The file to validate
 * @returns An object with valid status and optional error message
 */
export function validateLogoFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
        return { valid: false, error: "No file provided" };
    }

    // Check MIME type
    if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: "仅支持 SVG 和 PNG 格式的图片",
        };
    }

    // Check file size
    if (file.size > MAX_LOGO_FILE_SIZE) {
        return {
            valid: false,
            error: "文件大小不能超过 2MB",
        };
    }

    return { valid: true };
}
