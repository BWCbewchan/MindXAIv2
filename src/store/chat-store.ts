import { supabase } from "@/lib/supabase";
import { create } from "zustand";

export interface Message {
    id: string;
    chat_id: string;
    role: "user" | "assistant";
    content: string;
    tokens_used: number;
    created_at: string;
}

export interface Chat {
    id: string;
    title: string;
    subject_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface Subject {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
}

interface ChatState {
    // State
    chats: Chat[];
    currentChatId: string | null;
    messages: Message[];
    subjects: Subject[];
    selectedSubjectId: string | null;
    isLoading: boolean;
    isSending: boolean;
    chatWidth: number; // Values from 50 to 100 representing percentage
    isEditorMode: boolean; // Enables the Sandbox Live Editor instructions
    abortController: AbortController | null;

    // Actions
    loadSubjects: () => Promise<void>;
    loadChats: () => Promise<void>;
    loadMessages: (chatId: string) => Promise<void>;
    selectSubject: (subjectId: string | null) => void;
    selectChat: (chatId: string) => Promise<void>;
    createChat: (subjectId?: string) => Promise<string>;
    sendMessage: (content: string) => Promise<void>;
    deleteChat: (chatId: string) => Promise<void>;
    setCurrentChatId: (chatId: string | null) => void;
    setChatWidth: (width: number) => void;
    setEditorMode: (enabled: boolean) => void;
    stopGeneration: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    chats: [],
    currentChatId: null,
    messages: [],
    subjects: [],
    selectedSubjectId: null,
    isLoading: false,
    isSending: false,
    chatWidth: 100,
    isEditorMode: false,
    abortController: null as AbortController | null,

    loadSubjects: async () => {
        const { data } = await supabase
            .from("subjects")
            .select("*")
            .order("name");
        if (data) set({ subjects: data });
    },

    loadChats: async () => {
        const { data } = await supabase
            .from("chats")
            .select("*")
            .order("updated_at", { ascending: false });
        if (data) set({ chats: data });
    },

    loadMessages: async (chatId: string) => {
        set({ isLoading: true });
        const { data } = await supabase
            .from("messages")
            .select("*")
            .eq("chat_id", chatId)
            .order("created_at", { ascending: true });
        if (data) set({ messages: data, isLoading: false });
        else set({ isLoading: false });
    },

    selectSubject: (subjectId: string | null) => {
        set({ selectedSubjectId: subjectId });
    },

    selectChat: async (chatId: string) => {
        set({ currentChatId: chatId });
        await get().loadMessages(chatId);
    },

    setCurrentChatId: (chatId: string | null) => {
        set({ currentChatId: chatId, messages: [] });
    },

    createChat: async (subjectId?: string) => {
        const subject = subjectId || get().selectedSubjectId;
        const subjectData = get().subjects.find((s) => s.id === subject);

        const { data, error } = await supabase
            .from("chats")
            .insert({
                title: subjectData ? `${subjectData.icon} ${subjectData.name}` : "New Chat",
                subject_id: subject || null,
            })
            .select()
            .single();

        if (error || !data) throw new Error("Failed to create chat");

        set((state) => ({
            chats: [data, ...state.chats],
            currentChatId: data.id,
            messages: [],
        }));

        return data.id;
    },

    sendMessage: async (content: string) => {
        const state = get();
        let chatId = state.currentChatId;

        // Create new chat if needed
        if (!chatId) {
            chatId = await get().createChat();
        }

        const controller = new AbortController();
        set({ isSending: true, abortController: controller });

        // Save user message
        const { data: userMsg } = await supabase
            .from("messages")
            .insert({ chat_id: chatId, role: "user", content })
            .select()
            .single();

        if (userMsg) {
            set((state) => ({ messages: [...state.messages, userMsg] }));
        }

        try {
            // Build history from state before adding the new message, filter out errors
            const history = state.messages
                .filter(m => !m.content.startsWith("⚠️"))
                .map(m => ({
                    role: m.role === "user" ? "user" : "model",
                    parts: [{ text: m.content }]
                }));

            // Save a placeholder AI message first
            const aiMessageId = "ai-" + Date.now();
            const aiMsg: Message = {
                id: aiMessageId,
                chat_id: chatId!,
                role: "assistant",
                content: "",
                tokens_used: 0,
                created_at: new Date().toISOString()
            };

            set((state) => ({ messages: [...state.messages, aiMsg] }));

            // Call API Streaming
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    message: content,
                    chatId,
                    subjectId: state.selectedSubjectId,
                    history,
                    isEditorMode: state.isEditorMode,
                }),
            });

            if (!res.ok) {
                let errorMsg = "Không nhận được phản hồi từ AI";
                try {
                    const errJson = await res.json();
                    errorMsg = errJson.error ?? errorMsg;
                } catch {
                    try { errorMsg = await res.text() || errorMsg; } catch { /* ignore */ }
                }
                throw new Error(errorMsg);
            }

            if (!res.body) {
                throw new Error("No response body");
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = "";
            let stopped = false;

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunkText = decoder.decode(value, { stream: true });
                    accumulatedText += chunkText;

                    // Update the UI progressively
                    set((state) => ({
                        messages: state.messages.map((m) =>
                            m.id === aiMessageId ? { ...m, content: accumulatedText } : m
                        ),
                    }));
                }
            } catch (streamErr) {
                if ((streamErr as Error)?.name === "AbortError") {
                    stopped = true;
                } else {
                    throw streamErr;
                }
            }

            // Sync final message to database (even if stopped mid-stream)
            const { data: savedAiMsg } = await supabase
                .from("messages")
                .insert({
                    chat_id: chatId!,
                    role: "assistant",
                    content: accumulatedText,
                    tokens_used: 0, // Streaming API currently doesn't return this in payload
                })
                .select()
                .single();

            if (savedAiMsg) {
                set((state) => ({
                    messages: state.messages.map((m) =>
                        m.id === aiMessageId ? savedAiMsg : m
                    ),
                }));
            }

            // Update chat title if it's the first message and we weren't stopped before any text
            if (state.messages.length === 0 && accumulatedText) {
                const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
                await supabase.from("chats").update({ title, updated_at: new Date().toISOString() }).eq("id", chatId);
                get().loadChats();
            }
        } catch (error) {
            // Ignore AbortError (user stopped generation)
            if ((error as Error)?.name !== "AbortError") {
                const errorContent =
                    error instanceof Error ? error.message : "Something went wrong";
                set((state) => ({
                    messages: [
                        ...state.messages,
                        {
                            id: "error-" + Date.now(),
                            chat_id: chatId!,
                            role: "assistant",
                            content: `⚠️ ${errorContent}`,
                            tokens_used: 0,
                            created_at: new Date().toISOString(),
                        },
                    ],
                }));
            }
        } finally {
            set({ isSending: false, abortController: null });
        }
    },

    stopGeneration: () => {
        const { abortController } = get();
        if (abortController) {
            abortController.abort();
        }
        set({ isSending: false, abortController: null });
    },

    deleteChat: async (chatId: string) => {
        await supabase.from("chats").delete().eq("id", chatId);
        const state = get();
        set({
            chats: state.chats.filter((c) => c.id !== chatId),
            currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
            messages: state.currentChatId === chatId ? [] : state.messages,
        });
    },

    setChatWidth: (width: number) => {
        set({ chatWidth: width });
    },

    setEditorMode: (enabled: boolean) => {
        set({ isEditorMode: enabled });
    },
}));
