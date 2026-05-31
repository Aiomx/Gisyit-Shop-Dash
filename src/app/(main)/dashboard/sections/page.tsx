"use client";

import { useEffect, useState } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    LayoutGrid,
    Brain,
    AppWindow,
    Gamepad2,
    ShoppingBag,
    Globe,
    Sparkles,
    Cpu,
    Bot,
    Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import type { StoreSection_Entity } from "@/lib/supabase/types";

const iconOptions = [
    { value: "brain", label: "大脑 (AI)", icon: Brain },
    { value: "app-window", label: "应用窗口", icon: AppWindow },
    { value: "gamepad-2", label: "游戏手柄", icon: Gamepad2 },
    { value: "shopping-bag", label: "购物袋", icon: ShoppingBag },
    { value: "globe", label: "地球", icon: Globe },
    { value: "sparkles", label: "闪光", icon: Sparkles },
    { value: "cpu", label: "CPU", icon: Cpu },
    { value: "bot", label: "机器人", icon: Bot },
    { value: "zap", label: "闪电", icon: Zap },
];

const colorOptions = [
    { value: "#8B5CF6", label: "紫色" },
    { value: "#3B82F6", label: "蓝色" },
    { value: "#10B981", label: "绿色" },
    { value: "#F59E0B", label: "橙色" },
    { value: "#EF4444", label: "红色" },
    { value: "#EC4899", label: "粉色" },
    { value: "#6366F1", label: "靛蓝" },
    { value: "#14B8A6", label: "青色" },
];

function getIconComponent(iconName: string | undefined): React.ComponentType<{ className?: string; color?: string }> {
    const iconMap: Record<string, React.ComponentType<{ className?: string; color?: string }>> = {
        brain: Brain,
        "app-window": AppWindow,
        "gamepad-2": Gamepad2,
        "shopping-bag": ShoppingBag,
        globe: Globe,
        sparkles: Sparkles,
        cpu: Cpu,
        bot: Bot,
        zap: Zap,
    };
    return iconMap[iconName || ""] || LayoutGrid;
}

export default function SectionsPage() {
    const [sections, setSections] = useState<StoreSection_Entity[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<StoreSection_Entity | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        description: "",
        icon: "brain",
        color: "#8B5CF6",
        sort_order: 0,
        is_active: true,
    });

    const fetchSections = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/sections");
            const result = await response.json();
            if (result.data) {
                setSections(result.data);
            }
        } catch (error) {
            console.error("Error fetching sections:", error);
            toast.error("加载板块失败");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSections();
    }, []);

    const handleEdit = (section: StoreSection_Entity) => {
        setEditingSection(section);
        setFormData({
            name: section.name,
            slug: section.slug,
            description: section.description || "",
            icon: section.icon || "brain",
            color: section.color || "#8B5CF6",
            sort_order: section.sort_order,
            is_active: section.is_active,
        });
        setDialogOpen(true);
    };

    const handleCreate = () => {
        setEditingSection(null);
        setFormData({
            name: "",
            slug: "",
            description: "",
            icon: "brain",
            color: "#8B5CF6",
            sort_order: sections.length + 1,
            is_active: true,
        });
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("确定要删除这个板块吗？")) return;

        try {
            const response = await fetch(`/api/sections?id=${id}`, {
                method: "DELETE",
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "删除失败");
            }

            toast.success("板块已删除");
            fetchSections();
        } catch (error) {
            console.error("Error deleting section:", error);
            toast.error(error instanceof Error ? error.message : "删除失败");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = editingSection
                ? { ...formData, id: editingSection.id }
                : formData;

            const response = await fetch("/api/sections", {
                method: editingSection ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "保存失败");
            }

            toast.success(editingSection ? "板块更新成功" : "板块创建成功");
            setDialogOpen(false);
            fetchSections();
        } catch (error) {
            console.error("Error saving section:", error);
            toast.error(error instanceof Error ? error.message : "保存失败");
        } finally {
            setSaving(false);
        }
    };

    const generateSlug = () => {
        // Simple pinyin-like conversion for common Chinese characters
        const pinyinMap: Record<string, string> = {
            人工智能: "ai",
            应用软件: "apps",
            游戏: "games",
            实物商店: "store",
            海外代购: "overseas",
        };

        const slug =
            pinyinMap[formData.name] ||
            formData.name
                .toLowerCase()
                .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");
        setFormData((prev) => ({ ...prev, slug }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <LayoutGrid className="h-6 w-6" />
                        板块管理
                    </h1>
                    <p className="text-muted-foreground">管理商店大板块分类</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            添加板块
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editingSection ? "编辑板块" : "添加板块"}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">板块名称</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            name: e.target.value,
                                        }))
                                    }
                                    placeholder="如：人工智能"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">URL 标识</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="slug"
                                        value={formData.slug}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                slug: e.target.value,
                                            }))
                                        }
                                        placeholder="如：ai"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={generateSlug}
                                    >
                                        生成
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">描述</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            description: e.target.value,
                                        }))
                                    }
                                    placeholder="板块描述（可选）"
                                    rows={2}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>图标</Label>
                                    <Select
                                        value={formData.icon}
                                        onValueChange={(value) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                icon: value,
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {iconOptions.map((opt) => (
                                                <SelectItem
                                                    key={opt.value}
                                                    value={opt.value}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <opt.icon className="h-4 w-4" />
                                                        {opt.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>主题色</Label>
                                    <Select
                                        value={formData.color}
                                        onValueChange={(value) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                color: value,
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {colorOptions.map((opt) => (
                                                <SelectItem
                                                    key={opt.value}
                                                    value={opt.value}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-4 h-4 rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    opt.value,
                                                            }}
                                                        />
                                                        {opt.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sort_order">排序</Label>
                                    <Input
                                        id="sort_order"
                                        type="number"
                                        value={formData.sort_order}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                sort_order:
                                                    parseInt(e.target.value) ||
                                                    0,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>状态</Label>
                                    <div className="flex items-center gap-2 h-10">
                                        <Switch
                                            checked={formData.is_active}
                                            onCheckedChange={(checked) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    is_active: checked,
                                                }))
                                            }
                                        />
                                        <span className="text-sm">
                                            {formData.is_active
                                                ? "启用"
                                                : "禁用"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                >
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

            {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                    加载中...
                </div>
            ) : sections.length === 0 ? (
                <div className="text-center py-12">
                    <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-2 text-muted-foreground">暂无板块</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {sections.map((section) => {
                        const IconComponent = getIconComponent(section.icon);
                        return (
                            <Card key={section.id} className="relative">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div
                                            className="p-2 rounded-lg"
                                            style={{
                                                backgroundColor: `${section.color}20`,
                                            }}
                                        >
                                            <IconComponent
                                                className="h-6 w-6"
                                                color={section.color}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() =>
                                                    handleEdit(section)
                                                }
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() =>
                                                    handleDelete(section.id)
                                                }
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                    <CardTitle className="text-lg">
                                        {section.name}
                                    </CardTitle>
                                    <CardDescription>
                                        /{section.slug}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={
                                                section.is_active
                                                    ? "default"
                                                    : "secondary"
                                            }
                                        >
                                            {section.is_active
                                                ? "启用"
                                                : "禁用"}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                            排序: {section.sort_order}
                                        </span>
                                    </div>
                                    {section.description && (
                                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                                            {section.description}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
