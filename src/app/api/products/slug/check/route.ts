import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { validateSlug } from "@/lib/slug";

/**
 * GET - Check if a slug is available
 * 
 * Query params:
 * - slug: The slug to check
 * - excludeId: Optional product ID to exclude (for updates)
 * 
 * Requirements: 4.3, 4.4
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get("slug");
        const excludeId = searchParams.get("excludeId");

        if (!slug) {
            return NextResponse.json(
                { error: "Slug is required", available: false },
                { status: 400 }
            );
        }

        // Validate slug format first
        const validation = validateSlug(slug);
        if (!validation.valid) {
            return NextResponse.json({
                available: false,
                error: validation.errorZh || validation.error,
            });
        }

        // Check if slug exists in products table
        let query = supabaseAdmin
            .from("products")
            .select("id")
            .eq("slug", slug.trim());

        if (excludeId) {
            query = query.neq("id", excludeId);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error checking slug availability:", error);
            return NextResponse.json(
                { error: "检查 Slug 可用性失败", available: false },
                { status: 500 }
            );
        }

        // Slug is available if no products found with this slug
        const available = !data || data.length === 0;

        return NextResponse.json({
            available,
            error: available ? null : "该 Slug 已被其他商品使用",
        });
    } catch (err) {
        console.error("Slug check error:", err);
        return NextResponse.json(
            { error: String(err), available: false },
            { status: 500 }
        );
    }
}
