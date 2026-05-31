import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";

// GET - Fetch all users (registered + anonymous sessions)
export async function GET() {
    try {
        let registeredUsers: Array<{
            id: string;
            type: "registered";
            email: string | null;
            nickname: string | null;
            custom_id: null;
            phone: string | null;
            avatar_url: string | null;
            status: string;
            status_reason: string | null;
            status_updated_at: string | null;
            created_at: string;
            order_count: number;
            total_spent: number;
        }> = [];

        // Try to fetch auth users using admin API (requires service role key)
        try {
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

            if (!authError && authData?.users) {
                const authUsers = authData.users;
                const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
                const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

                registeredUsers = await Promise.all(
                    authUsers.map(async (authUser) => {
                        const profile = profilesMap.get(authUser.id);
                        const { data: orders } = await supabaseAdmin
                            .from("orders")
                            .select("total_amount, status")
                            .eq("user_id", authUser.id);

                        const completedOrders = orders?.filter(o =>
                            ["paid", "fulfilled", "completed"].includes(o.status)
                        ) || [];

                        return {
                            id: authUser.id,
                            type: "registered" as const,
                            email: authUser.email || null,
                            nickname: profile?.full_name || null,
                            custom_id: null,
                            phone: authUser.phone || null,
                            avatar_url: profile?.avatar_url || null,
                            status: profile?.status || "active",
                            status_reason: profile?.status_reason || null,
                            status_updated_at: profile?.status_updated_at || null,
                            created_at: authUser.created_at,
                            order_count: completedOrders.length,
                            total_spent: completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
                        };
                    })
                );
            }
        } catch (authErr) {
            console.warn("Could not fetch auth users:", authErr);
            // Fallback: Get users from orders table
            const { data: orderUsers } = await supabaseAdmin
                .from("orders")
                .select("user_id, total_amount, status, created_at")
                .not("user_id", "is", null);

            if (orderUsers) {
                const userOrdersMap = new Map<string, { orders: typeof orderUsers; first_order: string }>();
                orderUsers.forEach(order => {
                    if (!order.user_id) return;
                    const existing = userOrdersMap.get(order.user_id);
                    if (existing) {
                        existing.orders.push(order);
                        if (new Date(order.created_at) < new Date(existing.first_order)) {
                            existing.first_order = order.created_at;
                        }
                    } else {
                        userOrdersMap.set(order.user_id, { orders: [order], first_order: order.created_at });
                    }
                });

                const userIds = Array.from(userOrdersMap.keys());
                const { data: profiles } = await supabaseAdmin.from("profiles").select("*").in("id", userIds);
                const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

                registeredUsers = Array.from(userOrdersMap.entries()).map(([userId, data]) => {
                    const profile = profilesMap.get(userId);
                    const completedOrders = data.orders.filter(o => ["paid", "fulfilled", "completed"].includes(o.status));
                    return {
                        id: userId,
                        type: "registered" as const,
                        email: null,
                        nickname: profile?.full_name || null,
                        custom_id: null,
                        phone: null,
                        avatar_url: profile?.avatar_url || null,
                        status: profile?.status || "active",
                        status_reason: profile?.status_reason || null,
                        status_updated_at: profile?.status_updated_at || null,
                        created_at: data.first_order,
                        order_count: completedOrders.length,
                        total_spent: completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
                    };
                });
            }
        }

        // Fetch anonymous sessions with orders
        const { data: anonymousOrders } = await supabaseAdmin
            .from("orders")
            .select("anonymous_session_id, total_amount, status, created_at")
            .not("anonymous_session_id", "is", null)
            .is("user_id", null);

        const anonymousSessionsMap = new Map<string, {
            session_id: string;
            orders: { total_amount: number; status: string; created_at: string }[];
            first_order_at: string;
        }>();

        (anonymousOrders || []).forEach(order => {
            if (!order.anonymous_session_id) return;
            const existing = anonymousSessionsMap.get(order.anonymous_session_id);
            if (existing) {
                existing.orders.push({ total_amount: order.total_amount, status: order.status, created_at: order.created_at });
                if (new Date(order.created_at) < new Date(existing.first_order_at)) existing.first_order_at = order.created_at;
            } else {
                anonymousSessionsMap.set(order.anonymous_session_id, {
                    session_id: order.anonymous_session_id,
                    orders: [{ total_amount: order.total_amount, status: order.status, created_at: order.created_at }],
                    first_order_at: order.created_at,
                });
            }
        });

        const anonymousUsers = Array.from(anonymousSessionsMap.values()).map(session => {
            const completedOrders = session.orders.filter(o => ["paid", "fulfilled", "completed"].includes(o.status));
            return {
                id: session.session_id,
                type: "anonymous" as const,
                email: null,
                nickname: null,
                custom_id: null,
                phone: null,
                avatar_url: null,
                status: "active" as const,
                status_reason: null,
                status_updated_at: null,
                created_at: session.first_order_at,
                order_count: completedOrders.length,
                total_spent: completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
            };
        });

        const allUsers = [...registeredUsers, ...anonymousUsers].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return NextResponse.json({ data: allUsers });
    } catch (err) {
        console.error("GET users error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

// PUT - Update user status
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { user_id, status, status_reason, send_email } = body;

        if (!user_id) return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        if (!["active", "banned", "violation"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

        const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({ status, status_reason: status_reason || null, status_updated_at: new Date().toISOString() })
            .eq("id", user_id);

        if (updateError) {
            console.error("Error updating user status:", updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        if (send_email && status !== "active") {
            try {
                const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user_id);
                if (userData?.user?.email) {
                    console.log(`Would send email to ${userData.user.email}: 账户已被${status === "banned" ? "封禁" : "违规"}, 原因: ${status_reason || "未说明"}`);
                }
            } catch (emailErr) {
                console.warn("Email sending error:", emailErr);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("PUT user error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
