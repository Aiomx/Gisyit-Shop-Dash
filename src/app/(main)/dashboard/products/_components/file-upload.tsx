"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
    MAX_APP_FILE_SIZE_BYTES,
    type FileCategory,
    getMaxFileSizeForCategory,
    formatFileSize,
    validateFileSize,
} from "@/lib/storage/types";

interface FileUploadProps {
    productId: string;
    onUploadComplete: () => void;
    disabled?: boolean;
    fileCategory?: FileCategory;
    accept?: string;
}

export function FileUpload({
    productId,
    onUploadComplete,
    disabled,
    fileCategory,
    accept,
}: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const xhrRef = useRef<XMLHttpRequest | null>(null);

    const getDisplayMaxSize = (): number => {
        if (fileCategory) {
            return getMaxFileSizeForCategory(fileCategory);
        }
        return MAX_APP_FILE_SIZE_BYTES;
    };

    const displayMaxSizeFormatted = formatFileSize(getDisplayMaxSize());

    const handleFileSelect = useCallback((file: File) => {
        setError(null);
        const validationError = validateFileSize(file, fileCategory);
        if (validationError) {
            setError(validationError);
            return;
        }
        setSelectedFile(file);
    }, [fileCategory]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && !uploading) {
            setIsDragging(true);
        }
    }, [disabled, uploading]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (disabled || uploading) return;
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, [disabled, uploading, handleFileSelect]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };


    const handleUpload = async () => {
        if (!selectedFile || uploading) return;

        setUploading(true);
        setUploadProgress(0);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("filename", selectedFile.name);
            formData.append("contentType", selectedFile.type || "application/octet-stream");

            const xhr = new XMLHttpRequest();
            xhrRef.current = xhr;

            const uploadPromise = new Promise<void>((resolve, reject) => {
                xhr.upload.addEventListener("progress", (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 90) + 5;
                        setUploadProgress(percent);
                    }
                });

                xhr.addEventListener("load", () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            reject(new Error(response.error || "上传失败"));
                        } catch {
                            reject(new Error("上传失败"));
                        }
                    }
                });

                xhr.addEventListener("error", () => reject(new Error("网络错误")));
                xhr.addEventListener("abort", () => reject(new Error("已取消")));
            });

            setUploadProgress(5);
            xhr.open("POST", `/api/products/${productId}/files/upload`);
            xhr.send(formData);

            await uploadPromise;

            setUploadProgress(100);
            setSelectedFile(null);
            onUploadComplete();
        } catch (err) {
            if (err instanceof Error && err.message !== "已取消") {
                setError(err.message);
            }
        } finally {
            setUploading(false);
            setUploadProgress(0);
            xhrRef.current = null;
        }
    };

    const handleCancel = () => {
        if (uploading && xhrRef.current) {
            xhrRef.current.abort();
        }
        setSelectedFile(null);
        setError(null);
        setUploading(false);
        setUploadProgress(0);
    };

    return (
        <div className="space-y-4">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
                className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    isDragging && "border-primary bg-primary/5",
                    !isDragging && !disabled && "border-muted-foreground/25 hover:border-primary/50",
                    disabled && "opacity-50 cursor-not-allowed",
                    uploading && "pointer-events-none"
                )}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleInputChange}
                    className="hidden"
                    disabled={disabled || uploading}
                    accept={accept}
                />
                <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">
                    {isDragging ? "释放文件以上传" : "拖拽文件到此处，或点击选择"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    {fileCategory === "video" && "支持 MP4、WebM、MOV 格式，"}
                    {fileCategory === "image" && "支持 JPG、PNG、GIF、WebP 格式，"}
                    {fileCategory === "app" && "支持应用程序文件，"}
                    最大 {displayMaxSizeFormatted}
                </p>
            </div>

            {selectedFile && !uploading && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <FileIcon className="h-8 w-8 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={handleCancel}>
                            <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={handleUpload}>上传</Button>
                    </div>
                </div>
            )}

            {uploading && (
                <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <FileIcon className="h-8 w-8 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{selectedFile?.name}</p>
                            <p className="text-xs text-muted-foreground">上传中...</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={handleCancel}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}
        </div>
    );
}
