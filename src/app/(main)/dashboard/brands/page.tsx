"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Tag, Package, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { BrandWithCount, BrandGroup } from "@/lib/supabase/types";
import { BrandFormDialog } from "./_components/brand-form-dialog";
import { BrandProductsDialog } from "./_components/brand-products-dialog";

const brandGroupLabels: Record<BrandGroup, string> = {
    os: "操作系统",
    platform: "平台",
    store: "商店",
    other: "其他",
};

/**
 * Brand Management Page
 * 
 * Displays brand list with DataTable component.
 * Shows columns: logo, name, group, sort_order, is_active, product_count, actions
 * Provides create/edit/delete functionality.
 * 
 * Requirements: 1.8, 2.2
 */
export default function BrandsPage() {
    const [brands, setBrands] = useState<BrandWithCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [productsDialogOpen, setProductsDialogOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<BrandWithCount | null>(null);
    const [selectedBrand, setSelectedBrand] = useState<BrandWithCount | null>(null);

    const fetchBrands = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/brands");
            const result = await response.json();
            if (result.data) {
                setBrands(result.data);
            }
        } catch (error) {
            console.error("Error fetching brands:", error);
            toast.error("加载品牌列表失败");
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchBrands();
    }, [fetchBrands]);

    const handleCreate = () => {
        setEditingBrand(null);
        setFormDialogOpen(true);
    };

    const handleEdit = (brand: BrandWithCount) => {
        setEditingBrand(brand);
        setFormDialogOpen(true);
    };

    const handleViewProducts = (brand: BrandWithCount) => {
        setSelectedBrand(brand);
        setProductsDialogOpen(true);
    };

    const handleDelete = async (brand: BrandWithCount) => {
        if (brand.product_count > 0) {
            toast.error("该品牌下有关联商品，无法删除");
            return;
        }

        if (!confirm(`确定要删除品牌 "${brand.name}" 吗？`)) return;

        try {
            const response = await fetch(`/api/brands?id=${brand.id}`, {
                method: "DELETE",
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "删除失败");
            }

            toast.success("品牌已删除");
            fetchBrands();
        } catch (error) {
            console.error("Error deleting brand:", error);
            toast.error(error instanceof Error ? error.message : "删除失败");
        }
    };

    const handleFormSuccess = () => {
        setFormDialogOpen(false);
        setEditingBrand(null);
        fetchBrands();
    };

    // Group brands by brand_group
    const groupedBrands = brands.reduce(
        (acc, brand) => {
            const group = brand.brand_group;
            if (!acc[group]) {
                acc[group] = [];
            }
            acc[group].push(brand);
            return acc;
        },
        {} as Record<BrandGroup, BrandWithCount[]>
    );

    // Sort groups in a specific order
    const groupOrder: BrandGroup[] = ["os", "platform", "store", "other"];
    const sortedGroups = groupOrder.filter((group) => groupedBrands[group]?.length > 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Tag className="h-6 w-6" />
                        品牌管理
                    </h1>
                    <p className="text-muted-foreground">管理商品品牌和平台分类</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    添加品牌
                </Button>
            </div>

            <div className="space-y-6">
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">加载中...</div>
                ) : brands.length === 0 ? (
                    <div className="text-center py-12">
                        <Tag className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <p className="mt-2 text-muted-foreground">暂无品牌</p>
                        <Button className="mt-4" onClick={handleCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            添加第一个品牌
                        </Button>
                    </div>
                ) : (
                    sortedGroups.map((group) => (
                        <div key={group} className="space-y-2">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                {brandGroupLabels[group]}
                                <Badge variant="secondary">{groupedBrands[group].length}</Badge>
                            </h2>
                            <div className="rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[60px]">Logo</TableHead>
                                            <TableHead>品牌名称</TableHead>
                                            <TableHead>标识</TableHead>
                                            <TableHead className="w-[80px]">排序</TableHead>
                                            <TableHead className="w-[80px]">状态</TableHead>
                                            <TableHead className="w-[100px]">关联商品</TableHead>
                                            <TableHead className="w-[120px]">操作</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupedBrands[group]
                                            .sort((a, b) => a.sort_order - b.sort_order)
                                            .map((brand) => (
                                                <TableRow key={brand.id}>
                                                    <TableCell>
                                                        {brand.logo_url ? (
                                                            <img
                                                                src={brand.logo_url}
                                                                alt={brand.name}
                                                                className="h-8 w-8 object-contain"
                                                            />
                                                        ) : (
                                                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                                                <Tag className="h-4 w-4 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-medium">{brand.name}</TableCell>
                                                    <TableCell className="text-muted-foreground font-mono text-sm">
                                                        {brand.slug}
                                                    </TableCell>
                                                    <TableCell>{brand.sort_order}</TableCell>
                                                    <TableCell>
                                                        {brand.is_active ? (
                                                            <Badge variant="default" className="gap-1">
                                                                <Eye className="h-3 w-3" />
                                                                启用
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="gap-1">
                                                                <EyeOff className="h-3 w-3" />
                                                                禁用
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="gap-1"
                                                            onClick={() => handleViewProducts(brand)}
                                                        >
                                                            <Package className="h-4 w-4" />
                                                            {brand.product_count}
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEdit(brand)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete(brand)}
                                                                disabled={brand.product_count > 0}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <BrandFormDialog
                open={formDialogOpen}
                onOpenChange={setFormDialogOpen}
                brand={editingBrand}
                onSuccess={handleFormSuccess}
            />

            <BrandProductsDialog
                open={productsDialogOpen}
                onOpenChange={setProductsDialogOpen}
                brand={selectedBrand}
                onProductsChanged={fetchBrands}
            />
        </div>
    );
}
