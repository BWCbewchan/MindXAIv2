import { Chat, Subject } from "@/store/chat-store";
import { HelpCircle, Library, MessageCircle, MessageSquarePlus, Trash2 } from "lucide-react";
import { useNextStep } from "nextstepjs";
import React from "react";

interface ChatSidebarProps {
    chats: Chat[];
    subjects: Subject[];
    currentChatId: string | null;
    selectedSubjectId: string | null;
    onSelectChat: (id: string) => void;
    onSelectSubject: (id: string | null) => void;
    onNewChat: () => void;
    onDeleteChat: (id: string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onOpenSettings: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
    chats,
    subjects,
    currentChatId,
    selectedSubjectId,
    onSelectChat,
    onSelectSubject,
    onNewChat,
    onDeleteChat,
    isOpen,
    setIsOpen,
    onOpenSettings,
}) => {
    const { startNextStep } = useNextStep();

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-20 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar sidebar */}
            <div
                className={`fixed md:static inset-y-0 left-0 z-30 w-72 bg-[#F5F0E8] border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                    }`}
            >
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-6 px-2">
                        <div className="bg-white p-2 rounded-xl shadow-sm text-blue-500">
                            <Library size={24} />
                        </div>
                        <h1 className="text-xl font-bold font-display text-gray-800 tracking-tight">AI4Student</h1>
                    </div>

                    <button
                        onClick={() => {
                            onNewChat();
                            if (window.innerWidth < 768) setIsOpen(false);
                        }}
                        className="w-full btn-primary flex items-center justify-center gap-2 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                        <MessageSquarePlus size={20} />
                        Hội thoại mới
                    </button>
                </div>

                {/* Subjects Filter */}
                <div className="px-4 mb-2">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-2">Môn học</h2>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => onSelectSubject(null)}
                            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${selectedSubjectId === null
                                ? "bg-gray-800 text-white shadow-sm"
                                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                                }`}
                        >
                            Tất cả
                        </button>
                        {subjects.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => onSelectSubject(s.id)}
                                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${selectedSubjectId === s.id
                                    ? "bg-white shadow-sm ring-2 ring-blue-400"
                                    : "bg-white/60 text-gray-600 hover:bg-white border border-gray-200"
                                    }`}
                                style={{
                                    color: selectedSubjectId === s.id ? s.color : undefined,
                                }}
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 mt-2">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-4">Lịch sử trò chuyện</h2>

                    {chats.length === 0 ? (
                        <div className="text-center p-4 text-sm text-gray-500 bg-white/50 rounded-xl mx-2">
                            Chưa có trò chuyện nào. Bắt đầu ngay nhé! 🚀
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {chats.map((chat) => (
                                <div
                                    key={chat.id}
                                    className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${currentChatId === chat.id
                                        ? "bg-white shadow-sm font-bold text-blue-600 border border-blue-100"
                                        : "text-gray-600 hover:bg-white/80 font-medium"
                                        }`}
                                    onClick={() => {
                                        onSelectChat(chat.id);
                                        if (window.innerWidth < 768) setIsOpen(false);
                                    }}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <MessageCircle size={18} className={currentChatId === chat.id ? "text-blue-500" : "text-gray-400"} />
                                        <span className="truncate text-sm">{chat.title || "New Chat"}</span>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteChat(chat.id);
                                        }}
                                        className={`p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors ${currentChatId === chat.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                            }`}
                                        title="Xóa trò chuyện"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bottom Actions (Hướng dẫn + Settings) */}
                <div className="p-4 border-t border-gray-200 mt-auto flex flex-col gap-1">
                    <button
                        onClick={() => startNextStep('mainTour')}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 rounded-xl transition-colors"
                    >
                        <div className="bg-white p-1.5 rounded-lg shadow-sm text-blue-500">
                            <HelpCircle size={18} />
                        </div>
                        Hướng dẫn sử dụng
                    </button>

                    <button
                        id="tour-settings-button"
                        onClick={onOpenSettings}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 rounded-xl transition-colors"
                    >
                        <div className="bg-white p-1.5 rounded-lg shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </div>
                        Cài đặt
                    </button>
                </div>
            </div>
        </>
    );
};
