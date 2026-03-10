"use client";

import { ChatInput } from "@/components/chat/chat-input";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { SettingsModal } from "@/components/chat/settings-modal";
import { useChatStore } from "@/store/chat-store";
import { BookOpen, Code2, Menu, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ChatPage() {
    const {
        chats,
        subjects,
        currentChatId,
        selectedSubjectId,
        isSending,
        loadSubjects,
        loadChats,
        selectChat,
        selectSubject,
        setCurrentChatId,
        deleteChat,
        sendMessage,
    } = useChatStore();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<string | undefined>(undefined);

    // Initial load
    useEffect(() => {
        loadSubjects();
        loadChats();
    }, [loadSubjects, loadChats]);

    // Handle URL params for direct chat navigation (if needed)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const chatId = urlParams.get("id");
        if (chatId) {
            selectChat(chatId);
        }
    }, [selectChat]);

    // Update URL without reload when chat changes
    useEffect(() => {
        if (currentChatId) {
            window.history.replaceState({}, "", `/chat?id=${currentChatId}`);
        } else {
            window.history.replaceState({}, "", `/chat`);
        }
    }, [currentChatId]);

    return (
        <div className="flex h-screen overflow-hidden bg-white selection:bg-blue-100 selection:text-blue-900">
            <ChatSidebar
                chats={chats}
                subjects={subjects}
                currentChatId={currentChatId}
                selectedSubjectId={selectedSubjectId}
                onSelectChat={selectChat}
                onSelectSubject={selectSubject}
                onNewChat={() => setCurrentChatId(null)}
                onDeleteChat={deleteChat}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                onOpenSettings={() => setIsSettingsOpen(true)}
                isDesktopCollapsed={isDesktopCollapsed}
                onToggleCollapse={() => setIsDesktopCollapsed(c => !c)}
            />

            <main className="flex-1 flex flex-col relative h-full bg-[#FFF8F0]/30 min-w-0">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center px-4 py-3 bg-white border-b border-gray-100 z-10 sticky top-0">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 text-gray-500 hover:text-blue-500 rounded-lg"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="flex-1 text-center font-display font-bold text-gray-800">
                        Sparky AI
                    </div>
                    <Link
                        href="/ide"
                        className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-xl text-violet-600 text-xs font-semibold hover:bg-violet-100 transition-colors"
                    >
                        <Code2 size={14} />
                        IDE
                    </Link>
                </div>

                {/* Desktop expand button — visible only when sidebar is collapsed */}
                {isDesktopCollapsed && (
                    <button
                        onClick={() => setIsDesktopCollapsed(false)}
                        className="hidden md:flex absolute top-3 left-3 z-20 items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-500 hover:text-blue-500 hover:border-blue-300 transition-all text-xs font-medium"
                        title="Mở sidebar"
                    >
                        <PanelLeftOpen size={16} />
                    </button>
                )}

                {/* Desktop IDE button — top-right */}
                <Link
                    id="tour-ide-button"
                    href="/ide"
                    className="hidden md:flex absolute top-3 right-4 z-20 items-center gap-1.5 px-3 py-1.5 bg-white border border-violet-200 rounded-xl shadow-sm text-violet-600 hover:bg-violet-50 hover:border-violet-400 transition-all text-xs font-semibold"
                    title="Mở IDE"
                >
                    <Code2 size={14} />
                    IDE
                </Link>

                {/* Desktop Help button */}
                <button
                    onClick={() => { setSettingsTab("guide"); setIsSettingsOpen(true); }}
                    className="hidden md:flex absolute top-3 right-20 z-20 items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-all text-xs font-semibold"
                    title="Hướng dẫn sử dụng"
                >
                    <BookOpen size={14} />
                    Hướng dẫn
                </button>

                <ChatWindow />

                <ChatInput
                    onSendMessage={sendMessage}
                    isLoading={isSending}
                />
            </main>

            {/* Settings Modal */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => { setIsSettingsOpen(false); setSettingsTab(undefined); }}
                initialTab={settingsTab}
            />
        </div>
    );
}
