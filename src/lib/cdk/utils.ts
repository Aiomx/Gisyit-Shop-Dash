/**
 * CDK Utility Functions for Admin Dashboard
 *
 * Utility functions for CDK code parsing, deduplication, hashing, and validation.
 *
 * Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 2.4
 */

import type {
    DeduplicationResult,
    ParsedTextResult,
    CDKValidationResult,
} from "./types";

// ============================================
// Text Parsing
// ============================================

/**
 * Parse text input into individual CDK codes
 *
 * Handles various newline formats (\n, \r\n, \r) and trims whitespace.
 * Returns only non-empty lines after trimming.
 *
 * Requirements: 1.3
 *
 * @param text - Raw text input with newline-separated codes
 * @returns Parsed codes and line count
 */
export function parseTextInput(text: string): ParsedTextResult {
    if (!text || text.trim() === "") {
        return { codes: [], lineCount: 0 };
    }

    // Split by any newline format: \r\n (Windows), \n (Unix), \r (old Mac)
    const lines = text.split(/\r\n|\n|\r/);

    // Trim each line and filter out empty lines
    const codes = lines
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    return {
        codes,
        lineCount: codes.length,
    };
}

// ============================================
// Deduplication
// ============================================

/**
 * Deduplicate an array of CDK codes
 *
 * Returns unique codes and the count of duplicates removed.
 * Preserves the order of first occurrence.
 *
 * Requirements: 1.4
 *
 * @param codes - Array of CDK codes (may contain duplicates)
 * @returns Unique codes and duplicate count
 */
export function deduplicateCodes(codes: string[]): DeduplicationResult {
    const seen = new Set<string>();
    const uniqueCodes: string[] = [];
    let duplicateCount = 0;

    for (const code of codes) {
        if (seen.has(code)) {
            duplicateCount++;
        } else {
            seen.add(code);
            uniqueCodes.push(code);
        }
    }

    return {
        uniqueCodes,
        duplicateCount,
    };
}

// ============================================
// Hashing
// ============================================

/**
 * Generate a SHA256 hash for a CDK code (for deduplication)
 *
 * Uses Web Crypto API for secure hashing.
 *
 * @param code - The CDK code to hash
 * @returns Promise resolving to hex-encoded hash string
 */
export async function hashCodeAsync(code: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a simple hash for a CDK code (synchronous, for client-side)
 *
 * Uses a simple hash function suitable for in-memory deduplication.
 * For database storage, use hashCodeAsync for SHA256.
 *
 * @param code - The CDK code to hash
 * @returns Hash string
 */
export function hashCodeSync(code: string): string {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
        const char = code.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
}

// ============================================
// Validation
// ============================================

/**
 * Validate a CDK code against a regex pattern
 *
 * When a pattern is provided, the code must match the pattern.
 * When no pattern is provided, any non-empty trimmed string is accepted.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 *
 * @param code - The CDK code to validate
 * @param pattern - Optional regex pattern string to validate against
 * @returns Validation result with success status and optional error
 */
export function validateCode(code: string, pattern?: string): CDKValidationResult {
    // Trim the code first
    const trimmedCode = code.trim();

    // Check for empty code
    if (trimmedCode.length === 0) {
        return {
            valid: false,
            error: "Code cannot be empty",
        };
    }

    // If no pattern is configured, accept any non-empty trimmed string
    // Requirements: 2.4
    if (!pattern || pattern.trim() === "") {
        return {
            valid: true,
            normalizedCode: trimmedCode,
        };
    }

    // Validate against the regex pattern
    // Requirements: 2.1, 2.2, 2.3
    try {
        const regex = new RegExp(pattern);
        const matches = regex.test(trimmedCode);

        if (matches) {
            return {
                valid: true,
                normalizedCode: trimmedCode,
            };
        }
        return {
            valid: false,
            error: `Code does not match pattern: ${pattern}`,
        };
    } catch (e) {
        // Invalid regex pattern - treat as validation failure
        return {
            valid: false,
            error: `Invalid regex pattern: ${pattern}`,
        };
    }
}
