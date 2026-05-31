/**
 * CDK Import Service Module
 *
 * Exports for CDK code import functionality in the admin dashboard.
 */

// Types
export type {
    CDKImportSourceType,
    CDKImportError,
    CDKImportResult,
    CDKImportBatch,
    CDKImportOptions,
    CDKValidationResult,
    DeduplicationResult,
    ParsedTextResult,
} from "./types";

// Import functions
export {
    importFromText,
    importFromCSV,
    importFromXLSX,
} from "./import-service";

// Utility functions
export {
    parseTextInput,
    deduplicateCodes,
    validateCode,
    hashCodeAsync,
    hashCodeSync,
} from "./utils";

// Admin service types
export type {
    CDKInventoryStats,
    CDKCodeDetail,
    CDKImportBatchDetail,
    InvalidateCodeResult,
} from "./admin-service";

// Admin service functions
export {
    CDKStatus,
    getInventoryStats,
    searchCode,
    invalidateCode,
    getImportHistory,
} from "./admin-service";
