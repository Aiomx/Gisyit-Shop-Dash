import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { validateFileSize, SUPPORTED_VIDEO_MIME_TYPES } from "@/lib/storage/types";
import { generateStoragePath } from "@/lib/storage";
import { parseVideoUrl } from "@/lib/video/video-url-parser";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ProductVideo {
    id: string;
    product_id: string;
    video_url: string;
    video_type: 'demo' | 'tutorial' | 'review';
    source_type: 'local' | 'youtube' | 'bilibili' | 'external';
    thumbnail_url?: string;
    title?: string;
    duration?: number;
    sort_order: number;
    created_at: string;
}

// GET - Fetch all videos for a product
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: productId } = await params;

        const { data: videos, error } = await supabase
            .from("product_videos")
            .select("*")
            .eq("product_id", productId)
            .order("sort_order", { ascending: true });

        if (error) {
            console.error("Database error:", error);
            return NextResponse.json(
                { error: "获取视频列表失败" },
                { status: 500 }
            );
        }

        // For local videos stored in private bucket, generate signed URLs
        const videosWithSignedUrls = await Promise.all(
            (videos || []).map(async (video) => {
                if (video.source_type === 'local' && video.video_url) {
                    try {
                        // Extract storage path from URL
                        const url = new URL(video.video_url);
                        const pathParts = url.pathname.split("/");
                        const productsIndex = pathParts.indexOf("products");
                        if (productsIndex >= 0) {
                            const storagePath = pathParts.slice(productsIndex).join("/");

                            // Generate signed URL (valid for 1 hour)
                            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                                .from("product-files")
                                .createSignedUrl(storagePath, 3600);

                            if (!signedUrlError && signedUrlData) {
                                return {
                                    ...video,
                                    video_url: signedUrlData.signedUrl
                                };
                            }
                        }
                    } catch (e) {
                        console.error("Error generating signed URL for video:", e);
                    }
                }
                return video;
            })
        );

        return NextResponse.json({ data: videosWithSignedUrls });
    } catch (error) {
        console.error("GET videos error:", error);
        return NextResponse.json(
            { error: "服务器错误" },
            { status: 500 }
        );
    }
}

// POST - Upload new video or add external video link
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: productId } = await params;
        const contentType = request.headers.get("content-type");

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

        // Get current max sort_order
        const { data: maxOrderData } = await supabase
            .from("product_videos")
            .select("sort_order")
            .eq("product_id", productId)
            .order("sort_order", { ascending: false })
            .limit(1);

        const nextSortOrder = maxOrderData && maxOrderData.length > 0
            ? maxOrderData[0].sort_order + 1
            : 0;

        // Handle file upload (multipart/form-data)
        if (contentType?.includes("multipart/form-data")) {
            const formData = await request.formData();
            const file = formData.get("file") as File;
            const videoType = (formData.get("video_type") as string) || "demo";
            const title = (formData.get("title") as string) || file?.name;

            if (!file) {
                return NextResponse.json(
                    { error: "未提供文件" },
                    { status: 400 }
                );
            }

            // Validate file type
            if (!SUPPORTED_VIDEO_MIME_TYPES.includes(file.type as any)) {
                return NextResponse.json(
                    { error: "不支持的视频格式，仅支持 MP4、WebM、MOV" },
                    { status: 400 }
                );
            }

            // Validate file size
            const sizeError = validateFileSize(file, "video");
            if (sizeError) {
                return NextResponse.json(
                    { error: sizeError },
                    { status: 400 }
                );
            }

            // Generate unique filename
            const fileExtension = file.name.split(".").pop();
            const uniqueFilename = `${uuidv4()}.${fileExtension}`;
            const storagePath = generateStoragePath(productId, `videos/${uniqueFilename}`);

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from("product-files")
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
                .from("product-files")
                .getPublicUrl(storagePath);

            // Insert video record
            const { data: videoData, error: insertError } = await supabase
                .from("product_videos")
                .insert({
                    product_id: productId,
                    video_url: urlData.publicUrl,
                    video_type: videoType,
                    source_type: 'local',
                    title: title,
                    sort_order: nextSortOrder,
                })
                .select()
                .single();

            if (insertError) {
                console.error("Database insert error:", insertError);

                // Clean up uploaded file
                await supabase.storage
                    .from("product-files")
                    .remove([storagePath]);

                return NextResponse.json(
                    { error: "保存视频信息失败" },
                    { status: 500 }
                );
            }

            return NextResponse.json({ data: videoData });
        }

        // Handle external video URL (application/json)
        const body = await request.json();
        const { video_url, video_type = "demo", title } = body;

        if (!video_url) {
            return NextResponse.json(
                { error: "缺少视频链接" },
                { status: 400 }
            );
        }

        // Parse video URL to determine source type and extract metadata
        const videoInfo = parseVideoUrl(video_url);

        // Insert video record
        const { data: videoData, error: insertError } = await supabase
            .from("product_videos")
            .insert({
                product_id: productId,
                video_url: video_url,
                video_type: video_type,
                source_type: videoInfo.source_type,
                thumbnail_url: videoInfo.thumbnail_url,
                title: title || videoInfo.title,
                duration: videoInfo.duration,
                sort_order: nextSortOrder,
            })
            .select()
            .single();

        if (insertError) {
            console.error("Database insert error:", insertError);
            return NextResponse.json(
                { error: "保存视频信息失败" },
                { status: 500 }
            );
        }

        return NextResponse.json({ data: videoData });
    } catch (error) {
        console.error("POST video error:", error);
        return NextResponse.json(
            { error: "服务器错误" },
            { status: 500 }
        );
    }
}

// PUT - Update video (reorder)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: productId } = await params;
        const body = await request.json();

        if (body.action === "reorder") {
            // Batch update sort orders
            const { videos } = body;

            if (!Array.isArray(videos)) {
                return NextResponse.json(
                    { error: "无效的视频排序数据" },
                    { status: 400 }
                );
            }

            // Update each video's sort_order
            const updatePromises = videos.map(({ id, sort_order }: { id: string; sort_order: number }) =>
                supabase
                    .from("product_videos")
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
        }

        return NextResponse.json(
            { error: "不支持的操作" },
            { status: 400 }
        );
    } catch (error) {
        console.error("PUT video error:", error);
        return NextResponse.json(
            { error: "服务器错误" },
            { status: 500 }
        );
    }
}

// DELETE - Remove video
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: productId } = await params;
        const body = await request.json();
        const { video_id } = body;

        if (!video_id) {
            return NextResponse.json(
                { error: "缺少视频ID" },
                { status: 400 }
            );
        }

        // Get video info before deletion
        const { data: videoData, error: fetchError } = await supabase
            .from("product_videos")
            .select("*")
            .eq("id", video_id)
            .eq("product_id", productId)
            .single();

        if (fetchError || !videoData) {
            return NextResponse.json(
                { error: "视频不存在" },
                { status: 404 }
            );
        }

        // Delete from database first
        const { error: deleteError } = await supabase
            .from("product_videos")
            .delete()
            .eq("id", video_id)
            .eq("product_id", productId);

        if (deleteError) {
            console.error("Database delete error:", deleteError);
            return NextResponse.json(
                { error: "删除视频记录失败" },
                { status: 500 }
            );
        }

        // If it's a local video, delete from storage
        if (videoData.source_type === 'local') {
            try {
                const url = new URL(videoData.video_url);
                const pathParts = url.pathname.split("/");
                const storagePath = pathParts.slice(pathParts.indexOf("products")).join("/");

                const { error: storageError } = await supabase.storage
                    .from("product-files")
                    .remove([storagePath]);

                if (storageError) {
                    console.error("Storage delete error:", storageError);
                    // Don't fail the request if storage deletion fails
                    // The database record is already deleted
                }
            } catch (error) {
                console.error("Error parsing video URL for deletion:", error);
                // Continue even if we can't delete from storage
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE video error:", error);
        return NextResponse.json(
            { error: "服务器错误" },
            { status: 500 }
        );
    }
}