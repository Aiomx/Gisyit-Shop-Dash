/**
 * Suite Codes API Routes
 *
 * Handles activation code listing and generation.
 *
 * Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 3.1, 3.4, 3.5
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { generateCodes } from "@/lib/suite-code/generator";
import {
    validateCreditsAmount,
    validateExpirationDate,
} from "@/lib/suite-code/validator";
import type {
    CodeType,
    MembershipTier,
    CodeStatus,
    GenerateCodesRequest,
    SuiteCode,
} from "@/lib/supabase/suite-code-types";

// ============================================
// GET - Fetch activation codes with pagination, filtering, and search
// Requirements: 3.1, 3.4, 3.5
// ============================================

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Pagination parameters
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") || "20", 10)));
        const offset = (page - 1) * pageSize;

        // Filter parameters
        const codeType = searchParams.get("code_type") as CodeType | null;
        const membershipTier = searchParams.get("membership_tier") as MembershipTier | null;
        const status = searchParams.get("status") as CodeStatus | null;
        const startDate = searchParams.get("start_date");
        const endDate = searchParams.get("end_date");
        const search = searchParams.get("search");
        const batchId = searchParams.get("batch_id");

        // Build query
        let query = supabaseAdmin
            .from("suite_codes")
            .select("*", { count: "exact" });

        // Apply filters - Requirements: 3.4
        if (codeType) {
            query = query.eq("code_type", codeType);
        }

        if (membershipTier) {
            query = query.eq("membership_tier", membershipTier);
        }

        if (status) {
            query = query.eq("status", status);
        }

        if (startDate) {
            query = query.gte("created_at", startDate);
        }

        if (endDate) {
            query = query.lte("created_at", endDate);
        }

        if (batchId) {
            query = query.eq("batch_id", batchId);
        }

        // Apply search - Requirements: 3.5
        if (search) {
            // Search by code string or activated_by user ID
            query = query.or(`code.ilike.%${search}%,activated_by.eq.${search}`);
        }

        // Apply pagination and ordering
        query = query
            .order("created_at", { ascending: false })
            .range(offset, offset + pageSize - 1);

        const { data, error, count } = await query;

        if (error) {
            console.error("Error fetching suite codes:", error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / pageSize);

        return NextResponse.json({
            success: true,
            data: data as SuiteCode[],
            total,
            page,
            page_size: pageSize,
            total_pages: totalPages,
        });
    } catch (err) {
        console.error("GET suite-codes error:", err);
        return NextResponse.json(
            { success: false, error: String(err) },
            { status: 500 }
        );
    }
}


// ============================================
// POST - Generate activation codes
// Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
// ============================================

export async function POST(request: NextRequest) {
    try {
        const body: GenerateCodesRequest = await request.json();
        const {
            code_type,
            quantity,
            expires_at,
            membership_tier,
            membership_days,
            credits_amount,
            notes,
        } = body;

        // Validate required fields
        if (!code_type || !quantity || !expires_at) {
            return NextResponse.json(
                { success: false, error: "缺少必填参数: code_type, quantity, expires_at" },
                { status: 400 }
            );
        }

        // Validate quantity
        if (quantity < 1 || quantity > 1000) {
            return NextResponse.json(
                { success: false, error: "生成数量必须在 1-1000 之间" },
                { status: 400 }
            );
        }

        // Validate expiration date
        const expirationValidation = validateExpirationDate(expires_at);
        if (!expirationValidation.valid) {
            return NextResponse.json(
                { success: false, error: expirationValidation.errorMessage },
                { status: 400 }
            );
        }

        // Validate membership code parameters - Requirements: 1.2
        if (code_type === "membership") {
            if (!membership_tier) {
                return NextResponse.json(
                    { success: false, error: "会员码必须指定会员等级 (membership_tier)" },
                    { status: 400 }
                );
            }
            if (!["plus", "pro", "ultra"].includes(membership_tier)) {
                return NextResponse.json(
                    { success: false, error: "无效的会员等级，必须是 plus, pro, 或 ultra" },
                    { status: 400 }
                );
            }
            if (!membership_days || membership_days < 1) {
                return NextResponse.json(
                    { success: false, error: "会员码必须指定有效天数 (membership_days)" },
                    { status: 400 }
                );
            }
        }

        // Validate credits code parameters - Requirements: 1.3
        if (code_type === "credits") {
            if (!credits_amount) {
                return NextResponse.json(
                    { success: false, error: "积分码必须指定积分数量 (credits_amount)" },
                    { status: 400 }
                );
            }
            const creditsValidation = validateCreditsAmount(credits_amount);
            if (!creditsValidation.valid) {
                return NextResponse.json(
                    { success: false, error: creditsValidation.errorMessage },
                    { status: 400 }
                );
            }
        }

        // Generate batch ID - Requirements: 1.5
        const batchId = crypto.randomUUID();

        // Generate unique codes - Requirements: 1.6
        const generatedCodes = generateCodes(
            {
                type: code_type,
                tier: code_type === "membership" ? membership_tier : undefined,
            },
            quantity
        );

        // Check for existing codes to ensure uniqueness across the system
        const { data: existingCodes } = await supabaseAdmin
            .from("suite_codes")
            .select("code")
            .in("code", generatedCodes);

        if (existingCodes && existingCodes.length > 0) {
            // Some codes already exist, regenerate those
            const existingSet = new Set(existingCodes.map((c) => c.code));
            const uniqueCodes = generatedCodes.filter((c) => !existingSet.has(c));

            // Generate additional codes to replace duplicates
            let attempts = 0;
            const maxAttempts = 100;
            while (uniqueCodes.length < quantity && attempts < maxAttempts) {
                const additionalCodes = generateCodes(
                    {
                        type: code_type,
                        tier: code_type === "membership" ? membership_tier : undefined,
                    },
                    quantity - uniqueCodes.length
                );

                for (const code of additionalCodes) {
                    if (!existingSet.has(code) && !uniqueCodes.includes(code)) {
                        uniqueCodes.push(code);
                        if (uniqueCodes.length >= quantity) break;
                    }
                }
                attempts++;
            }

            if (uniqueCodes.length < quantity) {
                return NextResponse.json(
                    { success: false, error: "无法生成足够的唯一激活码，请稍后重试" },
                    { status: 500 }
                );
            }

            generatedCodes.length = 0;
            generatedCodes.push(...uniqueCodes);
        }

        // Prepare records for insertion - Requirements: 1.7
        const records = generatedCodes.map((code) => ({
            code,
            code_type,
            membership_tier: code_type === "membership" ? membership_tier : null,
            membership_days: code_type === "membership" ? membership_days : null,
            credits_amount: code_type === "credits" ? credits_amount : null,
            status: "unused" as CodeStatus,
            expires_at,
            batch_id: batchId,
            notes: notes || null,
        }));

        // Insert codes into database
        const { data: insertedCodes, error: insertError } = await supabaseAdmin
            .from("suite_codes")
            .insert(records)
            .select();

        if (insertError) {
            console.error("Error inserting suite codes:", insertError);
            return NextResponse.json(
                { success: false, error: `激活码生成失败: ${insertError.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `成功生成 ${insertedCodes.length} 个激活码`,
            codes: insertedCodes as SuiteCode[],
            batch_id: batchId,
            count: insertedCodes.length,
        });
    } catch (err) {
        console.error("POST suite-codes error:", err);
        return NextResponse.json(
            { success: false, error: String(err) },
            { status: 500 }
        );
    }
}
