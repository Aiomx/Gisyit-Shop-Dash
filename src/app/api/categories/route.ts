import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin-client";

// GET - Fetch categories
export async function GET() {
    const { data, error } = await supabaseAdmin
        .from("product_categories")
        .select("*")
        .order("store_section")
        .order("sort_order");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
}

// POST - Create category
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, slug, store_section, section_id, sort_order } = body;

        const { data, error } = await supabaseAdmin
            .from("product_categories")
            .insert({
                name,
                slug,
                store_section,
                section_id,
                sort_order: sort_order || 0,
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

// PUT - Update category
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, name, slug, store_section, section_id, sort_order } = body;

        if (!id) {
            return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from("product_categories")
            .update({ name, slug, store_section, section_id, sort_order })
            .eq("id", id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

// DELETE - Delete category
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
        }

        const { error } = await supabaseAdmin.from("product_categories").delete().eq("id", id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
