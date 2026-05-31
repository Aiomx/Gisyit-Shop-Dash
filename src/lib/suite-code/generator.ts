/**
 * Suite Code Generator Module
 *
 * Generates, parses, and formats activation codes for SUITE Studio.
 * Code format: {PREFIX}-{4CHARS}-{4CHARS}
 *
 * Requirements: 1.1, 7.1, 7.2, 7.3
 */

import {
    type CodeType,
    type MembershipTier,
    CODE_PREFIXES,
    PREFIX_TO_TYPE,
    CODE_CHARSET,
    CODE_FORMAT_PATTERN,
} from '../supabase/suite-code-types';

// ============================================
// Types
// ============================================

/**
 * Parsed code information
 */
export interface ParsedCode {
    type: CodeType;
    tier?: MembershipTier;
    segments: [string, string];
}

/**
 * Code generation options
 */
export interface GenerateCodeOptions {
    type: CodeType;
    tier?: MembershipTier;
}

// ============================================
// Code Generation
// ============================================

/**
 * Generates a random segment of specified length using the allowed character set.
 *
 * @param length - Length of the segment to generate
 * @returns Random string of uppercase letters and numbers
 *
 * Requirements: 7.2
 */
export function generateCodeSegment(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * CODE_CHARSET.length);
        result += CODE_CHARSET.charAt(randomIndex);
    }
    return result;
}

/**
 * Generates a single activation code with the specified type and tier.
 *
 * Code format: {PREFIX}-{4CHARS}-{4CHARS}
 * - SPLUS for Plus membership
 * - SPRO for Pro membership
 * - SULTRA for Ultra membership
 * - SCRED for credits
 *
 * @param type - Code type: 'membership' or 'credits'
 * @param tier - Membership tier (required for membership type)
 * @returns Generated activation code string
 * @throws Error if membership type is specified without a tier
 *
 * Requirements: 1.1, 7.1, 7.2, 7.3
 */
export function generateCode(type: CodeType, tier?: MembershipTier): string {
    if (type === 'membership' && !tier) {
        throw new Error('Membership tier is required for membership codes');
    }

    const prefixKey = type === 'membership' ? `membership_${tier}` : 'credits';
    const prefix = CODE_PREFIXES[prefixKey];

    if (!prefix) {
        throw new Error(`Invalid prefix key: ${prefixKey}`);
    }

    const segment1 = generateCodeSegment(4);
    const segment2 = generateCodeSegment(4);

    return `${prefix}-${segment1}-${segment2}`;
}

/**
 * Generates multiple unique activation codes.
 *
 * @param options - Generation options including type and tier
 * @param quantity - Number of codes to generate
 * @returns Array of unique activation codes
 *
 * Requirements: 1.5, 1.6
 */
export function generateCodes(options: GenerateCodeOptions, quantity: number): string[] {
    const codes = new Set<string>();

    // Generate codes until we have the requested quantity
    // Using a Set ensures uniqueness within the batch
    while (codes.size < quantity) {
        const code = generateCode(options.type, options.tier);
        codes.add(code);
    }

    return Array.from(codes);
}

// ============================================
// Code Parsing
// ============================================

/**
 * Parses an activation code string into its components.
 *
 * @param code - Activation code string to parse
 * @returns Parsed code information or null if invalid format
 *
 * Requirements: 7.4
 */
export function parseCode(code: string): ParsedCode | null {
    // Validate format
    if (!CODE_FORMAT_PATTERN.test(code)) {
        return null;
    }

    const parts = code.split('-');
    const prefix = parts[0];
    const segment1 = parts[1];
    const segment2 = parts[2];

    const typeInfo = PREFIX_TO_TYPE[prefix];
    if (!typeInfo) {
        return null;
    }

    return {
        type: typeInfo.type,
        tier: typeInfo.tier,
        segments: [segment1, segment2],
    };
}

/**
 * Validates if a code string matches the expected format.
 *
 * @param code - Code string to validate
 * @returns true if the code format is valid
 *
 * Requirements: 7.4
 */
export function isValidCodeFormat(code: string): boolean {
    return CODE_FORMAT_PATTERN.test(code);
}

// ============================================
// Code Formatting
// ============================================

/**
 * Formats code components back into a code string.
 *
 * @param type - Code type
 * @param tier - Membership tier (for membership codes)
 * @param segments - Two 4-character segments
 * @returns Formatted code string
 *
 * Requirements: 7.5
 */
export function formatCode(
    type: CodeType,
    tier: MembershipTier | undefined,
    segments: [string, string]
): string {
    const prefixKey = type === 'membership' ? `membership_${tier}` : 'credits';
    const prefix = CODE_PREFIXES[prefixKey];

    if (!prefix) {
        throw new Error(`Invalid type/tier combination: ${type}/${tier}`);
    }

    return `${prefix}-${segments[0]}-${segments[1]}`;
}

/**
 * Gets the prefix for a given code type and tier.
 *
 * @param type - Code type
 * @param tier - Membership tier (for membership codes)
 * @returns Code prefix string
 *
 * Requirements: 7.1
 */
export function getCodePrefix(type: CodeType, tier?: MembershipTier): string {
    const prefixKey = type === 'membership' ? `membership_${tier}` : 'credits';
    const prefix = CODE_PREFIXES[prefixKey];

    if (!prefix) {
        throw new Error(`Invalid type/tier combination: ${type}/${tier}`);
    }

    return prefix;
}

/**
 * Extracts the prefix from a code string.
 *
 * @param code - Full code string
 * @returns Prefix portion of the code or null if invalid
 */
export function extractPrefix(code: string): string | null {
    if (!isValidCodeFormat(code)) {
        return null;
    }
    return code.split('-')[0];
}

/**
 * Gets the type and tier from a code prefix.
 *
 * @param prefix - Code prefix (e.g., 'SPLUS', 'SCRED')
 * @returns Type and tier information or null if invalid prefix
 */
export function getTypeFromPrefix(prefix: string): { type: CodeType; tier?: MembershipTier } | null {
    return PREFIX_TO_TYPE[prefix] || null;
}
