/**
 * CDK Import Service for Admin Dashboard
 *
 * Handles importing CDK codes from various sources (text, CSV, XLSX).
 * All imports are processed through importFromText which handles
 * parsing, validation, deduplication, and database insertion.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { supabaseAdmin } from "../supabase/admin-client";
import type {
    CDKImportResult,
    CDKImportError,
    CDKImportOptions,
    CDKImportSourceType,
} from "./types";
import {
    parseTextInput,
    deduplicateCodes,
    validateCode,
    hashCodeAsync,
} from "./utils";

// ============================================
// Import from Text
// ============================================

/**
 * Import CDK codes from text input
 *
 * Parses text input, validates codes against product pattern,
 * deduplicates, and inserts valid codes into the database.
 *
 * Requirements: 1.3, 1.4, 1.5, 1.6
 *
 * @param text - Raw text input with newline-separated codes
 * @param options - Import options including productId and adminId
 * @returns Import result with success/duplicate/invalid counts
 */
export async function importFromText(
    text: string,
    options: CDKImportOptions
): Promise<CDKImportResult> {
    const { productId, adminId, pattern: overridePattern } = options;

    // Step 1: Parse text into individual codes
    const { codes: parsedCodes } = parseTextInput(text);

    if (parsedCodes.length === 0) {
        return {
            success: true,
            successCount: 0,
            duplicateCount: 0,
            invalidCount: 0,
            totalCount: 0,
            errors: [],
        };
    }

    // Step 2: Get product pattern if not overridden
    let validationPattern = overridePattern;
    if (validationPattern === undefined) {
        const { data: product } = await supabaseAdmin
            .from("products")
            .select("cdk_pattern")
            .eq("id", productId)
            .single();

        validationPattern = product?.cdk_pattern || undefined;
    }

    // Step 3: Validate codes and collect errors
    const validCodes: string[] = [];
    const errors: CDKImportError[] = [];

    for (let i = 0; i < parsedCodes.length; i++) {
        const code = parsedCodes[i];
        const result = validateCode(code, validationPattern);

        if (result.valid && result.normalizedCode) {
            validCodes.push(result.normalizedCode);
        } else {
            errors.push({
                line: i + 1,
                code: code.substring(0, 20) + (code.length > 20 ? "..." : ""),
                reason: result.error || "Validation failed",
            });
        }
    }

    // Step 4: Deduplicate valid codes (within this import batch)
    const { uniqueCodes, duplicateCount: inBatchDuplicates } =
        deduplicateCodes(validCodes);

    // Step 5: Check for existing codes in database
    const codeHashes = await Promise.all(
        uniqueCodes.map((code) => hashCodeAsync(code))
    );

    const { data: existingCodes } = await supabaseAdmin
        .from("cdk_codes")
        .select("code_hash")
        .in("code_hash", codeHashes);

    const existingHashes = new Set(
        existingCodes?.map((c) => c.code_hash) || []
    );

    // Filter out codes that already exist in database
    const newCodes: Array<{ code: string; hash: string }> = [];
    let dbDuplicateCount = 0;

    for (let i = 0; i < uniqueCodes.length; i++) {
        const hash = codeHashes[i];
        if (existingHashes.has(hash)) {
            dbDuplicateCount++;
        } else {
            newCodes.push({ code: uniqueCodes[i], hash });
        }
    }

    const totalDuplicates = inBatchDuplicates + dbDuplicateCount;

    // Step 6: Create import batch record
    const { data: batch, error: batchError } = await supabaseAdmin
        .from("cdk_import_batches")
        .insert({
            product_id: productId,
            admin_id: adminId,
            source_type: "text" as CDKImportSourceType,
            total_count: parsedCodes.length,
            success_count: newCodes.length,
            duplicate_count: totalDuplicates,
            invalid_count: errors.length,
            error_details: errors.length > 0 ? errors : null,
        })
        .select("id")
        .single();

    if (batchError) {
        return {
            success: false,
            successCount: 0,
            duplicateCount: totalDuplicates,
            invalidCount: errors.length,
            totalCount: parsedCodes.length,
            errors: [
                {
                    line: 0,
                    code: "",
                    reason: `Failed to create import batch: ${batchError.message}`,
                },
            ],
        };
    }

    // Step 7: Insert new codes into database
    if (newCodes.length > 0) {
        const codesToInsert = newCodes.map(({ code, hash }) => ({
            product_id: productId,
            code,
            code_hash: hash,
            status: "available",
            import_batch_id: batch.id,
        }));

        const { error: insertError } = await supabaseAdmin
            .from("cdk_codes")
            .insert(codesToInsert);

        if (insertError) {
            // Rollback: delete the batch record
            await supabaseAdmin
                .from("cdk_import_batches")
                .delete()
                .eq("id", batch.id);

            return {
                success: false,
                successCount: 0,
                duplicateCount: totalDuplicates,
                invalidCount: errors.length,
                totalCount: parsedCodes.length,
                errors: [
                    {
                        line: 0,
                        code: "",
                        reason: `Failed to insert codes: ${insertError.message}`,
                    },
                ],
            };
        }

        // Step 8: Create audit logs for imported codes
        const { data: insertedCodes } = await supabaseAdmin
            .from("cdk_codes")
            .select("id")
            .eq("import_batch_id", batch.id);

        if (insertedCodes && insertedCodes.length > 0) {
            const auditLogs = insertedCodes.map((c) => ({
                cdk_code_id: c.id,
                action: "imported",
                old_status: null,
                new_status: "available",
                actor_id: adminId,
                actor_type: "admin",
                reason: `Imported via text input (batch: ${batch.id})`,
            }));

            await supabaseAdmin.from("cdk_audit_logs").insert(auditLogs);
        }
    }

    return {
        success: true,
        successCount: newCodes.length,
        duplicateCount: totalDuplicates,
        invalidCount: errors.length,
        totalCount: parsedCodes.length,
        errors,
        batchId: batch.id,
    };
}

// ============================================
// Import from CSV
// ============================================

/**
 * Import CDK codes from CSV file content
 *
 * Parses CSV content, extracts codes from the first column of each row,
 * and delegates to importFromText for processing.
 *
 * Requirements: 1.1
 *
 * @param csvContent - Raw CSV file content as string
 * @param options - Import options including productId and adminId
 * @returns Import result with success/duplicate/invalid counts
 */
export async function importFromCSV(
    csvContent: string,
    options: CDKImportOptions
): Promise<CDKImportResult> {
    // Parse CSV: extract first column from each row
    const lines = csvContent.split(/\r\n|\n|\r/);
    const codes: string[] = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) continue;

        // Handle quoted values and comma separation
        let firstColumn: string;
        if (trimmedLine.startsWith('"')) {
            // Quoted value - find closing quote
            const endQuote = trimmedLine.indexOf('"', 1);
            if (endQuote > 0) {
                firstColumn = trimmedLine.substring(1, endQuote);
            } else {
                firstColumn = trimmedLine.substring(1);
            }
        } else {
            // Unquoted - take everything before first comma
            const commaIndex = trimmedLine.indexOf(",");
            firstColumn =
                commaIndex > 0
                    ? trimmedLine.substring(0, commaIndex)
                    : trimmedLine;
        }

        const code = firstColumn.trim();
        if (code.length > 0) {
            codes.push(code);
        }
    }

    // Convert to text format and delegate to importFromText
    const text = codes.join("\n");
    const result = await importFromText(text, options);

    // Update the batch source type to CSV
    if (result.batchId) {
        await supabaseAdmin
            .from("cdk_import_batches")
            .update({ source_type: "csv" as CDKImportSourceType })
            .eq("id", result.batchId);
    }

    return result;
}

// ============================================
// Import from XLSX
// ============================================

// XLSX library types (dynamically imported)
interface XLSXWorkBook {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
}

interface XLSXModule {
    read(data: ArrayBuffer, opts?: { type?: string }): XLSXWorkBook;
    utils: {
        sheet_to_json<T>(sheet: unknown, opts?: { header?: number | 1 }): T[];
    };
}

/**
 * Import CDK codes from XLSX file
 *
 * Parses XLSX file using xlsx library, extracts codes from the first column
 * of the first sheet, and delegates to importFromText for processing.
 *
 * Requirements: 1.2
 *
 * @param fileBuffer - XLSX file content as ArrayBuffer
 * @param options - Import options including productId and adminId
 * @returns Import result with success/duplicate/invalid counts
 */
export async function importFromXLSX(
    fileBuffer: ArrayBuffer,
    options: CDKImportOptions
): Promise<CDKImportResult> {
    // Dynamic import of xlsx library
    let XLSX: XLSXModule;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        XLSX = await import("xlsx" as string) as unknown as XLSXModule;
    } catch {
        return {
            success: false,
            successCount: 0,
            duplicateCount: 0,
            invalidCount: 0,
            totalCount: 0,
            errors: [
                {
                    line: 0,
                    code: "",
                    reason: "XLSX library not available. Please install xlsx package.",
                },
            ],
        };
    }

    // Parse XLSX file
    let workbook: XLSXWorkBook;
    try {
        workbook = XLSX.read(fileBuffer, { type: "array" });
    } catch (e) {
        return {
            success: false,
            successCount: 0,
            duplicateCount: 0,
            invalidCount: 0,
            totalCount: 0,
            errors: [
                {
                    line: 0,
                    code: "",
                    reason: `Failed to parse XLSX file: ${e instanceof Error ? e.message : "Unknown error"}`,
                },
            ],
        };
    }

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        return {
            success: false,
            successCount: 0,
            duplicateCount: 0,
            invalidCount: 0,
            totalCount: 0,
            errors: [
                {
                    line: 0,
                    code: "",
                    reason: "XLSX file contains no sheets",
                },
            ],
        };
    }

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

    // Extract codes from first column
    const codes: string[] = [];
    for (const row of data) {
        if (Array.isArray(row) && row.length > 0) {
            const firstCell = row[0];
            const code =
                firstCell !== null && firstCell !== undefined
                    ? String(firstCell).trim()
                    : "";
            if (code.length > 0) {
                codes.push(code);
            }
        }
    }

    // Convert to text format and delegate to importFromText
    const text = codes.join("\n");
    const result = await importFromText(text, options);

    // Update the batch source type to XLSX
    if (result.batchId) {
        await supabaseAdmin
            .from("cdk_import_batches")
            .update({ source_type: "xlsx" as CDKImportSourceType })
            .eq("id", result.batchId);
    }

    return result;
}
