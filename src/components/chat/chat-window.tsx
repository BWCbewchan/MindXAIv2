"use client";

import { useChatStore } from "@/store/chat-store";
import { Bot } from "lucide-react";
import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { PromptSuggestions } from "./prompt-suggestions";
import { SubjectSelector } from "./subject-selector";

export const ChatWindow = () => {
    const {
        messages,
        subjects,
        selectedSubjectId,
        isLoading,
        isSending,
        chatWidth,
        selectSubject,
        sendMessage,
    } = useChatStore();

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        // Use smooth scrolling only when a new message starts (isSending changes),
        // but use instant "auto" snapping when chunks are streamed (messages change heavily).
        const behavior = isSending ? "auto" : "smooth";
        scrollToBottom(behavior);
    }, [messages, isSending]);

    const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
    const showWelcome = messages.length === 0 && !isLoading;

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 h-full">
            <div
                className="h-full flex flex-col mx-auto transition-all duration-300"
                style={{ width: `${chatWidth}%` }}
            >
                {showWelcome ? (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in py-10">
                        <div className="bg-white p-6 rounded-full shadow-sm mb-6 border border-blue-100">
                            <Bot size={48} className="text-blue-500" />
                        </div>

                        <h2 className="text-3xl font-display font-bold text-gray-800 mb-2 text-center">
                            Xin chào! Mình là Sparky 🤖
                        </h2>
                        <p className="text-lg text-gray-500 mb-10 text-center max-w-lg">
                            Trợ lý học tập AI siêu cấp của bạn. Bạn muốn chúng ta cùng tìm hiểu về điều gì hôm nay?
                        </p>

                        <div className="w-full max-w-3xl bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
                            <SubjectSelector
                                subjects={subjects}
                                selectedId={selectedSubjectId}
                                onSelect={selectSubject}
                            />
                        </div>

                        <PromptSuggestions
                            subjectName={selectedSubject?.name}
                            onSelectPrompt={sendMessage}
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col pb-6">
                        {messages.map((message) => (
                            <MessageBubble key={message.id} message={message} />
                        ))}

                        {isSending && (
                            <MessageBubble
                                message={{
                                    id: "loading",
                                    chat_id: "",
                                    role: "assistant",
                                    content: "",
                                    tokens_used: 0,
                                    created_at: new Date().toISOString(),
                                }}
                                isTyping={true}
                            />
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                )}
            </div>
        </div>
    );
};
