/**
 * Slug Generation and Validation Utilities for Admin Dashboard
 *
 * Utility functions for generating and validating URL-friendly slugs.
 * This is a copy of the store-frontend slug utilities for use in the admin dashboard.
 *
 * Requirements: 1.1, 1.2, 1.4, 1.5, 1.6
 */

export interface SlugValidationResult {
    valid: boolean;
    error?: string;
    /** Chinese error message for UI display */
    errorZh?: string;
}

/**
 * Reserved words that cannot be used as slugs
 * Requirements: 1.6
 */
export const RESERVED_SLUGS = [
    'new',
    'edit',
    'admin',
    'api',
    'create',
    'delete',
    'update',
    'list',
    'search',
] as const;

export type ReservedSlug = (typeof RESERVED_SLUGS)[number];

/**
 * Generate a slug from a product name
 *
 * - Converts to lowercase
 * - Replaces spaces and special chars with hyphens
 * - Removes consecutive hyphens
 * - Ensures starts with letter
 * - Removes leading/trailing hyphens
 *
 * Requirements: 1.1, 1.2
 *
 * @param name - The product name to convert to a slug
 * @returns URL-friendly slug string
 */
export function generateSlug(name: string): string {
    if (!name || name.trim() === '') {
        return '';
    }

    let slug = name
        // Convert to lowercase
        .toLowerCase()
        // Replace spaces and special characters with hyphens
        .replace(/[\s_]+/g, '-')
        // Remove characters that are not lowercase letters, numbers, or hyphens
        .replace(/[^a-z0-9-]/g, '')
        // Remove consecutive hyphens
        .replace(/-+/g, '-')
        // Remove leading hyphens
        .replace(/^-+/, '')
        // Remove trailing hyphens
        .replace(/-+$/, '');

    // Ensure slug starts with a letter
    // If it starts with a number, prepend 'p-'
    if (slug.length > 0 && /^[0-9]/.test(slug)) {
        slug = `p-${slug}`;
    }

    // Ensure minimum length of 2 characters
    // If too short after processing, pad with 'x'
    if (slug.length === 1) {
        slug = `${slug}x`;
    }

    return slug;
}

/**
 * Validate a slug format
 *
 * - Only lowercase letters, numbers, hyphens
 * - Starts with letter
 * - Minimum 2 characters
 * - Not a reserved word
 *
 * Requirements: 1.4, 1.5, 1.6
 *
 * @param slug - The slug to validate
 * @returns Validation result with success status and optional error
 */
export function validateSlug(slug: string): SlugValidationResult {
    // Check for empty slug
    if (!slug || slug.trim() === '') {
        return {
            valid: false,
            error: 'Slug cannot be empty',
            errorZh: 'Slug 不能为空',
        };
    }

    const trimmedSlug = slug.trim();

    // Check minimum length (2 characters)
    // Requirements: 1.5
    if (trimmedSlug.length < 2) {
        return {
            valid: false,
            error: 'Slug must be at least 2 characters long',
            errorZh: 'Slug 长度至少为 2 个字符',
        };
    }

    // Check for valid characters (only lowercase letters, numbers, hyphens)
    // Requirements: 1.4
    if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
        return {
            valid: false,
            error: 'Slug can only contain lowercase letters, numbers, and hyphens',
            errorZh: 'Slug 只能包含小写字母、数字和连字符',
        };
    }

    // Check that slug starts with a letter
    // Requirements: 1.5
    if (!/^[a-z]/.test(trimmedSlug)) {
        return {
            valid: false,
            error: 'Slug must start with a letter',
            errorZh: 'Slug 必须以字母开头',
        };
    }

    // Check for reserved words
    // Requirements: 1.6
    if (RESERVED_SLUGS.includes(trimmedSlug as ReservedSlug)) {
        return {
            valid: false,
            error: `Slug "${trimmedSlug}" is a reserved word`,
            errorZh: `"${trimmedSlug}" 为系统保留字，请使用其他名称`,
        };
    }

    return {
        valid: true,
    };
}

/**
 * Check if a string is a reserved slug
 *
 * @param slug - The slug to check
 * @returns true if the slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
    return RESERVED_SLUGS.includes(slug.toLowerCase() as ReservedSlug);
}
