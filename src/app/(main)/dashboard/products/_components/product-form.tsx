"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Infinity, Link2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { Product, ProductCategory, ProductType, DeliveryType, StoreSection_Entity } from "@/lib/supabase/types";
import { ProductFiles } from "./product-files";
import { BrandSelector } from "./brand-selector";
import { FreeProductToggle, validateFreeProductConfig } from "@/components/product/free-product-toggle";
import { generateSlug, validateSlug } from "@/lib/slug";

interface ProductFormProps {
    product: Product | null;
    categories: ProductCategory[];
    onSave: () => void;
    onCancel: () => void;
}

// Product types will be loaded dynamically from store_sections

const deliveryTypes: { value: DeliveryType; label: string }[] = [
    { value: "download", label: "下载" },
    { value: "license_key", label: "授权码" },
    { value: "cdk", label: "CDK" },
    { value: "shipment", label: "物流发货" },
    { value: "manual", label: "人工处理" },
];

export function ProductForm({ product, categories, onSave, onCancel }: ProductFormProps) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [sections, setSections] = useState<StoreSection_Entity[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Slug validation state - Requirements: 4.3, 4.4
    const [slugValidation, setSlugValidation] = useState<{
        checking: boolean;
        available: boolean | null;
        error: string | null;
    }>({ checking: false, available: null, error: null });

    // Normalize product_type: map legacy "app" to "apps" for section slug compatibility
    const normalizeProductType = (type: string | undefined): string => {
        if (type === "app") return "apps"; // Legacy data compatibility
        return type || "";
    };

    const [formData, setFormData] = useState({
        product_code: product?.product_code || "",
        name: product?.name || "",
        // Slug field - Requirements: 4.1, 4.2
        slug: product?.slug || "",
        subtitle: product?.subtitle || "",
        description: product?.description || "",
        product_type: normalizeProductType(product?.product_type),
        delivery_type: product?.delivery_type || ("license_key" as DeliveryType),
        category_id: product?.category_id || "",
        is_active: product?.is_active ?? true,
        has_discount: product?.has_discount ?? false,
        image_url: product?.images?.[0]?.image_url || "",
        price_amount: product?.prices?.[0]?.price_amount?.toString() || "",
        inventory_count: product?.inventory_count as number | null | undefined,
        // Free product fields - Requirements: 9.1, 9.4
        is_free: (product as any)?.is_free ?? false,
        require_login: (product as any)?.require_login ?? false,
        // Promotion fields
        promotion_price: (product as any)?.promotion_price?.toString() || "",
        original_price: (product as any)?.original_price?.toString() || product?.prices?.[0]?.price_amount?.toString() || "",
        promotion_end_at: (product as any)?.promotion_end_at || "",
        is_promotion_unlimited: (product as any)?.is_promotion_unlimited ?? true,
    });

    // Store original slug for history tracking - Requirements: 4.6, 5.1
    const originalSlug = useRef(product?.slug || "");

    // Track if inventory is unlimited (null)
    const [isUnlimitedInventory, setIsUnlimitedInventory] = useState(
        product?.inventory_count === null || product?.inventory_count === undefined
    );

    // Track selected brand IDs for association
    const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);

    // Fetch sections for grouping categories
    useEffect(() => {
        const fetchSections = async () => {
            try {
                const response = await fetch("/api/sections");
                const result = await response.json();
                if (result.data) {
                    setSections(result.data);
                }
            } catch (error) {
                console.error("Error fetching sections:", error);
            }
        };
        fetchSections();
    }, []);

    // Check slug availability - Requirements: 4.3, 4.4
    const checkSlugAvailability = useCallback(async (slug: string) => {
        if (!slug || slug.trim() === "") {
            setSlugValidation({ checking: false, available: null, error: null });
            return;
        }

        // First validate format
        const validation = validateSlug(slug);
        if (!validation.valid) {
            setSlugValidation({
                checking: false,
                available: false,
                error: validation.errorZh || validation.error || "无效的 Slug 格式",
            });
            return;
        }

        setSlugValidation({ checking: true, available: null, error: null });

        try {
            const response = await fetch(
                `/api/products/slug/check?slug=${encodeURIComponent(slug)}${product?.id ? `&excludeId=${product.id}` : ""}`
            );
            const result = await response.json();

            if (response.ok) {
                setSlugValidation({
                    checking: false,
                    available: result.available,
                    error: result.available ? null : "该 Slug 已被其他商品使用",
                });
            } else {
                setSlugValidation({
                    checking: false,
                    available: false,
                    error: result.error || "检查 Slug 可用性失败",
                });
            }
        } catch (error) {
            setSlugValidation({
                checking: false,
                available: false,
                error: "检查 Slug 可用性失败",
            });
        }
    }, [product?.id]);

    // Debounced slug check
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.slug) {
                checkSlugAvailability(formData.slug);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.slug, checkSlugAvailability]);

    // Auto-generate slug from name for new products - Requirements: 4.5
    const handleGenerateSlug = () => {
        const newSlug = generateSlug(formData.name);
        if (newSlug) {
            setFormData((prev) => ({ ...prev, slug: newSlug }));
        }
    };

    // Auto-generate slug when name changes for new products
    useEffect(() => {
        if (!product && formData.name && !formData.slug) {
            const newSlug = generateSlug(formData.name);
            if (newSlug) {
                setFormData((prev) => ({ ...prev, slug: newSlug }));
            }
        }
    }, [product, formData.name, formData.slug]);

    // Group categories by section
    const groupedCategories = categories.reduce(
        (acc, cat) => {
            const sectionId = cat.section_id || cat.store_section;
            if (!acc[sectionId]) {
                acc[sectionId] = [];
            }
            acc[sectionId].push(cat);
            return acc;
        },
        {} as Record<string, ProductCategory[]>
    );

    const getSectionName = (sectionId: string) => {
        const section = sections.find((s) => s.id === sectionId || s.slug === sectionId);
        return section?.name || sectionId;
    };

    const generateProductCode = () => {
        const code = `GIS${String(Date.now()).slice(-8)}`;
        setFormData((prev) => ({ ...prev, product_code: code }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("只支持 JPEG、PNG、GIF、WebP 格式的图片");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("图片大小不能超过 5MB");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "上传失败");
            }

            setFormData((prev) => ({ ...prev, image_url: result.url }));
            toast.success("图片上传成功");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error(error instanceof Error ? error.message : "图片上传失败");
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate free product configuration - Requirements: 9.2, 9.5
        const freeProductValidation = validateFreeProductConfig(
            formData.is_free,
            formData.delivery_type
        );
        if (!freeProductValidation.valid) {
            toast.error(freeProductValidation.error);
            return;
        }

        // Validate slug - Requirements: 4.3, 4.4
        if (formData.slug) {
            const slugValidationResult = validateSlug(formData.slug);
            if (!slugValidationResult.valid) {
                toast.error(slugValidationResult.errorZh || slugValidationResult.error);
                return;
            }

            // Check if slug availability check is still pending or failed
            if (slugValidation.checking) {
                toast.error("正在检查 Slug 可用性，请稍候...");
                return;
            }

            if (slugValidation.available === false) {
                toast.error(slugValidation.error || "该 Slug 已被其他商品使用");
                return;
            }
        }

        setLoading(true);

        try {
            // Check if slug was modified for history tracking - Requirements: 4.6, 5.1
            const slugChanged = product && originalSlug.current && formData.slug !== originalSlug.current;

            const payload = {
                ...formData,
                id: product?.id,
                // Ensure inventory_count is properly set (null for unlimited)
                inventory_count: isUnlimitedInventory ? null : formData.inventory_count,
                // Include old slug for history tracking if changed
                oldSlug: slugChanged ? originalSlug.current : undefined,
            };

            const response = await fetch("/api/products", {
                method: product ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "保存失败");
            }

            // Save brand associations
            // For new products, use the returned ID; for existing products, use the current ID
            const productId = product?.id || result.data?.id;
            if (productId) {
                const brandResponse = await fetch(`/api/products/${productId}/brands`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ brand_ids: selectedBrandIds }),
                });

                if (!brandResponse.ok) {
                    const brandResult = await brandResponse.json();
                    console.error("Brand association error:", brandResult.error);
                    // Don't fail the whole save, just log the error
                    toast.warning("商品已保存，但品牌关联更新失败");
                }
            }

            toast.success(product ? "商品更新成功" : "商品创建成功");
            onSave();
        } catch (error) {
            console.error("Error saving product:", error);
            toast.error(error instanceof Error ? error.message : "保存失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="product_code">商品编码</Label>
                    <div className="flex gap-2">
                        <Input
                            id="product_code"
                            value={formData.product_code}
                            onChange={(e) => setFormData((prev) => ({ ...prev, product_code: e.target.value }))}
                            required
                        />
                        <Button type="button" variant="outline" onClick={generateProductCode}>
                            生成
                        </Button>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="name">商品名称</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        required
                    />
                </div>
            </div>

            {/* Slug Field - Requirements: 4.1, 4.2, 4.5 */}
            <div className="space-y-2">
                <Label htmlFor="slug" className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    URL Slug
                </Label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input
                            id="slug"
                            value={formData.slug}
                            onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))}
                            placeholder="product-url-slug"
                            className={`pr-10 ${slugValidation.error
                                ? "border-red-500 focus-visible:ring-red-500"
                                : slugValidation.available === true
                                    ? "border-green-500 focus-visible:ring-green-500"
                                    : ""
                                }`}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {slugValidation.checking && (
                                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            {!slugValidation.checking && slugValidation.available === true && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            {!slugValidation.checking && slugValidation.available === false && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerateSlug}
                        disabled={!formData.name}
                        title="从商品名称生成 Slug"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
                {slugValidation.error && (
                    <p className="text-xs text-red-500">{slugValidation.error}</p>
                )}
                {slugValidation.available === true && formData.slug && (
                    <p className="text-xs text-green-600">
                        ✓ 此 Slug 可用，商品链接将为: /product/{formData.slug}
                    </p>
                )}
                {!slugValidation.error && !slugValidation.available && formData.slug && !slugValidation.checking && (
                    <p className="text-xs text-muted-foreground">
                        商品链接将为: /product/{formData.slug}
                    </p>
                )}
                {!formData.slug && (
                    <p className="text-xs text-muted-foreground">
                        Slug 用于生成友好的商品 URL，只能包含小写字母、数字和连字符
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="subtitle">副标题</Label>
                <Input
                    id="subtitle"
                    value={formData.subtitle}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">商品描述</Label>
                <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>商品类型</Label>
                    <Select
                        value={formData.product_type}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, product_type: value }))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="选择类型" />
                        </SelectTrigger>
                        <SelectContent>
                            {sections.filter(s => s.is_active).map((section) => (
                                <SelectItem key={section.id} value={section.slug}>
                                    {section.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>交付方式</Label>
                    <Select
                        value={formData.delivery_type}
                        onValueChange={(value: DeliveryType) => setFormData((prev) => ({ ...prev, delivery_type: value }))}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {deliveryTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>商品分类</Label>
                    <Select
                        value={formData.category_id}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="选择分类" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(groupedCategories).map(([sectionId, cats]) => (
                                <SelectGroup key={sectionId}>
                                    <SelectLabel>{getSectionName(sectionId)}</SelectLabel>
                                    {cats.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="price">价格 (CNY)</Label>
                    <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price_amount}
                        onChange={(e) => setFormData((prev) => ({ ...prev, price_amount: e.target.value }))}
                    />
                </div>
            </div>

            {/* Brand Association - Requirements: 2.1 */}
            <BrandSelector
                productId={product?.id || null}
                selectedBrandIds={selectedBrandIds}
                onBrandChange={setSelectedBrandIds}
            />

            {/* Inventory Management */}
            <div className="space-y-3">
                <Label>库存管理</Label>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Switch
                            id="unlimited_inventory"
                            checked={isUnlimitedInventory}
                            onCheckedChange={(checked) => {
                                setIsUnlimitedInventory(checked);
                                if (checked) {
                                    setFormData((prev) => ({ ...prev, inventory_count: null }));
                                } else {
                                    setFormData((prev) => ({ ...prev, inventory_count: 0 }));
                                }
                            }}
                        />
                        <Label htmlFor="unlimited_inventory" className="flex items-center gap-1">
                            <Infinity className="h-4 w-4" />
                            无限库存
                        </Label>
                    </div>
                    {!isUnlimitedInventory && (
                        <div className="flex items-center gap-2">
                            <Label htmlFor="inventory_count" className="whitespace-nowrap">库存数量:</Label>
                            <Input
                                id="inventory_count"
                                type="number"
                                min="0"
                                className="w-32"
                                value={formData.inventory_count ?? 0}
                                onChange={(e) => setFormData((prev) => ({
                                    ...prev,
                                    inventory_count: e.target.value === "" ? 0 : parseInt(e.target.value, 10)
                                }))}
                            />
                        </div>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                    {isUnlimitedInventory
                        ? "无限库存：商品始终显示为有货状态"
                        : formData.inventory_count === 0
                            ? "库存为 0：商品将显示为缺货状态"
                            : `当前库存 ${formData.inventory_count} 件`}
                </p>
            </div>

            <div className="space-y-2">
                <Label>商品图片</Label>
                <div className="flex gap-4">
                    {/* Image preview */}
                    <div className="w-24 h-24 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                        {formData.image_url ? (
                            <div className="relative w-full h-full group">
                                <img src={formData.image_url} alt="商品图片" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setFormData((prev) => ({ ...prev, image_url: "" }))}
                                    className="absolute top-1 right-1 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-3 w-3 text-white" />
                                </button>
                            </div>
                        ) : (
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        )}
                    </div>

                    {/* Upload controls */}
                    <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                {uploading ? "上传中..." : "本地上传"}
                            </Button>
                        </div>
                        <Input
                            placeholder="或输入图片 URL..."
                            value={formData.image_url}
                            onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">支持 JPEG、PNG、GIF、WebP，最大 5MB</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="is_active">上架销售</Label>
                </div>
                <div className="flex items-center gap-2">
                    <Switch
                        id="has_discount"
                        checked={formData.has_discount}
                        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, has_discount: checked }))}
                    />
                    <Label htmlFor="has_discount">促销商品</Label>
                </div>
            </div>

            {/* Promotion Settings - Only show when has_discount is true */}
            {formData.has_discount && (
                <div className="space-y-4 p-4 border rounded-lg bg-orange-50/50 dark:bg-orange-950/20">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        <span className="text-sm font-medium">促销设置</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="original_price">原价 (CNY)</Label>
                            <Input
                                id="original_price"
                                type="number"
                                step="0.01"
                                placeholder="促销结束后恢复的价格"
                                value={formData.original_price}
                                onChange={(e) => setFormData((prev) => ({ ...prev, original_price: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="promotion_price">促销价 (CNY)</Label>
                            <Input
                                id="promotion_price"
                                type="number"
                                step="0.01"
                                placeholder="促销期间的价格"
                                value={formData.promotion_price}
                                onChange={(e) => setFormData((prev) => ({ ...prev, promotion_price: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Switch
                                id="is_promotion_unlimited"
                                checked={formData.is_promotion_unlimited}
                                onCheckedChange={(checked) => {
                                    setFormData((prev) => ({
                                        ...prev,
                                        is_promotion_unlimited: checked,
                                        promotion_end_at: checked ? "" : prev.promotion_end_at
                                    }));
                                }}
                            />
                            <Label htmlFor="is_promotion_unlimited" className="flex items-center gap-1">
                                <Infinity className="h-4 w-4" />
                                无限期促销
                            </Label>
                        </div>

                        {!formData.is_promotion_unlimited && (
                            <div className="space-y-2">
                                <Label htmlFor="promotion_end_at">促销结束时间</Label>
                                <Input
                                    id="promotion_end_at"
                                    type="datetime-local"
                                    value={formData.promotion_end_at ? formData.promotion_end_at.slice(0, 16) : ""}
                                    onChange={(e) => setFormData((prev) => ({
                                        ...prev,
                                        promotion_end_at: e.target.value ? new Date(e.target.value).toISOString() : ""
                                    }))}
                                />
                                <p className="text-xs text-muted-foreground">
                                    促销结束后，商品价格将自动恢复为原价
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Free Product Settings - Requirements: 9.1, 9.2, 9.3, 9.4, 9.5 */}
            <FreeProductToggle
                isFree={formData.is_free}
                requireLogin={formData.require_login}
                deliveryType={formData.delivery_type}
                onIsFreeChange={(value) => {
                    setFormData((prev) => ({
                        ...prev,
                        is_free: value,
                        // Auto-set delivery_type to "download" when enabling is_free - Requirements: 9.2
                        delivery_type: value && prev.delivery_type !== "download" ? "download" : prev.delivery_type,
                    }));
                }}
                onRequireLoginChange={(value) => {
                    setFormData((prev) => ({ ...prev, require_login: value }));
                }}
                onDeliveryTypeChange={(value) => {
                    setFormData((prev) => ({ ...prev, delivery_type: value }));
                }}
            />

            {/* Product Files Section - For download delivery type */}
            {formData.delivery_type === "download" && (
                <>
                    <Separator className="my-4" />
                    <ProductFiles
                        productId={product?.id || null}
                        productType={formData.product_type as ProductType}
                        deliveryType={formData.delivery_type as DeliveryType}
                    />
                </>
            )}

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    取消
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? "保存中..." : "保存"}
                </Button>
            </div>
        </form>
    );
}
