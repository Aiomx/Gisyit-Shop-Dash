"use client";

import { useState } from "react";
import { Search, Copy, Ban, ExternalLink, CheckCircle, Clock, XCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { searchCode, invalidateCode, type CDKCodeDetail, CDKStatus } from "@/lib/cdk/admin-service";

interface CDKSearchViewProps {
    refreshKey?: number;
    onRefresh?: () => void;
}

const statusConfig = {
    available: { label: "可用", variant: "default" as const, icon: CheckCircle, color: "text-green-500" },
    reserved: { label: "已预留", variant: "secondary" as const, icon: Clock, color: "text-yellow-500" },
    delivered: { label: "已发货", variant: "default" as const, icon: Package, color: "text-purple-500" },
    invalid: { label: "已作废", variant: "destructive" as const, icon: XCircle, color: "text-red-500" },
};

export function CDKSearchView({ onRefresh }: CDKSearchViewProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<CDKCodeDetail[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedCode, setSelectedCode] = useState<CDKCodeDetail | null>(null);
    const [invalidateDialogOpen, setInvalidateDialogOpen] = useState(false);
    const [codeToInvalidate, setCodeToInvalidate] = useState<CDKCodeDetail | null>(null);
    const [invalidating, setInvalidating] = useState(false);

    // Use a valid admin UUID - in production this would come from auth context
    const adminId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    const handleSearch = async () => {
        if (!query.trim()) {
            toast.error("请输入搜索内容");
            return;
        }

        setSearching(true);
        try {
            const data = await searchCode(query.trim());
            setResults(data);
            if (data.length === 0) {
                toast.info("未找到匹配的CDK码");
            }
        } catch (error) {
            console.error("Search error:", error);
            toast.error("搜索失败");
        } finally {
            setSearching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success("已复制到剪贴板");
    };

    const handleInvalidateClick = (code: CDKCodeDetail) => {
        setCodeToInvalidate(code);
        setInvalidateDialogOpen(true);
    };

    const handleConfirmInvalidate = async () => {
        if (!codeToInvalidate) return;

        setInvalidating(true);
        try {
            const result = await invalidateCode(codeToInvalidate.id, adminId, "管理员手动作废");
            if (result.success) {
                toast.success("CDK码已作废");
                // Refresh search results
                handleSearch();
                onRefresh?.();
            } else {
                toast.error(result.error || "作废失败");
            }
        } catch (error) {
            console.error("Invalidate error:", error);
            toast.error("作废失败");
        } finally {
            setInvalidating(false);
            setInvalidateDialogOpen(false);
            setCodeToInvalidate(null);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleString("zh-CN");
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>搜索CDK码</CardTitle>
                    <CardDescription>
                        通过CDK码内容或ID搜索，查看详细信息
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="输入CDK码或ID..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pl-9"
                            />
                        </div>
                        <Button onClick={handleSearch} disabled={searching}>
                            {searching ? "搜索中..." : "搜索"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {results.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>搜索结果</CardTitle>
                        <CardDescription>找到 {results.length} 个匹配的CDK码</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>CDK码</TableHead>
                                        <TableHead>状态</TableHead>
                                        <TableHead>商品</TableHead>
                                        <TableHead>订单</TableHead>
                                        <TableHead>创建时间</TableHead>
                                        <TableHead className="w-[120px]">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.map((code) => {
                                        const status = statusConfig[code.status] || statusConfig.available;
                                        return (
                                            <TableRow key={code.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                                                            {code.code}
                                                        </code>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => handleCopyCode(code.code)}
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={status.variant} className="gap-1">
                                                        <status.icon className={`h-3 w-3 ${status.color}`} />
                                                        {status.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">{code.product_name || "-"}</span>
                                                </TableCell>
                                                <TableCell>
                                                    {code.order_number ? (
                                                        <span className="text-sm font-mono">{code.order_number}</span>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-muted-foreground">
                                                        {formatDate(code.created_at)}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setSelectedCode(code)}
                                                            title="查看详情"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
                                                        {code.status !== CDKStatus.DELIVERED &&
                                                            code.status !== CDKStatus.INVALID && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleInvalidateClick(code)}
                                                                    title="作废"
                                                                >
                                                                    <Ban className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Code Detail Dialog */}
            <Dialog open={!!selectedCode} onOpenChange={() => setSelectedCode(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>CDK码详情</DialogTitle>
                        <DialogDescription>查看CDK码的完整信息</DialogDescription>
                    </DialogHeader>
                    {selectedCode && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">CDK码</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                            {selectedCode.code}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => handleCopyCode(selectedCode.code)}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">状态</p>
                                    <Badge
                                        variant={statusConfig[selectedCode.status]?.variant || "default"}
                                        className="mt-1"
                                    >
                                        {statusConfig[selectedCode.status]?.label || selectedCode.status}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">商品</p>
                                    <p className="mt-1">{selectedCode.product_name || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">订单号</p>
                                    <p className="mt-1 font-mono">{selectedCode.order_number || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">创建时间</p>
                                    <p className="mt-1 text-sm">{formatDate(selectedCode.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">更新时间</p>
                                    <p className="mt-1 text-sm">{formatDate(selectedCode.updated_at)}</p>
                                </div>
                                {selectedCode.reserved_at && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">预留时间</p>
                                        <p className="mt-1 text-sm">{formatDate(selectedCode.reserved_at)}</p>
                                    </div>
                                )}
                                {selectedCode.delivered_at && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">发货时间</p>
                                        <p className="mt-1 text-sm">{formatDate(selectedCode.delivered_at)}</p>
                                    </div>
                                )}
                                {selectedCode.invalidated_at && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">作废时间</p>
                                        <p className="mt-1 text-sm">{formatDate(selectedCode.invalidated_at)}</p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">ID</p>
                                <code className="text-xs font-mono text-muted-foreground">
                                    {selectedCode.id}
                                </code>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Invalidate Confirmation Dialog */}
            <AlertDialog open={invalidateDialogOpen} onOpenChange={setInvalidateDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认作废CDK码</AlertDialogTitle>
                        <AlertDialogDescription>
                            确定要作废这个CDK码吗？作废后将无法恢复，该码将不能再被使用。
                            {codeToInvalidate && (
                                <code className="block mt-2 p-2 bg-muted rounded text-sm font-mono">
                                    {codeToInvalidate.code}
                                </code>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={invalidating}>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmInvalidate}
                            disabled={invalidating}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {invalidating ? "处理中..." : "确认作废"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
