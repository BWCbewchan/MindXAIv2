import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";

interface ApiKey {
    id: string;
    key_name: string;
    api_key: string;
    is_active: boolean;
    total_requests: number;
    failed_requests: number;
    last_used_at: string | null;
    daily_limit: number;
}

interface GeminiResponse {
    text: string;
    tokensUsed: number;
    responseTimeMs: number;
    apiKeyId: string;
}

export interface ChatMessage {
    role: "user" | "model";
    parts: { text: string }[];
}

// Get the best available API key (least used, active, below daily limit)
async function selectBestApiKey(): Promise<ApiKey | null> {
    const today = new Date().toISOString().split("T")[0];

    // Get all active keys
    const { data: keys, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("is_active", true)
        .order("total_requests", { ascending: true });

    if (error || !keys || keys.length === 0) return null;

    // For each key, check today's usage against daily limit
    for (const key of keys) {
        const { count } = await supabase
            .from("api_usage_logs")
            .select("*", { count: "exact", head: true })
            .eq("api_key_id", key.id)
            .gte("request_timestamp", `${today}T00:00:00`)
            .eq("status", "success");

        const todayCount = count || 0;
        if (todayCount < key.daily_limit) {
            return key;
        }
    }

    return null; // All keys exhausted
}

// Log API usage
async function logUsage(
    apiKeyId: string,
    responseTimeMs: number,
    tokensUsed: number,
    status: "success" | "error",
    errorMessage?: string
) {
    await supabase.from("api_usage_logs").insert({
        api_key_id: apiKeyId,
        response_time_ms: responseTimeMs,
        tokens_used: tokensUsed,
        status,
        error_message: errorMessage,
    });

    // Update key stats
    if (status === "success") {
        await supabase.rpc("increment_key_requests", { key_id: apiKeyId });
    } else {
        await supabase.rpc("increment_key_failures", { key_id: apiKeyId });
    }
}

export async function* streamFromGemini(
    prompt: string,
    systemPrompt: string,
    history: ChatMessage[] = [],
    retryCount = 0
): AsyncGenerator<string, GeminiResponse, unknown> {
    const maxRetries = 3;
    const apiKey = await selectBestApiKey();

    if (!apiKey) {
        throw new Error(
            "No available API keys. Please add or activate a Gemini API key in the admin panel."
        );
    }

    const startTime = Date.now();

    try {
        const genAI = new GoogleGenerativeAI(apiKey.api_key);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt,
        });

        const chat = model.startChat({
            history: history,
        });

        const result = await chat.sendMessageStream(prompt);
        let fullText = "";

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;
            yield chunkText; // Yield each chunk to the client
        }

        const response = await result.response;
        const responseTimeMs = Date.now() - startTime;

        const tokensUsed =
            (response.usageMetadata?.promptTokenCount || 0) +
            (response.usageMetadata?.candidatesTokenCount || 0);

        // Log success
        await logUsage(apiKey.id, responseTimeMs, tokensUsed, "success");

        // Update last_used_at
        await supabase
            .from("api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", apiKey.id);

        return { text: fullText, tokensUsed, responseTimeMs, apiKeyId: apiKey.id };
    } catch (error: unknown) {
        const responseTimeMs = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";

        // Log failure
        await logUsage(apiKey.id, responseTimeMs, 0, "error", errorMsg);

        // If quota exceeded or auth error, deactivate key and retry with next
        if (
            errorMsg.includes("429") ||
            errorMsg.includes("quota") ||
            errorMsg.includes("RESOURCE_EXHAUSTED")
        ) {
            await supabase
                .from("api_keys")
                .update({ is_active: false })
                .eq("id", apiKey.id);
        }

        // Retry with next key
        if (retryCount < maxRetries) {
            return yield* streamFromGemini(prompt, systemPrompt, history, retryCount + 1);
        }

        throw new Error(`All API keys failed. Last error: ${errorMsg}`);
    }
}
