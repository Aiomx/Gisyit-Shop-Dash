import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import {
    type CreateBrandInput,
    type UpdateBrandInput,
    type BrandErrorCode,
    brandErrorMessages,
} from "@/lib/supabase/types";
import {
    generateSlug,
    validateBrandName,
    validateSlug,
} from "@/lib/brand/brand-utils";

/**
 * Brand API Route
 * 
 * Provides CRUD operations for brand management.
 * Requirements: 1.1, 1.3, 1.7, 1.8
 */

/**
 * GET - Fetch all brands with product count
 * Requirements: 1.8, 7.4
 */
export async function GET() {
    try {
        // Fetch brands with product count using a left join
        const { data: brands, error } = await supabaseAdmin
            .from("brands")
            .select(`
                *,
                product_brands(count)
            `)
            .order("brand_group")
            .order("sort_order");

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform the data to include product_count
        const brandsWithCount = brands?.map((brand) => ({
            ...brand,
            product_count: brand.product_brands?.[0]?.count || 0,
            product_brands: undefined, // Remove the nested object
        }));

        return NextResponse.json({ data: brandsWithCount });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

/**
 * POST - Create a new brand
 * Requirements: 1.1, 1.2, 7.1, 7.2
 */
export async function POST(request: NextRequest) {
    try {
        const body: CreateBrandInput = await request.json();
        const { name, slug: providedSlug, logo_url, brand_group, sort_order, is_active, description } = body;

        // Validate brand name
        if (!validateBrandName(name)) {
            const errorCode: BrandErrorCode = "INVALID_BRAND_NAME";
            return NextResponse.json(
                { error: brandErrorMessages[errorCode], code: errorCode },
                { status: 400 }
            );
        }

        // Generate or validate slug
        let slug = providedSlug;
        if (!slug) {
            // Auto-generate slug from name (Requirements: 1.2)
            slug = generateSlug(name);
        }

        // Validate slug format
        if (!validateSlug(slug)) {
            const errorCode: BrandErrorCode = "INVALID_SLUG_FORMAT";
            return NextResponse.json(
                { error: brandErrorMessages[errorCode], code: errorCode },
                { status: 400 }
            );
        }

        // Check slug uniqueness (Requirements: 1.3)
        const { data: existingBrand } = await supabaseAdmin
            .from("brands")
            .select("id")
            .eq("slug", slug)
            .single();

        if (existingBrand) {
            const errorCode: BrandErrorCode = "BRAND_SLUG_EXISTS";
            return NextResponse.json(
                { error: brandErrorMessages[errorCode], code: errorCode },
                { status: 400 }
            );
        }

        // Create brand
        const { data, error } = await supabaseAdmin
            .from("brands")
            .insert({
                name: name.trim(),
                slug,
                logo_url: logo_url || null,
                brand_group: brand_group || "platform",
                sort_order: sort_order ?? 0,
                is_active: is_active ?? true,
                description: description || null,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data, success: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

/**
 * PATCH - Update an existing brand
 * Requirements: 1.1, 1.3, 7.1, 7.2
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updateData }: { id: string } & UpdateBrandInput = body;

        if (!id) {
            return NextResponse.json({ error: "Brand ID is required" }, { status: 400 });
        }

        // Check if brand exists
        const { data: existingBrand, error: fetchError } = await supabaseAdmin
            .from("brands")
            .select("id, slug")
            .eq("id", id)
            .single();

        if (fetchError || !existingBrand) {
            const errorCode: BrandErrorCode = "BRAND_NOT_FOUND";
            return NextResponse.json(
                { error: brandErrorMessages[errorCode], code: errorCode },
                { status: 404 }
            );
        }

        // Validate name if provided
        if (updateData.name !== undefined && !validateBrandName(updateData.name)) {
            const errorCode: BrandErrorCode = "INVALID_BRAND_NAME";
            return NextResponse.json(
                { error: brandErrorMessages[errorCode], code: errorCode },
                { status: 400 }
            );
        }

        // Validate and check slug uniqueness if provided
        if (updateData.slug !== undefined) {
            if (!validateSlug(updateData.slug)) {
                const errorCode: BrandErrorCode = "INVALID_SLUG_FORMAT";
                return NextResponse.json(
                    { error: brandErrorMessages[errorCode], code: errorCode },
                    { status: 400 }
                );
            }

            // Check slug uniqueness (only if slug is different)
            if (updateData.slug !== existingBrand.slug) {
                const { data: slugExists } = await supabaseAdmin
                    .from("brands")
                    .select("id")
                    .eq("slug", updateData.slug)
                    .neq("id", id)
                    .single();

                if (slugExists) {
                    const errorCode: BrandErrorCode = "BRAND_SLUG_EXISTS";
                    return NextResponse.json(
                        { error: brandErrorMessages[errorCode], code: errorCode },
                        { status: 400 }
                    );
                }
            }
        }

        // Build update object
        const updateFields: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (updateData.name !== undefined) updateFields.name = updateData.name.trim();
        if (updateData.slug !== undefined) updateFields.slug = updateData.slug;
        if (updateData.logo_url !== undefined) updateFields.logo_url = updateData.logo_url || null;
        if (updateData.brand_group !== undefined) updateFields.brand_group = updateData.brand_group;
        if (updateData.sort_order !== undefined) updateFields.sort_order = updateData.sort_order;
        if (updateData.is_active !== undefined) updateFields.is_active = updateData.is_active;
        if (updateData.description !== undefined) updateFields.description = updateData.description || null;

        // Update brand
        const { data, error } = await supabaseAdmin
            .from("brands")
            .update(updateFields)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data, success: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

/**
 * DELETE - Delete a brand
 * Requirements: 1.7
 * 
 * Prevents deletion if brand has associated products.
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Brand ID is required" }, { status: 400 });
        }

        // Check if brand exists
        const { data: existingBrand, error: fetchError } = await supabaseAdmin
            .from("brands")
            .select("id")
            .eq("id", id)
            .single();

        if (fetchError || !existingBrand) {
            const errorCode: BrandErrorCode = "BRAND_NOT_FOUND";
            return NextResponse.json(
                { error: brandErrorMessages[errorCode], code: errorCode },
                { status: 404 }
            );
        }

        // Check for associated products (Requirements: 1.7)
        const { count: productCount } = await supabaseAdmin
            .from("product_brands")
            .select("*", { count: "exact", head: true })
            .eq("brand_id", id);

        if (productCount && productCount > 0) {
            const errorCode: BrandErrorCode = "BRAND_HAS_PRODUCTS";
            return NextResponse.json(
                { error: brandErrorMessages[errorCode], code: errorCode },
                { status: 400 }
            );
        }

        // Delete brand
        const { error } = await supabaseAdmin
            .from("brands")
            .delete()
            .eq("id", id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
