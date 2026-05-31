/**
 * Suite Codes Statistics API
 *
 * Returns statistics about activation codes.
 *
 * Requirements: 6.1, 6.2
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import type { CodeStatistics } from "@/lib/supabase/suite-code-types";

// ============================================
// GET - Fetch activation code statistics
// Requirements: 6.1, 6.2
// ============================================

export async function GET() {
    try {
        // Fetch all codes for statistics calculation
        const { data: codes, error } = await supabaseAdmin
            .from("suite_codes")
            .select("status, code_type, membership_tier");

        if (error) {
            console.error("Error fetching suite codes for stats:", error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        // Calculate statistics - Requirements: 6.1
        const stats: CodeStatistics = {
            total: codes.length,
            unused: 0,
            used: 0,
            expired: 0,
            disabled: 0,
            by_type: {
                membership: {
                    plus: 0,
                    pro: 0,
                    ultra: 0,
                },
                credits: 0,
            },
        };

        // Count by status
        for (const code of codes) {
            // Status counts
            switch (code.status) {
                case "unused":
                    stats.unused++;
                    break;
                case "used":
                    stats.used++;
                    break;
                case "expired":
                    stats.expired++;
                    break;
                case "disabled":
                    stats.disabled++;
                    break;
            }

            // Type counts - Requirements: 6.2
            if (code.code_type === "membership") {
                switch (code.membership_tier) {
                    case "plus":
                        stats.by_type.membership.plus++;
                        break;
                    case "pro":
                        stats.by_type.membership.pro++;
                        break;
                    case "ultra":
                        stats.by_type.membership.ultra++;
                        break;
                }
            } else if (code.code_type === "credits") {
                stats.by_type.credits++;
            }
        }

        // Fetch recent activations for activity display
        const { data: recentActivations, error: recentError } = await supabaseAdmin
            .from("suite_codes")
            .select("id, code, code_type, membership_tier, credits_amount, activated_at, activated_by")
            .eq("status", "used")
            .not("activated_at", "is", null)
            .order("activated_at", { ascending: false })
            .limit(10);

        if (recentError) {
            console.error("Error fetching recent activations:", recentError);
            // Don't fail the whole request, just return stats without recent activity
        }

        return NextResponse.json({
            success: true,
            data: {
                statistics: stats,
                recent_activations: recentActivations || [],
            },
        });
    } catch (err) {
        console.error("GET suite-codes/stats error:", err);
        return NextResponse.json(
            { success: false, error: String(err) },
            { status: 500 }
        );
    }
}
