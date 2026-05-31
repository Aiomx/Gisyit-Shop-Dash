"use client";

import { useState } from "react";
import { Search, X, CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent } from "@/components/ui/card";
import type {
    CodeType,
    MembershipTier,
    CodeStatus,
    CodeListFilter,
} from "@/lib/supabase/suite-code-types";

interface CodeSearchProps {
    onFilterChange: (filter: CodeListFilter) => void;
}

/**
 * Code Search Component
 *
 * Provides filtering and search functionality for activation codes:
 * - Filter by code type (membership/credits)
 * - Filter by membership tier
 * - Filter by status
 * - Filter by date range
 * - Search by code string or user ID
 *
 * Requirements: 3.4, 3.5
 */
export function CodeSearch({ onFilterChange }: CodeSearchProps) {
    const [codeType, setCodeType] = useState<CodeType | "all">("all");
    const [membershipTier, setMembershipTier] = useState<MembershipTier | "all">("all");
    const [status, setStatus] = useState<CodeStatus | "all">("all");
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [search, setSearch] = useState("");

    const buildFilter = (): CodeListFilter => {
        const filter: CodeListFilter = {};

        if (codeType !== "all") filter.code_type = codeType;
        if (membershipTier !== "all") filter.membership_tier = membershipTier;
        if (status !== "all") filter.status = status;
        if (startDate) filter.start_date = startDate.toISOString();
        if (endDate) filter.end_date = endDate.toISOString();
        if (search.trim()) filter.search = search.trim();

        return filter;
    };

    const handleSearch = () => {
        onFilterChange(buildFilter());
    };

    const handleReset = () => {
        setCodeType("all");
        setMembershipTier("all");
        setStatus("all");
        setStartDate(undefined);
        setEndDate(undefined);
        setSearch("");
        onFilterChange({});
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    {/* Search Input - Requirements: 3.5 */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="搜索激活码或用户 ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pl-9"
                            />
                        </div>
                        <Button onClick={handleSearch}>
                            <Search className="h-4 w-4 mr-2" />
                            搜索
                        </Button>
                        <Button variant="outline" onClick={handleReset}>
                            <X className="h-4 w-4 mr-2" />
                            重置
                        </Button>
                    </div>

                    {/* Filters - Requirements: 3.4 */}
                    <div className="grid gap-4 md:grid-cols-5">
                        {/* Code Type Filter */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">类型</Label>
                            <Select
                                value={codeType}
                                onValueChange={(v) => setCodeType(v as CodeType | "all")}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="全部类型" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">全部类型</SelectItem>
                                    <SelectItem value="membership">会员时长</SelectItem>
                                    <SelectItem value="credits">积分充值</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Membership Tier Filter */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">会员等级</Label>
                            <Select
                                value={membershipTier}
                                onValueChange={(v) => setMembershipTier(v as MembershipTier | "all")}
                                disabled={codeType === "credits"}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="全部等级" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">全部等级</SelectItem>
                                    <SelectItem value="plus">Plus</SelectItem>
                                    <SelectItem value="pro">Pro</SelectItem>
                                    <SelectItem value="ultra">Ultra</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">状态</Label>
                            <Select
                                value={status}
                                onValueChange={(v) => setStatus(v as CodeStatus | "all")}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="全部状态" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">全部状态</SelectItem>
                                    <SelectItem value="unused">未使用</SelectItem>
                                    <SelectItem value="used">已使用</SelectItem>
                                    <SelectItem value="expired">已过期</SelectItem>
                                    <SelectItem value="disabled">已禁用</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Start Date Filter */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">开始日期</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? (
                                            format(startDate, "yyyy-MM-dd", { locale: zhCN })
                                        ) : (
                                            <span className="text-muted-foreground">选择日期</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={startDate}
                                        onSelect={setStartDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* End Date Filter */}
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">结束日期</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? (
                                            format(endDate, "yyyy-MM-dd", { locale: zhCN })
                                        ) : (
                                            <span className="text-muted-foreground">选择日期</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={endDate}
                                        onSelect={setEndDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Quick Filter Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setStatus("unused");
                                onFilterChange({ ...buildFilter(), status: "unused" });
                            }}
                        >
                            <Filter className="h-3 w-3 mr-1" />
                            仅未使用
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setCodeType("membership");
                                onFilterChange({ ...buildFilter(), code_type: "membership" });
                            }}
                        >
                            <Filter className="h-3 w-3 mr-1" />
                            仅会员码
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setCodeType("credits");
                                onFilterChange({ ...buildFilter(), code_type: "credits" });
                            }}
                        >
                            <Filter className="h-3 w-3 mr-1" />
                            仅积分码
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const today = new Date();
                                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                                setStartDate(weekAgo);
                                setEndDate(today);
                                onFilterChange({
                                    ...buildFilter(),
                                    start_date: weekAgo.toISOString(),
                                    end_date: today.toISOString(),
                                });
                            }}
                        >
                            <Filter className="h-3 w-3 mr-1" />
                            最近7天
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
