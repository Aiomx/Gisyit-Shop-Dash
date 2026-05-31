import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Pixel 平台使用相同的 Supabase 实例
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://api.haokir.com";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 账户状态类型
type AccountStatus = "active" | "low_active" | "suspended" | "banned" | "violation";

interface PixelUser {
    id: string;
    username: string;
    email: string | null;
    custom_user_id: string;
    avatar_color: string;
    language_level: string;
    learning_language: string;
    interface_language: string;
    created_at: string;
    updated_at: string;
    friend_count: number;
    status: AccountStatus;
    status_reason: string | null;
}

// 根据用户活跃度计算状态（如果没有手动设置状态）
function calculateUserStatus(user: { updated_at: string; status?: AccountStatus }): AccountStatus {
    if (user.status === "banned" || user.status === "violation") {
        return user.status;
    }
    
    const lastActive = new Date(user.updated_at);
    const now = new Date();
    const daysSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceActive > 90) return "suspended";
    if (daysSinceActive > 30) return "low_active";
    return "active";
}

export async function GET() {
    try {
        // 获取用户列表
        const { data: users, error: usersError } = await supabase
            .from("users")
            .select("*")
            .order("created_at", { ascending: false });

        if (usersError) {
            return NextResponse.json({ error: usersError.message }, { status: 500 });
        }

        // 获取每个用户的好友数量
        const usersWithFriends: PixelUser[] = await Promise.all(
            (users || []).map(async (user) => {
                const { count } = await supabase
                    .from("friends")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", user.id)
                    .eq("status", "accepted");

                // 计算或获取用户状态
                const status = calculateUserStatus(user);

                return {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    custom_user_id: user.custom_user_id,
                    avatar_color: user.avatar_color || "#3b5dc9",
                    language_level: user.language_level || "A1",
                    learning_language: user.learning_language || "American English",
                    interface_language: user.interface_language || "English",
                    created_at: user.created_at,
                    updated_at: user.updated_at,
                    friend_count: count || 0,
                    status: user.status || status,
                    status_reason: user.status_reason || null,
                };
            })
        );

        return NextResponse.json({ data: usersWithFriends });
    } catch (error) {
        console.error("Error fetching pixel users:", error);
        return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { user_id, status, status_reason } = body;

        if (!user_id || !status) {
            return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
        }

        // 只允许管理员设置 active 或 banned 状态
        if (!["active", "banned"].includes(status)) {
            return NextResponse.json({ error: "无效的状态值" }, { status: 400 });
        }

        const { error } = await supabase
            .from("users")
            .update({
                status,
                status_reason: status_reason || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", user_id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "用户状态已更新" });
    } catch (error) {
        console.error("Error updating user status:", error);
        return NextResponse.json({ error: "更新用户状态失败" }, { status: 500 });
    }
}
