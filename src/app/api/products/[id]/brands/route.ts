import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";

/**
 * Product-Brand Association API Route
 * 
 * Manages brand associations for a specific product.
 * Requirements: 2.1
 */

/**
 * GET - Get brands associated with a product
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: productId } = await params;

        // Get brand associations for this product
        const { data: associations, error } = await supabaseAdmin
            .from("product_brands")
            .select(`
                brand_id,
                brand:brands(
                    id,
                    name,
                    slug,
                    logo_url,
                    brand_group,
                    is_active
                )
            `)
            .eq("product_id", productId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Extract brand IDs and brand details
        const brandIds = associations?.map((a) => a.brand_id) || [];
        const brands = associations?.map((a) => a.brand).filter(Boolean) || [];

        return NextResponse.json({
            data: {
                brand_ids: brandIds,
                brands,
            },
        });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

/**
 * PUT - Update brand associations for a product
 * Requirements: 2.1
 * 
 * Replaces all brand associations with the provided list.
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: productId } = await params;
        const body = await request.json();
        const { brand_ids } = body;

        if (!Array.isArray(brand_ids)) {
            return NextResponse.json(
                { error: "brand_ids must be an array" },
                { status: 400 }
            );
        }

        // Check if product exists
        const { data: product, error: productError } = await supabaseAdmin
            .from("products")
            .select("id")
            .eq("id", productId)
            .single();

        if (productError || !product) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 }
            );
        }

        // Verify all brands exist if brand_ids is not empty
        if (brand_ids.length > 0) {
            const { data: existingBrands, error: brandsError } = await supabaseAdmin
                .from("brands")
                .select("id")
                .in("id", brand_ids);

            if (brandsError) {
                return NextResponse.json({ error: brandsError.message }, { status: 500 });
            }

            const existingBrandIds = new Set(existingBrands?.map((b) => b.id) || []);
            const invalidBrandIds = brand_ids.filter((id: string) => !existingBrandIds.has(id));

            if (invalidBrandIds.length > 0) {
                return NextResponse.json(
                    { error: `Brands not found: ${invalidBrandIds.join(", ")}` },
                    { status: 400 }
                );
            }
        }

        // Delete existing associations
        const { error: deleteError } = await supabaseAdmin
            .from("product_brands")
            .delete()
            .eq("product_id", productId);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        // Insert new associations if any
        if (brand_ids.length > 0) {
            const associations = brand_ids.map((brandId: string) => ({
                product_id: productId,
                brand_id: brandId,
            }));

            const { error: insertError } = await supabaseAdmin
                .from("product_brands")
                .insert(associations);

            if (insertError) {
                return NextResponse.json({ error: insertError.message }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            brand_count: brand_ids.length,
        });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
