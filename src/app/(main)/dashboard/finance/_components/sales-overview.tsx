"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, Package, ShoppingCart, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { format, subDays, subMonths } from "date-fns";
import { zhCN } from "date-fns/locale";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";

interface SalesData {
    date: string;
    revenue: number;
    orders: number;
    paidOrders: number;
}

interface SalesStats {
    totalRevenue: number;
    totalOrders: number;
    paidOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    averageOrderValue: number;
}

type PeriodType = "7days" | "30days" | "12months";

const chartConfig = {
    revenue: {
        label: "销售额",
        color: "var(--chart-1)",
    },
    orders: {
        label: "订单数",
        color: "var(--chart-2)",
    },
    paidOrders: {
        label: "已支付",
        color: "var(--chart-3)",
    },
} satisfies ChartConfig;

export function SalesOverview() {
    const [period, setPeriod] = useState<PeriodType>("30days");
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<SalesData[]>([]);
    const [stats, setStats] = useState<SalesStats>({
        totalRevenue: 0,
        totalOrders: 0,
        paidOrders: 0,
        pendingOrders: 0,
        cancelledOrders: 0,
        averageOrderValue: 0,
    });

    useEffect(() => {
        fetchSalesData();
    }, [period]);

    async function fetchSalesData() {
        setLoading(true);
        try {
            const now = new Date();
            let startDate: Date;
            let dateFormat: string;
            let groupByMonth = false;

            switch (period) {
                case "7days":
                    startDate = subDays(now, 7);
                    dateFormat = "MM-dd";
                    break;
                case "30days":
                    startDate = subDays(now, 30);
                    dateFormat = "MM-dd";
                    break;
                case "12months":
                    startDate = subMonths(now, 12);
                    dateFormat = "yyyy-MM";
                    groupByMonth = true;
                    break;
                default:
                    startDate = subDays(now, 30);
                    dateFormat = "MM-dd";
            }

            // Fetch orders within the period
            const { data: orders, error } = await supabase
                .from("orders")
                .select("id, status, total_amount, created_at, payment_completed_at")
                .gte("created_at", startDate.toISOString())
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Error fetching orders:", error);
                return;
            }

            // Calculate stats
            const paidStatuses = ["paid", "fulfilled", "completed"];
            const paidOrders = orders?.filter(o => paidStatuses.includes(o.status)) || [];
            const pendingOrders = orders?.filter(o => o.status === "pending" || o.status === "pending_payment") || [];
            const cancelledOrders = orders?.filter(o => o.status === "cancelled") || [];

            const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
            const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

            setStats({
                totalRevenue,
                totalOrders: orders?.length || 0,
                paidOrders: paidOrders.length,
                pendingOrders: pendingOrders.length,
                cancelledOrders: cancelledOrders.length,
                averageOrderValue: avgOrderValue,
            });

            // Group data by date/month
            const dataMap = new Map<string, SalesData>();

            // Initialize all dates/months in the range
            if (groupByMonth) {
                for (let i = 12; i >= 0; i--) {
                    const date = subMonths(now, i);
                    const key = format(date, "yyyy-MM");
                    dataMap.set(key, { date: format(date, "M月", { locale: zhCN }), revenue: 0, orders: 0, paidOrders: 0 });
                }
            } else {
                const days = period === "7days" ? 7 : 30;
                for (let i = days; i >= 0; i--) {
                    const date = subDays(now, i);
                    const key = format(date, "yyyy-MM-dd");
                    dataMap.set(key, { date: format(date, dateFormat), revenue: 0, orders: 0, paidOrders: 0 });
                }
            }

            // Aggregate order data
            orders?.forEach(order => {
                const orderDate = new Date(order.created_at);
                const key = groupByMonth
                    ? format(orderDate, "yyyy-MM")
                    : format(orderDate, "yyyy-MM-dd");

                const existing = dataMap.get(key);
                if (existing) {
                    existing.orders += 1;
                    if (paidStatuses.includes(order.status)) {
                        existing.paidOrders += 1;
                        existing.revenue += order.total_amount || 0;
                    }
                }
            });

            setChartData(Array.from(dataMap.values()));
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <Card className="shadow-xs">
                <CardHeader>
                    <CardTitle>销售概览</CardTitle>
                    <CardDescription>查看销售趋势和订单统计</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-xs">
            <CardHeader>
                <CardTitle>销售概览</CardTitle>
                <CardDescription>查看销售趋势和订单统计</CardDescription>
                <CardAction>
                    <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
                        <SelectTrigger>
                            <SelectValue placeholder="选择时间段" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7days">最近7天</SelectItem>
                            <SelectItem value="30days">最近30天</SelectItem>
                            <SelectItem value="12months">最近12个月</SelectItem>
                        </SelectContent>
                    </Select>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Separator />
                <div className="flex flex-col items-start justify-between gap-2 py-5 md:flex-row md:items-stretch md:gap-0">
                    <div className="flex flex-1 items-center justify-center gap-2">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border">
                            <TrendingUp className="size-6 stroke-chart-1" />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs uppercase">总销售额</p>
                            <p className="font-medium tabular-nums">{formatCurrency(stats.totalRevenue, { currency: "CNY", locale: "zh-CN" })}</p>
                        </div>
                    </div>
                    <Separator orientation="vertical" className="h-auto!" />
                    <div className="flex flex-1 items-center justify-center gap-2">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border">
                            <ShoppingCart className="size-6 stroke-chart-2" />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs uppercase">总订单数</p>
                            <p className="font-medium tabular-nums">{stats.totalOrders}</p>
                        </div>
                    </div>
                    <Separator orientation="vertical" className="h-auto!" />
                    <div className="flex flex-1 items-center justify-center gap-2">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border">
                            <ArrowDownLeft className="size-6 stroke-green-500" />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs uppercase">已支付</p>
                            <p className="font-medium tabular-nums">{stats.paidOrders}</p>
                        </div>
                    </div>
                    <Separator orientation="vertical" className="h-auto!" />
                    <div className="flex flex-1 items-center justify-center gap-2">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border">
                            <Package className="size-6 stroke-chart-3" />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs uppercase">客单价</p>
                            <p className="font-medium tabular-nums">{formatCurrency(stats.averageOrderValue, { currency: "CNY", locale: "zh-CN" })}</p>
                        </div>
                    </div>
                </div>
                <Separator />
                <ChartContainer className="max-h-72 w-full" config={chartConfig}>
                    <BarChart margin={{ left: -25, right: 0, top: 25, bottom: 0 }} accessibilityLayer data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => `${value >= 1000 ? `${value / 1000}k` : value}`}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="revenue" fill={chartConfig.revenue.color} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
