"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, ShoppingCart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase/client";
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

const statusColors: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    created: "outline",
    pending_payment: "secondary",
    paid: "default",
    fulfilled: "default",
    completed: "default",
    cancelled: "destructive",
};

export function RecentOrdersTable() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            const { data } = await supabase
                .from("orders")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(5);

            if (data) {
                setOrders(data);
            }
            setLoading(false);
        };

        fetchOrders();
    }, []);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>最近订单</CardTitle>
                    <CardDescription>最新的 5 个订单</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/orders">
                        查看全部
                        <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">加载中...</div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-8">
                        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <p className="mt-2 text-muted-foreground">暂无订单</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>订单号</TableHead>
                                <TableHead>金额</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>时间</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                                    <TableCell className="font-medium">¥{order.total_amount.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusColors[order.status]}>
                                            {statusLabels[order.status]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {format(new Date(order.created_at), "MM-dd HH:mm")}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
