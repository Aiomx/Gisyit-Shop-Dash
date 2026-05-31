"use client";

import { useState, useRef, useCallback } from "react";
import { FileText, ImagePlus, Video, Loader2, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Item,
    ItemContent,
    ItemTitle,
    ItemDescription,
    ItemMedia,
    ItemActions,
} from "@/components/ui/item";

export interface DescriptionEditorProps {
    productId: string;
    content: string | null;
    onSave: (content: string) => Promise<void>;
    disabled?: boolean;
}

/**
 * Markdown editor component for product descriptions
 * 
 * Provides a textarea for Markdown input with media upload capabilities.
 * Supports uploading images and videos, inserting their URLs into the content.
 * 
 * Requirements: 6.1, 6.2, 6.3
 */
export function DescriptionEditor({
    productId,
    content,
    onSave,
    disabled = false,
}: DescriptionEditorProps) {
    const [value, setValue] = useState(content || "");
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value);
        setHasChanges(e.target.value !== (content || ""));
        setError(null);
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await onSave(value);
            setHasChanges(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "保存失败，请稍后重试");
        } finally {
            setSaving(false);
        }
    };

    const insertMediaUrl = useCallback((url: string, isVideo: boolean) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = value;

        // Generate Markdown syntax for media
        const mediaMarkdown = isVideo
            ? `\n<video src="${url}" controls width="100%"></video>\n`
            : `\n![image](${url})\n`;

        const newValue = text.substring(0, start) + mediaMarkdown + text.substring(end);
        setValue(newValue);
        setHasChanges(true);

        // Set cursor position after inserted content
        setTimeout(() => {
            textarea.focus();
            const newPosition = start + mediaMarkdown.length;
            textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
    }, [value]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("productId", productId);

            const response = await fetch("/api/upload/description", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "上传失败");
            }

            const isVideo = file.type.startsWith("video/");
            insertMediaUrl(data.url, isVideo);
        } catch (err) {
            setError(err instanceof Error ? err.message : "上传失败，请稍后重试");
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-3">
            <Item variant="outline" size="sm" className="bg-blue-50/50 dark:bg-blue-950/20">
                <ItemMedia variant="icon" className="bg-blue-100 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>商品详情介绍</ItemTitle>
                    <ItemDescription>
                        {error ? (
                            <span className="text-destructive">{error}</span>
                        ) : (
                            "使用 Markdown 格式编写详细的商品介绍"
                        )}
                    </ItemDescription>
                </ItemContent>
                <ItemActions>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={disabled || uploading}
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={triggerFileUpload}
                        disabled={disabled || uploading}
                        title="上传图片或视频"
                    >
                        {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <ImagePlus className="h-4 w-4" />
                        )}
                        <span className="sr-only md:not-sr-only md:ml-1">上传媒体</span>
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleSave}
                        disabled={disabled || saving || !hasChanges}
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        <span className="sr-only md:not-sr-only md:ml-1">保存</span>
                    </Button>
                </ItemActions>
            </Item>
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                placeholder="在此输入商品详情介绍...&#10;&#10;支持 Markdown 格式：&#10;- **粗体** 和 *斜体*&#10;- # 标题&#10;- - 列表项&#10;- ![图片](url)&#10;- [链接](url)"
                className="min-h-[200px] font-mono text-sm"
                disabled={disabled || saving}
            />
            <p className="text-xs text-muted-foreground">
                支持 Markdown 格式。点击"上传媒体"按钮可上传图片（jpg/png/gif/webp，最大10MB）或视频（mp4/webm，最大100MB）。
            </p>
        </div>
    );
}
