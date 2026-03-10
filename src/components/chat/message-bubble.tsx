import { Message } from "@/store/chat-store";
import { Bot, Brain, User } from "lucide-react";
import React from "react";
import { MarkdownRenderer } from "./markdown-renderer";
import { useTypewriter } from "./use-typewriter";

interface MessageBubbleProps {
    message: Message;
    isTyping?: boolean;
    animate?: boolean; // Cờ kiểm soát xem có chạy hiệu ứng gốc không
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    isTyping = false,
    animate = false,
}) => {
    const isUser = message.role === "user";

    // Gắn hook typewriter cho tin nhắn hiện tại
    const { displayedText } = useTypewriter(message.content, 15, animate && !isUser);

    return (
        <div className={`flex w-full mb-6 ${isUser ? "justify-end" : "justify-start"}`}>
            <div
                className={`flex gap-3 ${isUser
                        ? "max-w-[95%] sm:max-w-[90%] md:max-w-[85%] lg:max-w-[80%]"
                        : "w-full min-w-0"
                    } ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
                {/* Avatar */}
                <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${isUser ? "bg-orange-100 text-orange-500" : "bg-blue-100 text-blue-500"
                        }`}
                >
                    {isUser ? <User size={20} /> : <Bot size={20} />}
                </div>

                {/* Container for Bubble & Timestamp */}
                <div className={`flex flex-col gap-1 min-w-0 ${isUser ? "items-end" : "items-start flex-1"}`}>
                    {/* Bubble */}
                    <div
                        className={`${isUser ? "message-user" : "message-ai w-full"}`}
                    >
                        {isTyping ? (
                            <div className="flex items-center space-x-1 py-1 px-2">
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                            </div>
                        ) : (
                            <>
                                {isUser ? (
                                    <div className="whitespace-pre-wrap font-medium">{message.content}</div>
                                ) : (
                                    <div className={`transition-opacity duration-300 ${displayedText ? 'opacity-100' : 'opacity-0'}`}>
                                        <MarkdownRenderer content={displayedText} />
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Timestamp & Tokens */}
                    {!isTyping && (
                        <div
                            className={`text-[10px] mt-1 flex gap-2 text-gray-400 px-1`}
                        >
                            {message.tokens_used > 0 && !isUser && (
                                <span title="Kiến thức AI đã xử lý" className="flex items-center gap-1">
                                    <Brain size={11} /> {message.tokens_used} tokens
                                </span>
                            )}
                            <span>
                                {new Date(message.created_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
