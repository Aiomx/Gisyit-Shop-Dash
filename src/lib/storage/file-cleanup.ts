/**
 * File Cleanup Utility
 *
 * Handles batch deletion of product files from both Supabase Storage
 * and the database. Used when a product is deleted to ensure all
 * associated files are properly cleaned up.
 *
 * Requirements: 1.5, 6.3
 */

import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { PRODUCT_FILES_BUCKET } from "./types";

/**
 * Result of a file cleanup operation
 */
export interface FileCleanupResult {
    success: boolean;
    deletedCount: number;
    errors: string[];
}

/**
 * Delete all files associated with a product
 *
 * This function handles cascade deletion of product files:
 * 1. Fetches all file records for the product from the database
 * 2. Deletes all files from Supabase Storage
 * 3. Deletes all file records from the database
 *
 * Note: The database has ON DELETE CASCADE for product_files,
 * but we need to manually delete from Storage since it's not
 * automatically linked to database cascades.
 *
 * @param productId - UUID of the product to clean up files for
 * @returns FileCleanupResult with success status and details
 *
 * Requirements: 1.5, 6.3
 *
 * @example
 * const result = await deleteProductFiles("abc-123");
 * if (!result.success) {
 *   console.error("Cleanup errors:", result.errors);
 * }
 */
export async function deleteProductFiles(productId: string): Promise<FileCleanupResult> {
    const errors: string[] = [];
    let deletedCount = 0;

    try {
        // Step 1: Fetch all file records for this product
        const { data: files, error: fetchError } = await supabaseAdmin
            .from("product_files")
            .select("id, storage_path")
            .eq("product_id", productId);

        if (fetchError) {
            return {
                success: false,
                deletedCount: 0,
                errors: [`Failed to fetch product files: ${fetchError.message}`],
            };
        }

        // If no files, return success
        if (!files || files.length === 0) {
            return {
                success: true,
                deletedCount: 0,
                errors: [],
            };
        }

        // Step 2: Delete files from Supabase Storage
        const storagePaths = files.map((f) => f.storage_path);

        if (storagePaths.length > 0) {
            const { error: storageError } = await supabaseAdmin.storage
                .from(PRODUCT_FILES_BUCKET)
                .remove(storagePaths);

            if (storageError) {
                // Log error but continue with database deletion
                // Files might have been manually deleted or moved
                errors.push(`Storage deletion warning: ${storageError.message}`);
            }
        }

        // Step 3: Delete file records from database
        // Note: This is technically redundant if product deletion uses CASCADE,
        // but we do it explicitly to ensure cleanup happens even if called
        // before product deletion or if CASCADE is not configured
        const { error: dbError } = await supabaseAdmin
            .from("product_files")
            .delete()
            .eq("product_id", productId);

        if (dbError) {
            errors.push(`Database deletion error: ${dbError.message}`);
            return {
                success: false,
                deletedCount: 0,
                errors,
            };
        }

        deletedCount = files.length;

        return {
            success: true,
            deletedCount,
            errors,
        };
    } catch (err) {
        return {
            success: false,
            deletedCount,
            errors: [...errors, `Unexpected error: ${String(err)}`],
        };
    }
}

/**
 * Get the count of files associated with a product
 *
 * Useful for checking if a product has files before deletion.
 *
 * @param productId - UUID of the product
 * @returns Number of files associated with the product
 */
export async function getProductFileCount(productId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
        .from("product_files")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId);

    if (error) {
        console.error("Error counting product files:", error);
        return 0;
    }

    return count || 0;
}
