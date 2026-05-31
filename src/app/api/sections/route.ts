import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all sections
export async function GET() {
    try {
        const { data, error } = await supabase
            .from("store_sections")
            .select("*")
            .order("sort_order", { ascending: true });

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Error fetching sections:", error);
        return NextResponse.json(
            { error: "获取板块列表失败" },
            { status: 500 }
        );
    }
}

// POST - Create new section
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, slug, description, icon, color, sort_order, is_active } = body;

        if (!name || !slug) {
            return NextResponse.json(
                { error: "名称和标识不能为空" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("store_sections")
            .insert({
                name,
                slug,
                description,
                icon,
                color,
                sort_order: sort_order || 0,
                is_active: is_active !== false,
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json(
                    { error: "该标识已存在" },
                    { status: 400 }
                );
            }
            throw error;
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Error creating section:", error);
        return NextResponse.json(
            { error: "创建板块失败" },
            { status: 500 }
        );
    }
}

// PUT - Update section
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, name, slug, description, icon, color, sort_order, is_active } = body;

        if (!id) {
            return NextResponse.json(
                { error: "缺少板块ID" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("store_sections")
            .update({
                name,
                slug,
                description,
                icon,
                color,
                sort_order,
                is_active,
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json(
                    { error: "该标识已存在" },
                    { status: 400 }
                );
            }
            throw error;
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Error updating section:", error);
        return NextResponse.json(
            { error: "更新板块失败" },
            { status: 500 }
        );
    }
}

// DELETE - Delete section
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "缺少板块ID" },
                { status: 400 }
            );
        }

        // Check if section has categories
        const { count } = await supabase
            .from("product_categories")
            .select("*", { count: "exact", head: true })
            .eq("section_id", id);

        if (count && count > 0) {
            return NextResponse.json(
                { error: "该板块下还有分类，无法删除" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("store_sections")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting section:", error);
        return NextResponse.json(
            { error: "删除板块失败" },
            { status: 500 }
        );
    }
}
