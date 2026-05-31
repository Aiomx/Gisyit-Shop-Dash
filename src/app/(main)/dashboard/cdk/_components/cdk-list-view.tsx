"use client";

import { useEffect, useState } from "react";
import { Copy, Ban, Eye, EyeOff, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

interface CDKCode {
    id: string;
    code: string;
    status: "available" | "reserved" | "delivered" | "invalid";
    product_id: string;
    order_id: string | null;
    reserved_at: string | null;
    delivered_at: string | null;
    invalidated_at: string | null;
    created_at: string;
    products?: {
        name: string;
    };
    orders?: {
        order_number: string;
        status: string;
    };
}

interface CDKListViewProps {
    productId?: string;
    refreshKey?: number;
    onRefresh?: () => void;
}

const statusConfig = {
    available: { label: "可用", variant: "default" as const, color: "bg-green-500" },
    reserved: { label: "已预留", variant: "secondary" as const, color: "bg-yellow-500" },
    delivered: { label: "已使用", variant: "outline" as const, color: "bg-purple-500" },
    invalid: { label: "已作废", variant: "destructive" as const, color: "bg-red-500" },
};

export function CDKListView({ productId, refreshKey, onRefresh }: CDKListViewProps) {
    const [codes, setCodes] = useState<CDKCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [visibleCodes, setVisibleCodes] = useState<Set<string>>(new Set());
    const [invalidateDialogOpen, setInvalidateDialogOpen] = useState(false);
    const [selectedCode, setSelectedCode] = useState<CDKCode | null>(null);
    const [invalidating, setInvalidating] = useState(false);

    useEffect(() => {
        fetchCodes();
    }, [productId, refreshKey]);

    const fetchCodes = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("cdk_codes")
                .select(`
                    id, code, status, product_id, order_id,
                    reserved_at, delivered_at, invalidated_at, created_at,
                    products:product_id (name),
                    orders:order_id (order_number, status)
                `)
                .order("created_at", { ascending: false })
                .limit(100);

            if (productId) {
                query = query.eq("product_id", productId);
            }

            const { data, error } = await query;
            if (error) throw error;
            setCodes((data as unknown as CDKCode[]) || []);
        } catch (error) {
            console.error("Failed to fetch CDK codes:", error);
            toast.error("获取CDK列表失败");
        } finally {
            setLoading(false);
        }
    };

    const toggleCodeVisibility = (codeId: string) => {
        setVisibleCodes((prev) => {
            const next = new Set(prev);
            if (next.has(codeId)) {
                next.delete(codeId);
            } else {
                next.add(codeId);
            }
            return next;
        });
    };

    const copyCode = async (code: string) => {
        await navigator.clipboard.writeText(code);
        toast.success("已复制到剪贴板");
    };

    const maskCode = (code: string) => {
        if (code.length <= 8) return "****";
        return code.slice(0, 4) + "****" + code.slice(-4);
    };

    const handleInvalidate = async () => {
        if (!selectedCode) return;
        setInvalidating(true);
        try {
            const { error } = await supabase
                .from("cdk_codes")
                .update({
                    status: "invalid",
                    invalidated_at: new Date().toISOString(),
                })
                .eq("id", selectedCode.id);

            if (error) throw error;
            toast.success("CDK已作废");
            setInvalidateDialogOpen(false);
            onRefresh?.();
            fetchCodes();
        } catch (error) {
            console.error("Failed to invalidate CDK:", error);
            toast.error("作废失败");
        } finally {
            setInvalidating(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        );
    }

    if (codes.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                暂无CDK数据
            </div>
        );
    }

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">激活码</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>商品</TableHead>
                            <TableHead>关联订单</TableHead>
                            <TableHead>创建时间</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {codes.map((code) => {
                            const isVisible = visibleCodes.has(code.id);
                            const config = statusConfig[code.status];
                            return (
                                <TableRow key={code.id}>
                                    <TableCell className="font-mono">
                                        <div className="flex items-center gap-2">
                                            <span className="select-all">
                                                {isVisible ? code.code : maskCode(code.code)}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => toggleCodeVisibility(code.id)}
                                            >
                                                {isVisible ? (
                                                    <EyeOff className="h-3 w-3" />
                                                ) : (
                                                    <Eye className="h-3 w-3" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => copyCode(code.code)}
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={config.variant}>
                                            <span
                                                className={`w-2 h-2 rounded-full mr-1.5 ${config.color}`}
                                            />
                                            {config.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {(code.products as any)?.name || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {code.order_id && (code.orders as any)?.order_number ? (
                                            <Link
                                                href={`/dashboard/orders?id=${code.order_id}`}
                                                className="flex items-center gap-1 text-blue-500 hover:underline"
                                            >
                                                {(code.orders as any).order_number}
                                                <ExternalLink className="h-3 w-3" />
                                            </Link>
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {formatDate(code.created_at)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {code.status !== "invalid" &&
                                            code.status !== "delivered" && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-600"
                                                    onClick={() => {
                                                        setSelectedCode(code);
                                                        setInvalidateDialogOpen(true);
                                                    }}
                                                >
                                                    <Ban className="h-4 w-4 mr-1" />
                                                    作废
                                                </Button>
                                            )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={invalidateDialogOpen} onOpenChange={setInvalidateDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认作废此CDK？</AlertDialogTitle>
                        <AlertDialogDescription>
                            作废后此CDK将无法再被使用。此操作不可撤销。
                            <br />
                            <span className="font-mono mt-2 block">
                                {selectedCode?.code}
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleInvalidate}
                            disabled={invalidating}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {invalidating ? "处理中..." : "确认作废"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
