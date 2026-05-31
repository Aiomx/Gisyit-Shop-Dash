"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CheckCircle, Clock, Package, ShoppingCart, XCircle } from "lucide-react";
import Link from "next/link";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/supabase/types";

const statusLabels: Record<OrderStatus, string> = {
    pending: "待支付",
    created: "已创建",
    pending_payment: "待支付",
    paid: "已支付",
    fulfilled: "已发货",
    completed: "已完成",
    cancelled: "已取消",
};

const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="size-4 stroke-orange-500" />,
    pending_payment: <Clock className="size-4 stroke-orange-500" />,
    created: <Clock className="size-4 stroke-orange-500" />,
    paid: <CheckCircle className="size-4 stroke-green-500" />,
    fulfilled: <Package className="size-4 stroke-blue-500" />,
    completed: <CheckCircle className="size-4 stroke-green-500" />,
    cancelled: <XCircle className="size-4 stroke-destructive" />,
};

export function RecentOrders() {
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        fetchRecentOrders();
    }, []);

    async function fetchRecentOrders() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("orders")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(5);

            if (error) {
                console.error("Error fetching recent orders:", error);
                return;
            }

            setOrders(data || []);
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
                    <CardTitle>最近订单</CardTitle>
                    <CardDescription>最新的订单记录</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-14 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>最近订单</CardTitle>
                <CardDescription>最新的订单记录</CardDescription>
                <CardAction>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard/orders">查看全部</Link>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
                <Separator />
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <ShoppingCart className="size-12 mb-2 opacity-50" />
                        <p>暂无订单</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => (
                            <div key={order.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                                    {statusIcons[order.status] || <ShoppingCart className="size-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-mono text-sm">{order.order_number}</p>
                                        <Badge variant="outline" className="text-xs">
                                            {statusLabels[order.status]}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {format(new Date(order.created_at), "yyyy-MM-dd HH:mm")}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-medium text-sm tabular-nums">
                                        {formatCurrency(order.total_amount, { currency: "CNY", locale: "zh-CN" })}
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
