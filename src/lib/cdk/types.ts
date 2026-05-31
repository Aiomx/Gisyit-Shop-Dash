/**
 * CDK Import Service Types for Admin Dashboard
 *
 * Type definitions for CDK code import operations.
 * These types are used by the admin dashboard for importing
 * CDK codes via CSV, XLSX, or text input.
 *
 * Requirements: 1.6
 */

// ============================================
// Import Source Types
// ============================================

/**
 * Source type for CDK import
 */
export type CDKImportSourceType = "csv" | "xlsx" | "text";

// ============================================
// Import Result Types
// ============================================

/**
 * Error detail for a failed import line
 */
export interface CDKImportError {
    /** Line number in the source (1-indexed) */
    line: number;
    /** The code that failed */
    code: string;
    /** Reason for failure */
    reason: string;
}

/**
 * Result of a CDK import operation
 *
 * The sum of successCount + duplicateCount + invalidCount
 * should always equal totalCount.
 *
 * Requirements: 1.6
 */
export interface CDKImportResult {
    /** Whether the import operation completed (may have partial failures) */
    success: boolean;
    /** Number of codes successfully imported */
    successCount: number;
    /** Number of duplicate codes skipped */
    duplicateCount: number;
    /** Number of codes that failed validation */
    invalidCount: number;
    /** Total codes processed */
    totalCount: number;
    /** Detailed errors for invalid codes */
    errors: CDKImportError[];
    /** Import batch ID for tracking */
    batchId?: string;
}

// ============================================
// Import Batch Types
// ============================================

/**
 * CDK import batch record
 *
 * Represents a single import operation for audit and history tracking.
 *
 * Requirements: 1.6, 8.4
 */
export interface CDKImportBatch {
    id: string;
    product_id: string;
    admin_id: string;
    source_type: CDKImportSourceType;
    total_count: number;
    success_count: number;
    duplicate_count: number;
    invalid_count: number;
    error_details?: CDKImportError[];
    created_at: string;
}

// ============================================
// Import Options Types
// ============================================

/**
 * Options for CDK import operations
 */
export interface CDKImportOptions {
    /** Product ID to import codes for */
    productId: string;
    /** Admin user ID performing the import */
    adminId: string;
    /** Optional regex pattern for validation (overrides product pattern) */
    pattern?: string;
}

// ============================================
// Validation Types
// ============================================

/**
 * Result of CDK code validation
 */
export interface CDKValidationResult {
    /** Whether the code is valid */
    valid: boolean;
    /** The normalized (trimmed) code if valid */
    normalizedCode?: string;
    /** Error message if validation failed */
    error?: string;
}

/**
 * Result of deduplication operation
 */
export interface DeduplicationResult {
    uniqueCodes: string[];
    duplicateCount: number;
}

/**
 * Parsed text input result
 */
export interface ParsedTextResult {
    codes: string[];
    lineCount: number;
}
