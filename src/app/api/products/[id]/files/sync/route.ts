/**
 * Product Files Sync API Route
 *
 * Syncs orphaned files from storage bucket to database.
 * POST: Sync orphaned files for a product
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { PRODUCT_FILES_BUCKET, UploadErrorCodes } from "@/lib/storage/types";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST - Sync orphaned files from storage to database
 *
 * Finds files in storage that don't have database records and creates them.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: productId } = await params;

        if (!productId) {
            return NextResponse.json(
                { error: "Product ID is required" },
                { status: 400 }
            );
        }

        // Verify product exists
        const { data: product, error: productError } = await supabaseAdmin
            .from("products")
            .select("id")
            .eq("id", productId)
            .single();

        if (productError || !product) {
            return NextResponse.json(
                { error: "Product not found", error_code: UploadErrorCodes.INVALID_PRODUCT },
                { status: 404 }
            );
        }

        // Get existing database records
        const { data: dbFiles } = await supabaseAdmin
            .from("product_files")
            .select("filename, storage_path")
            .eq("product_id", productId);

        const dbFilenames = new Set(dbFiles?.map((f) => f.filename) || []);

        // List files in storage bucket
        const storageFolderPath = `products/${productId}`;
        const { data: storageFiles, error: listError } = await supabaseAdmin.storage
            .from(PRODUCT_FILES_BUCKET)
            .list(storageFolderPath);

        if (listError) {
            console.error("Error listing storage files:", listError);
            return NextResponse.json(
                { error: listError.message, error_code: UploadErrorCodes.STORAGE_ERROR },
                { status: 500 }
            );
        }

        // Find orphaned files (in storage but not in database)
        const orphanedFiles = storageFiles?.filter(
            (f) => !f.name.startsWith(".") && !dbFilenames.has(f.name)
        ) || [];

        if (orphanedFiles.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No orphaned files found",
                synced: 0,
            });
        }

        // Create database records for orphaned files
        const syncedFiles = [];
        const errors = [];

        for (const file of orphanedFiles) {
            const storagePath = `${storageFolderPath}/${file.name}`;

            // Get file metadata from storage
            const { data: fileData } = await supabaseAdmin.storage
                .from(PRODUCT_FILES_BUCKET)
                .list(storageFolderPath, {
                    search: file.name,
                });

            const fileInfo = fileData?.find((f) => f.name === file.name);
            const fileSize = fileInfo?.metadata?.size || 0;
            const mimeType = fileInfo?.metadata?.mimetype || "application/octet-stream";

            // Create database record
            const { data: fileRecord, error: dbError } = await supabaseAdmin
                .from("product_files")
                .insert({
                    product_id: productId,
                    filename: file.name,
                    original_filename: file.name,
                    file_size: fileSize,
                    mime_type: mimeType,
                    storage_path: storagePath,
                })
                .select()
                .single();

            if (dbError) {
                console.error(`Error syncing file ${file.name}:`, dbError);
                errors.push({ filename: file.name, error: dbError.message });
            } else {
                syncedFiles.push(fileRecord);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Synced ${syncedFiles.length} files`,
            synced: syncedFiles.length,
            files: syncedFiles,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (err) {
        console.error("Sync product files error:", err);
        return NextResponse.json(
            { error: String(err) },
            { status: 500 }
        );
    }
}
