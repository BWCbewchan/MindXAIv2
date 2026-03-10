"use client";

import { NextStep, NextStepProvider, Tour } from 'nextstepjs';
import { ReactNode } from 'react';

const steps: Tour[] = [
    {
        tour: 'ideTour',
        steps: [
            {
                icon: '🛠️',
                title: 'IDE Trực Tuyến',
                content: 'Đây là môi trường lập trình trực tuyến. Bạn có thể viết code, chạy Python, làm việc với Jupyter Notebook hoặc xây dựng trang web — tất cả trong trình duyệt.',
                selector: '#tour-ide-tool-label',
                side: 'bottom',
                showControls: true,
                showSkip: true,
            },
            {
                icon: '✍️',
                title: 'Vùng soạn thảo code',
                content: 'Viết code trực tiếp trong vùng này. Python dùng Pyodide (hỗ trợ numpy, matplotlib, pandas). Notebook cho phép chia cell và chạy từng cell bằng Shift+Enter. Web Sandbox có live preview HTML/CSS/JS.',
                selector: '#tour-ide-editor',
                side: 'right',
                showControls: true,
                showSkip: true,
            },
            {
                icon: '🤖',
                title: 'AI Agent',
                content: 'Nhấn nút Agent để mở bảng AI. Mô tả yêu cầu bằng tiếng Việt — AI sẽ viết hoặc chỉnh sửa code cho bạn. Sau đó bạn chọn Accept để giữ lại hoặc Discard để hoàn tác.',
                selector: '#tour-ide-agent',
                side: 'bottom',
                showControls: true,
                showSkip: true,
            },
            {
                icon: '◀',
                title: 'Quay lại danh sách công cụ',
                content: 'Nhấn nút IDE ở góc trái để quay về trang chọn công cụ, nơi bạn có thể chuyển sang Python Script, Jupyter Notebook hoặc Web Sandbox.',
                selector: '#tour-ide-back',
                side: 'bottom',
                showControls: true,
                showSkip: true,
            },
        ]
    },
    {
        tour: 'mainTour',
        steps: [
            {
                icon: '',
                title: 'Chọn chủ đề học',
                content: 'Chọn môn học (Python, Game, Web…) để AI tập trung trả lời đúng lĩnh vực. Các gợi ý câu hỏi bên dưới sẽ thay đổi theo môn bạn chọn. Nhấp lại vào môn đang chọn để bỏ chọn.',
                selector: '#tour-subject-selector',
                side: 'bottom',
                showControls: true,
                showSkip: true,
            },
            {
                icon: '💡',
                title: 'Gợi ý câu hỏi nhanh',
                content: 'Nhấp vào một gợi ý để điền sẵn câu hỏi vào ô chat — bạn có thể chỉnh sửa thêm trước khi gửi. Nội dung gợi ý thay đổi theo môn học đã chọn.',
                selector: '#tour-prompt-suggestions',
                side: 'top',
                showControls: true,
                showSkip: true,
            },
            {
                icon: '✏️',
                title: 'Ô nhập tin nhắn',
                content: 'Gõ câu hỏi và nhấn Enter để gửi (Shift+Enter để xuống dòng). Hỗ trợ dán ảnh trực tiếp bằng Ctrl+V. Khi AI đang trả lời, nút đỏ trên thanh này giúp dừng tạo ngay lập tức.',
                selector: '#tour-chat-input',
                side: 'top',
                showControls: true,
                showSkip: true,
            },
            {
                icon: '📎',
                title: 'Đính kèm file & ảnh',
                content: 'Nhấn biểu tượng kẹp giấy để đính kèm file PDF, Word, Excel… hoặc biểu tượng ảnh để tải ảnh lên. AI sẽ đọc và phân tích nội dung tài liệu trước khi trả lời.',
                selector: '#tour-attach-buttons',
                side: 'top',
                showControls: true,
                showSkip: true,
            },
            {
                icon: '🎙️',
                title: 'Nhập bằng giọng nói',
                content: 'Nhấn biểu tượng micro để bắt đầu ghi âm giọng nói. Văn bản sẽ tự động chuyển đổi và điền vào ô nhập — tiện lợi khi không muốn gõ bàn phím.',
                selector: '#tour-voice-input',
                side: 'top',
                showControls: true,
                showSkip: true,
            },
            {
                icon: '🖥️',
                title: 'Chế độ Live Editor',
                content: 'Bật nút này để AI viết code có thể chạy ngay trong cửa sổ chat — xem kết quả HTML/CSS/JS tức thì. Phù hợp để thử nhanh mà không cần mở IDE riêng.',
                selector: '#tour-live-editor-toggle',
                side: 'top',
                showControls: true,
                showSkip: true,
            },
            {
                icon: '📂',
                title: 'Lịch sử hội thoại',
                content: 'Thanh bên trái lưu toàn bộ các cuộc trò chuyện trước đây. Nhấn tên để tiếp tục, nhấn biểu tượng thùng rác để xóa. Dùng nút "+ Chat mới" ở đầu danh sách để bắt đầu cuộc trò chuyện mới.',
                selector: '#tour-chat-history',
                side: 'right',
                showControls: true,
                showSkip: true,
            },
            {
                icon: '⚙️',
                title: 'Cài đặt & Hướng dẫn',
                content: 'Tại đây bạn có thể tùy chỉnh phong cách trả lời của AI, đổi Model và API Key, bật tính năng nâng cao, và xem lại hướng dẫn sử dụng đầy đủ bất cứ lúc nào.',
                selector: '#tour-settings-button',
                side: 'top',
                showControls: true,
                showSkip: true,
            },

        ]
    }
];

export function TourProvider({ children }: { children: ReactNode }) {
    return (
        <NextStepProvider>
            <NextStep steps={steps as any}>
                {children}
            </NextStep>
        </NextStepProvider>
    );
}
