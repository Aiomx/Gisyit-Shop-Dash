/**
 * Product Files Upload API Route (Server-side Proxy)
 *
 * Handles file uploads through the server to bypass CORS issues.
 *
 * POST: Upload file
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { PRODUCT_FILES_BUCKET, UploadErrorCodes } from "@/lib/storage/types";
import { generateStoragePath, generateUniqueFilename } from "@/lib/storage";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * POST - Upload file
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

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const filename = formData.get("filename") as string;
        const contentType = formData.get("contentType") as string || "application/octet-stream";

        if (!file || !filename) {
            return NextResponse.json(
                { error: "File and filename are required" },
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

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage (server-side, no CORS)
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from(PRODUCT_FILES_BUCKET)
            .upload(storagePath, buffer, {
                contentType,
                upsert: false,
            });

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            return NextResponse.json(
                { error: uploadError.message, error_code: UploadErrorCodes.STORAGE_ERROR },
                { status: 500 }
            );
        }

        // Create database record
        const { data: fileRecord, error: dbError } = await supabaseAdmin
            .from("product_files")
            .insert({
                product_id: productId,
                filename: storageFilename,
                original_filename: filename,
                file_size: buffer.length,
                mime_type: contentType,
                storage_path: storagePath,
            })
            .select()
            .single();

        if (dbError) {
            console.error("Database insert error:", dbError);
            // Try to clean up the uploaded file
            await supabaseAdmin.storage.from(PRODUCT_FILES_BUCKET).remove([storagePath]);
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
        console.error("POST upload error:", err);
        return NextResponse.json(
            { error: String(err), error_code: UploadErrorCodes.UPLOAD_FAILED },
            { status: 500 }
        );
    }
}

// Configure for large file uploads (App Router style)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
