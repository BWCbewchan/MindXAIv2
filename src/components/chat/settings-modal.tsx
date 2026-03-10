import { useChatStore } from "@/store/chat-store";
import { ChevronDown, X } from "lucide-react";
import React, { useState } from "react";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState("personalization");
    const [baseTone, setBaseTone] = useState("Thân thiện");
    const [isToneDropdownOpen, setIsToneDropdownOpen] = useState(false);

    // States for Traits
    const [traits, setTraits] = useState<Record<string, string>>({
        "Ấm áp": "Bình thường",
        "Nhiệt tình": "Bình thường",
        "Tiêu đề và danh sách": "Bình thường",
        "Biểu tượng cảm xúc": "Bình thường"
    });
    const [openTraitDropdown, setOpenTraitDropdown] = useState<string | null>(null);
    const traitOptions = ["Giảm đi", "Bình thường", "Tăng lên", "Tối đa"];

    // Mock states for toggles
    const [toggles, setToggles] = useState({
        saveMemory: true,
        useHistory: true,
        webSearch: true,
        canvas: true,
        voice: true,
        advancedVoice: true,
        connectorSearch: false,
    });

    const { chatWidth, setChatWidth } = useChatStore();

    const handleToggle = (key: keyof typeof toggles) => {
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (!isOpen) return null;

    const toneOptions = [
        "Mặc định", "Chuyên nghiệp", "Thân thiện",
        "Thẳng thắn", "Cá tính", "Hiệu quả",
        "Ham học hỏi", "Giễu cợt"
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800 tracking-tight">Cài đặt</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-48 bg-gray-50/50 border-r border-gray-100 p-4 flex flex-col gap-1 hidden sm:flex">
                        <button
                            onClick={() => setActiveTab("personalization")}
                            className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "personalization" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:bg-gray-100"}`}
                        >
                            Cá nhân hóa
                        </button>
                        <button
                            onClick={() => setActiveTab("appearance")}
                            className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "appearance" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:bg-gray-100"}`}
                        >
                            Giao diện
                        </button>
                        <button
                            onClick={() => setActiveTab("memory")}
                            className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "memory" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:bg-gray-100"}`}
                        >
                            Bộ nhớ
                        </button>
                        <button
                            onClick={() => setActiveTab("advanced")}
                            className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "advanced" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:bg-gray-100"}`}
                        >
                            Nâng cao
                        </button>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">

                        {activeTab === "personalization" && (
                            <>
                                {/* Section: Cá nhân hóa */}
                                <section className="mb-10 animate-fade-in">
                                    <h3 className="text-lg font-medium text-gray-800 mb-6 border-b border-gray-100 pb-2">Cá nhân hóa</h3>

                                    {/* Tone Dropdown */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700">Phong cách và giọng điệu cơ bản</h4>
                                            <p className="text-xs text-gray-500 mt-1 max-w-[250px]">Thiết lập phong cách phản hồi của AI.</p>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsToneDropdownOpen(!isToneDropdownOpen)}
                                                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-blue-100 outline-none"
                                            >
                                                {baseTone}
                                                <ChevronDown size={16} className="text-gray-400" />
                                            </button>

                                            {isToneDropdownOpen && (
                                                <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-10 py-1 max-h-48 overflow-y-auto">
                                                    {toneOptions.map(tone => (
                                                        <button
                                                            key={tone}
                                                            onClick={() => {
                                                                setBaseTone(tone);
                                                                setIsToneDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-2 text-sm ${baseTone === tone ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                                        >
                                                            {tone}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100 my-4" />

                                    {/* Traits toggles */}
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700">Đặc điểm</h4>
                                            <p className="text-xs text-gray-500 mt-1">Chọn các tùy chỉnh bổ sung dựa trên phong cách cơ bản.</p>
                                        </div>

                                        {Object.keys(traits).map((trait) => (
                                            <div key={trait} className="flex items-center justify-between">
                                                <span className="text-sm text-gray-700">{trait}</span>
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setOpenTraitDropdown(openTraitDropdown === trait ? null : trait)}
                                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 rounded-lg transition-all shadow-sm"
                                                    >
                                                        {traits[trait]} <ChevronDown size={14} className="text-gray-400 ml-1" />
                                                    </button>
                                                    {openTraitDropdown === trait && (
                                                        <div className="absolute top-full right-0 mt-1 w-36 bg-white border border-gray-100 rounded-xl shadow-lg z-10 py-1">
                                                            {traitOptions.map(option => (
                                                                <button
                                                                    key={option}
                                                                    onClick={() => {
                                                                        setTraits(prev => ({ ...prev, [trait]: option }));
                                                                        setOpenTraitDropdown(null);
                                                                    }}
                                                                    className={`w-full text-left px-4 py-2 text-xs ${traits[trait] === option ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                                                >
                                                                    {option}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-6 mb-2">
                                        <label className="text-sm font-medium text-gray-700 block mb-2">Hướng dẫn tùy chỉnh</label>
                                        <textarea
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none resize-y min-h-[80px] custom-scrollbar"
                                            placeholder="Tùy chỉnh thêm về hành vi, phong cách và giọng điệu"
                                        />
                                    </div>
                                </section>

                                {/* Section: Thông tin về bạn */}
                                <section className="mb-10 animate-fade-in">
                                    <h3 className="text-lg font-medium text-gray-800 mb-6 border-b border-gray-100 pb-2">Thông tin về bạn</h3>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-2">Biệt danh</label>
                                            <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" placeholder="AI nên gọi bạn là gì?" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-2">Nghề nghiệp</label>
                                            <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none" placeholder="Ví dụ: Lập trình viên, Học sinh..." />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-2">Thêm thông tin về bạn</label>
                                            <textarea
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none resize-y min-h-[80px]"
                                                placeholder="Sở thích, giá trị hoặc những điểm ưu tiên khi trò chuyện?"
                                            />
                                        </div>
                                    </div>
                                </section>
                            </>
                        )}

                        {activeTab === "appearance" && (
                            <section className="mb-6 animate-fade-in">
                                <h3 className="text-lg font-medium text-gray-800 mb-6 border-b border-gray-100 pb-2">Giao diện</h3>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 block mb-2">Độ rộng đoạn chat: {chatWidth}%</label>
                                        <input
                                            type="range"
                                            min="50"
                                            max="100"
                                            step="5"
                                            value={chatWidth}
                                            onChange={(e) => setChatWidth(Number(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                                            <span>Thu hẹp (50%)</span>
                                            <span>Mở rộng (100%)</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-3">Điều chỉnh khoảng cách hai bên của vùng hiển thị tin nhắn.</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === "memory" && (
                            <section className="mb-10 animate-fade-in">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4">
                                    <h3 className="text-lg font-medium text-gray-800">Bộ nhớ</h3>
                                    <button className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all">
                                        Quản lý
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <ToggleRow
                                        title="Tham khảo bộ nhớ đã lưu"
                                        description="Cho phép AI lưu và sử dụng bộ nhớ khi phản hồi."
                                        checked={toggles.saveMemory}
                                        onChange={() => handleToggle("saveMemory")}
                                    />
                                    <ToggleRow
                                        title="Tham khảo lịch sử đoạn chat"
                                        description="Cho phép AI tham khảo tất cả các cuộc trò chuyện trước đó khi phản hồi."
                                        checked={toggles.useHistory}
                                        onChange={() => handleToggle("useHistory")}
                                    />
                                </div>
                            </section>
                        )}

                        {activeTab === "advanced" && (
                            <section className="mb-6 animate-fade-in">
                                <h3 className="text-lg font-medium text-gray-800 mb-4 border-b border-gray-100 pb-2">Nâng cao</h3>

                                <div className="space-y-4">
                                    <ToggleRow
                                        title="Tìm kiếm trên mạng"
                                        description="Cho phép tự động tìm kiếm trên web để tìm câu trả lời."
                                        checked={toggles.webSearch}
                                        onChange={() => handleToggle("webSearch")}
                                    />
                                    <ToggleRow
                                        title="Canvas"
                                        description="Cộng tác với AI trên văn bản và thiết kế."
                                        checked={toggles.canvas}
                                        onChange={() => handleToggle("canvas")}
                                    />
                                    <ToggleRow
                                        title="Chế độ thoại"
                                        description="Kích hoạt trò chuyện bằng giọng nói."
                                        checked={toggles.voice}
                                        onChange={() => handleToggle("voice")}
                                    />
                                    <ToggleRow
                                        title="Thoại nâng cao"
                                        description="Trò chuyện tự nhiên và mượt mà hơn ở Chế độ thoại."
                                        checked={toggles.advancedVoice}
                                        onChange={() => handleToggle("advancedVoice")}
                                    />
                                    <ToggleRow
                                        title="Tìm kiếm trình kết nối"
                                        description="Tự động tìm kiếm các nguồn chuyên sâu được kết nối."
                                        checked={toggles.connectorSearch}
                                        onChange={() => handleToggle("connectorSearch")}
                                    />
                                </div>
                            </section>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper component for Toggle settings
const ToggleRow = ({ title, description, checked, onChange }: { title: string, description: string, checked: boolean, onChange: () => void }) => {
    return (
        <label className="flex items-center justify-between gap-4 cursor-pointer group">
            <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{title}</div>
                <div className="text-xs text-gray-500 mt-0.5 max-w-[90%] leading-relaxed">{description}</div>
            </div>
            <div className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-within:ring-2 focus-within:ring-blue-200">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                    className="peer sr-only"
                />
                <span className={`absolute left-0 h-5 w-9 rounded-full transition-colors ${checked ? "bg-blue-500" : "bg-gray-200"}`} />
                <span className={`absolute left-[2px] h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0"} shadow-sm`} />
            </div>
        </label>
    );
};
