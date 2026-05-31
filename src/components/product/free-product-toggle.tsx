"use client";

import { AlertTriangle, Download, Gift } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { DeliveryType } from "@/lib/supabase/types";

export interface FreeProductToggleProps {
    isFree: boolean;
    requireLogin: boolean;
    deliveryType: DeliveryType;
    onIsFreeChange: (value: boolean) => void;
    onRequireLoginChange: (value: boolean) => void;
    onDeliveryTypeChange?: (value: DeliveryType) => void;
}

/**
 * Toggle component for free product settings
 * - Shows warning if delivery_type is not 'download'
 * - Auto-suggests changing delivery_type
 * 
 * Requirements: 9.1, 9.3, 9.4
 */
export function FreeProductToggle({
    isFree,
    requireLogin,
    deliveryType,
    onIsFreeChange,
    onRequireLoginChange,
    onDeliveryTypeChange,
}: FreeProductToggleProps) {
    const isDeliveryTypeValid = deliveryType === "download";

    const handleIsFreeChange = (checked: boolean) => {
        if (checked && !isDeliveryTypeValid && onDeliveryTypeChange) {
            // Auto-set delivery_type to "download" when enabling is_free
            onDeliveryTypeChange("download");
        }
        onIsFreeChange(checked);
    };

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Gift className="h-4 w-4" />
                <span className="text-sm font-medium">免费商品设置</span>
            </div>

            {/* is_free toggle - Requirements: 9.1 */}
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label htmlFor="is_free" className="text-sm font-medium">
                        设为免费商品
                    </Label>
                    <p className="text-xs text-muted-foreground">
                        免费商品可直接下载，无需支付
                    </p>
                </div>
                <Switch
                    id="is_free"
                    checked={isFree}
                    onCheckedChange={handleIsFreeChange}
                />
            </div>

            {/* Warning when delivery_type is not "download" - Requirements: 9.3 */}
            {isFree && !isDeliveryTypeValid && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>交付方式不兼容</AlertTitle>
                    <AlertDescription>
                        免费商品必须使用"下载"交付方式。当前交付方式为"{getDeliveryTypeLabel(deliveryType)}"。
                        {onDeliveryTypeChange && (
                            <button
                                type="button"
                                className="ml-2 underline hover:no-underline"
                                onClick={() => onDeliveryTypeChange("download")}
                            >
                                点击切换为下载
                            </button>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            {/* require_login toggle - Requirements: 9.4 */}
            {isFree && (
                <div className="flex items-center justify-between pt-2 border-t">
                    <div className="space-y-0.5">
                        <Label htmlFor="require_login" className="text-sm font-medium flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            需要登录下载
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            开启后用户需登录才能下载，便于追踪下载记录
                        </p>
                    </div>
                    <Switch
                        id="require_login"
                        checked={requireLogin}
                        onCheckedChange={onRequireLoginChange}
                    />
                </div>
            )}

            {/* Info about free product behavior */}
            {isFree && isDeliveryTypeValid && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md space-y-1">
                    <p>• 免费商品在商品卡片上显示"下载"按钮</p>
                    <p>• 商品详情页隐藏价格和购物车入口</p>
                    <p>• 下载记录将被单独统计，不计入订单</p>
                </div>
            )}
        </div>
    );
}

/**
 * Get human-readable label for delivery type
 */
function getDeliveryTypeLabel(deliveryType: DeliveryType): string {
    const labels: Record<DeliveryType, string> = {
        download: "下载",
        license_key: "授权码",
        cdk: "CDK",
        shipment: "物流发货",
        manual: "人工处理",
    };
    return labels[deliveryType] || deliveryType;
}

/**
 * Validate free product configuration
 * Returns true if the configuration is valid
 * 
 * Requirements: 9.2, 9.5
 */
export function validateFreeProductConfig(
    isFree: boolean,
    deliveryType: DeliveryType
): { valid: boolean; error?: string } {
    if (isFree && deliveryType !== "download") {
        return {
            valid: false,
            error: '免费商品必须使用"下载"交付方式',
        };
    }
    return { valid: true };
}
