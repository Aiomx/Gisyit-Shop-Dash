import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { deleteProductFiles } from "@/lib/storage";

// GET - Fetch products (optionally filter by ID)
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    let query = supabaseAdmin
        .from("products")
        .select("*, images:product_images(*), prices:product_prices(*), category:product_categories(*)");

    // Filter by ID if provided
    if (id) {
        query = query.eq("id", id);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}

// POST - Create product
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { product_code, name, slug, subtitle, description, product_type, delivery_type, category_id, is_active, has_discount, image_url, price_amount, inventory_count, is_free, require_login } = body;

        // Validate free product constraints - Requirements: 9.5
        if (is_free === true && delivery_type !== "download") {
            return NextResponse.json(
                { error: '免费商品必须使用"下载"交付方式' },
                { status: 400 }
            );
        }

        // Import slug utilities
        const { generateSlug, validateSlug } = await import("@/lib/slug");

        // Validate user-provided slug if present - Requirements: 7.3, 7.4
        if (slug) {
            const validation = validateSlug(slug);
            if (!validation.valid) {
                return NextResponse.json(
                    { error: validation.errorZh || validation.error },
                    { status: 400 }
                );
            }

            // Check slug uniqueness - Requirements: 4.3, 4.4
            const { data: existingProduct } = await supabaseAdmin
                .from("products")
                .select("id")
                .eq("slug", slug)
                .single();

            if (existingProduct) {
                return NextResponse.json(
                    { error: "该 Slug 已被其他商品使用" },
                    { status: 400 }
                );
            }
        }

        // Generate slug from name if not provided - Requirements: 4.5
        let finalSlug = slug;
        if (!finalSlug && name) {
            finalSlug = generateSlug(name);

            // Check if generated slug is unique, append suffix if needed
            if (finalSlug) {
                let suffix = 2;
                let candidateSlug = finalSlug;
                while (true) {
                    const { data: existing } = await supabaseAdmin
                        .from("products")
                        .select("id")
                        .eq("slug", candidateSlug)
                        .single();

                    if (!existing) {
                        finalSlug = candidateSlug;
                        break;
                    }

                    candidateSlug = `${finalSlug}-${suffix}`;
                    suffix++;

                    if (suffix > 100) {
                        // Fallback to timestamp
                        finalSlug = `${finalSlug}-${Date.now()}`;
                        break;
                    }
                }
            }
        }

        // Create product
        const { data: productData, error: productError } = await supabaseAdmin
            .from("products")
            .insert({
                product_code,
                name,
                slug: finalSlug || null,
                subtitle: subtitle || null,
                description: description || null,
                product_type,
                delivery_type,
                category_id: category_id || null,
                is_active,
                has_discount,
                inventory_count: inventory_count === undefined ? null : inventory_count,
                is_free: is_free || false,
                require_login: require_login || false,
            })
            .select("id, slug")
            .single();

        if (productError) {
            return NextResponse.json({ error: productError.message }, { status: 500 });
        }

        const productId = productData.id;

        // Create image if provided
        if (image_url) {
            await supabaseAdmin.from("product_images").insert({
                product_id: productId,
                image_url,
                is_primary: true,
                sort_order: 0,
            });
        }

        // Create price if provided
        if (price_amount) {
            await supabaseAdmin.from("product_prices").insert({
                product_id: productId,
                price_amount: parseFloat(price_amount),
                currency: "CNY",
                is_active: true,
            });
        }

        return NextResponse.json({ data: { id: productId, slug: productData.slug }, success: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

// PUT - Update product
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            id, product_code, name, slug, oldSlug, subtitle, description, product_type, delivery_type,
            category_id, is_active, has_discount, image_url, price_amount, inventory_count,
            // Promotion fields
            promotion_price, original_price, promotion_start_at, promotion_end_at, is_promotion_unlimited,
            // Free product fields - Requirements: 9.5
            is_free, require_login,
            // Verification and description fields - Requirements: 1.3, 4.4
            is_verified, detail_content
        } = body;

        if (!id) {
            return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
        }

        // Validate free product constraints - Requirements: 9.5
        if (is_free === true && delivery_type !== "download") {
            return NextResponse.json(
                { error: '免费商品必须使用"下载"交付方式' },
                { status: 400 }
            );
        }

        // Validate slug format if provided - Requirements: 7.3, 7.4
        if (slug) {
            const { validateSlug } = await import("@/lib/slug");
            const validation = validateSlug(slug);
            if (!validation.valid) {
                return NextResponse.json(
                    { error: validation.errorZh || validation.error },
                    { status: 400 }
                );
            }

            // Check slug uniqueness (excluding current product) - Requirements: 4.3, 4.4
            const { data: existingProduct } = await supabaseAdmin
                .from("products")
                .select("id")
                .eq("slug", slug)
                .neq("id", id)
                .single();

            if (existingProduct) {
                return NextResponse.json(
                    { error: "该 Slug 已被其他商品使用" },
                    { status: 400 }
                );
            }
        }

        const errors: string[] = [];

        // Record slug history if slug was changed - Requirements: 4.6, 5.1
        if (oldSlug && slug && oldSlug !== slug) {
            try {
                // First, remove the new slug from history if it exists (slug reuse)
                // Requirements: 5.3
                await supabaseAdmin
                    .from("slug_history")
                    .delete()
                    .eq("old_slug", slug);

                // Then record the old slug in history
                const { error: historyError } = await supabaseAdmin
                    .from("slug_history")
                    .insert({
                        product_id: id,
                        old_slug: oldSlug,
                    });

                if (historyError) {
                    console.error("Slug history error:", historyError);
                    // Don't fail the update, just log the error
                }
            } catch (historyErr) {
                console.error("Slug history tracking error:", historyErr);
            }
        }

        // Build update object - only include fields that are explicitly provided
        // This prevents clearing fields when doing partial updates (e.g., from detail page)
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        // Only add fields that are explicitly provided (not undefined)
        if (product_code !== undefined) updateData.product_code = product_code;
        if (name !== undefined) updateData.name = name;
        if (slug !== undefined) updateData.slug = slug || null;
        if (subtitle !== undefined) updateData.subtitle = subtitle || null;
        if (description !== undefined) updateData.description = description || null;
        if (product_type !== undefined) updateData.product_type = product_type;
        if (delivery_type !== undefined) updateData.delivery_type = delivery_type;
        if (category_id !== undefined) updateData.category_id = category_id || null;
        if (is_active !== undefined) updateData.is_active = is_active;
        if (has_discount !== undefined) updateData.has_discount = has_discount;
        if (inventory_count !== undefined) updateData.inventory_count = inventory_count;
        // Free product fields - Requirements: 9.5
        if (is_free !== undefined) updateData.is_free = is_free;
        if (require_login !== undefined) updateData.require_login = require_login;

        // Add verification field if provided - Requirements: 1.3, 1.4
        if (is_verified !== undefined) {
            updateData.is_verified = is_verified;
        }

        // Add detail_content field if provided - Requirements: 4.4
        if (detail_content !== undefined) {
            updateData.detail_content = detail_content;
        }

        // Add promotion fields only if has_discount is explicitly provided
        if (has_discount !== undefined) {
            if (has_discount) {
                if (promotion_price !== undefined) updateData.promotion_price = promotion_price ? parseFloat(promotion_price) : null;
                if (original_price !== undefined) updateData.original_price = original_price ? parseFloat(original_price) : null;
                updateData.promotion_start_at = promotion_start_at || new Date().toISOString();
                updateData.promotion_end_at = is_promotion_unlimited ? null : (promotion_end_at || null);
                updateData.is_promotion_unlimited = is_promotion_unlimited || false;
            } else {
                // Clear promotion fields when not on discount
                updateData.promotion_price = null;
                updateData.original_price = null;
                updateData.promotion_start_at = null;
                updateData.promotion_end_at = null;
                updateData.is_promotion_unlimited = false;
            }
        }

        // Update product
        const { error: productError } = await supabaseAdmin
            .from("products")
            .update(updateData)
            .eq("id", id);

        if (productError) {
            console.error("Product update error:", productError);
            errors.push(`商品更新失败: ${productError.message}`);
        }

        // Update image only if image_url is explicitly provided (not just undefined)
        // Check if image_url key exists in the request body
        if (Object.prototype.hasOwnProperty.call(body, 'image_url')) {
            try {
                // Delete existing images
                await supabaseAdmin.from("product_images").delete().eq("product_id", id);

                // Insert new image if provided
                if (image_url) {
                    const { error: insertImgError } = await supabaseAdmin.from("product_images").insert({
                        product_id: id,
                        image_url,
                        is_primary: true,
                        sort_order: 0,
                    });
                    if (insertImgError) {
                        console.error("Insert image error:", insertImgError);
                        errors.push(`图片更新失败: ${insertImgError.message}`);
                    }
                }
            } catch (imgErr) {
                console.error("Image update error:", imgErr);
                errors.push(`图片更新异常: ${String(imgErr)}`);
            }
        }

        // Update price only if price_amount or promotion_price is explicitly provided
        const shouldUpdatePrice = Object.prototype.hasOwnProperty.call(body, 'price_amount') ||
            (has_discount && Object.prototype.hasOwnProperty.call(body, 'promotion_price'));

        // Determine effective price based on discount status
        const effectivePrice = has_discount ? promotion_price : price_amount;

        if (shouldUpdatePrice && effectivePrice !== undefined && effectivePrice !== "") {
            try {
                // Get all existing prices for this product (without spec_combination for simple products)
                const { data: existingPrices } = await supabaseAdmin
                    .from("product_prices")
                    .select("id")
                    .eq("product_id", id)
                    .is("spec_combination", null);

                if (existingPrices && existingPrices.length > 0) {
                    // Update the first price record and delete the rest
                    const [firstPrice, ...restPrices] = existingPrices;

                    // Update the first price
                    const { error: updatePriceError } = await supabaseAdmin
                        .from("product_prices")
                        .update({ price_amount: parseFloat(effectivePrice) })
                        .eq("id", firstPrice.id);

                    if (updatePriceError) {
                        console.error("Update price error:", updatePriceError);
                        errors.push(`价格更新失败: ${updatePriceError.message}`);
                    }

                    // Delete duplicate prices (if any)
                    if (restPrices.length > 0) {
                        const restPriceIds = restPrices.map(p => p.id);
                        await supabaseAdmin
                            .from("product_prices")
                            .delete()
                            .in("id", restPriceIds);
                    }
                } else {
                    // Insert new price if none exists
                    const { error: insertPriceError } = await supabaseAdmin.from("product_prices").insert({
                        product_id: id,
                        price_amount: parseFloat(effectivePrice),
                        currency: "CNY",
                        is_active: true,
                    });
                    if (insertPriceError) {
                        console.error("Insert price error:", insertPriceError);
                        errors.push(`价格更新失败: ${insertPriceError.message}`);
                    }
                }
            } catch (priceErr) {
                console.error("Price update error:", priceErr);
                errors.push(`价格更新异常: ${String(priceErr)}`);
            }
        }

        // Return success with warnings if there were non-critical errors
        if (errors.length > 0 && productError) {
            return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
        }

        // Return success with id and slug - Requirements: 7.3, 7.4
        return NextResponse.json({
            success: true,
            data: { id, slug: slug || null },
            warnings: errors.length > 0 ? errors : undefined
        });
    } catch (err) {
        console.error("PUT error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

// DELETE - Delete product
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
        }

        // Delete product files from Storage first (before cascade delete removes DB records)
        // Requirements: 1.5, 6.3
        const fileCleanupResult = await deleteProductFiles(id);
        if (!fileCleanupResult.success) {
            console.error("File cleanup errors:", fileCleanupResult.errors);
            // Continue with product deletion even if file cleanup has warnings
            // The database cascade will still clean up the file records
        }

        // Delete related data first (cascade should handle this, but being explicit)
        await supabaseAdmin.from("product_images").delete().eq("product_id", id);
        await supabaseAdmin.from("product_prices").delete().eq("product_id", id);
        await supabaseAdmin.from("product_specs").delete().eq("product_id", id);
        await supabaseAdmin.from("product_videos").delete().eq("product_id", id);

        // Delete product
        const { error } = await supabaseAdmin.from("products").delete().eq("id", id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            filesDeleted: fileCleanupResult.deletedCount,
            fileCleanupWarnings: fileCleanupResult.errors.length > 0 ? fileCleanupResult.errors : undefined
        });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
