/**
 * Product Files Upload URL API Route
 *
 * Generates upload credentials for direct client-to-Supabase uploads.
 * Uses TUS (resumable upload) protocol for large files (>100MB).
 * This bypasses Next.js body size limits by allowing direct uploads.
 *
 * POST: Generate upload credentials (supports resumable uploads)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { PRODUCT_FILES_BUCKET, UploadErrorCodes } from "@/lib/storage/types";
import { generateStoragePath, generateUniqueFilename } from "@/lib/storage";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST - Generate a signed upload URL for direct upload
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

        // Get file info from request body
        const body = await request.json();
        const { filename, contentType, fileSize } = body;

        if (!filename) {
            return NextResponse.json(
                { error: "Filename is required" },
                { status: 400 }
            );
        }

        // Get existing filenames from database
        const { data: existingFiles } = await supabaseAdmin
            .from("product_files")
            .select("filename")
            .eq("product_id", productId);

        const existingDbFilenames = existingFiles?.map((f) => f.filename) || [];

        // Also check storage bucket for orphaned files
        const storageFolderPath = `products/${productId}`;
        const { data: storageFiles } = await supabaseAdmin.storage
            .from(PRODUCT_FILES_BUCKET)
            .list(storageFolderPath);

        const existingStorageFilenames = storageFiles?.map((f) => f.name) || [];

        // Combine both lists to ensure uniqueness
        const existingFilenames = [...new Set([...existingDbFilenames, ...existingStorageFilenames])];

        // Generate unique filename if needed
        const storageFilename = generateUniqueFilename(filename, existingFilenames);
        const storagePath = generateStoragePath(productId, storageFilename);

        // Create signed upload URL (valid for 1 hour)
        // This returns path and token for use with uploadToSignedUrl (TUS/resumable)
        const { data: signedUrl, error: signError } = await supabaseAdmin.storage
            .from(PRODUCT_FILES_BUCKET)
            .createSignedUploadUrl(storagePath);

        if (signError || !signedUrl) {
            console.error("Error creating signed URL:", signError);
            return NextResponse.json(
                { error: signError?.message || "Failed to create upload URL", error_code: UploadErrorCodes.STORAGE_ERROR },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            // For TUS/resumable upload via uploadToSignedUrl
            path: signedUrl.path,
            token: signedUrl.token,
            // Legacy fields for backward compatibility
            uploadUrl: signedUrl.signedUrl,
            storagePath,
            storageFilename,
            originalFilename: filename,
            contentType: contentType || "application/octet-stream",
            fileSize,
        });
    } catch (err) {
        console.error("POST upload-url error:", err);
        return NextResponse.json(
            { error: String(err), error_code: UploadErrorCodes.UPLOAD_FAILED },
            { status: 500 }
        );
    }
}
