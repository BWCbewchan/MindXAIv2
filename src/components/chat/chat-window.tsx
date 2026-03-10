"use client";

import { useChatStore } from "@/store/chat-store";
import { Bot } from "lucide-react";
import { useNextStep } from "nextstepjs";
import { useCallback, useEffect, useRef } from "react";
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
    const { startNextStep } = useNextStep();

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true);
    const prevMessagesLengthRef = useRef(messages.length);

    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        // Thêm khoảng cách 150px làm ngưỡng để phát hiện đang ở dưới cùng
        isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
    }, []);

    useEffect(() => {
        const isNewUserMessage = messages.length > prevMessagesLengthRef.current && messages[messages.length - 1]?.role === "user";
        // Dùng instant "auto" snapping khi đang stream (isSending = true)
        const behavior = isSending ? "auto" : "smooth";

        // Chỉ auto-scroll nếu đang ở dưới cùng hoặc vừa gửi tin nhắn mới
        if (isNewUserMessage || isAtBottomRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior });
        }

        prevMessagesLengthRef.current = messages.length;
    }, [messages, isSending]);

    // Tự động start tour khi lần đầu người dùng vào app
    useEffect(() => {
        const hasSeenTour = localStorage.getItem('sparky_tour_seen');
        if (!hasSeenTour) {
            // Delay 1 chút để UI kịp render DOM elements
            const timer = setTimeout(() => {
                startNextStep('mainTour');
                localStorage.setItem('sparky_tour_seen', 'true');
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [startNextStep]);

    const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
    const showWelcome = messages.length === 0 && !isLoading;

    return (
        <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 h-full"
        >
            <div
                className="h-full flex flex-col mx-auto transition-all duration-300"
                style={{ width: `${chatWidth}%` }}
            >
                {showWelcome ? (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in py-10">
                        <div className="bg-white p-6 rounded-full shadow-sm mb-6 border border-blue-100">
                            <Bot size={48} className="text-blue-500" />
                        </div>

                        <h2 id="tour-welcome-title" className="text-3xl font-display font-bold text-gray-800 mb-2 text-center">
                            Xin chào! Mình là Mind<span className="text-red-500">X</span> AI
                        </h2>
                        <p className="text-lg text-gray-500 mb-10 text-center max-w-lg">
                            Trợ lý học tập AI siêu cấp của bạn. Bạn muốn chúng ta cùng tìm hiểu về điều gì hôm nay?
                        </p>

                        <div id="tour-subject-selector" className="w-full max-w-3xl bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
                            <SubjectSelector
                                subjects={subjects}
                                selectedId={selectedSubjectId}
                                onSelect={selectSubject}
                            />
                        </div>

                        <div id="tour-prompt-suggestions" className="w-full">
                            <PromptSuggestions
                                subjectName={selectedSubject?.name}
                                onSelectPrompt={sendMessage}
                            />
                        </div>
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
