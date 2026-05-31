import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { v4 as uuidv4 } from "uuid";

// Supported media formats
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const ALLOWED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];

// File extension mapping
const EXTENSION_MAP: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
};

// Size limits in bytes
const IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const VIDEO_MAX_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Validates if the file type is supported
 */
export function isValidFileType(mimeType: string): boolean {
    return ALLOWED_TYPES.includes(mimeType);
}

/**
 * Validates if the file size is within limits
 */
export function isValidFileSize(mimeType: string, size: number): boolean {
    if (IMAGE_TYPES.includes(mimeType)) {
        return size <= IMAGE_MAX_SIZE;
    }
    if (VIDEO_TYPES.includes(mimeType)) {
        return size <= VIDEO_MAX_SIZE;
    }
    return false;
}

/**
 * Generates the storage path for description media
 */
export function generateStoragePath(productId: string, mimeType: string): string {
    const ext = EXTENSION_MAP[mimeType] || "bin";
    const uniqueId = uuidv4();
    return `product-descriptions/${productId}/${uniqueId}.${ext}`;
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const productId = formData.get("productId") as string;

        // Validate required fields
        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        if (!productId) {
            return NextResponse.json(
                { error: "Product ID is required" },
                { status: 400 }
            );
        }

        // Validate file type
        if (!isValidFileType(file.type)) {
            return NextResponse.json(
                { error: "不支持的文件格式，请上传 jpg/png/gif/webp/mp4/webm 格式" },
                { status: 400 }
            );
        }

        // Validate file size
        if (!isValidFileSize(file.type, file.size)) {
            const isImage = IMAGE_TYPES.includes(file.type);
            const maxSize = isImage ? "10MB" : "100MB";
            return NextResponse.json(
                { error: `文件大小超出限制（${isImage ? "图片" : "视频"}最大 ${maxSize}）` },
                { status: 400 }
            );
        }

        // Generate storage path
        const storagePath = generateStoragePath(productId, file.type);

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Upload to Supabase Storage
        const { data, error } = await supabaseAdmin.storage
            .from("images")
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (error) {
            console.error("Upload error:", error);
            return NextResponse.json(
                { error: "文件上传失败，请稍后重试" },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from("images")
            .getPublicUrl(storagePath);

        return NextResponse.json({
            success: true,
            url: urlData.publicUrl,
            path: data.path,
        });
    } catch (err) {
        console.error("Upload error:", err);
        return NextResponse.json(
            { error: "文件上传失败，请稍后重试" },
            { status: 500 }
        );
    }
}
