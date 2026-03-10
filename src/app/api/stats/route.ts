import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
    // Total chats & messages
    const { count: totalChats } = await supabase
        .from("chats")
        .select("*", { count: "exact", head: true });

    const { count: totalMessages } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true });

    // Today's stats
    const today = new Date().toISOString().split("T")[0];
    const { count: todayChats } = await supabase
        .from("chats")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00`);

    const { count: todayMessages } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00`);

    // Knowledge stats
    const { count: totalKnowledge } = await supabase
        .from("knowledge")
        .select("*", { count: "exact", head: true });

    // Subject stats
    const { data: subjects } = await supabase.from("subjects").select("id, name, icon, color");

    // Messages per subject
    const subjectStats = await Promise.all(
        (subjects || []).map(async (subject) => {
            const { count: chatCount } = await supabase
                .from("chats")
                .select("*", { count: "exact", head: true })
                .eq("subject_id", subject.id);

            const { count: knowledgeCount } = await supabase
                .from("knowledge")
                .select("*", { count: "exact", head: true })
                .eq("subject_id", subject.id);

            return {
                ...subject,
                chat_count: chatCount || 0,
                knowledge_count: knowledgeCount || 0,
            };
        })
    );

    // Messages per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentMessages } = await supabase
        .from("messages")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at");

    // Aggregate by day
    const dailyStats: Record<string, number> = {};
    recentMessages?.forEach((msg) => {
        const day = msg.created_at.split("T")[0];
        dailyStats[day] = (dailyStats[day] || 0) + 1;
    });

    const dailyTrend = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const dateStr = date.toISOString().split("T")[0];
        return { date: dateStr, messages: dailyStats[dateStr] || 0 };
    });

    // Hourly heatmap
    const { data: allMessages } = await supabase
        .from("messages")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo.toISOString());

    const hourlyHeatmap = Array.from({ length: 24 }, (_, hour) => {
        const count = allMessages?.filter((m) => new Date(m.created_at).getHours() === hour).length || 0;
        return { hour, count };
    });

    // Top questions (recent user messages)
    const { data: topQuestions } = await supabase
        .from("messages")
        .select("content")
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(10);

    // Avg messages per chat
    const avgMessagesPerChat =
        totalChats && totalMessages ? Math.round((totalMessages / totalChats) * 10) / 10 : 0;

    return NextResponse.json({
        overview: {
            totalChats: totalChats || 0,
            todayChats: todayChats || 0,
            totalMessages: totalMessages || 0,
            todayMessages: todayMessages || 0,
            totalKnowledge: totalKnowledge || 0,
            activeSubjects: subjects?.length || 0,
            avgMessagesPerChat,
        },
        subjectStats,
        dailyTrend,
        hourlyHeatmap,
        topQuestions: topQuestions?.map((q) => q.content) || [],
    });
}
