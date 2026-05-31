"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Product, ProductImage, ProductVideo, ProductType, DeliveryType } from "@/lib/supabase/types";
import { ProductGalleryManager } from "@/components/product/product-gallery-manager";
import { ProductVideoManager } from "@/components/product/product-video-manager";
import { ProductFiles } from "../../_components/product-files";
import { VerificationToggle } from "@/components/product/verification-toggle";
import { DescriptionEditor } from "@/components/product/description-editor";

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;

    const [product, setProduct] = useState<Product | null>(null);
    const [images, setImages] = useState<ProductImage[]>([]);
    const [videos, setVideos] = useState<ProductVideo[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProduct = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/products?id=${productId}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "获取商品信息失败");
            }

            if (result.data && result.data.length > 0) {
                setProduct(result.data[0]);
            } else {
                throw new Error("商品不存在");
            }

            // Fetch product images
            const imagesResponse = await fetch(`/api/products/${productId}/images`);
            const imagesResult = await imagesResponse.json();

            if (imagesResponse.ok && imagesResult.data) {
                setImages(imagesResult.data);
            }

            // Fetch product videos
            const videosResponse = await fetch(`/api/products/${productId}/videos`);
            const videosResult = await videosResponse.json();

            if (videosResponse.ok && videosResult.data) {
                setVideos(videosResult.data);
            }
        } catch (error) {
            console.error("Error fetching product:", error);
            toast.error(error instanceof Error ? error.message : "获取商品信息失败");
            router.push("/dashboard/products");
        }
        setLoading(false);
    };

    useEffect(() => {
        if (productId) {
            fetchProduct();
        }
    }, [productId]);

    const handleSave = async () => {
        try {
            // Since individual components handle their own persistence,
            // the save operation here focuses on validation and user feedback

            // Validate that we have at least one image (business rule)
            if (images.length === 0) {
                toast.error("请至少添加一张商品图片");
                return;
            }

            // Validate that we have a primary image
            const hasPrimaryImage = images.some(img => img.is_primary);
            if (!hasPrimaryImage && images.length > 0) {
                // Auto-set the first image as primary if none is set
                await handleSetPrimaryImage(images[0].id);
            }

            // All individual component changes are already persisted
            // This save operation confirms all changes are complete
            toast.success("商品详情保存成功");

            // Optionally redirect back to products list after successful save
            // router.push("/dashboard/products");
        } catch (error) {
            console.error("Save error:", error);
            toast.error(error instanceof Error ? error.message : "保存失败");
        }
    };

    const handleSetPrimaryImage = async (imageId: string) => {
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

            // Update local state
            const updatedImages = images.map(img => ({
                ...img,
                is_primary: img.id === imageId
            }));
            setImages(updatedImages);
        } catch (error) {
            throw error;
        }
    };

    const handleCancel = () => {
        router.push("/dashboard/products");
    };

    /**
     * Handle verification toggle change
     * Updates the product's is_verified status via API
     * Requirements: 2.2, 2.3, 2.4
     */
    const handleVerificationToggle = async (verified: boolean) => {
        try {
            const response = await fetch("/api/products", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: productId,
                    is_verified: verified,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "更新验证状态失败");
            }

            // Update local state
            setProduct(prev => prev ? { ...prev, is_verified: verified } : null);
            toast.success(verified ? "商品已标记为已验证" : "商品验证状态已取消");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "更新验证状态失败");
            throw error;
        }
    };

    /**
     * Handle description save
     * Updates the product's detail_content via API
     * Requirements: 6.4, 6.5, 6.6
     */
    const handleDescriptionSave = async (content: string) => {
        try {
            const response = await fetch("/api/products", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: productId,
                    detail_content: content,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "保存商品介绍失败");
            }

            // Update local state
            setProduct(prev => prev ? { ...prev, detail_content: content } : null);
            toast.success("商品介绍保存成功");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "保存商品介绍失败");
            throw error;
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={handleCancel}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">商品详情配置</h1>
                            <p className="text-muted-foreground">加载中...</p>
                        </div>
                    </div>
                </div>
                <div className="text-center py-8">
                    <p className="text-muted-foreground">正在加载商品信息...</p>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={handleCancel}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">商品详情配置</h1>
                            <p className="text-muted-foreground">商品不存在</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handleCancel}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">商品详情配置</h1>
                        <p className="text-muted-foreground" title={product.name}>
                            {product.name}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleCancel}>
                        <X className="mr-2 h-4 w-4" />
                        取消
                    </Button>
                    <Button onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" />
                        保存
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                {/* Basic Product Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>基本信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">商品名称</label>
                                <p className="mt-1 font-medium">{product.name}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">商品编码</label>
                                <p className="mt-1 font-medium">{product.product_code}</p>
                            </div>
                        </div>
                        {product.description && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">商品描述</label>
                                <p className="mt-1 text-sm">{product.description}</p>
                            </div>
                        )}

                        {/* Verification Toggle - Requirements: 2.1, 2.2, 2.5 */}
                        {/* Note: Verification toggle disabled - product_type "app"/"apps" not in current schema */}
                    </CardContent>
                </Card>

                {/* Description Editor - Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6 */}
                <Card>
                    <CardHeader>
                        <CardTitle>商品详情介绍</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DescriptionEditor
                            productId={productId}
                            content={product.detail_content ?? null}
                            onSave={handleDescriptionSave}
                        />
                    </CardContent>
                </Card>

                {/* Gallery Management */}
                <Card>
                    <CardHeader>
                        <CardTitle>图片管理</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ProductGalleryManager
                            productId={productId}
                            images={images}
                            onImagesChange={setImages}
                        />
                    </CardContent>
                </Card>

                {/* Video Management */}
                <Card>
                    <CardHeader>
                        <CardTitle>视频管理</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ProductVideoManager
                            productId={productId}
                            videos={videos}
                            onVideosChange={setVideos}
                        />
                    </CardContent>
                </Card>

                {/* File Management - For download delivery type */}
                {product.delivery_type === "download" && (
                    <ProductFiles
                        productId={productId}
                        productType={product.product_type as ProductType}
                        deliveryType={product.delivery_type as DeliveryType}
                    />
                )}
            </div>
        </div>
    );
}