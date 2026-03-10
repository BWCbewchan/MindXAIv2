import { useChatStore } from "@/store/chat-store";
import { Code, File as FileIcon, ImageIcon, Paperclip, Send, Square, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { VoiceInput } from "./voice-input";

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    onSendMessage,
    isLoading,
    placeholder = "Hỏi AI điều gì đó...",
}) => {
    const [message, setMessage] = useState("");
    const [attachments, setAttachments] = useState<File[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const { chatWidth, isEditorMode, setEditorMode, stopGeneration } = useChatStore();

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [message]);

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        const pastedFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1 || items[i].kind === "file") {
                const file = items[i].getAsFile();
                if (file) {
                    pastedFiles.push(file);
                }
            }
        }

        if (pastedFiles.length > 0) {
            setAttachments(prev => [...prev, ...pastedFiles]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
            // Reset input value so the same file can be selected again
            e.target.value = "";
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if ((message.trim() || attachments.length > 0) && !isLoading) {
            // Tạm thời mock việc gửi file bằng cách thêm tên file vào message
            // (Khi tích hợp API thật, sẽ cần sửa onSendMessage để nhận thêm mảng File)
            let finalMessage = message.trim();
            if (attachments.length > 0) {
                const fileNames = attachments.map(a => a.name || "image.png").join(", ");
                finalMessage = finalMessage + (finalMessage ? "\n\n" : "") + `[Đã đính kèm: ${fileNames}]`;
            }
            if (finalMessage) {
                onSendMessage(finalMessage);
            }

            setMessage("");
            setAttachments([]);
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="p-4 z-10 relative bg-transparent">
            <div
                className="mx-auto transition-all duration-300"
                style={{ width: `${chatWidth}%` }}
            >
                {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3 p-2 bg-gray-50 rounded-2xl border border-gray-200">
                        {attachments.map((file, index) => (
                            <div key={index} className="relative group bg-white border border-gray-200 rounded-xl p-2 flex items-center gap-2 pr-8 shadow-sm max-w-[200px]">
                                <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg shrink-0">
                                    {file.type.includes('image') ? <ImageIcon size={16} /> : <FileIcon size={16} />}
                                </div>
                                <span className="text-xs font-medium text-gray-700 truncate">
                                    {file.name || "Pasted image"}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeAttachment(index)}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <form
                    id="tour-chat-input"
                    onSubmit={handleSubmit}
                    className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-3xl p-2 transition-all focus-within:bg-white focus-within:border-blue-300 focus-within:shadow-[0_0_0_4px_rgba(108,155,210,0.1)]"
                >
                    {/* Hidden inputs */}
                    <input
                        type="file"
                        multiple
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        ref={imageInputRef}
                        onChange={handleFileChange}
                    />

                    <div className="flex items-center gap-1 pl-2 pb-1.5">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors flex-shrink-0"
                            title="Đính kèm file"
                        >
                            <Paperclip size={20} />
                        </button>
                        <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors flex-shrink-0"
                            title="Tải ảnh lên"
                        >
                            <ImageIcon size={20} />
                        </button>
                    </div>

                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder={placeholder}
                        disabled={isLoading}
                        className="flex-1 max-h-[120px] min-h-[44px] bg-transparent border-none resize-none py-3 px-1 focus:outline-none custom-scrollbar text-gray-700 placeholder:text-gray-400 font-medium"
                        rows={1}
                    />

                    <div className="flex items-center gap-1 pb-1.5 pr-1">
                        <button
                            id="tour-live-editor-toggle"
                            type="button"
                            onClick={() => setEditorMode(!isEditorMode)}
                            className={`p-2 rounded-full transition-colors flex-shrink-0 ${isEditorMode ? "text-emerald-500 bg-emerald-50" : "text-gray-400 hover:text-emerald-500 hover:bg-emerald-50"}`}
                            title={isEditorMode ? "Tắt chế độ Live Editor" : "Bật chế độ Live Editor (Code Sandbox)"}
                        >
                            <Code size={20} />
                        </button>

                        <VoiceInput
                            onTranscript={(text) => {
                                setMessage(prev => {
                                    const newText = prev ? prev + " " + text : text;
                                    return newText;
                                });
                                // Tự động focus lại vào input sau khi nhận diện xong
                                setTimeout(() => textareaRef.current?.focus(), 100);
                            }}
                            disabled={isLoading}
                        />
                        {isLoading ? (
                            <button
                                type="button"
                                onClick={stopGeneration}
                                className="p-3 rounded-full flex-shrink-0 transition-all bg-red-500 text-white hover:bg-red-600 hover:shadow-md hover:-translate-y-0.5"
                                title="Dừng tạo câu trả lời"
                            >
                                <Square size={18} className="fill-white" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={(!message.trim() && attachments.length === 0) || isLoading}
                                className={`p-3 rounded-full flex-shrink-0 transition-all ${
                                    (message.trim() || attachments.length > 0) && !isLoading
                                        ? "bg-blue-500 text-white hover:bg-blue-600 hover:shadow-md hover:-translate-y-0.5"
                                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                }`}
                            >
                                <Send size={18} className={(message.trim() || attachments.length > 0) && !isLoading ? "ml-0.5" : ""} />
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};
