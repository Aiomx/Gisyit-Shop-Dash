/**
 * Product Files API Route
 *
 * Handles file upload and listing for product files.
 * POST: Upload a new file for a product
 * GET: List all files for a product
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import {
    PRODUCT_FILES_BUCKET,
    MAX_FILE_SIZE_BYTES,
    UploadErrorCodes,
} from "@/lib/storage/types";
import { generateStoragePath, generateUniqueFilename } from "@/lib/storage";

// Increase max duration for large file uploads (5 minutes)
export const maxDuration = 300;

// Force dynamic rendering for file uploads
export const dynamic = "force-dynamic";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET - List all files for a product
 *
 * Requirements: 1.4
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: productId } = await params;

        if (!productId) {
            return NextResponse.json(
                { error: "Product ID is required" },
                { status: 400 }
            );
        }

        // Fetch files for the product
        const { data, error } = await supabaseAdmin
            .from("product_files")
            .select("*")
            .eq("product_id", productId)
            .order("uploaded_at", { ascending: false });

        if (error) {
            console.error("Error fetching product files:", error);
            return NextResponse.json(
                { error: error.message, error_code: UploadErrorCodes.DATABASE_ERROR },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error("GET product files error:", err);
        return NextResponse.json(
            { error: String(err) },
            { status: 500 }
        );
    }
}

/**
 * POST - Upload a new file for a product
 *
 * Handles multipart form data upload, stores file in Supabase Storage,
 * and creates a database record with file metadata.
 *
 * Requirements: 1.1, 1.2, 1.3
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

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
                {
                    error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024 * 1024)}GB.`,
                    error_code: UploadErrorCodes.FILE_TOO_LARGE,
                },
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
        const allExistingFilenames = [...new Set([...existingDbFilenames, ...existingStorageFilenames])];

        // Generate unique filename if needed
        const originalFilename = file.name;
        const storageFilename = generateUniqueFilename(originalFilename, allExistingFilenames);
        const storagePath = generateStoragePath(productId, storageFilename);

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
            .from(PRODUCT_FILES_BUCKET)
            .upload(storagePath, buffer, {
                contentType: file.type || "application/octet-stream",
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
                original_filename: originalFilename,
                file_size: file.size,
                mime_type: file.type || "application/octet-stream",
                storage_path: storagePath,
            })
            .select()
            .single();

        if (dbError) {
            console.error("Database insert error:", dbError);
            // Attempt to clean up uploaded file
            await supabaseAdmin.storage
                .from(PRODUCT_FILES_BUCKET)
                .remove([storagePath]);

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
        console.error("POST product file error:", err);
        return NextResponse.json(
            { error: String(err), error_code: UploadErrorCodes.UPLOAD_FAILED },
            { status: 500 }
        );
    }
}