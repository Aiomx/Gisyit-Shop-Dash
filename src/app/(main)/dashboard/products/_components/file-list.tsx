"use client";

import { useState } from "react";
import { FileIcon, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import type { ProductFile } from "@/lib/supabase/types";

interface FileListProps {
    productId: string;
    files: ProductFile[];
    onFileDeleted: () => void;
    loading?: boolean;
}

/**
 * FileList Component
 *
 * Displays uploaded files with metadata and delete functionality.
 *
 * Requirements: 1.4
 */
export function FileList({ productId, files, onFileDeleted, loading }: FileListProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<ProductFile | null>(null);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getFileTypeLabel = (mimeType: string): string => {
        const typeMap: Record<string, string> = {
            "application/zip": "ZIP",
            "application/x-zip-compressed": "ZIP",
            "application/x-rar-compressed": "RAR",
            "application/x-7z-compressed": "7Z",
            "application/x-msdownload": "EXE",
            "application/x-msdos-program": "EXE",
            "application/octet-stream": "文件",
            "application/pdf": "PDF",
            "application/dmg": "DMG",
            "application/x-apple-diskimage": "DMG",
            "text/plain": "TXT",
        };
        return typeMap[mimeType] || mimeType.split("/")[1]?.toUpperCase() || "文件";
    };

    const handleDelete = async (file: ProductFile) => {
        setDeletingId(file.id);
        try {
            const response = await fetch(`/api/products/${productId}/files/${file.id}`, {
                method: "DELETE",
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "删除失败");
            }

            toast.success("文件已删除");
            onFileDeleted();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "删除失败");
        } finally {
            setDeletingId(null);
            setConfirmDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <FileIcon className="mx-auto h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">暂无上传文件</p>
            </div>
        );
    }

    return (
        <>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>文件名</TableHead>
                            <TableHead className="w-[100px]">类型</TableHead>
                            <TableHead className="w-[100px]">大小</TableHead>
                            <TableHead className="w-[160px]">上传时间</TableHead>
                            <TableHead className="w-[60px]">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {files.map((file) => (
                            <TableRow key={file.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="truncate" title={file.original_filename}>
                                            {file.original_filename}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="text-xs bg-muted px-2 py-1 rounded">
                                        {getFileTypeLabel(file.mime_type)}
                                    </span>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {formatFileSize(file.file_size)}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {formatDate(file.uploaded_at)}
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setConfirmDelete(file)}
                                        disabled={deletingId === file.id}
                                    >
                                        {deletingId === file.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        )}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Delete confirmation dialog */}
            <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除文件</AlertDialogTitle>
                        <AlertDialogDescription>
                            确定要删除文件 "{confirmDelete?.original_filename}" 吗？此操作无法撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => confirmDelete && handleDelete(confirmDelete)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
