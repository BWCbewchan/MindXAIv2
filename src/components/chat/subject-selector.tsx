import { BookOpen, Code, Gamepad2, Globe, Sparkles } from "lucide-react";
import React from "react";

interface SubjectSelectorProps {
    subjects: Array<{ id: string; name: string; icon: string; color: string; description: string }>;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}

export const SubjectSelector: React.FC<SubjectSelectorProps> = ({
    subjects,
    selectedId,
    onSelect,
}) => {
    // Map icons
    const getIcon = (name: string, colorClass: string) => {
        const props = { size: 24, className: colorClass };
        if (name.toLowerCase().includes("python") || name.toLowerCase().includes("programming") || name.toLowerCase().includes("lập trình")) return <Code {...props} />;
        if (name.toLowerCase().includes("game")) return <Gamepad2 {...props} />;
        if (name.toLowerCase().includes("web")) return <Globe {...props} />;
        if (name.toLowerCase().includes("computer") || name.toLowerCase().includes("khoa học máy tính")) return <Sparkles {...props} />;
        return <BookOpen {...props} />;
    };

    const getColorClasses = (colorHex: string) => {
        // Determine tailwind color classes based on hex values from DB
        if (colorHex === "#6C9BD2") return { bg: "bg-blue-50", border: "border-blue-200", hover: "hover:border-blue-300", icon: "text-blue-500", active: "bg-blue-100 border-blue-400" };
        if (colorHex === "#9B72CF") return { bg: "bg-purple-50", border: "border-purple-200", hover: "hover:border-purple-300", icon: "text-purple-500", active: "bg-purple-100 border-purple-400" };
        if (colorHex === "#4ECDC4") return { bg: "bg-green-50", border: "border-green-200", hover: "hover:border-green-300", icon: "text-green-500", active: "bg-green-100 border-green-400" };
        if (colorHex === "#F4A261") return { bg: "bg-orange-50", border: "border-orange-200", hover: "hover:border-orange-300", icon: "text-orange-500", active: "bg-orange-100 border-orange-400" };
        return { bg: "bg-gray-50", border: "border-gray-200", hover: "hover:border-gray-300", icon: "text-gray-500", active: "bg-gray-100 border-gray-400" };
    };

    return (
        <div className="w-full">
            <h3 className="font-bold text-gray-700 mb-3 px-2 flex items-center gap-2">
                <span>Chọn môn học bạn muốn hỏi:</span>
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {subjects.map((subject) => {
                    const colors = getColorClasses(subject.color);
                    const isActive = selectedId === subject.id;

                    return (
                        <button
                            key={subject.id}
                            onClick={() => onSelect(isActive ? null : subject.id)}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all transform hover:-translate-y-1 ${isActive
                                    ? `${colors.active} shadow-md scale-105`
                                    : `bg-white ${colors.border} shadow-sm ${colors.hover}`
                                }`}
                        >
                            <div className={`p-3 rounded-full mb-2 bg-white shadow-sm ${isActive ? 'animate-bounce' : ''}`}>
                                {getIcon(subject.name, colors.icon)}
                            </div>
                            <span className={`font-bold text-sm text-center ${isActive ? colors.icon : 'text-gray-600'}`}>
                                {subject.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
