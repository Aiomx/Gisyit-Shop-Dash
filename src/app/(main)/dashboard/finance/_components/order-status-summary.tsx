"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Clock, Package, ShoppingCart, XCircle } from "lucide-react";
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase/client";

interface OrderStatusData {
    pending: number;
    paid: number;
    fulfilled: number;
    completed: number;
    cancelled: number;
}

const chartConfig = {
    paid: {
        label: "已支付",
        color: "var(--chart-1)",
    },
    fulfilled: {
        label: "已发货",
        color: "var(--chart-2)",
    },
    completed: {
        label: "已完成",
        color: "var(--chart-3)",
    },
} satisfies ChartConfig;

export function OrderStatusSummary() {
    const [loading, setLoading] = useState(true);
    const [statusData, setStatusData] = useState<OrderStatusData>({
        pending: 0,
        paid: 0,
        fulfilled: 0,
        completed: 0,
        cancelled: 0,
    });

    useEffect(() => {
        fetchOrderStatus();
    }, []);

    async function fetchOrderStatus() {
        setLoading(true);
        try {
            const { data: orders, error } = await supabase
                .from("orders")
                .select("status");

            if (error) {
                console.error("Error fetching order status:", error);
                return;
            }

            const counts: OrderStatusData = {
                pending: 0,
                paid: 0,
                fulfilled: 0,
                completed: 0,
                cancelled: 0,
            };

            orders?.forEach(order => {
                const status = order.status as string;
                if (status === "pending" || status === "pending_payment" || status === "created") {
                    counts.pending += 1;
                } else if (status === "paid") {
                    counts.paid += 1;
                } else if (status === "fulfilled") {
                    counts.fulfilled += 1;
                } else if (status === "completed") {
                    counts.completed += 1;
                } else if (status === "cancelled") {
                    counts.cancelled += 1;
                }
            });

            setStatusData(counts);
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    }

    const totalOrders = statusData.pending + statusData.paid + statusData.fulfilled + statusData.completed + statusData.cancelled;
    const successfulOrders = statusData.paid + statusData.fulfilled + statusData.completed;

    const chartData = [{
        period: "current",
        paid: statusData.paid,
        fulfilled: statusData.fulfilled,
        completed: statusData.completed,
    }];

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>订单状态分布</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>订单状态分布</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Separator />

                <div className="h-32">
                    <ChartContainer config={chartConfig}>
                        <RadialBarChart
                            margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                            data={chartData}
                            endAngle={180}
                            innerRadius={80}
                            outerRadius={130}
                        >
                            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                                <Label
                                    content={({ viewBox }) => {
                                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                            return (
                                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={(viewBox.cy ?? 0) - 16}
                                                        className="fill-foreground font-bold text-2xl tabular-nums"
                                                    >
                                                        {successfulOrders}
                                                    </tspan>
                                                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 4} className="fill-muted-foreground">
                                                        成功订单
                                                    </tspan>
                                                </text>
                                            );
                                        }
                                    }}
                                />
                            </PolarRadiusAxis>
                            <RadialBar
                                dataKey="completed"
                                stackId="a"
                                cornerRadius={4}
                                fill="var(--color-completed)"
                                className="stroke-4 stroke-card"
                            />
                            <RadialBar
                                dataKey="fulfilled"
                                stackId="a"
                                cornerRadius={4}
                                fill="var(--color-fulfilled)"
                                className="stroke-4 stroke-card"
                            />
                            <RadialBar
                                dataKey="paid"
                                stackId="a"
                                cornerRadius={4}
                                fill="var(--color-paid)"
                                className="stroke-4 stroke-card"
                            />
                        </RadialBarChart>
                    </ChartContainer>
                </div>
                <Separator />
                <div className="flex justify-between gap-4">
                    <div className="flex flex-1 flex-col items-center space-y-2">
                        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                            <Clock className="size-5 stroke-orange-500" />
                        </div>
                        <div className="space-y-0.5 text-center">
                            <p className="text-muted-foreground text-xs uppercase">待支付</p>
                            <p className="font-medium tabular-nums">{statusData.pending}</p>
                        </div>
                    </div>
                    <Separator orientation="vertical" className="h-auto!" />
                    <div className="flex flex-1 flex-col items-center space-y-2">
                        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                            <CheckCircle className="size-5 stroke-green-500" />
                        </div>
                        <div className="space-y-0.5 text-center">
                            <p className="text-muted-foreground text-xs uppercase">已支付</p>
                            <p className="font-medium tabular-nums">{statusData.paid}</p>
                        </div>
                    </div>
                    <Separator orientation="vertical" className="h-auto!" />
                    <div className="flex flex-1 flex-col items-center space-y-2">
                        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                            <XCircle className="size-5 stroke-destructive" />
                        </div>
                        <div className="space-y-0.5 text-center">
                            <p className="text-muted-foreground text-xs uppercase">已取消</p>
                            <p className="font-medium tabular-nums">{statusData.cancelled}</p>
                        </div>
                    </div>
                </div>
                <span className="text-muted-foreground text-xs tabular-nums">
                    共 {totalOrders} 个订单
                </span>
            </CardContent>
        </Card>
    );
}
