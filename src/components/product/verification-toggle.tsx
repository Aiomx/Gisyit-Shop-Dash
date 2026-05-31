"use client";

import { useState } from "react";
import { BadgeCheck, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
    Item,
    ItemContent,
    ItemTitle,
    ItemDescription,
    ItemMedia,
    ItemActions,
} from "@/components/ui/item";

export interface VerificationToggleProps {
    productId: string;
    isVerified: boolean;
    onToggle: (verified: boolean) => Promise<void>;
    disabled?: boolean;
}

/**
 * Toggle component for product verification status
 * 
 * Displays a switch to toggle the verification status of a product.
 * Shows loading state during API calls and handles errors gracefully.
 * 
 * Requirements: 2.1, 2.5
 */
export function VerificationToggle({
    productId,
    isVerified,
    onToggle,
    disabled = false,
}: VerificationToggleProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleToggle = async (checked: boolean) => {
        setLoading(true);
        setError(null);
        try {
            await onToggle(checked);
        } catch (err) {
            setError(err instanceof Error ? err.message : "更新验证状态失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Item variant="outline" size="sm" className="bg-green-50/50 dark:bg-green-950/20">
            <ItemMedia variant="icon" className="bg-green-100 dark:bg-green-900/50 border-green-200 dark:border-green-800">
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-green-600 dark:text-green-400" />
                ) : (
                    <BadgeCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                )}
            </ItemMedia>
            <ItemContent>
                <ItemTitle>商品验证</ItemTitle>
                <ItemDescription>
                    {error ? (
                        <span className="text-destructive">{error}</span>
                    ) : (
                        "标记为已验证（安全、无病毒、开源）"
                    )}
                </ItemDescription>
            </ItemContent>
            <ItemActions>
                <Switch
                    id={`verification-toggle-${productId}`}
                    checked={isVerified}
                    onCheckedChange={handleToggle}
                    disabled={disabled || loading}
                    aria-label="切换验证状态"
                />
            </ItemActions>
        </Item>
    );
}
