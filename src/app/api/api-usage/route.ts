import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
    const today = new Date().toISOString().split("T")[0];

    // Get all keys with today's usage
    const { data: keys } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at");

    // Get today's usage logs aggregated by key
    const { data: todayLogs } = await supabase
        .from("api_usage_logs")
        .select("*")
        .gte("request_timestamp", `${today}T00:00:00`);

    // Calculate per-key stats
    const keyStats = keys?.map((key) => {
        const keyLogs = todayLogs?.filter((l) => l.api_key_id === key.id) || [];
        const successLogs = keyLogs.filter((l) => l.status === "success");
        const errorLogs = keyLogs.filter((l) => l.status === "error");

        const avgResponseTime = successLogs.length > 0
            ? Math.round(successLogs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / successLogs.length)
            : 0;

        const totalTokens = successLogs.reduce((sum, l) => sum + (l.tokens_used || 0), 0);

        return {
            id: key.id,
            key_name: key.key_name,
            is_active: key.is_active,
            daily_limit: key.daily_limit,
            today_requests: keyLogs.length,
            today_success: successLogs.length,
            today_errors: errorLogs.length,
            success_rate: keyLogs.length > 0 ? Math.round((successLogs.length / keyLogs.length) * 100) : 100,
            avg_response_time: avgResponseTime,
            total_tokens: totalTokens,
            remaining_quota: key.daily_limit - keyLogs.length,
            health_score: calculateHealthScore(successLogs.length, errorLogs.length, avgResponseTime),
        };
    }) || [];

    // Aggregate totals
    const totals = {
        total_requests_today: todayLogs?.length || 0,
        total_success: todayLogs?.filter((l) => l.status === "success").length || 0,
        total_errors: todayLogs?.filter((l) => l.status === "error").length || 0,
        overall_success_rate: todayLogs && todayLogs.length > 0
            ? Math.round((todayLogs.filter((l) => l.status === "success").length / todayLogs.length) * 100)
            : 100,
        avg_response_time: todayLogs && todayLogs.length > 0
            ? Math.round(
                todayLogs
                    .filter((l) => l.status === "success")
                    .reduce((sum, l) => sum + (l.response_time_ms || 0), 0) /
                Math.max(todayLogs.filter((l) => l.status === "success").length, 1)
            )
            : 0,
        total_tokens: todayLogs?.reduce((sum, l) => sum + (l.tokens_used || 0), 0) || 0,
        active_keys: keys?.filter((k) => k.is_active).length || 0,
        total_keys: keys?.length || 0,
    };

    // Hourly breakdown for chart
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
        const hourLogs = todayLogs?.filter((l) => {
            const logHour = new Date(l.request_timestamp).getHours();
            return logHour === hour;
        }) || [];

        return {
            hour,
            requests: hourLogs.length,
            success: hourLogs.filter((l) => l.status === "success").length,
            errors: hourLogs.filter((l) => l.status === "error").length,
        };
    });

    // Get recent errors
    const recentErrors = todayLogs
        ?.filter((l) => l.status === "error")
        .sort((a, b) => new Date(b.request_timestamp).getTime() - new Date(a.request_timestamp).getTime())
        .slice(0, 50)
        .map(l => ({
            id: l.id,
            timestamp: l.request_timestamp,
            key_name: keys?.find(k => k.id === l.api_key_id)?.key_name || 'Unknown',
            error_message: l.error_message
        })) || [];

    return NextResponse.json({ totals, keyStats, hourlyData, recentErrors });
}

function calculateHealthScore(success: number, errors: number, avgResponseTime: number): number {
    const total = success + errors;
    if (total === 0) return 100;

    const successRate = success / total;
    const responseScore = avgResponseTime < 1000 ? 1 : avgResponseTime < 3000 ? 0.7 : 0.4;
    const score = Math.round(successRate * 70 + responseScore * 30);

    return Math.min(100, Math.max(0, score));
}
