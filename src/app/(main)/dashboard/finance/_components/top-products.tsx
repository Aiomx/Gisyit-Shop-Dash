"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";

interface TopProduct {
    product_code: string;
    product_name: string;
    total_quantity: number;
    total_revenue: number;
}

export function TopProducts() {
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<TopProduct[]>([]);

    useEffect(() => {
        fetchTopProducts();
    }, []);

    async function fetchTopProducts() {
        setLoading(true);
        try {
            // Fetch order items from paid orders
            const { data: orderItems, error } = await supabase
                .from("order_items")
                .select(`
                    product_code,
                    product_name,
                    quantity,
                    price,
                    order:orders!inner(status)
                `)
                .in("order.status", ["paid", "fulfilled", "completed"]);

            if (error) {
                console.error("Error fetching order items:", error);
                return;
            }

            // Aggregate by product
            const productMap = new Map<string, TopProduct>();

            orderItems?.forEach(item => {
                const existing = productMap.get(item.product_code);
                const revenue = (item.price || 0) * (item.quantity || 1);

                if (existing) {
                    existing.total_quantity += item.quantity || 1;
                    existing.total_revenue += revenue;
                } else {
                    productMap.set(item.product_code, {
                        product_code: item.product_code,
                        product_name: item.product_name,
                        total_quantity: item.quantity || 1,
                        total_revenue: revenue,
                    });
                }
            });

            // Sort by revenue and take top 5
            const sorted = Array.from(productMap.values())
                .sort((a, b) => b.total_revenue - a.total_revenue)
                .slice(0, 5);

            setProducts(sorted);
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>热销商品</CardTitle>
                    <CardDescription>销售额最高的商品</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>热销商品</CardTitle>
                <CardDescription>销售额最高的商品</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Separator />
                {products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Package className="size-12 mb-2 opacity-50" />
                        <p>暂无销售数据</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {products.map((product, index) => (
                            <div key={product.product_code} className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-sm">
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{product.product_name}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{product.product_code}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-medium text-sm tabular-nums">
                                        {formatCurrency(product.total_revenue, { currency: "CNY", locale: "zh-CN" })}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {product.total_quantity} 件
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
