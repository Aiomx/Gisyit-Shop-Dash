"use client";

import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { SuiteCode, CodeStatus } from "@/lib/supabase/suite-code-types";

interface CodeDetailDialogProps {
    code: SuiteCode | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
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
    plus: "Plus 会员",
    pro: "Pro 会员",
    ultra: "Ultra 会员",
};

/**
 * Code Detail Dialog Component
 *
 * Displays complete information about an activation code:
 * - Code string and status
 * - Type and value information
 * - Creation and expiration dates
 * - Activation details (if activated)
 *
 * Requirements: 3.2, 3.3
 */
export function CodeDetailDialog({
    code,
    open,
    onOpenChange,
}: CodeDetailDialogProps) {
    if (!code) return null;

    const copyCode = async () => {
        await navigator.clipboard.writeText(code.code);
        toast.success("已复制到剪贴板");
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    const config = statusConfig[code.status];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>激活码详情</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Code String */}
                    <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">激活码</div>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm">
                                {code.code}
                            </code>
                            <Button variant="outline" size="icon" onClick={copyCode}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">状态</span>
                        <Badge variant={config.variant}>
                            <span className={`w-2 h-2 rounded-full mr-1.5 ${config.color}`} />
                            {config.label}
                        </Badge>
                    </div>

                    <Separator />

                    {/* Basic Info - Requirements: 3.2 */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium">基本信息</h4>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <div className="text-muted-foreground">类型</div>
                                <div className="font-medium">
                                    {code.code_type === "membership" ? "会员时长" : "积分充值"}
                                </div>
                            </div>

                            <div>
                                <div className="text-muted-foreground">值</div>
                                <div className="font-medium">
                                    {code.code_type === "membership"
                                        ? `${tierLabels[code.membership_tier || ""] || ""} ${code.membership_days}天`
                                        : `${code.credits_amount?.toLocaleString()} 积分`}
                                </div>
                            </div>

                            <div>
                                <div className="text-muted-foreground">创建时间</div>
                                <div className="font-medium">{formatDate(code.created_at)}</div>
                            </div>

                            <div>
                                <div className="text-muted-foreground">过期时间</div>
                                <div className="font-medium">{formatDate(code.expires_at)}</div>
                            </div>

                            {code.batch_id && (
                                <div className="col-span-2">
                                    <div className="text-muted-foreground">批次 ID</div>
                                    <div className="font-mono text-xs">{code.batch_id}</div>
                                </div>
                            )}

                            {code.notes && (
                                <div className="col-span-2">
                                    <div className="text-muted-foreground">备注</div>
                                    <div className="font-medium">{code.notes}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Activation Details - Requirements: 3.3 */}
                    {code.status === "used" && code.activated_at && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium">激活信息</h4>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <div className="text-muted-foreground">激活时间</div>
                                        <div className="font-medium">
                                            {formatDate(code.activated_at)}
                                        </div>
                                    </div>

                                    {code.activated_by && (
                                        <div>
                                            <div className="text-muted-foreground">激活用户</div>
                                            <div className="font-mono text-xs truncate">
                                                {code.activated_by}
                                            </div>
                                        </div>
                                    )}

                                    {code.activation_ip && (
                                        <div>
                                            <div className="text-muted-foreground">激活 IP</div>
                                            <div className="font-mono text-xs">
                                                {code.activation_ip}
                                            </div>
                                        </div>
                                    )}

                                    {code.activation_device && (
                                        <div className="col-span-2">
                                            <div className="text-muted-foreground">激活设备</div>
                                            <div className="text-xs truncate">
                                                {code.activation_device}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ID */}
                    <div className="pt-2 border-t">
                        <div className="text-xs text-muted-foreground">
                            ID: <span className="font-mono">{code.id}</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
