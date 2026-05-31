"use client";

import { useEffect, useState } from "react";
import { Package, ShoppingCart, Users, Banknote } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";

interface StoreStats {
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    totalRevenue: number;
    totalUsers: number;
    paidOrders: number;
}

export function StoreStatsCards() {
    const [stats, setStats] = useState<StoreStats>({
        totalProducts: 0,
        activeProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalUsers: 0,
        paidOrders: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);

            // Fetch products count
            const { count: totalProducts } = await supabase
                .from("products")
                .select("*", { count: "exact", head: true });

            const { count: activeProducts } = await supabase
                .from("products")
                .select("*", { count: "exact", head: true })
                .eq("is_active", true);

            // Fetch orders
            const { data: orders } = await supabase
                .from("orders")
                .select("total_amount, status");

            const totalOrders = orders?.length || 0;
            const paidOrders = orders?.filter(o => ["paid", "fulfilled", "completed"].includes(o.status)).length || 0;
            const totalRevenue = orders
                ?.filter(o => ["paid", "fulfilled", "completed"].includes(o.status))
                .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

            // Fetch users count
            const { count: totalUsers } = await supabase
                .from("profiles")
                .select("*", { count: "exact", head: true });

            setStats({
                totalProducts: totalProducts || 0,
                activeProducts: activeProducts || 0,
                totalOrders,
                totalRevenue,
                totalUsers: totalUsers || 0,
                paidOrders,
            });
            setLoading(false);
        };

        fetchStats();
    }, []);

    const cards = [
        {
            title: "商品总数",
            value: loading ? "-" : `${stats.activeProducts} / ${stats.totalProducts}`,
            description: "上架 / 总数",
            icon: Package,
            color: "text-blue-500",
        },
        {
            title: "订单总数",
            value: loading ? "-" : stats.totalOrders.toString(),
            description: `${stats.paidOrders} 个已支付`,
            icon: ShoppingCart,
            color: "text-green-500",
        },
        {
            title: "销售总额",
            value: loading ? "-" : `¥${stats.totalRevenue.toFixed(2)}`,
            description: "已支付订单",
            icon: Banknote,
            color: "text-yellow-500",
        },
        {
            title: "注册用户",
            value: loading ? "-" : stats.totalUsers.toString(),
            description: "总用户数",
            icon: Users,
            color: "text-purple-500",
        },
    ];

    return (
        <div className="grid @5xl/main:grid-cols-4 @xl/main:grid-cols-2 grid-cols-1 gap-4">
            {cards.map((card) => (
                <Card key={card.title} className="@container/card">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardDescription>{card.title}</CardDescription>
                            <card.icon className={`h-5 w-5 ${card.color}`} />
                        </div>
                        <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
                            {card.value}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                    </CardHeader>
                </Card>
            ))}
        </div>
    );
}
