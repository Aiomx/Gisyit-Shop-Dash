/**
 * Suite Code Individual API Routes
 *
 * Handles individual activation code operations (status update, delete).
 *
 * Requirements: 4.1, 4.2, 4.3
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { validateStatusChange } from "@/lib/suite-code/validator";
import type { CodeStatus, UpdateCodeStatusRequest } from "@/lib/supabase/suite-code-types";

// ============================================
// GET - Fetch single activation code by ID
// ============================================

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { success: false, error: "激活码 ID 是必需的" },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from("suite_codes")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return NextResponse.json(
                    { success: false, error: "激活码不存在" },
                    { status: 404 }
                );
            }
            console.error("Error fetching suite code:", error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (err) {
        console.error("GET suite-code error:", err);
        return NextResponse.json(
            { success: false, error: String(err) },
            { status: 500 }
        );
    }
}

// ============================================
// PATCH - Update activation code status
// Requirements: 4.1, 4.2, 4.3
// ============================================

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body: UpdateCodeStatusRequest = await request.json();
        const { status: targetStatus } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: "激活码 ID 是必需的" },
                { status: 400 }
            );
        }

        if (!targetStatus || !["unused", "disabled"].includes(targetStatus)) {
            return NextResponse.json(
                { success: false, error: "无效的状态值，必须是 unused 或 disabled" },
                { status: 400 }
            );
        }

        // Fetch current code status
        const { data: currentCode, error: fetchError } = await supabaseAdmin
            .from("suite_codes")
            .select("id, status, code")
            .eq("id", id)
            .single();

        if (fetchError) {
            if (fetchError.code === "PGRST116") {
                return NextResponse.json(
                    { success: false, error: "激活码不存在" },
                    { status: 404 }
                );
            }
            console.error("Error fetching suite code:", fetchError);
            return NextResponse.json(
                { success: false, error: fetchError.message },
                { status: 500 }
            );
        }

        // Validate status change - Requirements: 4.2, 4.3
        const validation = validateStatusChange(
            currentCode.status as CodeStatus,
            targetStatus
        );

        if (!validation.valid) {
            return NextResponse.json(
                {
                    success: false,
                    error: validation.errorMessage,
                    errorCode: validation.errorCode,
                },
                { status: 400 }
            );
        }

        // Update status - Requirements: 4.1
        const { data: updatedCode, error: updateError } = await supabaseAdmin
            .from("suite_codes")
            .update({ status: targetStatus })
            .eq("id", id)
            .select()
            .single();

        if (updateError) {
            console.error("Error updating suite code status:", updateError);
            return NextResponse.json(
                { success: false, error: updateError.message },
                { status: 500 }
            );
        }

        const actionText = targetStatus === "disabled" ? "禁用" : "启用";
        return NextResponse.json({
            success: true,
            message: `激活码已${actionText}`,
            data: updatedCode,
        });
    } catch (err) {
        console.error("PATCH suite-code error:", err);
        return NextResponse.json(
            { success: false, error: String(err) },
            { status: 500 }
        );
    }
}

// ============================================
// DELETE - Delete activation code
// ============================================

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { success: false, error: "激活码 ID 是必需的" },
                { status: 400 }
            );
        }

        // Check if code exists and is not used
        const { data: currentCode, error: fetchError } = await supabaseAdmin
            .from("suite_codes")
            .select("id, status, code")
            .eq("id", id)
            .single();

        if (fetchError) {
            if (fetchError.code === "PGRST116") {
                return NextResponse.json(
                    { success: false, error: "激活码不存在" },
                    { status: 404 }
                );
            }
            console.error("Error fetching suite code:", fetchError);
            return NextResponse.json(
                { success: false, error: fetchError.message },
                { status: 500 }
            );
        }

        // Prevent deletion of used codes
        if (currentCode.status === "used") {
            return NextResponse.json(
                { success: false, error: "无法删除已使用的激活码" },
                { status: 400 }
            );
        }

        // Delete the code
        const { error: deleteError } = await supabaseAdmin
            .from("suite_codes")
            .delete()
            .eq("id", id);

        if (deleteError) {
            console.error("Error deleting suite code:", deleteError);
            return NextResponse.json(
                { success: false, error: deleteError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "激活码已删除",
        });
    } catch (err) {
        console.error("DELETE suite-code error:", err);
        return NextResponse.json(
            { success: false, error: String(err) },
            { status: 500 }
        );
    }
}
