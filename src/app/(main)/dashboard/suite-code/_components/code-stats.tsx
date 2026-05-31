"use client";

import { useEffect, useState } from "react";
import {
    Key,
    CheckCircle,
    XCircle,
    Clock,
    Ban,
    Crown,
    Sparkles,
    Zap,
    Coins,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CodeStatistics } from "@/lib/supabase/suite-code-types";

interface RecentActivation {
    id: string;
    code: string;
    code_type: string;
    membership_tier: string | null;
    credits_amount: number | null;
    activated_at: string;
    activated_by: string | null;
}

interface CodeStatsProps {
    refreshKey?: number;
}

/**
 * Code Statistics Component
 *
 * Displays summary statistics for activation codes including:
 * - Total codes, unused, used, expired, disabled counts
 * - Statistics grouped by code type (membership tiers and credits)
 * - Recent activation activity
 *
 * Requirements: 6.1, 6.2, 6.3
 */
export function CodeStats({ refreshKey }: CodeStatsProps) {
    const [stats, setStats] = useState<CodeStatistics | null>(null);
    const [recentActivations, setRecentActivations] = useState<RecentActivation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const response = await fetch("/api/suite-codes/stats");
                const result = await response.json();
                if (result.success) {
                    setStats(result.data.statistics);
                    setRecentActivations(result.data.recent_activations || []);
                }
            } catch (error) {
                console.error("Failed to fetch suite code stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [refreshKey]);

    // Status statistics items - Requirements: 6.1
    const statusItems = [
        {
            title: "总数",
            value: stats?.total ?? 0,
            icon: Key,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
        },
        {
            title: "未使用",
            value: stats?.unused ?? 0,
            icon: CheckCircle,
            color: "text-green-500",
            bgColor: "bg-green-500/10",
        },
        {
            title: "已使用",
            value: stats?.used ?? 0,
            icon: Clock,
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
        },
        {
            title: "已过期",
            value: stats?.expired ?? 0,
            icon: XCircle,
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
        },
        {
            title: "已禁用",
            value: stats?.disabled ?? 0,
            icon: Ban,
            color: "text-red-500",
            bgColor: "bg-red-500/10",
        },
    ];

    // Type statistics items - Requirements: 6.2
    const typeItems = [
        {
            title: "Plus 会员",
            value: stats?.by_type.membership.plus ?? 0,
            icon: Sparkles,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
        },
        {
            title: "Pro 会员",
            value: stats?.by_type.membership.pro ?? 0,
            icon: Zap,
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
        },
        {
            title: "Ultra 会员",
            value: stats?.by_type.membership.ultra ?? 0,
            icon: Crown,
            color: "text-violet-500",
            bgColor: "bg-violet-500/10",
        },
        {
            title: "积分充值",
            value: stats?.by_type.credits ?? 0,
            icon: Coins,
            color: "text-cyan-500",
            bgColor: "bg-cyan-500/10",
        },
    ];

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getCodeTypeLabel = (activation: RecentActivation) => {
        if (activation.code_type === "membership") {
            const tierLabels: Record<string, string> = {
                plus: "Plus",
                pro: "Pro",
                ultra: "Ultra",
            };
            return tierLabels[activation.membership_tier || ""] || "会员";
        }
        return `${activation.credits_amount} 积分`;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Status stats skeleton */}
                <div className="grid gap-4 md:grid-cols-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-20" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                {/* Type stats skeleton */}
                <div className="grid gap-4 md:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-20" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Status Statistics - Requirements: 6.1 */}
            <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    状态统计
                </h3>
                <div className="grid gap-4 md:grid-cols-5">
                    {statusItems.map((item) => (
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
                                <div className="text-2xl font-bold">
                                    {item.value.toLocaleString()}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Type Statistics - Requirements: 6.2 */}
            <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    类型统计
                </h3>
                <div className="grid gap-4 md:grid-cols-4">
                    {typeItems.map((item) => (
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
                                <div className="text-2xl font-bold">
                                    {item.value.toLocaleString()}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Recent Activations - Requirements: 6.3 */}
            {recentActivations.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                        最近激活
                    </h3>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="space-y-3">
                                {recentActivations.slice(0, 5).map((activation) => (
                                    <div
                                        key={activation.id}
                                        className="flex items-center justify-between py-2 border-b last:border-0"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="font-mono text-sm">
                                                {activation.code.slice(0, 10)}...
                                            </div>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                                                {getCodeTypeLabel(activation)}
                                            </span>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {formatDate(activation.activated_at)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
