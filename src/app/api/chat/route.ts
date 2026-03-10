import { buildSystemPrompt } from "@/lib/ai-config";
import { streamFromGemini } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { message, chatId, subjectId, history, isEditorMode } = await request.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Build system prompt with knowledge context and editor mode
        const systemPrompt = await buildSystemPrompt(subjectId, isEditorMode);

        // Get Stream generator
        const streamGenerator = streamFromGemini(message, systemPrompt, history || []);

        const encoder = new TextEncoder();

        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of streamGenerator) {
                        if (chunk) {
                            controller.enqueue(encoder.encode(chunk));
                        }
                    }

                    // Note: We don't currently expose tokensUsed or responseTimeMs through 
                    // this basic stream. That info can be logged server-side 
                    // within streamFromGemini instead.
                } catch (e) {
                    controller.error(e);
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(readableStream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
