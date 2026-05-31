"use client";

import { useState, useEffect } from "react";
import { Key, Upload, Search, History, RefreshCw, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";
import { InventoryStats } from "./_components/inventory-stats";
import { CDKImportForm } from "./_components/cdk-import-form";
import { CDKSearchView } from "./_components/cdk-search-view";
import { ImportHistoryView } from "./_components/import-history-view";
import { CDKListView } from "./_components/cdk-list-view";

interface ProductOption {
    id: string;
    name: string;
    delivery_type: string;
}

export default function CDKManagementPage() {
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>("all");
    const [refreshKey, setRefreshKey] = useState(0);
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        const fetchProducts = async () => {
            const { data } = await supabase
                .from("products")
                .select("id, name, delivery_type")
                .eq("delivery_type", "cdk")
                .order("name");
            if (data) {
                setProducts(data);
            }
        };
        fetchProducts();
    }, []);

    const handleRefresh = () => {
        setRefreshKey((prev) => prev + 1);
    };

    const handleImportSuccess = () => {
        handleRefresh();
        // Switch to overview tab to see updated stats
        setActiveTab("overview");
    };

    const productIdForQuery = selectedProductId === "all" ? undefined : selectedProductId;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Key className="h-6 w-6" />
                        CDK 库存管理
                    </h1>
                    <p className="text-muted-foreground">管理虚拟商品激活码库存</p>
                </div>
                <div className="flex items-center gap-4">
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="选择商品" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">全部商品</SelectItem>
                            {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                    {product.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="overview" className="gap-2">
                        <Key className="h-4 w-4" />
                        库存概览
                    </TabsTrigger>
                    <TabsTrigger value="list" className="gap-2">
                        <List className="h-4 w-4" />
                        激活码列表
                    </TabsTrigger>
                    <TabsTrigger value="import" className="gap-2">
                        <Upload className="h-4 w-4" />
                        导入CDK
                    </TabsTrigger>
                    <TabsTrigger value="search" className="gap-2">
                        <Search className="h-4 w-4" />
                        搜索查询
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                        <History className="h-4 w-4" />
                        导入历史
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <InventoryStats productId={productIdForQuery} refreshKey={refreshKey} />
                </TabsContent>

                <TabsContent value="list" className="space-y-6">
                    <CDKListView
                        productId={productIdForQuery}
                        refreshKey={refreshKey}
                        onRefresh={handleRefresh}
                    />
                </TabsContent>

                <TabsContent value="import">
                    <CDKImportForm
                        products={products}
                        selectedProductId={selectedProductId}
                        onSuccess={handleImportSuccess}
                    />
                </TabsContent>

                <TabsContent value="search">
                    <CDKSearchView refreshKey={refreshKey} onRefresh={handleRefresh} />
                </TabsContent>

                <TabsContent value="history">
                    <ImportHistoryView productId={productIdForQuery} refreshKey={refreshKey} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
