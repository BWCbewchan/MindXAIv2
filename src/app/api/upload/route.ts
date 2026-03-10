import { parseDocument } from "@/lib/document-parser";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const subjectId = formData.get("subject_id") as string;
        const title = formData.get("title") as string;

        if (!file) {
            return NextResponse.json({ error: "File is required" }, { status: 400 });
        }

        if (!subjectId) {
            return NextResponse.json({ error: "Subject ID is required" }, { status: 400 });
        }

        // Parse document
        const { text, filename } = await parseDocument(file);

        if (!text || text.trim().length === 0) {
            return NextResponse.json(
                { error: "Could not extract text from the document" },
                { status: 400 }
            );
        }

        // Store in knowledge table
        const { data, error } = await supabase
            .from("knowledge")
            .insert({
                subject_id: subjectId,
                title: title || filename,
                content: text.trim(),
                source_filename: filename,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data,
            textLength: text.length,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
