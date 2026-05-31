"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Star, StarOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { ProductImage } from "@/lib/supabase/types";
import { validateFileSize, SUPPORTED_IMAGE_MIME_TYPES } from "@/lib/storage/types";

interface ProductGalleryManagerProps {
    productId: string;
    images: ProductImage[];
    onImagesChange: (images: ProductImage[]) => void;
}

export function ProductGalleryManager({
    productId,
    images,
    onImagesChange
}: ProductGalleryManagerProps) {
    const [uploading, setUploading] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const validFiles: File[] = [];

        // Validate files
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Check MIME type
            if (!SUPPORTED_IMAGE_MIME_TYPES.includes(file.type as any)) {
                toast.error(`文件 ${file.name} 不是支持的图片格式`);
                continue;
            }

            // Check file size
            const sizeError = validateFileSize(file, "image");
            if (sizeError) {
                toast.error(`文件 ${file.name}: ${sizeError}`);
                continue;
            }

            validFiles.push(file);
        }

        if (validFiles.length === 0) return;

        setUploading(true);
        try {
            const uploadPromises = validFiles.map(async (file) => {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("product_id", productId);

                const response = await fetch(`/api/products/${productId}/images`, {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || "上传失败");
                }

                return response.json();
            });

            const results = await Promise.all(uploadPromises);
            const newImages = results.map(result => result.data);

            // Update images list with new uploads
            const updatedImages = [...images, ...newImages];
            onImagesChange(updatedImages);

            toast.success(`成功上传 ${newImages.length} 张图片`);
        } catch (error) {
            console.error("Upload error:", error);
            toast.error(error instanceof Error ? error.message : "上传失败");
        } finally {
            setUploading(false);
        }
    }, [productId, images, onImagesChange]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleDeleteImage = async (imageId: string) => {
        try {
            const response = await fetch(`/api/products/${productId}/images`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ image_id: imageId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "删除失败");
            }

            // Remove image from local state
            const updatedImages = images.filter(img => img.id !== imageId);
            onImagesChange(updatedImages);

            toast.success("图片删除成功");
        } catch (error) {
            console.error("Delete error:", error);
            toast.error(error instanceof Error ? error.message : "删除失败");
        }
    };

    const handleSetPrimary = async (imageId: string) => {
        try {
            const response = await fetch(`/api/products/${productId}/images`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    image_id: imageId,
                    is_primary: true
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "设置主图失败");
            }

            // Update local state - set all images to non-primary, then set the selected one as primary
            const updatedImages = images.map(img => ({
                ...img,
                is_primary: img.id === imageId
            }));
            onImagesChange(updatedImages);

            toast.success("主图设置成功");
        } catch (error) {
            console.error("Set primary error:", error);
            toast.error(error instanceof Error ? error.message : "设置主图失败");
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        // Reorder images array
        const newImages = [...images];
        const draggedImage = newImages[draggedIndex];
        newImages.splice(draggedIndex, 1);
        newImages.splice(dropIndex, 0, draggedImage);

        // Update sort_order for all images
        const updatedImages = newImages.map((img, index) => ({
            ...img,
            sort_order: index
        }));

        try {
            // Send reorder request to API
            const response = await fetch(`/api/products/${productId}/images`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: "reorder",
                    images: updatedImages.map(img => ({ id: img.id, sort_order: img.sort_order }))
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "排序失败");
            }

            onImagesChange(updatedImages);
            toast.success("图片排序已更新");
        } catch (error) {
            console.error("Reorder error:", error);
            toast.error(error instanceof Error ? error.message : "排序失败");
        }

        setDraggedIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <div className="mt-4">
                        <Button
                            onClick={handleUploadClick}
                            disabled={uploading}
                            variant="outline"
                        >
                            {uploading ? "上传中..." : "选择图片"}
                        </Button>
                        <p className="mt-2 text-sm text-muted-foreground">
                            支持 JPG、PNG、GIF、WebP 格式，单个文件最大 5MB
                        </p>
                    </div>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={SUPPORTED_IMAGE_MIME_TYPES.join(",")}
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                />
            </div>

            {/* Images Grid */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((image, index) => (
                            <Card
                                key={image.id}
                                className={`relative group cursor-move ${draggedIndex === index ? "opacity-50" : ""
                                    }`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, index)}
                                onDragEnd={handleDragEnd}
                            >
                                <CardContent className="p-2">
                                    {/* Drag Handle */}
                                    <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-black/50 rounded p-1">
                                            <GripVertical className="h-4 w-4 text-white" />
                                        </div>
                                    </div>

                                    {/* Primary Badge */}
                                    {image.is_primary && (
                                        <div className="absolute top-2 right-2 z-10">
                                            <div className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                                                主图
                                            </div>
                                        </div>
                                    )}

                                    {/* Image */}
                                    <div className="aspect-square relative overflow-hidden rounded">
                                        <img
                                            src={image.image_url}
                                            alt={image.alt_text || `商品图片 ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleSetPrimary(image.id)}
                                            disabled={image.is_primary}
                                        >
                                            {image.is_primary ? (
                                                <Star className="h-4 w-4 fill-current" />
                                            ) : (
                                                <StarOff className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDeleteImage(image.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                </div>
            )}

            {images.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    <p>暂无图片，点击上方按钮添加图片</p>
                </div>
            )}
        </div>
    );
}