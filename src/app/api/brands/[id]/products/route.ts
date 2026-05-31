import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { type BrandErrorCode, brandErrorMessages } from "@/lib/supabase/types";

/**
 * Product-Brand Association API Route
 * 
 * Manages the association between products and brands.
 * Requirements: 2.1, 2.2, 2.3
 */

/**
 * GET - List products associated with a brand
 * Requirements: 2.2
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: brandId } = await params;

        // Check if brand exists
        const { data: brand, error: brandError } = await supabaseAdmin
            .from("brands")
            .select("id, name")
            .eq("id", brandId)
            .single();

        if (brandError || !brand) {
            const errorCode: BrandErrorCode = "BRAND_NOT_FOUND";
            return NextResponse.json(
                { error: brandErrorMessages[errorCode], code: errorCode },
                { status: 404 }
            );
        }

        // Get products associated with this brand
        const { data: associations, error } = await supabaseAdmin
            .from("product_brands")
            .select(`
                id,
                product_id,
                created_at,
                product:products(
                    id,
                    product_code,
                    name,
                    is_active,
                    images:product_images(image_url, is_primary)
                )
            `)
            .eq("brand_id", brandId)
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform data to flatten product info
        const products = associations?.map((assoc) => {
            // product is returned as array from join, get first item
            const product = Array.isArray(assoc.product) ? assoc.product[0] : assoc.product;
            const images = product?.images || [];
            return {
                association_id: assoc.id,
                product_id: assoc.product_id,
                associated_at: assoc.created_at,
                ...product,
                // Get primary image or first image
                primary_image: images.find((img: { is_primary: boolean }) => img.is_primary)?.image_url
                    || images[0]?.image_url
                    || null,
                images: undefined, // Remove nested images array
            };
        });

        return NextResponse.json({
            data: {
                brand,
                products: products || [],
            },
        });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

/**
 * POST - Add product associations to a brand
 * Requirements: 2.1
 * 
 * Accepts an array of product IDs to associate with the brand.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: brandId } = await params;
        const body = await request.json();
        const { product_ids } = body;

        if (!Array.isArray(product_ids) || product_ids.length === 0) {
            return NextResponse.json(
                { error: "product_ids must be a non-empty array" },
                { status: 400 }
            );
        }

        // Check if brand exists
        const { data: brand, error: brandError } = await supabaseAdmin
            .from("brands")
            .select("id")
            .eq("id", brandId)
            .single();

        if (brandError || !brand) {
            const errorCode: BrandErrorCode = "BRAND_NOT_FOUND";
            return NextResponse.json(
                { error: brandErrorMessages[errorCode], code: errorCode },
                { status: 404 }
            );
        }

        // Verify all products exist
        const { data: existingProducts, error: productsError } = await supabaseAdmin
            .from("products")
            .select("id")
            .in("id", product_ids);

        if (productsError) {
            return NextResponse.json({ error: productsError.message }, { status: 500 });
        }

        const existingProductIds = new Set(existingProducts?.map((p) => p.id) || []);
        const invalidProductIds = product_ids.filter((id: string) => !existingProductIds.has(id));

        if (invalidProductIds.length > 0) {
            return NextResponse.json(
                { error: `Products not found: ${invalidProductIds.join(", ")}` },
                { status: 400 }
            );
        }

        // Get existing associations to avoid duplicates
        const { data: existingAssociations } = await supabaseAdmin
            .from("product_brands")
            .select("product_id")
            .eq("brand_id", brandId)
            .in("product_id", product_ids);

        const existingAssocProductIds = new Set(
            existingAssociations?.map((a) => a.product_id) || []
        );

        // Filter out already associated products
        const newProductIds = product_ids.filter(
            (id: string) => !existingAssocProductIds.has(id)
        );

        if (newProductIds.length === 0) {
            return NextResponse.json({
                success: true,
                message: "All products are already associated with this brand",
                added: 0,
            });
        }

        // Create new associations
        const associations = newProductIds.map((productId: string) => ({
            brand_id: brandId,
            product_id: productId,
        }));

        const { data, error } = await supabaseAdmin
            .from("product_brands")
            .insert(associations)
            .select();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data,
            added: data?.length || 0,
        });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

/**
 * DELETE - Remove product associations from a brand
 * Requirements: 2.3
 * 
 * Accepts an array of product IDs to disassociate from the brand.
 * Only removes the association, does not affect product or brand records.
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: brandId } = await params;
        const body = await request.json();
        const { product_ids } = body;

        if (!Array.isArray(product_ids) || product_ids.length === 0) {
            return NextResponse.json(
                { error: "product_ids must be a non-empty array" },
                { status: 400 }
            );
        }

        // Check if brand exists
        const { data: brand, error: brandError } = await supabaseAdmin
            .from("brands")
            .select("id")
            .eq("id", brandId)
            .single();

        if (brandError || !brand) {
            const errorCode: BrandErrorCode = "BRAND_NOT_FOUND";
            return NextResponse.json(
                { error: brandErrorMessages[errorCode], code: errorCode },
                { status: 404 }
            );
        }

        // Delete associations
        const { error } = await supabaseAdmin
            .from("product_brands")
            .delete()
            .eq("brand_id", brandId)
            .in("product_id", product_ids);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            removed: product_ids.length,
        });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
