"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { BrandWithCount, BrandGroup, CreateBrandInput, UpdateBrandInput } from "@/lib/supabase/types";
import { generateSlug } from "@/lib/brand/brand-utils";

interface BrandFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    brand: BrandWithCount | null;
    onSuccess: () => void;
}

const brandGroupOptions: { value: BrandGroup; label: string }[] = [
    { value: "os", label: "操作系统" },
    { value: "platform", label: "平台" },
    { value: "store", label: "商店" },
    { value: "other", label: "其他" },
];

/**
 * Brand Form Dialog Component
 * 
 * Provides form for creating and editing brands.
 * Includes fields: name, slug, logo upload, group select, sort_order, is_active toggle, description
 * Implements logo preview and upload functionality.
 * 
 * Requirements: 1.1, 1.2, 1.4
 */
export function BrandFormDialog({
    open,
    onOpenChange,
    brand,
    onSuccess,
}: BrandFormDialogProps) {
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<{
        name: string;
        slug: string;
        logo_url: string;
        brand_group: BrandGroup;
        sort_order: number;
        is_active: boolean;
        description: string;
    }>({
        name: "",
        slug: "",
        logo_url: "",
        brand_group: "platform",
        sort_order: 0,
        is_active: true,
        description: "",
    });

    // Reset form when dialog opens/closes or brand changes
    useEffect(() => {
        if (open) {
            if (brand) {
                setFormData({
                    name: brand.name,
                    slug: brand.slug,
                    logo_url: brand.logo_url || "",
                    brand_group: brand.brand_group,
                    sort_order: brand.sort_order,
                    is_active: brand.is_active,
                    description: brand.description || "",
                });
            } else {
                setFormData({
                    name: "",
                    slug: "",
                    logo_url: "",
                    brand_group: "platform",
                    sort_order: 0,
                    is_active: true,
                    description: "",
                });
            }
        }
    }, [open, brand]);

    const handleGenerateSlug = () => {
        const slug = generateSlug(formData.name);
        setFormData((prev) => ({ ...prev, slug }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!["image/svg+xml", "image/png"].includes(file.type)) {
            toast.error("仅支持 SVG 和 PNG 格式的图片");
            return;
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error("文件大小不能超过 2MB");
            return;
        }

        setUploading(true);
        try {
            const uploadFormData = new FormData();
            uploadFormData.append("file", file);

            const response = await fetch("/api/brands/upload", {
                method: "POST",
                body: uploadFormData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "上传失败");
            }

            setFormData((prev) => ({ ...prev, logo_url: result.url }));
            toast.success("Logo 上传成功");
        } catch (error) {
            console.error("Error uploading logo:", error);
            toast.error(error instanceof Error ? error.message : "上传失败");
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleRemoveLogo = () => {
        setFormData((prev) => ({ ...prev, logo_url: "" }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const isEditing = !!brand;
            const url = "/api/brands";
            const method = isEditing ? "PATCH" : "POST";

            const payload: CreateBrandInput | (UpdateBrandInput & { id: string }) = isEditing
                ? {
                    id: brand.id,
                    name: formData.name,
                    slug: formData.slug,
                    logo_url: formData.logo_url || undefined,
                    brand_group: formData.brand_group,
                    sort_order: formData.sort_order,
                    is_active: formData.is_active,
                    description: formData.description || undefined,
                }
                : {
                    name: formData.name,
                    slug: formData.slug || undefined,
                    logo_url: formData.logo_url || undefined,
                    brand_group: formData.brand_group,
                    sort_order: formData.sort_order,
                    is_active: formData.is_active,
                    description: formData.description || undefined,
                };

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "保存失败");
            }

            toast.success(isEditing ? "品牌更新成功" : "品牌创建成功");
            onSuccess();
        } catch (error) {
            console.error("Error saving brand:", error);
            toast.error(error instanceof Error ? error.message : "保存失败");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{brand ? "编辑品牌" : "添加品牌"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Logo Upload */}
                    <div className="space-y-2">
                        <Label>品牌 Logo</Label>
                        <div className="flex items-center gap-4">
                            {formData.logo_url ? (
                                <div className="relative">
                                    <img
                                        src={formData.logo_url}
                                        alt="Brand logo"
                                        className="h-16 w-16 object-contain rounded border"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6"
                                        onClick={handleRemoveLogo}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="h-16 w-16 rounded border-2 border-dashed flex items-center justify-center text-muted-foreground">
                                    <Upload className="h-6 w-6" />
                                </div>
                            )}
                            <div className="flex-1">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/svg+xml,image/png"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                    id="logo-upload"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            上传中...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mr-2 h-4 w-4" />
                                            上传 Logo
                                        </>
                                    )}
                                </Button>
                                <p className="text-xs text-muted-foreground mt-1">
                                    支持 SVG、PNG 格式，最大 2MB
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">品牌名称 *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, name: e.target.value }))
                            }
                            placeholder="如：macOS"
                            required
                            maxLength={100}
                        />
                    </div>

                    {/* Slug */}
                    <div className="space-y-2">
                        <Label htmlFor="slug">URL 标识</Label>
                        <div className="flex gap-2">
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                                }
                                placeholder="如：macos（留空自动生成）"
                            />
                            <Button type="button" variant="outline" onClick={handleGenerateSlug}>
                                生成
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            只能包含小写字母、数字和连字符
                        </p>
                    </div>

                    {/* Group and Sort Order */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>品牌分组</Label>
                            <Select
                                value={formData.brand_group}
                                onValueChange={(value: BrandGroup) =>
                                    setFormData((prev) => ({ ...prev, brand_group: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {brandGroupOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sort_order">排序</Label>
                            <Input
                                id="sort_order"
                                type="number"
                                value={formData.sort_order}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        sort_order: parseInt(e.target.value) || 0,
                                    }))
                                }
                            />
                        </div>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>启用状态</Label>
                            <p className="text-xs text-muted-foreground">
                                禁用后前端将不显示此品牌
                            </p>
                        </div>
                        <Switch
                            checked={formData.is_active}
                            onCheckedChange={(checked) =>
                                setFormData((prev) => ({ ...prev, is_active: checked }))
                            }
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">描述</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, description: e.target.value }))
                            }
                            placeholder="品牌描述（可选）"
                            rows={2}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            取消
                        </Button>
                        <Button type="submit" disabled={saving || uploading}>
                            {saving ? "保存中..." : "保存"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
