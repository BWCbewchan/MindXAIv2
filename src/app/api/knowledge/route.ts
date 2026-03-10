import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const subjectId = request.nextUrl.searchParams.get("subject_id");

    let query = supabase.from("knowledge").select("*, subjects(name, icon)").order("created_at", { ascending: false });

    if (subjectId) {
        query = query.eq("subject_id", subjectId);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { subject_id, title, content, source_filename } = body;

    const { data, error } = await supabase
        .from("knowledge")
        .insert({ subject_id, title, content, source_filename })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
    const body = await request.json();
    const { id, ...updates } = body;

    const { data, error } = await supabase
        .from("knowledge")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { error } = await supabase.from("knowledge").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
