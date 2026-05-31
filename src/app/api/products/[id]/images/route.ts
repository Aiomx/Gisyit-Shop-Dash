import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { validateFileSize, SUPPORTED_IMAGE_MIME_TYPES } from "@/lib/storage/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Use 'images' bucket for product images (public bucket)
// This is different from 'product-files' which is private for downloadable files
const IMAGES_BUCKET = "images";

interface ProductImage {
    id: string;
    product_id: string;
    image_url: string;
    alt_text?: string;
    is_primary: boolean;
    sort_order: number;
    created_at: string;
}

// GET - Fetch all images for a product
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: productId } = await params;

        const { data: images, error } = await supabase
            .from("product_images")
            .select("*")
            .eq("product_id", productId)
            .order("sort_order", { ascending: true });

        if (error) {
            console.error("Database error:", error);
            return NextResponse.json(
                { error: "获取图片列表失败" },
                { status: 500 }
            );
        }

        return NextResponse.json({ data: images });
    } catch (error) {
        console.error("GET images error:", error);
        return NextResponse.json(
            { error: "服务器错误" },
            { status: 500 }
        );
    }
}

// POST - Upload new image
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: productId } = await params;
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "未提供文件" },
                { status: 400 }
            );
        }

        // Validate file type
        if (!SUPPORTED_IMAGE_MIME_TYPES.includes(file.type as any)) {
            return NextResponse.json(
                { error: "不支持的图片格式" },
                { status: 400 }
            );
        }

        // Validate file size
        const sizeError = validateFileSize(file, "image");
        if (sizeError) {
            return NextResponse.json(
                { error: sizeError },
                { status: 400 }
            );
        }

        // Check if product exists
        const { data: product, error: productError } = await supabase
            .from("products")
            .select("id")
            .eq("id", productId)
            .single();

        if (productError || !product) {
            return NextResponse.json(
                { error: "商品不存在" },
                { status: 404 }
            );
        }

        // Generate unique filename
        const fileExtension = file.name.split(".").pop();
        const uniqueFilename = `${uuidv4()}.${fileExtension}`;
        // Store in images bucket under products/{productId}/gallery/
        const storagePath = `products/${productId}/gallery/${uniqueFilename}`;

        // Upload to Supabase Storage (images bucket - public)
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(IMAGES_BUCKET)
            .upload(storagePath, file, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            return NextResponse.json(
                { error: "文件上传失败" },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(IMAGES_BUCKET)
            .getPublicUrl(storagePath);

        // Get current max sort_order
        const { data: maxOrderData } = await supabase
            .from("product_images")
            .select("sort_order")
            .eq("product_id", productId)
            .order("sort_order", { ascending: false })
            .limit(1);

        const nextSortOrder = maxOrderData && maxOrderData.length > 0
            ? maxOrderData[0].sort_order + 1
            : 0;

        // Check if this should be the primary image (if no primary exists)
        const { data: primaryCheck } = await supabase
            .from("product_images")
            .select("id")
            .eq("product_id", productId)
            .eq("is_primary", true)
            .limit(1);

        const isPrimary = !primaryCheck || primaryCheck.length === 0;

        // Insert image record
        const { data: imageData, error: insertError } = await supabase
            .from("product_images")
            .insert({
                product_id: productId,
                image_url: urlData.publicUrl,
                alt_text: file.name,
                is_primary: isPrimary,
                sort_order: nextSortOrder,
            })
            .select()
            .single();

        if (insertError) {
            console.error("Database insert error:", insertError);

            // Clean up uploaded file
            await supabase.storage
                .from(IMAGES_BUCKET)
                .remove([storagePath]);

            return NextResponse.json(
                { error: "保存图片信息失败" },
                { status: 500 }
            );
        }

        return NextResponse.json({ data: imageData });
    } catch (error) {
        console.error("POST image error:", error);
        return NextResponse.json(
            { error: "服务器错误" },
            { status: 500 }
        );
    }
}

// PUT - Update image (set primary or reorder)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: productId } = await params;
        const body = await request.json();

        if (body.action === "reorder") {
            // Batch update sort orders
            const { images } = body;

            if (!Array.isArray(images)) {
                return NextResponse.json(
                    { error: "无效的图片排序数据" },
                    { status: 400 }
                );
            }

            // Update each image's sort_order
            const updatePromises = images.map(({ id, sort_order }: { id: string; sort_order: number }) =>
                supabase
                    .from("product_images")
                    .update({ sort_order })
                    .eq("id", id)
                    .eq("product_id", productId)
            );

            const results = await Promise.all(updatePromises);

            // Check for errors
            const hasError = results.some(result => result.error);
            if (hasError) {
                console.error("Reorder errors:", results.filter(r => r.error));
                return NextResponse.json(
                    { error: "更新排序失败" },
                    { status: 500 }
                );
            }

            return NextResponse.json({ success: true });
        } else {
            // Set primary image
            const { image_id, is_primary } = body;

            if (!image_id || typeof is_primary !== "boolean") {
                return NextResponse.json(
                    { error: "缺少必要参数" },
                    { status: 400 }
                );
            }

            // If setting as primary, first unset all other primary images
            if (is_primary) {
                await supabase
                    .from("product_images")
                    .update({ is_primary: false })
                    .eq("product_id", productId);
            }

            // Update the target image
            const { data, error } = await supabase
                .from("product_images")
                .update({ is_primary })
                .eq("id", image_id)
                .eq("product_id", productId)
                .select()
                .single();

            if (error) {
                console.error("Update primary error:", error);
                return NextResponse.json(
                    { error: "更新主图设置失败" },
                    { status: 500 }
                );
            }

            return NextResponse.json({ data });
        }
    } catch (error) {
        console.error("PUT image error:", error);
        return NextResponse.json(
            { error: "服务器错误" },
            { status: 500 }
        );
    }
}

// DELETE - Remove image
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: productId } = await params;
        const body = await request.json();
        const { image_id } = body;

        if (!image_id) {
            return NextResponse.json(
                { error: "缺少图片ID" },
                { status: 400 }
            );
        }

        // Get image info before deletion
        const { data: imageData, error: fetchError } = await supabase
            .from("product_images")
            .select("*")
            .eq("id", image_id)
            .eq("product_id", productId)
            .single();

        if (fetchError || !imageData) {
            return NextResponse.json(
                { error: "图片不存在" },
                { status: 404 }
            );
        }

        // Extract storage path from URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/images/products/{productId}/gallery/{filename}
        const url = new URL(imageData.image_url);
        const pathParts = url.pathname.split("/");
        // Find the index of 'images' bucket and get everything after it
        const bucketIndex = pathParts.indexOf("images");
        const storagePath = bucketIndex >= 0
            ? pathParts.slice(bucketIndex + 1).join("/")
            : pathParts.slice(pathParts.indexOf("products")).join("/");

        // Delete from database first
        const { error: deleteError } = await supabase
            .from("product_images")
            .delete()
            .eq("id", image_id)
            .eq("product_id", productId);

        if (deleteError) {
            console.error("Database delete error:", deleteError);
            return NextResponse.json(
                { error: "删除图片记录失败" },
                { status: 500 }
            );
        }

        // Delete from storage (images bucket)
        const { error: storageError } = await supabase.storage
            .from(IMAGES_BUCKET)
            .remove([storagePath]);

        if (storageError) {
            console.error("Storage delete error:", storageError);
            // Don't fail the request if storage deletion fails
            // The database record is already deleted
        }

        // If deleted image was primary, set another image as primary
        if (imageData.is_primary) {
            const { data: remainingImages } = await supabase
                .from("product_images")
                .select("id")
                .eq("product_id", productId)
                .order("sort_order", { ascending: true })
                .limit(1);

            if (remainingImages && remainingImages.length > 0) {
                await supabase
                    .from("product_images")
                    .update({ is_primary: true })
                    .eq("id", remainingImages[0].id);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE image error:", error);
        return NextResponse.json(
            { error: "服务器错误" },
            { status: 500 }
        );
    }
}