/**
 * CDK Admin Service for Dashboard
 *
 * Provides administrative functions for CDK inventory management:
 * - Inventory statistics
 * - Code search
 * - Code invalidation
 * - Import history
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { supabaseAdmin } from "../supabase/admin-client";

// ============================================
// Types
// ============================================

/**
 * CDK code status values
 */
export const CDKStatus = {
    AVAILABLE: "available",
    RESERVED: "reserved",
    DELIVERED: "delivered",
    INVALID: "invalid",
} as const;

export type CDKStatusType = (typeof CDKStatus)[keyof typeof CDKStatus];

/**
 * CDK inventory statistics
 *
 * Requirements: 8.1
 */
export interface CDKInventoryStats {
    total: number;
    available: number;
    reserved: number;
    delivered: number;
    invalid: number;
}

/**
 * CDK code detail for admin view
 *
 * Requirements: 8.2
 */
export interface CDKCodeDetail {
    id: string;
    code: string;
    status: CDKStatusType;
    product_id: string;
    product_name?: string;
    order_id?: string;
    order_number?: string;
    created_at: string;
    updated_at: string;
    reserved_at?: string;
    delivered_at?: string;
    invalidated_at?: string;
}


/**
 * CDK import batch record
 *
 * Requirements: 8.4
 */
export interface CDKImportBatchDetail {
    id: string;
    product_id: string;
    product_name?: string;
    admin_id: string;
    source_type: "csv" | "xlsx" | "text";
    total_count: number;
    success_count: number;
    duplicate_count: number;
    invalid_count: number;
    error_details?: Array<{ line: number; code: string; reason: string }>;
    created_at: string;
}

/**
 * Result of invalidation operation
 */
export interface InvalidateCodeResult {
    success: boolean;
    error?: string;
}

// ============================================
// Inventory Statistics
// ============================================

/**
 * Get CDK inventory statistics
 *
 * Returns counts by status for a specific product or all products.
 *
 * Requirements: 8.1
 *
 * @param productId - Optional product ID to filter by
 * @returns Inventory statistics by status
 */
export async function getInventoryStats(
    productId?: string
): Promise<CDKInventoryStats> {
    // Build base query
    let query = supabaseAdmin.from("cdk_codes").select("status");

    if (productId) {
        query = query.eq("product_id", productId);
    }

    const { data, error } = await query;

    if (error) {
        console.error("[CDK Admin] Stats error:", error);
        return { total: 0, available: 0, reserved: 0, delivered: 0, invalid: 0 };
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

    return stats;
}

// ============================================
// Code Search
// ============================================

/**
 * Search CDK codes by code content or ID
 *
 * Returns code details with product and order information.
 *
 * Requirements: 8.2
 *
 * @param query - Search query (code content or ID)
 * @param limit - Maximum number of results (default 50)
 * @returns Array of matching CDK code details
 */
export async function searchCode(
    query: string,
    limit = 50
): Promise<CDKCodeDetail[]> {
    if (!query || query.trim().length === 0) {
        return [];
    }

    const searchTerm = query.trim();

    // Search by exact ID match or partial code match
    const { data: codes, error } = await supabaseAdmin
        .from("cdk_codes")
        .select(`
            id,
            code,
            status,
            product_id,
            order_id,
            created_at,
            updated_at,
            reserved_at,
            delivered_at,
            invalidated_at
        `)
        .or(`id.eq.${searchTerm},code.ilike.%${searchTerm}%`)
        .limit(limit);

    if (error) {
        console.error("[CDK Admin] Search error:", error);
        return [];
    }

    if (!codes || codes.length === 0) {
        return [];
    }

    // Get product names for the found codes
    const productIds = [...new Set(codes.map((c) => c.product_id))];
    const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, name")
        .in("id", productIds);

    const productMap = new Map(
        (products || []).map((p) => [p.id, p.name])
    );

    // Get order numbers for codes with orders
    const orderIds = codes
        .map((c) => c.order_id)
        .filter((id): id is string => id !== null && id !== undefined);

    let orderMap = new Map<string, string>();
    if (orderIds.length > 0) {
        const { data: orders } = await supabaseAdmin
            .from("orders")
            .select("id, order_number")
            .in("id", orderIds);

        orderMap = new Map(
            (orders || []).map((o) => [o.id, o.order_number])
        );
    }

    // Build result with enriched data
    return codes.map((code) => ({
        id: code.id,
        code: code.code,
        status: code.status as CDKStatusType,
        product_id: code.product_id,
        product_name: productMap.get(code.product_id),
        order_id: code.order_id || undefined,
        order_number: code.order_id ? orderMap.get(code.order_id) : undefined,
        created_at: code.created_at,
        updated_at: code.updated_at,
        reserved_at: code.reserved_at || undefined,
        delivered_at: code.delivered_at || undefined,
        invalidated_at: code.invalidated_at || undefined,
    }));
}

// ============================================
// Code Invalidation
// ============================================

/**
 * Invalidate a CDK code
 *
 * Updates code status to invalid and creates an audit log entry.
 * Invalidated codes cannot be used for future reservations.
 *
 * Requirements: 8.3
 *
 * @param codeId - The CDK code ID to invalidate
 * @param adminId - The admin user ID performing the action
 * @param reason - Optional reason for invalidation
 * @returns Result indicating success or failure
 */
export async function invalidateCode(
    codeId: string,
    adminId: string,
    reason?: string
): Promise<InvalidateCodeResult> {
    if (!codeId) {
        return {
            success: false,
            error: "Code ID is required",
        };
    }

    if (!adminId) {
        return {
            success: false,
            error: "Admin ID is required",
        };
    }

    const invalidatedAt = new Date().toISOString();

    // Step 1: Get current code status
    const { data: currentCode, error: fetchError } = await supabaseAdmin
        .from("cdk_codes")
        .select("id, status")
        .eq("id", codeId)
        .single();

    if (fetchError || !currentCode) {
        console.error("[CDK Admin] Code not found:", fetchError);
        return {
            success: false,
            error: "Code not found",
        };
    }

    // Check if already invalid
    if (currentCode.status === CDKStatus.INVALID) {
        return {
            success: true, // Idempotent - already invalid
        };
    }

    // Check if delivered - cannot invalidate delivered codes
    if (currentCode.status === CDKStatus.DELIVERED) {
        return {
            success: false,
            error: "Cannot invalidate delivered codes",
        };
    }

    const oldStatus = currentCode.status;

    // Step 2: Update code status to invalid
    const { error: updateError } = await supabaseAdmin
        .from("cdk_codes")
        .update({
            status: CDKStatus.INVALID,
            invalidated_at: invalidatedAt,
            updated_at: invalidatedAt,
            // Clear reservation data if it was reserved
            order_id: null,
            reserved_at: null,
        })
        .eq("id", codeId);

    if (updateError) {
        console.error("[CDK Admin] Update error:", updateError);
        return {
            success: false,
            error: `Failed to invalidate code: ${updateError.message}`,
        };
    }

    // Step 3: Create audit log entry
    const { error: auditError } = await supabaseAdmin
        .from("cdk_audit_logs")
        .insert({
            cdk_code_id: codeId,
            action: "invalidated",
            old_status: oldStatus,
            new_status: CDKStatus.INVALID,
            actor_id: adminId,
            actor_type: "admin",
            reason: reason || "Admin invalidation",
            created_at: invalidatedAt,
        });

    if (auditError) {
        // Log but don't fail the operation
        console.error("[CDK Admin] Audit log error:", auditError);
    }

    console.log(
        `[CDK Admin] Invalidated code ${codeId} by admin ${adminId}`
    );

    return {
        success: true,
    };
}

// ============================================
// Import History
// ============================================

/**
 * Get CDK import history
 *
 * Returns import batches with statistics, ordered by most recent first.
 *
 * Requirements: 8.4
 *
 * @param limit - Maximum number of batches to return (default 50)
 * @param productId - Optional product ID to filter by
 * @returns Array of import batch details
 */
export async function getImportHistory(
    limit = 50,
    productId?: string
): Promise<CDKImportBatchDetail[]> {
    // Build query
    let query = supabaseAdmin
        .from("cdk_import_batches")
        .select(`
            id,
            product_id,
            admin_id,
            source_type,
            total_count,
            success_count,
            duplicate_count,
            invalid_count,
            error_details,
            created_at
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (productId) {
        query = query.eq("product_id", productId);
    }

    const { data: batches, error } = await query;

    if (error) {
        console.error("[CDK Admin] Import history error:", error);
        return [];
    }

    if (!batches || batches.length === 0) {
        return [];
    }

    // Get product names for the batches
    const productIds = [...new Set(batches.map((b) => b.product_id))];
    const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, name")
        .in("id", productIds);

    const productMap = new Map(
        (products || []).map((p) => [p.id, p.name])
    );

    // Build result with enriched data
    return batches.map((batch) => ({
        id: batch.id,
        product_id: batch.product_id,
        product_name: productMap.get(batch.product_id),
        admin_id: batch.admin_id,
        source_type: batch.source_type as "csv" | "xlsx" | "text",
        total_count: batch.total_count,
        success_count: batch.success_count,
        duplicate_count: batch.duplicate_count,
        invalid_count: batch.invalid_count,
        error_details: batch.error_details as Array<{
            line: number;
            code: string;
            reason: string;
        }> | undefined,
        created_at: batch.created_at,
    }));
}
