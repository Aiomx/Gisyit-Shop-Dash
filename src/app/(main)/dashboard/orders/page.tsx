"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ShoppingCart, Eye, MoreHorizontal, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";
import type { Order, OrderStatus } from "@/lib/supabase/types";

const statusLabels: Record<OrderStatus, string> = {
    pending: "待支付",
    created: "已创建",
    pending_payment: "待支付",
    paid: "已支付",
    fulfilled: "已发货",
    completed: "已完成",
    cancelled: "已取消",
};

const statusColors: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    created: "outline",
    pending_payment: "secondary",
    paid: "default",
    fulfilled: "default",
    completed: "default",
    cancelled: "destructive",
};

/**
 * Calculate remaining time for a pending order
 * Returns remaining seconds, or 0 if expired
 */
function calculateRemainingSeconds(expiresAt: string | undefined): number {
    if (!expiresAt) return 0;
    const expiresTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expiresTime - now) / 1000));
    return remaining;
}

/**
 * Format remaining time as MM:SS
 */
function formatRemainingTime(seconds: number): string {
    if (seconds <= 0) return "已过期";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Component to display countdown for pending orders
 */
function RemainingTimeDisplay({ expiresAt }: { expiresAt: string | undefined }) {
    const [remainingSeconds, setRemainingSeconds] = useState(() =>
        calculateRemainingSeconds(expiresAt)
    );

    useEffect(() => {
        if (!expiresAt) return;

        // Update immediately
        setRemainingSeconds(calculateRemainingSeconds(expiresAt));

        // Update every second
        const interval = setInterval(() => {
            const remaining = calculateRemainingSeconds(expiresAt);
            setRemainingSeconds(remaining);
            if (remaining <= 0) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);

    if (!expiresAt) {
        return <span className="text-muted-foreground">-</span>;
    }

    const isExpired = remainingSeconds <= 0;
    const isUrgent = remainingSeconds > 0 && remainingSeconds <= 300; // 5 minutes

    return (
        <div className="flex items-center gap-1.5">
            {isExpired ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
            ) : (
                <Clock className={`h-4 w-4 ${isUrgent ? "text-orange-500" : "text-muted-foreground"}`} />
            )}
            <span className={isExpired ? "text-destructive" : isUrgent ? "text-orange-500 font-medium" : ""}>
                {formatRemainingTime(remainingSeconds)}
            </span>
        </div>
    );
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from("orders")
            .select("*, items:order_items(*)")
            .order("created_at", { ascending: false });

        if (statusFilter !== "all") {
            query = query.eq("status", statusFilter);
        }

        const { data, error } = await query;

        if (!error && data) {
            setOrders(data);
        }
        setLoading(false);
    }, [statusFilter]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        await supabase
            .from("orders")
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq("id", orderId);
        fetchOrders();
    };

    const handleViewDetail = (order: Order) => {
        setSelectedOrder(order);
        setDetailOpen(true);
    };

    const filteredOrders = orders.filter(o =>
        o.order_number.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">订单管理</h1>
                <p className="text-muted-foreground">查看和管理所有订单</p>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="搜索订单号..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="订单状态" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        {Object.entries(statusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Badge variant="secondary">{filteredOrders.length} 个订单</Badge>
            </div>

            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>订单号</TableHead>
                            <TableHead>买家</TableHead>
                            <TableHead>商品数量</TableHead>
                            <TableHead>订单金额</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>剩余时间/支付时间</TableHead>
                            <TableHead>创建时间</TableHead>
                            <TableHead className="w-[100px]">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8">
                                    加载中...
                                </TableCell>
                            </TableRow>
                        ) : filteredOrders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8">
                                    <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                    <p className="mt-2 text-muted-foreground">暂无订单</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOrders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono">{order.order_number}</TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {order.user?.email || order.user?.nickname || (
                                                order.anonymous_session_id ? (
                                                    <span className="text-muted-foreground">
                                                        游客 ({order.anonymous_session_id.slice(0, 8)}...)
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{order.items?.length || 0} 件</TableCell>
                                    <TableCell className="font-medium">
                                        ¥{order.total_amount.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={statusColors[order.status]}>
                                            {statusLabels[order.status]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {order.status === "pending" ? (
                                            <RemainingTimeDisplay expiresAt={order.expires_at} />
                                        ) : order.status === "paid" && order.payment_completed_at ? (
                                            <div className="flex items-center gap-1.5 text-sm">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                <span>{format(new Date(order.payment_completed_at), "HH:mm:ss")}</span>
                                            </div>
                                        ) : order.status === "cancelled" ? (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {format(new Date(order.created_at), "yyyy-MM-dd HH:mm")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleViewDetail(order)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {order.status === "paid" && (
                                                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, "fulfilled")}>
                                                            标记为已发货
                                                        </DropdownMenuItem>
                                                    )}
                                                    {order.status === "fulfilled" && (
                                                        <DropdownMenuItem onClick={() => handleStatusChange(order.id, "completed")}>
                                                            标记为已完成
                                                        </DropdownMenuItem>
                                                    )}
                                                    {(order.status === "pending" || order.status === "pending_payment" || order.status === "created") && (
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => handleStatusChange(order.id, "cancelled")}
                                                        >
                                                            取消订单
                                                        </DropdownMenuItem>
                                                    )}
                                                    {order.status !== "cancelled" && order.status !== "completed" && order.status !== "pending" && order.status !== "pending_payment" && order.status !== "created" && (
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => handleStatusChange(order.id, "cancelled")}
                                                        >
                                                            取消订单
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>订单详情</DialogTitle>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-6">
                            {/* Order Basic Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">订单号</p>
                                    <p className="font-mono">{selectedOrder.order_number}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">状态</p>
                                    <Badge variant={statusColors[selectedOrder.status]}>
                                        {statusLabels[selectedOrder.status]}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">订单金额</p>
                                    <p className="font-medium">¥{selectedOrder.total_amount.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">创建时间</p>
                                    <p>{format(new Date(selectedOrder.created_at), "yyyy-MM-dd HH:mm:ss")}</p>
                                </div>
                                {selectedOrder.status === "pending" && selectedOrder.expires_at && (
                                    <div>
                                        <p className="text-muted-foreground">剩余支付时间</p>
                                        <RemainingTimeDisplay expiresAt={selectedOrder.expires_at} />
                                    </div>
                                )}
                                {selectedOrder.payment_completed_at && (
                                    <div>
                                        <p className="text-muted-foreground">支付完成时间</p>
                                        <p>{format(new Date(selectedOrder.payment_completed_at), "yyyy-MM-dd HH:mm:ss")}</p>
                                    </div>
                                )}
                            </div>

                            {/* Buyer Info Section */}
                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-3">买家信息</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    {selectedOrder.user_id ? (
                                        <>
                                            <div>
                                                <p className="text-muted-foreground">用户ID</p>
                                                <p className="font-mono text-xs">{selectedOrder.user_id}</p>
                                            </div>
                                            {selectedOrder.user?.email && (
                                                <div>
                                                    <p className="text-muted-foreground">邮箱</p>
                                                    <p>{selectedOrder.user.email}</p>
                                                </div>
                                            )}
                                            {selectedOrder.user?.nickname && (
                                                <div>
                                                    <p className="text-muted-foreground">昵称</p>
                                                    <p>{selectedOrder.user.nickname}</p>
                                                </div>
                                            )}
                                            {selectedOrder.user?.phone && (
                                                <div>
                                                    <p className="text-muted-foreground">手机</p>
                                                    <p>{selectedOrder.user.phone}</p>
                                                </div>
                                            )}
                                        </>
                                    ) : selectedOrder.anonymous_session_id ? (
                                        <div className="col-span-2">
                                            <p className="text-muted-foreground">游客会话ID</p>
                                            <p className="font-mono text-xs">{selectedOrder.anonymous_session_id}</p>
                                        </div>
                                    ) : (
                                        <div className="col-span-2 text-muted-foreground">
                                            无买家信息
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Product Info Section */}
                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-3">订单商品</h4>
                                <div className="space-y-3">
                                    {selectedOrder.items?.map((item) => (
                                        <div key={item.id} className="flex justify-between items-start p-3 bg-muted rounded-lg">
                                            <div className="space-y-1">
                                                <p className="font-medium">{item.product_name}</p>
                                                <p className="text-sm text-muted-foreground font-mono">{item.product_code}</p>
                                                {item.spec_combination && Object.keys(item.spec_combination).length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {Object.entries(item.spec_combination).map(([key, value]) => (
                                                            <Badge key={key} variant="outline" className="text-xs">
                                                                {key}: {value}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium">¥{item.price.toFixed(2)}</p>
                                                <p className="text-sm text-muted-foreground">× {item.quantity}</p>
                                                <p className="text-sm font-medium mt-1">
                                                    小计: ¥{(item.price * item.quantity).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Info Section */}
                            {(selectedOrder.stripe_session_id || selectedOrder.stripe_payment_intent_id) && (
                                <div className="border-t pt-4">
                                    <h4 className="font-medium mb-3">支付信息</h4>
                                    <div className="grid grid-cols-1 gap-2 text-sm">
                                        {selectedOrder.stripe_session_id && (
                                            <div>
                                                <p className="text-muted-foreground">Stripe Session ID</p>
                                                <p className="font-mono text-xs break-all">{selectedOrder.stripe_session_id}</p>
                                            </div>
                                        )}
                                        {selectedOrder.stripe_payment_intent_id && (
                                            <div>
                                                <p className="text-muted-foreground">Stripe Payment Intent ID</p>
                                                <p className="font-mono text-xs break-all">{selectedOrder.stripe_payment_intent_id}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
