"use client";

import { Check, Mic, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

// Định nghĩa types cho Web Speech API
interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onerror: (this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any;
    onend: (this: SpeechRecognition, ev: Event) => any;
    onresult: (this: SpeechRecognition, ev: SpeechRecognitionEvent) => any;
}

interface WindowWithSpeech extends Window {
    SpeechRecognition?: { new(): SpeechRecognition };
    webkitSpeechRecognition?: { new(): SpeechRecognition };
}

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    disabled?: boolean;
}

function createRecognition(): SpeechRecognition | null {
    if (typeof window === "undefined") return null;
    const Api =
        (window as WindowWithSpeech).SpeechRecognition ||
        (window as WindowWithSpeech).webkitSpeechRecognition;
    if (!Api) return null;
    const r = new Api();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "vi-VN";
    return r;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, disabled = false }) => {
    const [isSupported, setIsSupported] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [finalText, setFinalText] = useState("");
    const [interimText, setInterimText] = useState("");
    const [editedText, setEditedText] = useState("");

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const supported = !!(
            (window as WindowWithSpeech).SpeechRecognition ||
            (window as WindowWithSpeech).webkitSpeechRecognition
        );
        if (!supported) setIsSupported(false);
    }, []);

    // ESC key closes the popup
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleCancel(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen]);

    // Sync editable text whenever speech produces new results
    useEffect(() => {
        const combined = finalText + interimText;
        setEditedText(combined);
        // Auto-scroll textarea
        if (textareaRef.current) {
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
    }, [finalText, interimText]);

    const startNewSession = () => {
        // Luôn tạo instance mới để tránh lỗi khi start lại sau khi ended
        const r = createRecognition();
        if (!r) return;

        r.onresult = (event) => {
            let fin = "";
            let int = "";
            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    fin += event.results[i][0].transcript;
                } else {
                    int += event.results[i][0].transcript;
                }
            }
            setFinalText(fin);
            setInterimText(int);
        };

        r.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            setIsRecording(false);
            if (event.error === "not-allowed") {
                alert("Vui lòng cấp quyền Microphone cho trình duyệt.");
            }
        };

        r.onend = () => {
            setIsRecording(false);
            setInterimText("");
        };

        recognitionRef.current = r;
        r.start();
        setIsRecording(true);
    };

    const handleMicClick = () => {
        if (isOpen) return;
        setFinalText("");
        setInterimText("");
        setEditedText("");
        setIsOpen(true);
        startNewSession();
    };

    const handleToggle = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            startNewSession();
        }
    };

    const handleAccept = () => {
        const full = editedText.trim();
        if (full) onTranscript(full + " ");
        recognitionRef.current?.abort();
        setIsOpen(false);
        setFinalText("");
        setInterimText("");
        setEditedText("");
        setIsRecording(false);
    };

    const handleCancel = () => {
        recognitionRef.current?.abort();
        setIsOpen(false);
        setFinalText("");
        setInterimText("");
        setEditedText("");
        setIsRecording(false);
    };

    if (!isSupported) {
        return (
            <button
                type="button"
                disabled
                className="p-2 text-gray-300 rounded-full flex-shrink-0 cursor-not-allowed"
                title="Trình duyệt không hỗ trợ nhận diện giọng nói"
            >
                <Mic size={20} />
            </button>
        );
    }

    const displayText = editedText;

    return (
        <div className="relative flex items-center justify-center">

            {/* ── Compact popup phía trên input ── */}
            {isOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">

                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-shrink-0">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isRecording ? "bg-rose-100" : "bg-gray-200"}`}>
                                    <Mic size={12} className={isRecording ? "text-rose-500 animate-pulse" : "text-gray-400"} />
                                </div>
                                {isRecording && (
                                    <span className="absolute inset-0 rounded-full border border-rose-400 animate-ping opacity-60" />
                                )}
                            </div>
                            <span className="text-xs font-medium text-gray-600">
                                {isRecording ? "Đang nghe…" : "Đã dừng"}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Transcript — editable textarea */}
                    <div className="px-3 pt-2.5 pb-1">
                        <textarea
                            ref={textareaRef}
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            placeholder={isRecording ? "Hãy nói gì đó…" : "Không có nội dung"}
                            className="w-full min-h-[80px] max-h-[160px] resize-none text-sm text-gray-800 leading-relaxed bg-transparent border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-300 transition-colors"
                            rows={4}
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50 gap-2">
                        <button
                            type="button"
                            onClick={handleToggle}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                isRecording
                                    ? "bg-rose-100 text-rose-600 hover:bg-rose-200"
                                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                            }`}
                        >
                            <Mic size={11} />
                            {isRecording ? "Dừng" : "Ghi tiếp"}
                        </button>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleAccept}
                                disabled={!displayText.trim()}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
                            >
                                <Check size={11} />
                                Dùng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Mic trigger button ── */}
            <button
                type="button"
                onClick={handleMicClick}
                disabled={disabled || isOpen}
                className={`p-2 rounded-full transition-all flex-shrink-0 relative ${
                    isRecording
                        ? "text-rose-500 bg-rose-50 hover:bg-rose-100"
                        : isOpen
                            ? "text-blue-500 bg-blue-50"
                            : "text-gray-400 hover:text-rose-500 hover:bg-rose-50"
                }`}
                title={isRecording ? "Đang lắng nghe…" : isOpen ? "Đang duyệt văn bản" : "Nhập bằng giọng nói"}
            >
                <Mic size={20} className={isRecording ? "animate-pulse" : ""} />
                {isRecording && (
                    <span className="absolute inset-0 rounded-full border-2 border-rose-400 animate-ping opacity-75" />
                )}
            </button>

            <style>{`
                @keyframes vc-blink { 0%,100%{opacity:1} 50%{opacity:0} }
            `}</style>
        </div>
    );
};
