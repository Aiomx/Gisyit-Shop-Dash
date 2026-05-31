"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Play, Link, GripVertical, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { ProductVideo } from "@/lib/supabase/types";
import { validateFileSize, SUPPORTED_VIDEO_MIME_TYPES } from "@/lib/storage/types";

interface ProductVideoManagerProps {
    productId: string;
    videos: ProductVideo[];
    onVideosChange: (videos: ProductVideo[]) => void;
}

export function ProductVideoManager({
    productId,
    videos,
    onVideosChange
}: ProductVideoManagerProps) {
    const [uploading, setUploading] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [externalUrl, setExternalUrl] = useState("");
    const [videoType, setVideoType] = useState<"demo" | "tutorial" | "review">("demo");
    const [videoTitle, setVideoTitle] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const validFiles: File[] = [];

        // Validate files
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Check MIME type
            if (!SUPPORTED_VIDEO_MIME_TYPES.includes(file.type as any)) {
                toast.error(`文件 ${file.name} 不是支持的视频格式`);
                continue;
            }

            // Check file size
            const sizeError = validateFileSize(file, "video");
            if (sizeError) {
                toast.error(`文件 ${file.name}: ${sizeError}`);
                continue;
            }

            validFiles.push(file);
        }

        if (validFiles.length === 0) return;

        setUploading(true);
        try {
            const uploadPromises = validFiles.map(async (file) => {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("product_id", productId);
                formData.append("video_type", videoType);
                formData.append("title", videoTitle || file.name);

                const response = await fetch(`/api/products/${productId}/videos`, {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || "上传失败");
                }

                return response.json();
            });

            const results = await Promise.all(uploadPromises);
            const newVideos = results.map(result => result.data);

            // Update videos list with new uploads
            const updatedVideos = [...videos, ...newVideos];
            onVideosChange(updatedVideos);

            toast.success(`成功上传 ${newVideos.length} 个视频`);
            setVideoTitle("");
        } catch (error) {
            console.error("Upload error:", error);
            toast.error(error instanceof Error ? error.message : "上传失败");
        } finally {
            setUploading(false);
        }
    }, [productId, videos, onVideosChange, videoType, videoTitle]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleAddExternalVideo = async () => {
        if (!externalUrl.trim()) {
            toast.error("请输入视频链接");
            return;
        }

        try {
            const response = await fetch(`/api/products/${productId}/videos`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    video_url: externalUrl.trim(),
                    video_type: videoType,
                    title: videoTitle || "外部视频",
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "添加视频失败");
            }

            const result = await response.json();
            const updatedVideos = [...videos, result.data];
            onVideosChange(updatedVideos);

            toast.success("视频添加成功");
            setExternalUrl("");
            setVideoTitle("");
        } catch (error) {
            console.error("Add external video error:", error);
            toast.error(error instanceof Error ? error.message : "添加视频失败");
        }
    };

    const handleDeleteVideo = async (videoId: string) => {
        try {
            const response = await fetch(`/api/products/${productId}/videos`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ video_id: videoId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "删除失败");
            }

            // Remove video from local state
            const updatedVideos = videos.filter(video => video.id !== videoId);
            onVideosChange(updatedVideos);

            toast.success("视频删除成功");
        } catch (error) {
            console.error("Delete error:", error);
            toast.error(error instanceof Error ? error.message : "删除失败");
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        // Reorder videos array
        const newVideos = [...videos];
        const draggedVideo = newVideos[draggedIndex];
        newVideos.splice(draggedIndex, 1);
        newVideos.splice(dropIndex, 0, draggedVideo);

        // Update sort_order for all videos
        const updatedVideos = newVideos.map((video, index) => ({
            ...video,
            sort_order: index
        }));

        try {
            // Send reorder request to API
            const response = await fetch(`/api/products/${productId}/videos`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: "reorder",
                    videos: updatedVideos.map(video => ({ id: video.id, sort_order: video.sort_order }))
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "排序失败");
            }

            onVideosChange(updatedVideos);
            toast.success("视频排序已更新");
        } catch (error) {
            console.error("Reorder error:", error);
            toast.error(error instanceof Error ? error.message : "排序失败");
        }

        setDraggedIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const getVideoTypeLabel = (type: string) => {
        switch (type) {
            case "demo": return "演示";
            case "tutorial": return "教程";
            case "review": return "评测";
            default: return type;
        }
    };

    const getSourceTypeLabel = (sourceType: string) => {
        switch (sourceType) {
            case "local": return "本地";
            case "youtube": return "YouTube";
            case "bilibili": return "Bilibili";
            case "external": return "外部";
            default: return sourceType;
        }
    };

    const renderVideoPreview = (video: ProductVideo) => {
        if (video.source_type === "local") {
            return (
                <video
                    className="w-full h-full object-cover"
                    controls
                    preload="metadata"
                >
                    <source src={video.video_url} type="video/mp4" />
                    您的浏览器不支持视频播放
                </video>
            );
        } else {
            // For external videos, show thumbnail or placeholder
            return (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                    {video.thumbnail_url ? (
                        <img
                            src={video.thumbnail_url}
                            alt={video.title || "视频缩略图"}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-center">
                            <Play className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">外部视频</p>
                        </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => window.open(video.video_url, "_blank")}
                        >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            打开
                        </Button>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="space-y-4">
            {/* Add Video Section */}
            <Tabs defaultValue="external" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="external">外部链接</TabsTrigger>
                    <TabsTrigger value="upload">本地上传</TabsTrigger>
                </TabsList>

                <TabsContent value="external" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="video-url">视频链接</Label>
                            <Input
                                id="video-url"
                                placeholder="输入 YouTube、Bilibili 或其他视频链接"
                                value={externalUrl}
                                onChange={(e) => setExternalUrl(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="video-title">视频标题（可选）</Label>
                            <Input
                                id="video-title"
                                placeholder="输入视频标题"
                                value={videoTitle}
                                onChange={(e) => setVideoTitle(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="space-y-2">
                            <Label>视频类型</Label>
                            <Select value={videoType} onValueChange={(value: any) => setVideoType(value)}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="demo">演示</SelectItem>
                                    <SelectItem value="tutorial">教程</SelectItem>
                                    <SelectItem value="review">评测</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1" />
                        <Button onClick={handleAddExternalVideo} disabled={!externalUrl.trim()}>
                            <Link className="h-4 w-4 mr-2" />
                            添加视频
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                        <div className="text-center">
                            <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                            <div className="mt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="upload-title">视频标题（可选）</Label>
                                        <Input
                                            id="upload-title"
                                            placeholder="输入视频标题"
                                            value={videoTitle}
                                            onChange={(e) => setVideoTitle(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>视频类型</Label>
                                        <Select value={videoType} onValueChange={(value: any) => setVideoType(value)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="demo">演示</SelectItem>
                                                <SelectItem value="tutorial">教程</SelectItem>
                                                <SelectItem value="review">评测</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleUploadClick}
                                    disabled={uploading}
                                    variant="outline"
                                >
                                    {uploading ? "上传中..." : "选择视频文件"}
                                </Button>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    支持 MP4、WebM、MOV 格式，单个文件最大 500MB
                                </p>
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept={SUPPORTED_VIDEO_MIME_TYPES.join(",")}
                            onChange={(e) => handleFileSelect(e.target.files)}
                            className="hidden"
                        />
                    </div>
                </TabsContent>
            </Tabs>

            {/* Videos Grid */}
            {videos.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {videos
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((video, index) => (
                            <Card
                                key={video.id}
                                className={`relative group cursor-move ${draggedIndex === index ? "opacity-50" : ""
                                    }`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, index)}
                                onDragEnd={handleDragEnd}
                            >
                                <CardContent className="p-2">
                                    {/* Drag Handle */}
                                    <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-black/50 rounded p-1">
                                            <GripVertical className="h-4 w-4 text-white" />
                                        </div>
                                    </div>

                                    {/* Video Type Badge */}
                                    <div className="absolute top-2 right-2 z-10">
                                        <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                                            {getVideoTypeLabel(video.video_type)}
                                        </div>
                                    </div>

                                    {/* Video Preview */}
                                    <div className="aspect-video relative overflow-hidden rounded mb-2">
                                        {renderVideoPreview(video)}
                                    </div>

                                    {/* Video Info */}
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium truncate">
                                            {video.title || "未命名视频"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {getSourceTypeLabel(video.source_type)}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDeleteVideo(video.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                </div>
            )}

            {videos.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    <p>暂无视频，点击上方添加视频</p>
                </div>
            )}
        </div>
    );
}