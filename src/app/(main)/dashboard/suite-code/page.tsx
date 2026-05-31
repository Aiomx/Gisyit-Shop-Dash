"use client";

import { useState } from "react";
import { Key, BarChart3, List, Plus, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    CodeStats,
    CodeList,
    CodeGenerateForm,
    CodeSearch,
    CodeDetailDialog,
} from "./_components";
import type { SuiteCode, CodeListFilter } from "@/lib/supabase/suite-code-types";

/**
 * Suite Code Management Page
 *
 * Main page for managing SUITE Studio activation codes.
 * Provides tabs for:
 * - Overview statistics
 * - Code list with filtering
 * - Code generation
 * - Search functionality
 *
 * Requirements: 3.1, 6.1, 8.1, 8.3
 */
export default function SuiteCodePage() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [activeTab, setActiveTab] = useState("overview");
    const [filter, setFilter] = useState<CodeListFilter>({});
    const [selectedCode, setSelectedCode] = useState<SuiteCode | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);

    const handleRefresh = () => {
        setRefreshKey((prev) => prev + 1);
    };

    const handleGenerateSuccess = () => {
        handleRefresh();
        // Switch to overview tab to see updated stats
        setActiveTab("overview");
    };

    const handleFilterChange = (newFilter: CodeListFilter) => {
        setFilter(newFilter);
        // Switch to list tab when filter is applied
        setActiveTab("list");
    };

    const handleViewDetail = (code: SuiteCode) => {
        setSelectedCode(code);
        setDetailDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Key className="h-6 w-6" />
                        Suite Code 管理
                    </h1>
                    <p className="text-muted-foreground">
                        管理 SUITE Studio 激活码
                    </p>
                </div>
                <Button variant="outline" size="icon" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            {/* Tabs - Requirements: 8.3 */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="overview" className="gap-2">
                        <BarChart3 className="h-4 w-4" />
                        统计概览
                    </TabsTrigger>
                    <TabsTrigger value="list" className="gap-2">
                        <List className="h-4 w-4" />
                        激活码列表
                    </TabsTrigger>
                    <TabsTrigger value="generate" className="gap-2">
                        <Plus className="h-4 w-4" />
                        生成激活码
                    </TabsTrigger>
                    <TabsTrigger value="search" className="gap-2">
                        <Search className="h-4 w-4" />
                        搜索筛选
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab - Requirements: 6.1 */}
                <TabsContent value="overview" className="space-y-6">
                    <CodeStats refreshKey={refreshKey} />
                </TabsContent>

                {/* List Tab - Requirements: 3.1 */}
                <TabsContent value="list" className="space-y-6">
                    <CodeList
                        filter={filter}
                        refreshKey={refreshKey}
                        onRefresh={handleRefresh}
                        onViewDetail={handleViewDetail}
                    />
                </TabsContent>

                {/* Generate Tab */}
                <TabsContent value="generate" className="space-y-6">
                    <CodeGenerateForm onSuccess={handleGenerateSuccess} />
                </TabsContent>

                {/* Search Tab */}
                <TabsContent value="search" className="space-y-6">
                    <CodeSearch onFilterChange={handleFilterChange} />
                    {/* Show filtered results below search */}
                    {Object.keys(filter).length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-sm font-medium text-muted-foreground mb-3">
                                搜索结果
                            </h3>
                            <CodeList
                                filter={filter}
                                refreshKey={refreshKey}
                                onRefresh={handleRefresh}
                                onViewDetail={handleViewDetail}
                            />
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Detail Dialog */}
            <CodeDetailDialog
                code={selectedCode}
                open={detailDialogOpen}
                onOpenChange={setDetailDialogOpen}
            />
        </div>
    );
}
