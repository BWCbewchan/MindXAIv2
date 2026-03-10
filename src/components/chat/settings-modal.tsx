import { useChatStore } from "@/store/chat-store";
import { BarChart2, BookOpen, Bot, ChevronDown, ClipboardCopy, Code, Columns, Copy, ExternalLink, FilePlus, FolderOpen, FolderUp, Globe, ImageIcon, Key, Keyboard, Lightbulb, MessageSquare, Mic, Paperclip, PenLine, Play, Sparkles, Square, Target, Terminal, ThumbsDown, ThumbsUp, X, Zap } from "lucide-react";
import React, { useEffect, useState } from "react";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab }) => {
    const [activeTab, setActiveTab] = useState(initialTab ?? "personalization");
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

    // ESC key closes the modal
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    // Sync tab when modal opens with a specific initial tab
    useEffect(() => {
        if (isOpen && initialTab) setActiveTab(initialTab);
    }, [isOpen, initialTab]);

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
                        <div className="h-px bg-gray-100 my-2" />
                        <button
                            onClick={() => setActiveTab("guide")}
                            className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "guide" ? "bg-white shadow-sm text-violet-600" : "text-gray-600 hover:bg-gray-100"}`}
                        >
                            <BookOpen size={14} />
                            Hướng dẫn
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

                        {activeTab === "guide" && (
                            <section className="animate-fade-in">
                                <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-3">
                                    <BookOpen size={18} className="text-violet-500" />
                                    <h3 className="text-lg font-semibold text-gray-800">Hướng dẫn sử dụng</h3>
                                </div>

                                {/* ── CHAT AI ── */}
                                <GuideSection icon={<MessageSquare size={14} />} title="Chat AI" color="blue">
                                    <GuideItem icon={<Sparkles size={15} />} title="Gửi tin nhắn">
                                        Gõ câu hỏi vào ô nhập liệu phía dưới rồi nhấn <Kbd>Enter</Kbd> để gửi. Dùng <Kbd>Shift+Enter</Kbd> để xuống dòng mà không gửi. Trong khi AI đang trả lời, nhấn nút dừng <Square size={11} className="inline-block text-red-500 mx-0.5" /> màu đỏ để ngắt ngay lập tức.
                                    </GuideItem>
                                    <GuideItem icon={<FolderOpen size={15} />} title="Quản lý hội thoại">
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>Thanh sidebar bên trái (<strong>☰</strong>) liệt kê toàn bộ lịch sử các cuộc trò chuyện.</li>
                                            <li>Nhấn <strong>+ Chat mới</strong> ở đầu sidebar để tạo cuộc trò chuyện mới từ đầu.</li>
                                            <li>Nhấp vào tên bất kỳ cuộc hội thoại để tiếp tục nội dung cũ.</li>
                                            <li>Nhấn biểu tượng thùng rác bên cạnh tên để xóa vĩnh viễn hội thoại đó.</li>
                                            <li>Nhấn nút thu/mở sidebar để ẩn khi cần thêm không gian đọc.</li>
                                        </ul>
                                    </GuideItem>
                                    <GuideItem icon={<Target size={15} />} title="Chọn chủ đề học">
                                        Ở màn hình chào, chọn một môn học (Python, Game, Web…) để AI thu hẹp trọng tâm trả lời vào lĩnh vực đó. Các gợi ý câu hỏi sẽ tự động thay đổi theo môn đã chọn. Nhấn lại để bỏ chọn và quay về chế độ tổng hợp.
                                    </GuideItem>
                                    <GuideItem icon={<Lightbulb size={15} />} title="Gợi ý câu hỏi nhanh">
                                        Phía trên ô nhập liệu hiển thị 4 gợi ý câu hỏi phù hợp với môn học đã chọn. Nhấp vào một gợi ý để điền sẵn vào ô chat — có thể chỉnh sửa thêm trước khi gửi.
                                    </GuideItem>
                                    <GuideItem icon={<Paperclip size={15} />} title="Đính kèm file tài liệu">
                                        Nhấn <Paperclip size={12} className="inline-block mx-0.5 text-gray-500" /> để đính kèm bất kỳ file nào (PDF, Word, Excel, TXT…). AI sẽ đọc nội dung và trả lời dựa trên tài liệu đó. Có thể đính kèm nhiều file cùng lúc.
                                    </GuideItem>
                                    <GuideItem icon={<ImageIcon size={15} />} title="Đính kèm và dán ảnh">
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>Nhấn <ImageIcon size={11} className="inline-block mx-0.5 text-gray-500" /> để chọn file ảnh từ máy (JPG, PNG, GIF…).</li>
                                            <li>Hoặc dán ảnh trực tiếp bằng <Kbd>Ctrl+V</Kbd> vào ô nhập liệu — ảnh tự động đính kèm.</li>
                                            <li>AI có thể nhận diện, phân tích nội dung, mô tả và trả lời câu hỏi về ảnh.</li>
                                        </ul>
                                    </GuideItem>
                                    <GuideItem icon={<Mic size={15} />} title="Nhập bằng giọng nói">
                                        Nhấn biểu tượng micro <Mic size={11} className="inline-block mx-0.5 text-gray-500" /> ở ô nhập liệu để bắt đầu ghi âm. Nói rõ câu hỏi — văn bản sẽ được chuyển đổi và điền tự động. Nhấn lại để dừng và gửi.
                                    </GuideItem>
                                    <GuideItem icon={<Code size={15} />} title="Chế độ Live Editor (Sandbox)">
                                        Nhấn nút <Code size={11} className="inline-block mx-0.5 text-emerald-500" /> góc phải ô nhập để bật <strong>Live Editor</strong>. Khi bật, AI sẽ ưu tiên viết code có thể chạy ngay — kết quả hiển thị trực tiếp trong cửa sổ chat mà không cần mở IDE riêng. Phù hợp khi cần thử nhanh HTML, CSS hoặc đoạn code ngắn.
                                    </GuideItem>
                                    <GuideItem icon={<ClipboardCopy size={15} />} title="Sao chép code và phản hồi">
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>Hover vào khối code bất kỳ để thấy nút <strong>Copy</strong> góc phải — sao chép toàn bộ code chỉ một click.</li>
                                            <li>Hover vào bong bóng tin nhắn AI để thấy nút <Copy size={11} className="inline-block mx-0.5" /> sao chép toàn bộ nội dung đó.</li>
                                            <li>Nút <ThumbsUp size={11} className="inline-block mx-0.5 text-green-500" /> / <ThumbsDown size={11} className="inline-block mx-0.5 text-red-500" /> giúp gửi phản hồi về chất lượng câu trả lời.</li>
                                        </ul>
                                    </GuideItem>
                                </GuideSection>

                                {/* ── IDE: OVERVIEW ── */}
                                <GuideSection icon={<Zap size={14} />} title="IDE Trực Tuyến" color="violet">
                                    <GuideItem icon={<ExternalLink size={15} />} title="Mở IDE">
                                        Nhấn nút <strong>IDE</strong> góc trên bên phải trang Chat để sang màn hình chọn công cụ. Có 3 công cụ: <strong>Python Script</strong>, <strong>Jupyter Notebook</strong> và <strong>Web Sandbox</strong>. Nhấp vào thẻ công cụ để vào giao diện lập trình tương ứng.
                                    </GuideItem>
                                    <GuideItem icon={<Terminal size={15} />} title="Python Script">
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li><strong>Explorer file</strong> bên trái: quản lý nhiều file <code className="bg-gray-100 px-1 rounded text-xs">.py</code> hoặc <code className="bg-gray-100 px-1 rounded text-xs">.ipynb</code>.</li>
                                            <li>Nhấn <FilePlus size={11} className="inline-block mx-0.5" /> trên Explorer để thêm file mới — nhấp đúp tên file để đổi tên.</li>
                                            <li>Nhấn <Kbd>Ctrl+Enter</Kbd> hoặc nút <Play size={11} className="inline-block mx-0.5 text-green-600" /> <strong>Run</strong> để chạy code trong Terminal bên dưới.</li>
                                            <li>Kéo thanh phân cách giữa Editor và Terminal để điều chỉnh tỉ lệ.</li>
                                            <li><strong>Panel STDIN:</strong> khi code dùng <code className="bg-gray-100 px-1 rounded text-xs">input()</code>, ô nhập xuất hiện tự động để điền giá trị.</li>
                                            <li>Nút <strong>Xóa output</strong> và <strong>Restart</strong> để reset trạng thái Python runtime.</li>
                                        </ul>
                                    </GuideItem>
                                    <GuideItem icon={<BookOpen size={15} />} title="Jupyter Notebook">
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>Giao diện kiểu Colab: mỗi <strong>cell</strong> là một đơn vị code hoặc Markdown độc lập.</li>
                                            <li>Nhấn <Kbd>Shift+Enter</Kbd> hoặc nút <Play size={11} className="inline-block mx-0.5 text-blue-500" /> bên trái cell để chạy và chuyển xuống cell tiếp.</li>
                                            <li>Nút <strong>+Code</strong> thêm cell Python mới; <strong>+Markdown</strong> thêm cell văn bản có định dạng (tiêu đề, in đậm, danh sách…).</li>
                                            <li>Nút <strong>Chạy tất cả</strong> <Play size={11} className="inline-block mx-0.5" /> trên toolbar chạy toàn bộ notebook theo thứ tự từ trên xuống.</li>
                                            <li>Biểu đồ <strong>matplotlib</strong> tự động hiển thị inline ngay dưới cell tạo ra chúng.</li>
                                            <li>Nhấn nút <PenLine size={11} className="inline-block mx-0.5" /> trên cell Markdown để chỉnh sửa, nhấn <Play size={11} className="inline-block mx-0.5" /> để render lại.</li>
                                        </ul>
                                    </GuideItem>
                                    <GuideItem icon={<Globe size={15} />} title="Web Sandbox">
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>Editor code gồm 3 file mặc định: <code className="bg-gray-100 px-1 rounded text-xs">/index.html</code>, <code className="bg-gray-100 px-1 rounded text-xs">/css/style.css</code>, <code className="bg-gray-100 px-1 rounded text-xs">/js/main.js</code>.</li>
                                            <li>Preview cập nhật <strong>tự động</strong> mỗi khi bạn chỉnh sửa code — không cần nhấn nút.</li>
                                            <li>Nút <strong>Preview</strong> xem kết quả toàn màn hình; nút <Columns size={11} className="inline-block mx-0.5" /> <strong>Split</strong> chia đôi Editor và Preview song song.</li>
                                            <li>Tích hợp sẵn: Bootstrap 5, FontAwesome, jQuery, Google Fonts — dùng trực tiếp trong HTML không cần cài thêm.</li>
                                            <li>Nút <strong>Mở trong tab mới</strong> để xem Preview toàn trang riêng biệt.</li>
                                        </ul>
                                    </GuideItem>
                                    <GuideItem icon={<Bot size={15} />} title="AI Agent trong IDE">
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>Nhấn nút <Bot size={11} className="inline-block mx-0.5 text-violet-500" /> <strong>Agent</strong> góc trên phải IDE để mở sidebar trò chuyện với AI.</li>
                                            <li>AI <strong>tự động đọc code hiện tại</strong> và trả lời theo đúng ngữ cảnh — không cần dán code vào chat.</li>
                                            <li>Gõ yêu cầu (ví dụ: <em>"Thêm tính năng sắp xếp"</em>) — AI viết code và áp thẳng vào editor để xem trước.</li>
                                            <li>Thanh xác nhận xuất hiện ở đầu editor: nhấn <strong className="text-green-600">Accept</strong> để giữ lại thay đổi, hoặc <strong className="text-red-500">Discard</strong> để hoàn tác về code cũ.</li>
                                            <li>Nút <Paperclip size={11} className="inline-block mx-0.5" /> <strong>Gửi kèm code</strong> ở đáy sidebar: đính kèm toàn bộ code hiện tại vào tin nhắn tiếp theo để AI xem lại chính xác hơn.</li>
                                            <li>Nhấn <strong>Xóa</strong> trên header sidebar để reset lịch sử trò chuyện với Agent.</li>
                                        </ul>
                                    </GuideItem>
                                </GuideSection>

                                {/* ── KNOWLEDGE ── */}
                                <GuideSection icon={<BookOpen size={14} />} title="Kiến thức & Quản trị" color="green">
                                    <GuideItem icon={<FolderUp size={15} />} title="Tải tài liệu lên cơ sở kiến thức">
                                        Vào <strong>Admin</strong> → tab <strong>Kiến thức</strong> và tải file PDF hoặc Word. Hệ thống xử lý tài liệu thành từng đoạn nhỏ và lưu vào cơ sở dữ liệu vector. Khi người dùng hỏi câu hỏi liên quan, AI sẽ tự động tìm kiếm và sử dụng nội dung tài liệu này để trả lời chính xác hơn.
                                    </GuideItem>
                                    <GuideItem icon={<BarChart2 size={15} />} title="Thống kê sử dụng">
                                        Tab <strong>Thống kê</strong> trong Admin hiển thị: tổng số cuộc hội thoại, tổng token đã dùng, chi phí API ước tính và lượng tài liệu đang lưu trữ.
                                    </GuideItem>
                                    <GuideItem icon={<Key size={15} />} title="Quản lý API Key">
                                        Vào <strong>Admin → API Keys</strong> để thêm API key Gemini mới, tạm khóa (disable) hoặc xóa key cũ. Có thể thêm nhiều key để phân tải hoặc dự phòng khi key chính hết hạn mức.
                                    </GuideItem>
                                </GuideSection>

                                {/* ── SHORTCUTS ── */}
                                <GuideSection icon={<Keyboard size={14} />} title="Phím tắt" color="gray">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        {[
                                            ["Enter", "Gửi tin nhắn (Chat)"],
                                            ["Shift+Enter", "Xuống dòng (Chat)"],
                                            ["Ctrl+V", "Dán ảnh vào Chat"],
                                            ["Esc", "Đóng modal / hội thoại"],
                                            ["Ctrl+Enter", "Chạy code (Python IDE)"],
                                            ["Shift+Enter", "Chạy cell (Notebook)"],
                                            ["Ctrl+Z", "Hoàn tác trong editor"],
                                            ["Ctrl+Shift+Z", "Làm lại (Redo) trong editor"],
                                            ["Tab", "Thụt lề code (editor)"],
                                            ["Shift+Tab", "Bỏ thụt lề code"],
                                        ].map(([key, desc]) => (
                                            <div key={key} className="flex items-center gap-2">
                                                <Kbd>{key}</Kbd>
                                                <span className="text-gray-600 text-xs">{desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </GuideSection>
                            </section>
                        )}

                        {activeTab === "advanced" && (
                            <section className="mb-10 animate-fade-in">
                                <div className="flex items-center border-b border-gray-100 pb-2 mb-4">
                                    <h3 className="text-lg font-medium text-gray-800">Nâng cao</h3>
                                </div>
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

// Guide sub-components
const COLOR_MAP: Record<string, string> = {
    blue:   "text-blue-600 border-blue-100 bg-blue-50/60",
    violet: "text-violet-600 border-violet-100 bg-violet-50/60",
    green:  "text-green-600 border-green-100 bg-green-50/60",
    gray:   "text-gray-600 border-gray-100 bg-gray-50/60",
};

const GuideSection: React.FC<{ icon?: React.ReactNode; title: string; color: string; children: React.ReactNode }> = ({ icon, title, color, children }) => (
    <div className={`mb-5 rounded-xl border p-4 ${COLOR_MAP[color] ?? "border-gray-100 bg-gray-50"}`}>
        <div className={`flex items-center gap-1.5 font-semibold text-sm mb-3 ${COLOR_MAP[color]?.split(" ")[0] ?? "text-gray-700"}`}>
            {icon && <span className="shrink-0">{icon}</span>}
            {title}
        </div>
        <div className="space-y-3">{children}</div>
    </div>
);

const GuideItem: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="flex gap-2.5">
        <span className="mt-0.5 shrink-0 [&>svg]:w-[15px] [&>svg]:h-[15px]">{icon}</span>
        <div>
            <div className="text-sm font-medium text-gray-800 mb-0.5">{title}</div>
            <div className="text-xs text-gray-600 leading-relaxed">{children}</div>
        </div>
    </div>
);

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 border border-gray-300 text-xs font-mono text-gray-700 shadow-sm">{children}</kbd>
);
