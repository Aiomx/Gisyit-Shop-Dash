"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { CalendarIcon, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import type {
    CodeType,
    MembershipTier,
    GenerateCodesRequest,
} from "@/lib/supabase/suite-code-types";

interface CodeGenerateFormProps {
    onSuccess?: () => void;
}

interface FormData {
    code_type: CodeType;
    quantity: number;
    expires_at: Date;
    membership_tier?: MembershipTier;
    membership_days?: number;
    credits_amount?: number;
    notes?: string;
}

/**
 * Code Generate Form Component
 *
 * Form for generating new activation codes with:
 * - Code type selection (membership/credits)
 * - Membership tier selection (for membership codes)
 * - Credits amount input (for credits codes)
 * - Quantity and expiration date
 * - Optional notes
 *
 * Requirements: 1.2, 1.3, 1.4, 1.5
 */
export function CodeGenerateForm({ onSuccess }: CodeGenerateFormProps) {
    const [loading, setLoading] = useState(false);
    const [codeType, setCodeType] = useState<CodeType>("membership");
    const [expiresAt, setExpiresAt] = useState<Date | undefined>(
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Default: 1 year from now
    );

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        defaultValues: {
            code_type: "membership",
            quantity: 10,
            membership_tier: "plus",
            membership_days: 30,
            credits_amount: 100,
        },
    });

    const membershipTier = watch("membership_tier");

    const onSubmit = async (data: FormData) => {
        if (!expiresAt) {
            toast.error("请选择过期时间");
            return;
        }

        setLoading(true);
        try {
            const requestBody: GenerateCodesRequest = {
                code_type: codeType,
                quantity: data.quantity,
                expires_at: expiresAt.toISOString(),
                notes: data.notes,
            };

            // Add type-specific fields - Requirements: 1.2, 1.3
            if (codeType === "membership") {
                requestBody.membership_tier = data.membership_tier;
                requestBody.membership_days = data.membership_days;
            } else {
                requestBody.credits_amount = data.credits_amount;
            }

            const response = await fetch("/api/suite-codes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            const result = await response.json();

            if (result.success) {
                toast.success(result.message);
                reset();
                onSuccess?.();
            } else {
                toast.error(result.error || "生成失败");
            }
        } catch (error) {
            console.error("Failed to generate codes:", error);
            toast.error("生成失败，请稍后重试");
        } finally {
            setLoading(false);
        }
    };

    const handleCodeTypeChange = (value: CodeType) => {
        setCodeType(value);
        setValue("code_type", value);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    生成激活码
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Code Type Selection - Requirements: 1.2 */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>激活码类型</Label>
                            <Select value={codeType} onValueChange={handleCodeTypeChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择类型" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="membership">会员时长</SelectItem>
                                    <SelectItem value="credits">积分充值</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Quantity - Requirements: 1.5 */}
                        <div className="space-y-2">
                            <Label htmlFor="quantity">生成数量</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min={1}
                                max={1000}
                                {...register("quantity", {
                                    required: "请输入生成数量",
                                    min: { value: 1, message: "最少生成 1 个" },
                                    max: { value: 1000, message: "最多生成 1000 个" },
                                    valueAsNumber: true,
                                })}
                            />
                            {errors.quantity && (
                                <p className="text-sm text-red-500">{errors.quantity.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Membership-specific fields - Requirements: 1.2 */}
                    {codeType === "membership" && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>会员等级</Label>
                                <Select
                                    value={membershipTier}
                                    onValueChange={(value: MembershipTier) =>
                                        setValue("membership_tier", value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择等级" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="plus">Plus 会员</SelectItem>
                                        <SelectItem value="pro">Pro 会员</SelectItem>
                                        <SelectItem value="ultra">Ultra 会员</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="membership_days">会员天数</Label>
                                <Input
                                    id="membership_days"
                                    type="number"
                                    min={1}
                                    {...register("membership_days", {
                                        required: codeType === "membership" ? "请输入会员天数" : false,
                                        min: { value: 1, message: "最少 1 天" },
                                        valueAsNumber: true,
                                    })}
                                />
                                {errors.membership_days && (
                                    <p className="text-sm text-red-500">
                                        {errors.membership_days.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Credits-specific fields - Requirements: 1.3 */}
                    {codeType === "credits" && (
                        <div className="space-y-2">
                            <Label htmlFor="credits_amount">积分数量</Label>
                            <Input
                                id="credits_amount"
                                type="number"
                                min={100}
                                {...register("credits_amount", {
                                    required: codeType === "credits" ? "请输入积分数量" : false,
                                    min: { value: 100, message: "最少 100 积分" },
                                    valueAsNumber: true,
                                })}
                            />
                            {errors.credits_amount && (
                                <p className="text-sm text-red-500">
                                    {errors.credits_amount.message}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">最小值为 100</p>
                        </div>
                    )}

                    {/* Expiration Date - Requirements: 1.4 */}
                    <div className="space-y-2">
                        <Label>过期时间</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {expiresAt ? (
                                        format(expiresAt, "PPP", { locale: zhCN })
                                    ) : (
                                        <span>选择日期</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={expiresAt}
                                    onSelect={setExpiresAt}
                                    disabled={(date) => date < new Date()}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">备注（可选）</Label>
                        <Textarea
                            id="notes"
                            placeholder="输入备注信息..."
                            {...register("notes")}
                        />
                    </div>

                    {/* Submit Button */}
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                生成中...
                            </>
                        ) : (
                            <>
                                <Plus className="mr-2 h-4 w-4" />
                                生成激活码
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
