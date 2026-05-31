"use client";

import { useState, useEffect, useCallback } from "react";
import { FileIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "./file-upload";
import { FileList } from "./file-list";
import type { ProductFile, ProductType, DeliveryType } from "@/lib/supabase/types";

interface ProductFilesProps {
    productId: string | null;
    productType: ProductType;
    deliveryType?: DeliveryType;
}

/**
 * ProductFiles Component
 *
 * Integrates FileUpload and FileList components for managing product files.
 * Shown for app product type OR download delivery type.
 *
 * Requirements: 1.1, 1.4
 */
export function ProductFiles({ productId, productType, deliveryType }: ProductFilesProps) {
    const [files, setFiles] = useState<ProductFile[]>([]);
    const [loading, setLoading] = useState(false);

    // Show for download delivery type
    const shouldShowFiles = deliveryType === "download";

    const fetchFiles = useCallback(async () => {
        if (!productId) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/products/${productId}/files`);
            const result = await response.json();

            if (result.success && result.data) {
                setFiles(result.data);
            }
        } catch (err) {
            console.error("Error fetching files:", err);
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        if (productId && shouldShowFiles) {
            fetchFiles();
        }
    }, [productId, shouldShowFiles, fetchFiles]);

    // Don't render if not applicable
    if (!shouldShowFiles) {
        return null;
    }

    // Show message if product not saved yet
    if (!productId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileIcon className="h-5 w-5" />
                        应用文件
                    </CardTitle>
                    <CardDescription>
                        请先保存商品后再上传应用文件
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <FileIcon className="h-5 w-5" />
                            应用文件
                            {files.length > 0 && (
                                <Badge variant="secondary">{files.length}</Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            上传应用安装包文件，用户购买后可下载
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchFiles}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <FileUpload
                    productId={productId}
                    onUploadComplete={fetchFiles}
                    disabled={loading}
                />
                <FileList
                    productId={productId}
                    files={files}
                    onFileDeleted={fetchFiles}
                    loading={loading}
                />
            </CardContent>
        </Card>
    );
}
