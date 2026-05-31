"use client";

import { useEffect, useState } from "react";
import { FileText, FileSpreadsheet, AlertCircle, CheckCircle, Clock } from "lucide-react";
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
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getImportHistory, type CDKImportBatchDetail } from "@/lib/cdk/admin-service";

interface ImportHistoryViewProps {
    productId?: string;
    refreshKey?: number;
}

const sourceTypeConfig = {
    text: { label: "文本", icon: FileText },
    csv: { label: "CSV", icon: FileSpreadsheet },
    xlsx: { label: "Excel", icon: FileSpreadsheet },
};

export function ImportHistoryView({ productId, refreshKey }: ImportHistoryViewProps) {
    const [batches, setBatches] = useState<CDKImportBatchDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState<CDKImportBatchDetail | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const data = await getImportHistory(50, productId);
                setBatches(data);
            } catch (error) {
                console.error("Failed to fetch import history:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [productId, refreshKey]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString("zh-CN");
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>导入历史</CardTitle>
                    <CardDescription>查看CDK码导入记录</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-[200px]" />
                                    <Skeleton className="h-3 w-[150px]" />
                                </div>
                                <Skeleton className="h-6 w-20" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>导入历史</CardTitle>
                    <CardDescription>
                        查看CDK码导入记录，包括成功、重复和失败数量
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {batches.length === 0 ? (
                        <div className="text-center py-8">
                            <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
                            <p className="mt-2 text-muted-foreground">暂无导入记录</p>
                        </div>
                    ) : (
                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>导入时间</TableHead>
                                        <TableHead>来源</TableHead>
                                        <TableHead>商品</TableHead>
                                        <TableHead className="text-center">成功</TableHead>
                                        <TableHead className="text-center">重复</TableHead>
                                        <TableHead className="text-center">失败</TableHead>
                                        <TableHead className="text-center">总计</TableHead>
                                        <TableHead className="w-[80px]">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {batches.map((batch) => {
                                        const sourceConfig = sourceTypeConfig[batch.source_type] || sourceTypeConfig.text;
                                        const SourceIcon = sourceConfig.icon;
                                        const hasErrors = batch.invalid_count > 0;

                                        return (
                                            <TableRow key={batch.id}>
                                                <TableCell>
                                                    <span className="text-sm">
                                                        {formatDate(batch.created_at)}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <SourceIcon className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">{sourceConfig.label}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">{batch.product_name || "-"}</span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="default" className="bg-green-500">
                                                        {batch.success_count}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="secondary">
                                                        {batch.duplicate_count}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={hasErrors ? "destructive" : "secondary"}>
                                                        {batch.invalid_count}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline">
                                                        {batch.total_count}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {hasErrors && batch.error_details && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSelectedBatch(batch)}
                                                        >
                                                            详情
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Error Details Dialog */}
            <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            导入错误详情
                        </DialogTitle>
                        <DialogDescription>
                            {selectedBatch && (
                                <>
                                    导入时间: {formatDate(selectedBatch.created_at)}
                                    <br />
                                    商品: {selectedBatch.product_name || "-"}
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedBatch?.error_details && (
                        <div className="max-h-[400px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[60px]">行号</TableHead>
                                        <TableHead>CDK码</TableHead>
                                        <TableHead>错误原因</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedBatch.error_details.map((error, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-mono">{error.line}</TableCell>
                                            <TableCell>
                                                <code className="text-sm bg-muted px-1 rounded">
                                                    {error.code}
                                                </code>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {error.reason}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
