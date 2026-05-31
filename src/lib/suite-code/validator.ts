/**
 * Suite Code Validator Module
 *
 * Validates activation codes for format, status, and expiration.
 * Used by both admin dashboard and client activation flow.
 *
 * Requirements: 5.1, 5.2, 7.4
 */

import {
    type CodeStatus,
    type SuiteCode,
    type SuiteCodeErrorCode,
    CODE_FORMAT_PATTERN,
    suiteCodeErrorMessages,
} from '../supabase/suite-code-types';
import { parseCode } from './generator';

// ============================================
// Types
// ============================================

/**
 * Validation result
 */
export interface ValidationResult {
    /** Whether validation passed */
    valid: boolean;
    /** Error code if validation failed */
    errorCode?: SuiteCodeErrorCode;
    /** Human-readable error message */
    errorMessage?: string;
}

/**
 * Activation validation result with additional context
 */
export interface ActivationValidationResult extends ValidationResult {
    /** The validated code entity (if found) */
    code?: SuiteCode;
}

// ============================================
// Format Validation
// ============================================

/**
 * Validates the format of an activation code string.
 *
 * Valid format: {PREFIX}-{4CHARS}-{4CHARS}
 * - PREFIX: SPLUS, SPRO, SULTRA, or SCRED
 * - CHARS: Uppercase letters A-Z and numbers 0-9
 *
 * @param code - The activation code string to validate
 * @returns ValidationResult indicating if format is valid
 *
 * Requirements: 7.4
 */
export function validateCodeFormat(code: string): ValidationResult {
    if (!code || typeof code !== 'string') {
        return {
            valid: false,
            errorCode: 'INVALID_FORMAT',
            errorMessage: suiteCodeErrorMessages.INVALID_FORMAT,
        };
    }

    // Normalize: trim whitespace and convert to uppercase
    const normalizedCode = code.trim().toUpperCase();

    // Check against the format pattern
    if (!CODE_FORMAT_PATTERN.test(normalizedCode)) {
        return {
            valid: false,
            errorCode: 'INVALID_FORMAT',
            errorMessage: suiteCodeErrorMessages.INVALID_FORMAT,
        };
    }

    // Verify the prefix is valid by attempting to parse
    const parsed = parseCode(normalizedCode);
    if (!parsed) {
        return {
            valid: false,
            errorCode: 'INVALID_FORMAT',
            errorMessage: suiteCodeErrorMessages.INVALID_FORMAT,
        };
    }

    return { valid: true };
}

/**
 * Normalizes a code string (trim and uppercase).
 *
 * @param code - The code string to normalize
 * @returns Normalized code string
 */
export function normalizeCode(code: string): string {
    return code.trim().toUpperCase();
}

// ============================================
// Status Validation
// ============================================

/**
 * Validates if a code's status allows activation.
 *
 * Only codes with status 'unused' can be activated.
 *
 * @param status - The current status of the code
 * @returns ValidationResult indicating if status allows activation
 *
 * Requirements: 5.1
 */
export function validateCodeStatus(status: CodeStatus): ValidationResult {
    switch (status) {
        case 'unused':
            return { valid: true };

        case 'used':
            return {
                valid: false,
                errorCode: 'CODE_ALREADY_USED',
                errorMessage: suiteCodeErrorMessages.CODE_ALREADY_USED,
            };

        case 'expired':
            return {
                valid: false,
                errorCode: 'CODE_EXPIRED',
                errorMessage: suiteCodeErrorMessages.CODE_EXPIRED,
            };

        case 'disabled':
            return {
                valid: false,
                errorCode: 'CODE_DISABLED',
                errorMessage: suiteCodeErrorMessages.CODE_DISABLED,
            };

        default:
            // Unknown status - treat as invalid
            return {
                valid: false,
                errorCode: 'CODE_DISABLED',
                errorMessage: '激活码状态无效',
            };
    }
}

/**
 * Checks if a code status can be changed to a target status.
 *
 * Rules:
 * - 'unused' can be changed to 'disabled'
 * - 'disabled' can be changed to 'unused' (re-enable)
 * - 'used' cannot be changed (final state)
 * - 'expired' cannot be changed (final state)
 *
 * @param currentStatus - Current status of the code
 * @param targetStatus - Target status to change to
 * @returns ValidationResult indicating if the status change is allowed
 *
 * Requirements: 4.2, 4.3
 */
export function validateStatusChange(
    currentStatus: CodeStatus,
    targetStatus: 'unused' | 'disabled'
): ValidationResult {
    // Cannot change from 'used' status
    if (currentStatus === 'used') {
        return {
            valid: false,
            errorCode: 'ENABLE_USED_CODE',
            errorMessage: suiteCodeErrorMessages.ENABLE_USED_CODE,
        };
    }

    // Cannot change from 'expired' status
    if (currentStatus === 'expired') {
        return {
            valid: false,
            errorCode: 'CODE_EXPIRED',
            errorMessage: '无法修改已过期的激活码状态',
        };
    }

    // Valid transitions: unused <-> disabled
    if (currentStatus === 'unused' && targetStatus === 'disabled') {
        return { valid: true };
    }

    if (currentStatus === 'disabled' && targetStatus === 'unused') {
        return { valid: true };
    }

    // Same status - no change needed
    if (currentStatus === targetStatus) {
        return { valid: true };
    }

    return { valid: true };
}

// ============================================
// Expiration Validation
// ============================================

/**
 * Validates if a code has expired based on its expiration date.
 *
 * @param expiresAt - The expiration date (ISO 8601 string)
 * @param currentTime - Optional current time for testing (defaults to now)
 * @returns ValidationResult indicating if the code is still valid
 *
 * Requirements: 5.2
 */
export function validateExpiration(
    expiresAt: string,
    currentTime: Date = new Date()
): ValidationResult {
    const expirationDate = new Date(expiresAt);

    // Check if the expiration date is valid
    if (Number.isNaN(expirationDate.getTime())) {
        return {
            valid: false,
            errorCode: 'INVALID_EXPIRATION',
            errorMessage: suiteCodeErrorMessages.INVALID_EXPIRATION,
        };
    }

    // Check if current time is past expiration
    if (currentTime > expirationDate) {
        return {
            valid: false,
            errorCode: 'CODE_EXPIRED',
            errorMessage: suiteCodeErrorMessages.CODE_EXPIRED,
        };
    }

    return { valid: true };
}

/**
 * Checks if a code is expired based on its expiration date.
 *
 * @param expiresAt - The expiration date (ISO 8601 string)
 * @param currentTime - Optional current time for testing
 * @returns true if the code is expired
 */
export function isCodeExpired(expiresAt: string, currentTime: Date = new Date()): boolean {
    const expirationDate = new Date(expiresAt);
    return currentTime > expirationDate;
}

// ============================================
// Combined Validation
// ============================================

/**
 * Performs complete validation for code activation.
 *
 * Validates:
 * 1. Code format
 * 2. Code exists (if code entity provided)
 * 3. Code status is 'unused'
 * 4. Code has not expired
 *
 * @param codeString - The activation code string
 * @param codeEntity - Optional code entity from database
 * @param currentTime - Optional current time for testing
 * @returns ActivationValidationResult with validation status and code entity
 *
 * Requirements: 5.1, 5.2, 7.4
 */
export function validateForActivation(
    codeString: string,
    codeEntity?: SuiteCode | null,
    currentTime: Date = new Date()
): ActivationValidationResult {
    // Step 1: Validate format
    const formatResult = validateCodeFormat(codeString);
    if (!formatResult.valid) {
        return formatResult;
    }

    // Step 2: Check if code exists
    if (!codeEntity) {
        return {
            valid: false,
            errorCode: 'CODE_NOT_FOUND',
            errorMessage: suiteCodeErrorMessages.CODE_NOT_FOUND,
        };
    }

    // Step 3: Validate status
    const statusResult = validateCodeStatus(codeEntity.status);
    if (!statusResult.valid) {
        return {
            ...statusResult,
            code: codeEntity,
        };
    }

    // Step 4: Validate expiration
    const expirationResult = validateExpiration(codeEntity.expires_at, currentTime);
    if (!expirationResult.valid) {
        return {
            ...expirationResult,
            code: codeEntity,
        };
    }

    return {
        valid: true,
        code: codeEntity,
    };
}

/**
 * Validates credits amount for credits code generation.
 *
 * @param amount - The credits amount to validate
 * @returns ValidationResult indicating if the amount is valid
 *
 * Requirements: 1.3
 */
export function validateCreditsAmount(amount: number): ValidationResult {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
        return {
            valid: false,
            errorCode: 'INVALID_AMOUNT',
            errorMessage: suiteCodeErrorMessages.INVALID_AMOUNT,
        };
    }

    if (amount < 100) {
        return {
            valid: false,
            errorCode: 'INVALID_AMOUNT',
            errorMessage: suiteCodeErrorMessages.INVALID_AMOUNT,
        };
    }

    return { valid: true };
}

/**
 * Validates expiration date for code generation.
 *
 * @param expiresAt - The expiration date (ISO 8601 string)
 * @param currentTime - Optional current time for testing
 * @returns ValidationResult indicating if the expiration date is valid
 */
export function validateExpirationDate(
    expiresAt: string,
    currentTime: Date = new Date()
): ValidationResult {
    const expirationDate = new Date(expiresAt);

    // Check if the date is valid
    if (Number.isNaN(expirationDate.getTime())) {
        return {
            valid: false,
            errorCode: 'INVALID_EXPIRATION',
            errorMessage: suiteCodeErrorMessages.INVALID_EXPIRATION,
        };
    }

    // Expiration date must be in the future
    if (expirationDate <= currentTime) {
        return {
            valid: false,
            errorCode: 'INVALID_EXPIRATION',
            errorMessage: '过期时间必须在当前时间之后',
        };
    }

    return { valid: true };
}
