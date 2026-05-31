/**
 * CDK Inventory Stats API Route
 * 
 * Server-side endpoint for fetching CDK inventory statistics.
 * Uses admin client with service role key (server-side only).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// CDK status values
const CDKStatus = {
    AVAILABLE: "available",
    RESERVED: "reserved",
    DELIVERED: "delivered",
    INVALID: "invalid",
} as const;

type CDKStatusType = (typeof CDKStatus)[keyof typeof CDKStatus];

interface CDKInventoryStats {
    total: number;
    available: number;
    reserved: number;
    delivered: number;
    invalid: number;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get("productId") || undefined;

        // Create admin client directly in API route
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            console.error("[API] Missing env vars:", {
                hasUrl: !!supabaseUrl,
                hasKey: !!serviceRoleKey
            });
            return NextResponse.json(
                { error: "Server configuration error" },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Build query
        let query = supabase.from("cdk_codes").select("status");

        if (productId) {
            query = query.eq("product_id", productId);
        }

        const { data, error } = await query;

        if (error) {
            console.error("[API] CDK stats query error:", error);
            return NextResponse.json(
                { error: "Database query failed" },
                { status: 500 }
            );
        }

        // Count by status
        const stats: CDKInventoryStats = {
            total: data?.length || 0,
            available: 0,
            reserved: 0,
            delivered: 0,
            invalid: 0,
        };

        for (const code of data || []) {
            switch (code.status as CDKStatusType) {
                case CDKStatus.AVAILABLE:
                    stats.available++;
                    break;
                case CDKStatus.RESERVED:
                    stats.reserved++;
                    break;
                case CDKStatus.DELIVERED:
                    stats.delivered++;
                    break;
                case CDKStatus.INVALID:
                    stats.invalid++;
                    break;
            }
        }

        return NextResponse.json(stats);
    } catch (error) {
        console.error("[API] CDK stats error:", error);
        return NextResponse.json(
            { error: "Failed to fetch inventory stats" },
            { status: 500 }
        );
    }
}
