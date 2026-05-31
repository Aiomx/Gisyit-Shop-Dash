"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Brand, BrandGroup } from "@/lib/supabase/types";

interface BrandSelectorProps {
    productId: string | null;
    selectedBrandIds: string[];
    onBrandChange: (brandIds: string[]) => void;
}

const brandGroupLabels: Record<BrandGroup, string> = {
    os: "操作系统",
    platform: "平台",
    store: "商店",
    other: "其他",
};

export function BrandSelector({
    productId,
    selectedBrandIds,
    onBrandChange,
}: BrandSelectorProps) {
    const [open, setOpen] = useState(false);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch all brands
    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const response = await fetch("/api/brands");
                const result = await response.json();
                if (result.data) {
                    setBrands(result.data);
                }
            } catch (error) {
                console.error("Error fetching brands:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBrands();
    }, []);

    // Fetch product's current brand associations
    useEffect(() => {
        if (!productId) return;

        const fetchProductBrands = async () => {
            try {
                const response = await fetch(`/api/products/${productId}/brands`);
                const result = await response.json();
                if (result.data?.brand_ids) {
                    onBrandChange(result.data.brand_ids);
                }
            } catch (error) {
                console.error("Error fetching product brands:", error);
            }
        };
        fetchProductBrands();
    }, [productId]);

    // Group brands by brand_group
    const groupedBrands = brands.reduce(
        (acc, brand) => {
            const group = brand.brand_group || "other";
            if (!acc[group]) {
                acc[group] = [];
            }
            acc[group].push(brand);
            return acc;
        },
        {} as Record<BrandGroup, Brand[]>
    );

    const handleToggleBrand = (brandId: string) => {
        const newSelection = selectedBrandIds.includes(brandId)
            ? selectedBrandIds.filter((id) => id !== brandId)
            : [...selectedBrandIds, brandId];
        onBrandChange(newSelection);
    };

    const handleRemoveBrand = (brandId: string) => {
        onBrandChange(selectedBrandIds.filter((id) => id !== brandId));
    };

    const selectedBrands = brands.filter((b) => selectedBrandIds.includes(b.id));

    return (
        <div className="space-y-2">
            <Label>关联品牌</Label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between h-auto min-h-10"
                        disabled={loading}
                    >
                        <span className="text-muted-foreground">
                            {loading
                                ? "加载中..."
                                : selectedBrandIds.length === 0
                                    ? "选择品牌..."
                                    : `已选择 ${selectedBrandIds.length} 个品牌`}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                    <div className="max-h-80 overflow-y-auto p-2">
                        {Object.entries(groupedBrands).map(([group, groupBrands]) => (
                            <div key={group} className="mb-3">
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                    {brandGroupLabels[group as BrandGroup] || group}
                                </div>
                                <div className="space-y-1">
                                    {groupBrands.map((brand) => (
                                        <div
                                            key={brand.id}
                                            className={cn(
                                                "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent",
                                                selectedBrandIds.includes(brand.id) && "bg-accent"
                                            )}
                                            onClick={() => handleToggleBrand(brand.id)}
                                        >
                                            <Checkbox
                                                checked={selectedBrandIds.includes(brand.id)}
                                                onCheckedChange={() => handleToggleBrand(brand.id)}
                                            />
                                            {brand.logo_url && (
                                                <img
                                                    src={brand.logo_url}
                                                    alt={brand.name}
                                                    className="w-5 h-5 object-contain"
                                                />
                                            )}
                                            <span className="flex-1 text-sm">{brand.name}</span>
                                            {!brand.is_active && (
                                                <Badge variant="secondary" className="text-xs">
                                                    未启用
                                                </Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {brands.length === 0 && !loading && (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                                暂无品牌，请先创建品牌
                            </div>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Selected brands display */}
            {selectedBrands.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedBrands.map((brand) => (
                        <Badge
                            key={brand.id}
                            variant="secondary"
                            className="flex items-center gap-1 pr-1"
                        >
                            {brand.logo_url && (
                                <img
                                    src={brand.logo_url}
                                    alt={brand.name}
                                    className="w-3.5 h-3.5 object-contain"
                                />
                            )}
                            <span>{brand.name}</span>
                            <button
                                type="button"
                                onClick={() => handleRemoveBrand(brand.id)}
                                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
            <p className="text-xs text-muted-foreground">
                选择商品关联的品牌/平台，如 Mac、Windows、Steam 等
            </p>
        </div>
    );
}
