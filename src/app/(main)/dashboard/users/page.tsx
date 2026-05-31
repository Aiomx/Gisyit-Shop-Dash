"use client";

import { useEffect, useState } from "react";
import { Search, Users, Eye, Mail, UserCheck, UserX, AlertTriangle, Ghost } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type UserStatus = "active" | "banned" | "violation";
type UserType = "registered" | "anonymous";

interface User {
    id: string;
    type: UserType;
    email: string | null;
    nickname: string | null;
    custom_id: string | null;
    phone: string | null;
    avatar_url: string | null;
    status: UserStatus;
    status_reason: string | null;
    created_at: string;
    order_count: number;
    total_spent: number;
}

const statusConfig: Record<UserStatus, { label: string; color: string }> = {
    active: { label: "活跃", color: "bg-green-500" },
    banned: { label: "封禁", color: "bg-red-500" },
    violation: { label: "违规", color: "bg-yellow-500" },
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [newStatus, setNewStatus] = useState<UserStatus>("active");
    const [statusReason, setStatusReason] = useState("");
    const [sendEmail, setSendEmail] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [activeTab, setActiveTab] = useState<"all" | "registered" | "anonymous">("all");

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/users");
            const result = await response.json();
            if (result.data) setUsers(result.data);
        } catch (error) {
            toast.error("获取用户列表失败");
        }
        setLoading(false);
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleManageStatus = (user: User) => {
        setSelectedUser(user);
        setNewStatus(user.status);
        setStatusReason(user.status_reason || "");
        setStatusDialogOpen(true);
    };

    const handleUpdateStatus = async () => {
        if (!selectedUser) return;
        setUpdating(true);
        try {
            const response = await fetch("/api/users", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: selectedUser.id,
                    status: newStatus,
                    status_reason: statusReason,
                    send_email: sendEmail && newStatus !== "active",
                }),
            });
            const result = await response.json();
            if (result.error) toast.error(result.error);
            else { toast.success("用户状态已更新"); setStatusDialogOpen(false); fetchUsers(); }
        } catch { toast.error("更新状态失败"); }
        setUpdating(false);
    };

    const filteredUsers = users.filter(u => {
        if (activeTab === "registered" && u.type !== "registered") return false;
        if (activeTab === "anonymous" && u.type !== "anonymous") return false;
        const s = search.toLowerCase();
        return u.email?.toLowerCase().includes(s) || u.nickname?.toLowerCase().includes(s) || u.id.includes(s);
    });

    const getInitials = (user: User) => user.nickname?.slice(0, 2).toUpperCase() || user.email?.slice(0, 2).toUpperCase() || "U";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">用户管理</h1>
                <p className="text-muted-foreground">查看和管理所有注册用户和游客</p>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <div className="flex items-center justify-between gap-4">
                    <TabsList>
                        <TabsTrigger value="all">全部 ({users.length})</TabsTrigger>
                        <TabsTrigger value="registered">注册用户 ({users.filter(u => u.type === "registered").length})</TabsTrigger>
                        <TabsTrigger value="anonymous">游客 ({users.filter(u => u.type === "anonymous").length})</TabsTrigger>
                    </TabsList>
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="搜索..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                    </div>
                </div>

                <TabsContent value={activeTab} className="mt-4">
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>用户</TableHead>
                                    <TableHead>类型</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead>订单数</TableHead>
                                    <TableHead>消费总额</TableHead>
                                    <TableHead>时间</TableHead>
                                    <TableHead className="w-[80px]">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={7} className="text-center py-8">加载中...</TableCell></TableRow>
                                ) : filteredUsers.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="text-center py-8"><Users className="mx-auto h-12 w-12 text-muted-foreground/50" /><p className="mt-2 text-muted-foreground">暂无用户</p></TableCell></TableRow>
                                ) : filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={user.avatar_url || undefined} />
                                                    <AvatarFallback>{user.type === "anonymous" ? <Ghost className="h-4 w-4" /> : getInitials(user)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{user.type === "anonymous" ? `游客 ${user.id.slice(0, 8)}...` : (user.nickname || "未设置昵称")}</p>
                                                    {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell><Badge variant={user.type === "registered" ? "default" : "secondary"}>{user.type === "registered" ? "注册用户" : "游客"}</Badge></TableCell>
                                        <TableCell>
                                            {user.type === "registered" ? (
                                                <Badge variant="outline" className={`${statusConfig[user.status].color} text-white border-0`}>{statusConfig[user.status].label}</Badge>
                                            ) : <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                        <TableCell>{user.order_count}</TableCell>
                                        <TableCell className="font-medium">¥{user.total_spent.toFixed(2)}</TableCell>
                                        <TableCell className="text-muted-foreground">{format(new Date(user.created_at), "yyyy-MM-dd")}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => { setSelectedUser(user); setDetailOpen(true); }}><Eye className="h-4 w-4" /></Button>
                                                {user.type === "registered" && <Button variant="ghost" size="icon" onClick={() => handleManageStatus(user)}><UserCheck className="h-4 w-4" /></Button>}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Detail Dialog */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>用户详情</DialogTitle></DialogHeader>
                    {selectedUser && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={selectedUser.avatar_url || undefined} />
                                    <AvatarFallback className="text-lg">{selectedUser.type === "anonymous" ? <Ghost className="h-6 w-6" /> : getInitials(selectedUser)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-lg font-medium">{selectedUser.type === "anonymous" ? "游客会话" : (selectedUser.nickname || "未设置昵称")}</p>
                                    <Badge variant={selectedUser.type === "registered" ? "default" : "secondary"} className="mt-1">{selectedUser.type === "registered" ? "注册用户" : "游客"}</Badge>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><p className="text-muted-foreground">邮箱</p><p>{selectedUser.email || "-"}</p></div>
                                <div><p className="text-muted-foreground">手机</p><p>{selectedUser.phone || "-"}</p></div>
                                <div><p className="text-muted-foreground">订单数量</p><p>{selectedUser.order_count} 单</p></div>
                                <div><p className="text-muted-foreground">消费总额</p><p className="font-medium">¥{selectedUser.total_spent.toFixed(2)}</p></div>
                                <div><p className="text-muted-foreground">注册时间</p><p>{format(new Date(selectedUser.created_at), "yyyy-MM-dd HH:mm")}</p></div>
                                {selectedUser.type === "registered" && <div><p className="text-muted-foreground">账户状态</p><Badge variant="outline" className={`${statusConfig[selectedUser.status].color} text-white border-0`}>{statusConfig[selectedUser.status].label}</Badge></div>}
                                <div className="col-span-2"><p className="text-muted-foreground">用户ID</p><p className="font-mono text-xs break-all">{selectedUser.id}</p></div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Status Dialog */}
            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>管理用户状态</DialogTitle></DialogHeader>
                    {selectedUser && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                <Avatar><AvatarImage src={selectedUser.avatar_url || undefined} /><AvatarFallback>{getInitials(selectedUser)}</AvatarFallback></Avatar>
                                <div><p className="font-medium">{selectedUser.nickname || selectedUser.email}</p><p className="text-sm text-muted-foreground">{selectedUser.email}</p></div>
                            </div>
                            <div className="space-y-2">
                                <Label>账户状态</Label>
                                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as UserStatus)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active"><div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-green-500" />活跃</div></SelectItem>
                                        <SelectItem value="banned"><div className="flex items-center gap-2"><UserX className="h-4 w-4 text-red-500" />封禁</div></SelectItem>
                                        <SelectItem value="violation"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" />违规</div></SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>原因说明</Label>
                                <Textarea placeholder="请输入状态变更原因..." value={statusReason} onChange={(e) => setStatusReason(e.target.value)} rows={3} />
                            </div>
                            {newStatus !== "active" && (
                                <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                                    <Switch id="send_email" checked={sendEmail} onCheckedChange={setSendEmail} />
                                    <Label htmlFor="send_email" className="flex items-center gap-2"><Mail className="h-4 w-4" />发送邮件通知用户</Label>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>取消</Button>
                        <Button onClick={handleUpdateStatus} disabled={updating}>{updating ? "更新中..." : "确认更新"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
