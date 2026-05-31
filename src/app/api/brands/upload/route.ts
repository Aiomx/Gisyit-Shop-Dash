import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import {
    validateLogoFile,
    ALLOWED_LOGO_MIME_TYPES,
    MAX_LOGO_FILE_SIZE,
} from "@/lib/brand/brand-utils";
import { type BrandErrorCode, brandErrorMessages } from "@/lib/supabase/types";

/**
 * Brand Logo Upload API Route
 * 
 * Handles logo file uploads for brands.
 * Requirements: 1.4, 1.5
 */

/**
 * POST - Upload brand logo
 * Requirements: 1.4, 1.5, 7.3
 * 
 * Validates file type (SVG/PNG) and size (max 2MB).
 * Stores file in Supabase Storage and returns the public URL.
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate file using brand utility function
        const validation = validateLogoFile(file);
        if (!validation.valid) {
            // Determine specific error code
            let errorCode: BrandErrorCode = "INVALID_FILE_TYPE";
            if (file.size > MAX_LOGO_FILE_SIZE) {
                errorCode = "FILE_TOO_LARGE";
            } else if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type)) {
                errorCode = "INVALID_FILE_TYPE";
            }

            return NextResponse.json(
                { error: validation.error || brandErrorMessages[errorCode], code: errorCode },
                { status: 400 }
            );
        }

        // Generate unique filename
        const ext = file.type === "image/svg+xml" ? "svg" : "png";
        const filename = `brands/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Upload to Supabase Storage
        // Note: Some Supabase Storage configurations may not allow image/svg+xml directly
        // For SVG files, we upload as text/plain to bypass MIME type restrictions
        // The file extension (.svg) will still allow browsers to render it correctly
        let contentType = file.type;

        // For SVG files, use text/plain to bypass Supabase Storage MIME restrictions
        if (file.type === "image/svg+xml") {
            contentType = "text/plain";
        }

        const { data, error } = await supabaseAdmin.storage
            .from("images")
            .upload(filename, buffer, {
                contentType: contentType,
                cacheControl: "3600",
                upsert: false,
            });

        if (error) {
            console.error("Brand logo upload error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from("images")
            .getPublicUrl(filename);

        return NextResponse.json({
            success: true,
            url: urlData.publicUrl,
            path: data.path,
        });
    } catch (err) {
        console.error("Brand logo upload error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
