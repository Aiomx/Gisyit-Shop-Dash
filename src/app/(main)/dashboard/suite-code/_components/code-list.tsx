"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Copy,
    Ban,
    Eye,
    EyeOff,
    CheckCircle,
    MoreHorizontal,
    Info,
} from "lucide-react";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type {
    SuiteCode,
    CodeStatus,
    CodeListFilter,
} from "@/lib/supabase/suite-code-types";

interface CodeListProps {
    filter?: CodeListFilter;
    refreshKey?: number;
    onRefresh?: () => void;
    onViewDetail?: (code: SuiteCode) => void;
}

const statusConfig: Record<
    CodeStatus,
    { label: string; variant: "default" | "secondary" | "outline" | "destructive"; color: string }
> = {
    unused: { label: "未使用", variant: "default", color: "bg-green-500" },
    used: { label: "已使用", variant: "secondary", color: "bg-purple-500" },
    expired: { label: "已过期", variant: "outline", color: "bg-orange-500" },
    disabled: { label: "已禁用", variant: "destructive", color: "bg-red-500" },
};

const tierLabels: Record<string, string> = {
    plus: "Plus",
    pro: "Pro",
    ultra: "Ultra",
};

/**
 * Code List Component
 *
 * Displays a paginated table of activation codes with:
 * - Code string (masked/visible toggle)
 * - Status badges
 * - Type and value information
 * - Action buttons (disable/enable, copy, view details)
 *
 * Requirements: 3.1, 3.2, 3.3
 */
export function CodeList({
    filter,
    refreshKey,
    onRefresh,
    onViewDetail,
}: CodeListProps) {
    const [codes, setCodes] = useState<SuiteCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [visibleCodes, setVisibleCodes] = useState<Set<string>>(new Set());
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [selectedCode, setSelectedCode] = useState<SuiteCode | null>(null);
    const [targetStatus, setTargetStatus] = useState<"unused" | "disabled">("disabled");
    const [updating, setUpdating] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 20;

    const fetchCodes = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", page.toString());
            params.set("page_size", pageSize.toString());

            if (filter?.code_type) params.set("code_type", filter.code_type);
            if (filter?.membership_tier) params.set("membership_tier", filter.membership_tier);
            if (filter?.status) params.set("status", filter.status);
            if (filter?.start_date) params.set("start_date", filter.start_date);
            if (filter?.end_date) params.set("end_date", filter.end_date);
            if (filter?.search) params.set("search", filter.search);
            if (filter?.batch_id) params.set("batch_id", filter.batch_id);

            const response = await fetch(`/api/suite-codes?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                setCodes(result.data);
                setTotalPages(result.total_pages);
                setTotal(result.total);
            } else {
                toast.error("获取激活码列表失败");
            }
        } catch (error) {
            console.error("Failed to fetch suite codes:", error);
            toast.error("获取激活码列表失败");
        } finally {
            setLoading(false);
        }
    }, [page, filter]);

    useEffect(() => {
        fetchCodes();
    }, [fetchCodes, refreshKey]);

    // Reset page when filter changes
    useEffect(() => {
        setPage(1);
    }, [filter]);

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
        // Show prefix and last 4 chars, mask the middle
        const parts = code.split("-");
        if (parts.length === 3) {
            return `${parts[0]}-****-${parts[2].slice(-2)}**`;
        }
        return code.slice(0, 6) + "****" + code.slice(-4);
    };

    const handleStatusChange = async () => {
        if (!selectedCode) return;
        setUpdating(true);
        try {
            const response = await fetch(`/api/suite-codes/${selectedCode.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: targetStatus }),
            });

            const result = await response.json();
            if (result.success) {
                toast.success(result.message);
                setStatusDialogOpen(false);
                onRefresh?.();
                fetchCodes();
            } else {
                toast.error(result.error || "操作失败");
            }
        } catch (error) {
            console.error("Failed to update code status:", error);
            toast.error("操作失败");
        } finally {
            setUpdating(false);
        }
    };

    const openStatusDialog = (code: SuiteCode, status: "unused" | "disabled") => {
        setSelectedCode(code);
        setTargetStatus(status);
        setStatusDialogOpen(true);
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

    const getCodeValue = (code: SuiteCode) => {
        if (code.code_type === "membership") {
            return `${tierLabels[code.membership_tier || ""] || ""} ${code.membership_days}天`;
        }
        return `${code.credits_amount?.toLocaleString()} 积分`;
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
                暂无激活码数据
            </div>
        );
    }

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[220px]">激活码</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>类型</TableHead>
                            <TableHead>值</TableHead>
                            <TableHead>过期时间</TableHead>
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
                                    <TableCell className="font-mono text-sm">
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
                                        {code.code_type === "membership" ? "会员" : "积分"}
                                    </TableCell>
                                    <TableCell>{getCodeValue(code)}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {formatDate(code.expires_at)}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {formatDate(code.created_at)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => onViewDetail?.(code)}>
                                                    <Info className="h-4 w-4 mr-2" />
                                                    查看详情
                                                </DropdownMenuItem>
                                                {code.status === "unused" && (
                                                    <DropdownMenuItem
                                                        className="text-red-500"
                                                        onClick={() => openStatusDialog(code, "disabled")}
                                                    >
                                                        <Ban className="h-4 w-4 mr-2" />
                                                        禁用
                                                    </DropdownMenuItem>
                                                )}
                                                {code.status === "disabled" && (
                                                    <DropdownMenuItem
                                                        className="text-green-500"
                                                        onClick={() => openStatusDialog(code, "unused")}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-2" />
                                                        启用
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                    共 {total} 条记录，第 {page} / {totalPages} 页
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                    >
                        上一页
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                    >
                        下一页
                    </Button>
                </div>
            </div>

            {/* Status Change Dialog */}
            <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {targetStatus === "disabled" ? "确认禁用此激活码？" : "确认启用此激活码？"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {targetStatus === "disabled"
                                ? "禁用后此激活码将无法被使用。"
                                : "启用后此激活码将恢复可用状态。"}
                            <br />
                            <span className="font-mono mt-2 block">{selectedCode?.code}</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleStatusChange}
                            disabled={updating}
                            className={
                                targetStatus === "disabled"
                                    ? "bg-red-500 hover:bg-red-600"
                                    : "bg-green-500 hover:bg-green-600"
                            }
                        >
                            {updating ? "处理中..." : "确认"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
