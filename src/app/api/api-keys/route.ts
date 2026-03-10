import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    // Return keys with masked API key for security
    const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const masked = data?.map((key) => ({
        ...key,
        api_key_display: key.api_key.slice(0, 8) + "..." + key.api_key.slice(-4),
    }));

    return NextResponse.json(masked);
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { key_name, api_key, daily_limit } = body;

    if (!api_key) {
        return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("api_keys")
        .insert({
            key_name: key_name || "API Key",
            api_key,
            daily_limit: daily_limit || 1000,
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
    const body = await request.json();
    const { id, ...updates } = body;

    // Don't allow updating api_key through this endpoint
    delete updates.api_key;

    const { data, error } = await supabase
        .from("api_keys")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
