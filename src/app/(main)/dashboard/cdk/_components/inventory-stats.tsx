"use client";

import { useEffect, useState } from "react";
import { Package, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * CDK inventory statistics type
 */
interface CDKInventoryStats {
    total: number;
    available: number;
    reserved: number;
    delivered: number;
    invalid: number;
}

interface InventoryStatsProps {
    productId?: string;
    onRefresh?: () => void;
    refreshKey?: number;
}

export function InventoryStats({ productId, refreshKey }: InventoryStatsProps) {
    const [stats, setStats] = useState<CDKInventoryStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                // Call API route instead of direct admin service
                const params = new URLSearchParams();
                if (productId) {
                    params.set("productId", productId);
                }
                const url = `/api/cdk/stats${params.toString() ? `?${params}` : ""}`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error("Failed to fetch stats");
                }

                const data = await response.json();
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch inventory stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [productId, refreshKey]);

    const statItems = [
        {
            title: "总库存",
            value: stats?.total ?? 0,
            icon: Package,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
        },
        {
            title: "可用",
            value: stats?.available ?? 0,
            icon: CheckCircle,
            color: "text-green-500",
            bgColor: "bg-green-500/10",
        },
        {
            title: "已预留",
            value: stats?.reserved ?? 0,
            icon: Clock,
            color: "text-yellow-500",
            bgColor: "bg-yellow-500/10",
        },
        {
            title: "已发货",
            value: stats?.delivered ?? 0,
            icon: CheckCircle,
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
        },
        {
            title: "已作废",
            value: stats?.invalid ?? 0,
            icon: XCircle,
            color: "text-red-500",
            bgColor: "bg-red-500/10",
        },
    ];

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-20" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-5">
            {statItems.map((item) => (
                <Card key={item.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {item.title}
                        </CardTitle>
                        <div className={`p-2 rounded-lg ${item.bgColor}`}>
                            <item.icon className={`h-4 w-4 ${item.color}`} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{item.value.toLocaleString()}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
