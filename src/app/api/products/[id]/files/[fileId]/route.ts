/**
 * Product File API Route (Single File)
 *
 * Handles operations on a single product file.
 * DELETE: Remove a file from storage and database
 * GET: Get a single file's metadata
 *
 * Requirements: 1.5
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import {
    PRODUCT_FILES_BUCKET,
    UploadErrorCodes,
} from "@/lib/storage/types";

interface RouteParams {
    params: Promise<{ id: string; fileId: string }>;
}

/**
 * GET - Get a single file's metadata
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: productId, fileId } = await params;

        if (!productId || !fileId) {
            return NextResponse.json(
                { error: "Product ID and File ID are required" },
                { status: 400 }
            );
        }

        // Fetch the file record
        const { data, error } = await supabaseAdmin
            .from("product_files")
            .select("*")
            .eq("id", fileId)
            .eq("product_id", productId)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json(
                    { error: "File not found", error_code: UploadErrorCodes.FILE_NOT_FOUND },
                    { status: 404 }
                );
            }
            console.error("Error fetching file:", error);
            return NextResponse.json(
                { error: error.message, error_code: UploadErrorCodes.DATABASE_ERROR },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error("GET file error:", err);
        return NextResponse.json(
            { error: String(err) },
            { status: 500 }
        );
    }
}

/**
 * DELETE - Remove a file from storage and database
 *
 * Deletes both the file from Supabase Storage and the database record.
 *
 * Requirements: 1.5
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: productId, fileId } = await params;

        if (!productId || !fileId) {
            return NextResponse.json(
                { error: "Product ID and File ID are required" },
                { status: 400 }
            );
        }

        // First, get the file record to get the storage path
        const { data: fileRecord, error: fetchError } = await supabaseAdmin
            .from("product_files")
            .select("storage_path")
            .eq("id", fileId)
            .eq("product_id", productId)
            .single();

        if (fetchError) {
            if (fetchError.code === "PGRST116") {
                return NextResponse.json(
                    { error: "File not found", error_code: UploadErrorCodes.FILE_NOT_FOUND },
                    { status: 404 }
                );
            }
            console.error("Error fetching file for deletion:", fetchError);
            return NextResponse.json(
                { error: fetchError.message, error_code: UploadErrorCodes.DATABASE_ERROR },
                { status: 500 }
            );
        }

        // Delete from Supabase Storage
        const { error: storageError } = await supabaseAdmin.storage
            .from(PRODUCT_FILES_BUCKET)
            .remove([fileRecord.storage_path]);

        if (storageError) {
            console.error("Storage delete error:", storageError);
            // Continue with database deletion even if storage deletion fails
            // The file might have been manually deleted or moved
        }

        // Delete from database
        const { error: dbError } = await supabaseAdmin
            .from("product_files")
            .delete()
            .eq("id", fileId)
            .eq("product_id", productId);

        if (dbError) {
            console.error("Database delete error:", dbError);
            return NextResponse.json(
                { error: dbError.message, error_code: UploadErrorCodes.DATABASE_ERROR },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "File deleted successfully",
        });
    } catch (err) {
        console.error("DELETE file error:", err);
        return NextResponse.json(
            { error: String(err) },
            { status: 500 }
        );
    }
}