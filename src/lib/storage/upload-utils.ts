/**
 * Upload Utility Functions
 *
 * Utility functions for file upload operations in the dash admin panel.
 * Includes storage path generation and unique filename generation.
 *
 * Requirements: 6.1, 6.4
 */

// ============================================
// Storage Path Generation
// Requirements: 6.1
// ============================================

/**
 * Generate storage path for a product file
 *
 * Creates a storage path following the pattern: products/{product_id}/{filename}
 *
 * @param productId - UUID of the product
 * @param filename - Name of the file
 * @returns Storage path string
 *
 * Requirements: 6.1
 *
 * @example
 * generateStoragePath("abc-123", "app.exe") // "products/abc-123/app.exe"
 */
export function generateStoragePath(productId: string, filename: string): string {
    return `products/${productId}/${filename}`;
}

// ============================================
// Unique Filename Generation
// Requirements: 6.4
// ============================================

/**
 * Generate a unique filename to prevent overwrites
 *
 * When a file with the same name already exists, this function generates
 * a unique filename by appending a timestamp and random suffix.
 * The original filename is preserved for display purposes.
 *
 * @param originalFilename - The original filename
 * @param existingFilenames - Array of existing filenames for the product
 * @returns Unique filename (may be same as original if no conflict)
 *
 * Requirements: 6.4
 *
 * @example
 * generateUniqueFilename("app.exe", []) // "app.exe"
 * generateUniqueFilename("app.exe", ["app.exe"]) // "app_1734789600000_a1b2.exe"
 */
export function generateUniqueFilename(
    originalFilename: string,
    existingFilenames: string[]
): string {
    // If no conflict, return original filename
    if (!existingFilenames.includes(originalFilename)) {
        return originalFilename;
    }

    // Extract file extension and base name
    const lastDotIndex = originalFilename.lastIndexOf(".");
    const hasExtension = lastDotIndex > 0;
    const baseName = hasExtension
        ? originalFilename.slice(0, lastDotIndex)
        : originalFilename;
    const extension = hasExtension
        ? originalFilename.slice(lastDotIndex)
        : "";

    // Generate unique suffix with timestamp and random string
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).slice(2, 6);

    return `${baseName}_${timestamp}_${randomSuffix}${extension}`;
}

/**
 * Check if a filename already exists in the list
 *
 * @param filename - Filename to check
 * @param existingFilenames - Array of existing filenames
 * @returns True if filename exists
 */
export function filenameExists(
    filename: string,
    existingFilenames: string[]
): boolean {
    return existingFilenames.includes(filename);
}
