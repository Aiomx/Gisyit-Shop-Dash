"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, Trash2, Loader2, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { BrandWithCount } from "@/lib/supabase/types";

interface BrandProduct {
    association_id: string;
    product_id: string;
    associated_at: string;
    id: string;
    product_code: string;
    name: string;
    is_active: boolean;
    primary_image: string | null;
}

interface BrandProductsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    brand: BrandWithCount | null;
    onProductsChanged: () => void;
}

/**
 * Brand Products Dialog Component
 * 
 * Displays products associated with a brand.
 * Allows removing product associations.
 * 
 * Requirements: 2.2, 2.3
 */
export function BrandProductsDialog({
    open,
    onOpenChange,
    brand,
    onProductsChanged,
}: BrandProductsDialogProps) {
    const [products, setProducts] = useState<BrandProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [removing, setRemoving] = useState<string | null>(null);

    const fetchProducts = useCallback(async () => {
        if (!brand) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/brands/${brand.id}/products`);
            const result = await response.json();

            if (result.data?.products) {
                setProducts(result.data.products);
            }
        } catch (error) {
            console.error("Error fetching brand products:", error);
            toast.error("加载关联商品失败");
        } finally {
            setLoading(false);
        }
    }, [brand]);

    useEffect(() => {
        if (open && brand) {
            fetchProducts();
        } else {
            setProducts([]);
        }
    }, [open, brand, fetchProducts]);

    const handleRemoveProduct = async (product: BrandProduct) => {
        if (!brand) return;

        if (!confirm(`确定要移除商品 "${product.name}" 与此品牌的关联吗？`)) return;

        setRemoving(product.product_id);
        try {
            const response = await fetch(`/api/brands/${brand.id}/products`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product_ids: [product.product_id] }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "移除失败");
            }

            toast.success("已移除商品关联");
            fetchProducts();
            onProductsChanged();
        } catch (error) {
            console.error("Error removing product association:", error);
            toast.error(error instanceof Error ? error.message : "移除失败");
        } finally {
            setRemoving(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {brand?.name} - 关联商品
                    </DialogTitle>
                    <DialogDescription>
                        查看和管理与此品牌关联的商品
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-8">
                            <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                            <p className="mt-2 text-muted-foreground">暂无关联商品</p>
                            <p className="text-sm text-muted-foreground">
                                可以在商品编辑页面添加品牌关联
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[60px]">图片</TableHead>
                                        <TableHead>商品名称</TableHead>
                                        <TableHead className="w-[100px]">商品编码</TableHead>
                                        <TableHead className="w-[80px]">状态</TableHead>
                                        <TableHead className="w-[100px]">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.map((product) => (
                                        <TableRow key={product.product_id}>
                                            <TableCell>
                                                {product.primary_image ? (
                                                    <img
                                                        src={product.primary_image}
                                                        alt={product.name}
                                                        className="h-10 w-10 object-cover rounded"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                                        <Package className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{product.name}</span>
                                                    <a
                                                        href={`/dashboard/products/${product.product_id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-muted-foreground hover:text-foreground"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm text-muted-foreground">
                                                {product.product_code}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={product.is_active ? "default" : "secondary"}>
                                                    {product.is_active ? "上架" : "下架"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveProduct(product)}
                                                    disabled={removing === product.product_id}
                                                >
                                                    {removing === product.product_id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    )}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                        共 {products.length} 个关联商品
                    </p>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        关闭
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
