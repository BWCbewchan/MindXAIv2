import { BrainCircuit, Code, Gamepad2, Globe, Lightbulb } from "lucide-react";
import React from "react";

interface PromptSuggestionsProps {
    onSelectPrompt: (prompt: string) => void;
    subjectName?: string;
}

export const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({
    onSelectPrompt,
    subjectName,
}) => {
    // Default general prompts
    let prompts = [
        { title: "Vòng lặp là gì?", hint: "Lập trình", icon: Code, color: "text-blue-500", bg: "bg-blue-50" },
        { title: "Làm sao để tạo một game xếp hình?", hint: "Game dev", icon: Gamepad2, color: "text-purple-500", bg: "bg-purple-50" },
        { title: "Internet hoạt động thế nào?", hint: "Kiến thức chung", icon: Globe, color: "text-green-500", bg: "bg-green-50" },
        { title: "Trí tuệ nhân tạo là gì?", hint: "Khoa học máy tính", icon: BrainCircuit, color: "text-orange-500", bg: "bg-orange-50" },
    ];

    // Specific prompts based on subject
    if (subjectName?.toLowerCase().includes("python") || subjectName?.toLowerCase().includes("programming") || subjectName?.toLowerCase().includes("lập trình")) {
        prompts = [
            { title: "Kiểu dữ liệu trong Python là gì?", hint: "Python cơ bản", icon: Code, color: "text-blue-500", bg: "bg-blue-50" },
            { title: "Giải thích vòng lặp for và while trong Python", hint: "Python cơ bản", icon: Code, color: "text-blue-500", bg: "bg-blue-50" },
            { title: "Hàm (def) trong Python hoạt động thế nào?", hint: "Trung bình", icon: Code, color: "text-blue-500", bg: "bg-blue-50" },
            { title: "List, tuple và dictionary khác nhau thế nào?", hint: "Python cơ bản", icon: Code, color: "text-blue-500", bg: "bg-blue-50" },
        ];
    } else if (subjectName?.toLowerCase().includes("game")) {
        prompts = [
            { title: "Cách làm nhân vật di chuyển?", hint: "GameMaker", icon: Gamepad2, color: "text-purple-500", bg: "bg-purple-50" },
            { title: "Làm sao để tạo một sprite?", hint: "Đồ họa", icon: Gamepad2, color: "text-purple-500", bg: "bg-purple-50" },
            { title: "Cách tính điểm trong game?", hint: "Logic", icon: Gamepad2, color: "text-purple-500", bg: "bg-purple-50" },
            { title: "Va chạm (collision) hoạt động thế nào?", hint: "Vật lý", icon: Gamepad2, color: "text-purple-500", bg: "bg-purple-50" },
        ];
    } else if (subjectName?.toLowerCase().includes("web")) {
        prompts = [
            { title: "HTML, CSS và JS khác nhau thế nào?", hint: "Cơ bản", icon: Globe, color: "text-green-500", bg: "bg-green-50" },
            { title: "Cách đổi màu chữ bằng CSS?", hint: "Giao diện", icon: Globe, color: "text-green-500", bg: "bg-green-50" },
            { title: "Làm sao để tạo một nút bấm (button)?", hint: "Tương tác", icon: Globe, color: "text-green-500", bg: "bg-green-50" },
            { title: "Website lưu trữ lên mạng bằng cách nào?", hint: "Hosting", icon: Globe, color: "text-green-500", bg: "bg-green-50" },
        ];
    }

    return (
        <div className="w-full max-w-3xl mx-auto my-8 animate-fade-in">
            <div className="flex items-center gap-2 mb-4 text-gray-500 font-medium px-2">
                <Lightbulb size={20} className="text-yellow-500" />
                <p>Gợi ý câu hỏi cho {subjectName || "bạn"}:</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prompts.map((prompt, index) => {
                    const Icon = prompt.icon;
                    return (
                        <button
                            key={index}
                            onClick={() => onSelectPrompt(prompt.title)}
                            className="flex flex-col text-left p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all group"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-xl ${prompt.bg} ${prompt.color} group-hover:scale-110 transition-transform`}>
                                    <Icon size={18} />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                    {prompt.hint}
                                </span>
                            </div>
                            <p className="font-semibold text-gray-700 leading-snug">
                                "{prompt.title}"
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
