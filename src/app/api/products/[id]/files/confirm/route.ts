/**
 * Product Files Confirm API Route
 *
 * Confirms a direct upload and creates the database record.
 *
 * POST: Confirm upload and create file record
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { PRODUCT_FILES_BUCKET, UploadErrorCodes } from "@/lib/storage/types";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST - Confirm upload and create database record
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: productId } = await params;

        if (!productId) {
            return NextResponse.json(
                { error: "Product ID is required", error_code: UploadErrorCodes.INVALID_PRODUCT },
                { status: 400 }
            );
        }

        // Get file info from request body
        const body = await request.json();
        const { storagePath, storageFilename, originalFilename, contentType, fileSize } = body;

        if (!storagePath || !storageFilename || !originalFilename) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Verify the file exists in storage
        const storageFolderPath = `products/${productId}`;
        const { data: fileData, error: fileError } = await supabaseAdmin.storage
            .from(PRODUCT_FILES_BUCKET)
            .list(storageFolderPath, {
                search: storageFilename,
            });

        if (fileError) {
            console.error("Error verifying file:", fileError);
            return NextResponse.json(
                { error: "Failed to verify uploaded file", error_code: UploadErrorCodes.STORAGE_ERROR },
                { status: 500 }
            );
        }

        const uploadedFile = fileData?.find((f) => f.name === storageFilename);
        if (!uploadedFile) {
            return NextResponse.json(
                { error: "File not found in storage", error_code: UploadErrorCodes.FILE_NOT_FOUND },
                { status: 404 }
            );
        }

        // Create database record
        const { data: fileRecord, error: dbError } = await supabaseAdmin
            .from("product_files")
            .insert({
                product_id: productId,
                filename: storageFilename,
                original_filename: originalFilename,
                file_size: fileSize || uploadedFile.metadata?.size || 0,
                mime_type: contentType || uploadedFile.metadata?.mimetype || "application/octet-stream",
                storage_path: storagePath,
            })
            .select()
            .single();

        if (dbError) {
            console.error("Database insert error:", dbError);
            return NextResponse.json(
                { error: dbError.message, error_code: UploadErrorCodes.DATABASE_ERROR },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            file: fileRecord,
        });
    } catch (err) {
        console.error("POST confirm error:", err);
        return NextResponse.json(
            { error: String(err), error_code: UploadErrorCodes.UPLOAD_FAILED },
            { status: 500 }
        );
    }
}
