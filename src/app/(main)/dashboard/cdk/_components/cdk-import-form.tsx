"use client";

import { useState, useRef } from "react";
import { Upload, FileText, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { importFromText, importFromCSV, importFromXLSX } from "@/lib/cdk/import-service";
import type { CDKImportResult } from "@/lib/cdk/types";

interface ProductOption {
    id: string;
    name: string;
    delivery_type: string;
}

interface CDKImportFormProps {
    products: ProductOption[];
    selectedProductId: string;
    onSuccess?: () => void;
}

export function CDKImportForm({ products, selectedProductId, onSuccess }: CDKImportFormProps) {
    const [productId, setProductId] = useState(
        selectedProductId !== "all" ? selectedProductId : ""
    );
    const [textInput, setTextInput] = useState("");
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<CDKImportResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Use a valid admin UUID - in production this would come from auth context
    // Using the first admin user ID from the database
    const adminId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    const handleTextImport = async () => {
        if (!productId) {
            toast.error("请选择商品");
            return;
        }
        if (!textInput.trim()) {
            toast.error("请输入CDK码");
            return;
        }

        setImporting(true);
        setResult(null);

        try {
            const importResult = await importFromText(textInput, {
                productId,
                adminId,
            });
            setResult(importResult);
            if (importResult.success && importResult.successCount > 0) {
                toast.success(`成功导入 ${importResult.successCount} 个CDK码`);
                setTextInput("");
                onSuccess?.();
            } else if (importResult.successCount === 0 && importResult.duplicateCount > 0) {
                toast.warning("所有CDK码都已存在");
            } else if (!importResult.success) {
                toast.error("导入失败");
            }
        } catch (error) {
            console.error("Import error:", error);
            toast.error("导入失败");
        } finally {
            setImporting(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!productId) {
            toast.error("请先选择商品");
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            return;
        }

        setImporting(true);
        setResult(null);

        try {
            let importResult: CDKImportResult;

            if (file.name.endsWith(".csv")) {
                const text = await file.text();
                importResult = await importFromCSV(text, { productId, adminId });
            } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
                const buffer = await file.arrayBuffer();
                importResult = await importFromXLSX(buffer, { productId, adminId });
            } else {
                toast.error("不支持的文件格式，请上传 CSV 或 XLSX 文件");
                return;
            }

            setResult(importResult);
            if (importResult.success && importResult.successCount > 0) {
                toast.success(`成功导入 ${importResult.successCount} 个CDK码`);
                onSuccess?.();
            } else if (importResult.successCount === 0 && importResult.duplicateCount > 0) {
                toast.warning("所有CDK码都已存在");
            } else if (!importResult.success) {
                toast.error("导入失败");
            }
        } catch (error) {
            console.error("File import error:", error);
            toast.error("文件导入失败");
        } finally {
            setImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>导入CDK码</CardTitle>
                    <CardDescription>
                        支持文本粘贴、CSV文件和Excel文件导入。每行一个CDK码。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>选择商品</Label>
                        <Select value={productId} onValueChange={setProductId}>
                            <SelectTrigger className="w-full max-w-md">
                                <SelectValue placeholder="请选择要导入CDK的商品" />
                            </SelectTrigger>
                            <SelectContent>
                                {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                        {product.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Tabs defaultValue="text">
                        <TabsList>
                            <TabsTrigger value="text" className="gap-2">
                                <FileText className="h-4 w-4" />
                                文本导入
                            </TabsTrigger>
                            <TabsTrigger value="file" className="gap-2">
                                <FileSpreadsheet className="h-4 w-4" />
                                文件导入
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="text" className="space-y-4">
                            <div className="space-y-2">
                                <Label>CDK码列表</Label>
                                <Textarea
                                    placeholder="每行输入一个CDK码，例如：&#10;XXXX-XXXX-XXXX-XXXX&#10;YYYY-YYYY-YYYY-YYYY"
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    rows={10}
                                    className="font-mono"
                                />
                                <p className="text-sm text-muted-foreground">
                                    已输入 {textInput.split("\n").filter((l) => l.trim()).length} 行
                                </p>
                            </div>
                            <Button onClick={handleTextImport} disabled={importing || !productId}>
                                {importing ? "导入中..." : "开始导入"}
                            </Button>
                        </TabsContent>

                        <TabsContent value="file" className="space-y-4">
                            <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="mt-2 text-sm text-muted-foreground">
                                    支持 CSV 和 XLSX 格式
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    文件第一列将被识别为CDK码
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={importing || !productId}
                                >
                                    {importing ? "导入中..." : "选择文件"}
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {result && <ImportResultSummary result={result} />}
        </div>
    );
}

function ImportResultSummary({ result }: { result: CDKImportResult }) {
    const isSuccess = result.success && result.successCount > 0;
    const hasWarnings = result.duplicateCount > 0 || result.invalidCount > 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {isSuccess ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                    导入结果
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-500">
                            成功: {result.successCount}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                            重复: {result.duplicateCount}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="destructive">
                            无效: {result.invalidCount}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">
                            总计: {result.totalCount}
                        </Badge>
                    </div>
                </div>

                {result.errors.length > 0 && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>导入错误</AlertTitle>
                        <AlertDescription>
                            <ul className="mt-2 space-y-1 text-sm max-h-40 overflow-y-auto">
                                {result.errors.slice(0, 10).map((error, index) => (
                                    <li key={index}>
                                        第 {error.line} 行: {error.code} - {error.reason}
                                    </li>
                                ))}
                                {result.errors.length > 10 && (
                                    <li className="text-muted-foreground">
                                        ... 还有 {result.errors.length - 10} 个错误
                                    </li>
                                )}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
