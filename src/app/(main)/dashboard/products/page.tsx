"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Package, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import type { Product, ProductCategory, StoreSection_Entity } from "@/lib/supabase/types";
import { ProductForm } from "./_components/product-form";

export default function ProductsPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [sections, setSections] = useState<StoreSection_Entity[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/products");
            const result = await response.json();
            if (result.data) {
                setProducts(result.data);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
            toast.error("加载商品失败");
        }
        setLoading(false);
    };

    const fetchCategories = async () => {
        const { data } = await supabase.from("product_categories").select("*").order("sort_order");
        if (data) setCategories(data);
    };

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

    useEffect(() => {
        fetchProducts();
        fetchCategories();
        fetchSections();
    }, []);

    // Get section name by slug
    const getSectionName = (slug: string) => {
        const section = sections.find(s => s.slug === slug);
        return section?.name || slug;
    };

    const handleDelete = async (id: string) => {
        if (!confirm("确定要删除这个商品吗？")) return;

        try {
            const response = await fetch(`/api/products?id=${id}`, {
                method: "DELETE",
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "删除失败");
            }

            toast.success("商品已删除");
            fetchProducts();
        } catch (error) {
            console.error("Error deleting product:", error);
            toast.error(error instanceof Error ? error.message : "删除失败");
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setDialogOpen(true);
    };

    const handleDetail = (productId: string) => {
        router.push(`/dashboard/products/${productId}/detail`);
    };

    const handleCreate = () => {
        setEditingProduct(null);
        setDialogOpen(true);
    };

    const handleSave = async () => {
        setDialogOpen(false);
        setEditingProduct(null);
        fetchProducts();
    };

    const filteredProducts = products.filter(
        (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.product_code.toLowerCase().includes(search.toLowerCase())
    );

    const getLowestPrice = (product: Product) => {
        if (!product.prices?.length) return null;
        const activePrices = product.prices.filter((p) => p.is_active);
        if (!activePrices.length) return null;
        return Math.min(...activePrices.map((p) => p.price_amount));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">商品管理</h1>
                    <p className="text-muted-foreground">管理商店中的所有商品</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            添加商品
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] flex flex-col">
                        <DialogHeader className="flex-shrink-0">
                            <DialogTitle className="truncate pr-8" title={editingProduct?.name}>
                                {editingProduct ? `编辑商品: ${editingProduct.name}` : "添加商品"}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                            <ProductForm
                                product={editingProduct}
                                categories={categories}
                                onSave={handleSave}
                                onCancel={() => setDialogOpen(false)}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="搜索商品名称或编码..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Badge variant="secondary">{filteredProducts.length} 个商品</Badge>
            </div>

            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">图片</TableHead>
                            <TableHead>商品信息</TableHead>
                            <TableHead>类型</TableHead>
                            <TableHead>分类</TableHead>
                            <TableHead>价格</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead className="w-[100px]">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    加载中...
                                </TableCell>
                            </TableRow>
                        ) : filteredProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                    <p className="mt-2 text-muted-foreground">暂无商品</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProducts.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        {product.images?.[0] ? (
                                            <img
                                                src={product.images[0].image_url}
                                                alt={product.name}
                                                className="w-12 h-12 rounded object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                                <Package className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-[200px]">
                                            <p className="font-medium truncate" title={product.name}>{product.name}</p>
                                            <p className="text-sm text-muted-foreground truncate">{product.product_code}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {getSectionName(product.product_type)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{product.category?.name || "-"}</TableCell>
                                    <TableCell>
                                        {getLowestPrice(product) !== null ? (
                                            <span className="font-medium">¥{getLowestPrice(product)}</span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={product.is_active ? "default" : "secondary"}>
                                            {product.is_active ? "上架" : "下架"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDetail(product.id)}
                                                title="详情配置"
                                            >
                                                <Settings className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
