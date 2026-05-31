"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { ProductCategory, StoreSection_Entity } from "@/lib/supabase/types";

export default function CategoriesPage() {
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [sections, setSections] = useState<StoreSection_Entity[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        section_id: "",
        sort_order: 0,
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [catRes, secRes] = await Promise.all([
                fetch("/api/categories"),
                fetch("/api/sections"),
            ]);
            const catResult = await catRes.json();
            const secResult = await secRes.json();
            if (catResult.data) {
                setCategories(catResult.data);
            }
            if (secResult.data) {
                setSections(secResult.data);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("加载数据失败");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEdit = (category: ProductCategory) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            slug: category.slug,
            section_id: category.section_id || "",
            sort_order: category.sort_order,
        });
        setDialogOpen(true);
    };

    const handleCreate = () => {
        setEditingCategory(null);
        setFormData({
            name: "",
            slug: "",
            section_id: sections[0]?.id || "",
            sort_order: 0,
        });
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("确定要删除这个分类吗？")) return;

        try {
            const response = await fetch(`/api/categories?id=${id}`, {
                method: "DELETE",
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "删除失败");
            }

            toast.success("分类已删除");
            fetchData();
        } catch (error) {
            console.error("Error deleting category:", error);
            toast.error(error instanceof Error ? error.message : "删除失败");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Find the section to get store_section value for backward compatibility
            const section = sections.find((s) => s.id === formData.section_id);
            const payload = editingCategory
                ? {
                    ...formData,
                    id: editingCategory.id,
                    store_section: section?.slug || "apps",
                }
                : {
                    ...formData,
                    store_section: section?.slug || "apps",
                };

            const response = await fetch("/api/categories", {
                method: editingCategory ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "保存失败");
            }

            toast.success(editingCategory ? "分类更新成功" : "分类创建成功");
            setDialogOpen(false);
            fetchData();
        } catch (error) {
            console.error("Error saving category:", error);
            toast.error(error instanceof Error ? error.message : "保存失败");
        } finally {
            setSaving(false);
        }
    };

    const generateSlug = () => {
        const slug = formData.name
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        setFormData((prev) => ({ ...prev, slug }));
    };

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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">分类管理</h1>
                    <p className="text-muted-foreground">管理商品分类</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            添加分类
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingCategory ? "编辑分类" : "添加分类"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">分类名称</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">URL 标识</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="slug"
                                        value={formData.slug}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                                        required
                                    />
                                    <Button type="button" variant="outline" onClick={generateSlug}>
                                        生成
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>所属板块</Label>
                                <Select
                                    value={formData.section_id}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({ ...prev, section_id: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择板块" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sections.map((section) => (
                                            <SelectItem key={section.id} value={section.id}>
                                                {section.name}
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
                                        setFormData((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))
                                    }
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                    取消
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? "保存中..." : "保存"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-6">
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">加载中...</div>
                ) : Object.entries(groupedCategories).length === 0 ? (
                    <div className="text-center py-8">
                        <FolderTree className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <p className="mt-2 text-muted-foreground">暂无分类</p>
                    </div>
                ) : (
                    Object.entries(groupedCategories).map(([sectionId, cats]) => (
                        <div key={sectionId} className="space-y-2">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                {getSectionName(sectionId)}
                                <Badge variant="secondary">{cats.length}</Badge>
                            </h2>
                            <div className="rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>分类名称</TableHead>
                                            <TableHead>URL 标识</TableHead>
                                            <TableHead>排序</TableHead>
                                            <TableHead className="w-[100px]">操作</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cats.map((category) => (
                                            <TableRow key={category.id}>
                                                <TableCell className="font-medium">{category.name}</TableCell>
                                                <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                                                <TableCell>{category.sort_order}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(category.id)}
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
        </div>
    );
}
