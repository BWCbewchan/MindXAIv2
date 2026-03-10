"use client";

import { NextStep, NextStepProvider, Tour } from 'nextstepjs';
import { ReactNode } from 'react';

const steps: Tour[] = [
    {
        tour: 'mainTour',
        steps: [
            {
                icon: '👋',
                title: 'Chào mừng đến với MindX AI!',
                content: 'Đây là trợ lý học tập siêu cấp của bạn. Hãy để mình hướng dẫn bạn cách sử dụng nhé.',
                selector: '#tour-welcome-title',
                side: 'bottom',
                showControls: true,
                showSkip: true
            },
            {
                icon: '📚',
                title: 'Chọn chủ đề',
                content: 'Bạn có thể chọn chủ đề mình muốn học ở đây.',
                selector: '#tour-subject-selector',
                side: 'bottom',
                showControls: true,
                showSkip: true
            },
            {
                icon: '💡',
                title: 'Gợi ý nhanh',
                content: 'Nhấn vào các gợi ý này để bắt đầu nhanh chóng mà không cần gõ phím.',
                selector: '#tour-prompt-suggestions',
                side: 'top',
                showControls: true,
                showSkip: true
            },
            {
                icon: '✍️',
                title: 'Nhập câu hỏi',
                content: 'Bạn có thể tự gõ câu hỏi, hoặc đính kèm file, hình ảnh để AI phân tích tại đây.',
                selector: '#tour-chat-input',
                side: 'top',
                showControls: true,
                showSkip: true
            },
            {
                icon: '💻',
                title: 'Live Sandbox',
                content: 'Bật chế độ này để yêu cầu AI viết code và xem kết quả ngay lập tức!',
                selector: '#tour-live-editor-toggle',
                side: 'top',
                showControls: true,
                showSkip: true
            },
            {
                icon: '⚙️',
                title: 'Cài đặt AI',
                content: 'Bạn có thể tùy chỉnh Prompt, Model và đổi API Key bất cứ lúc nào trong này.',
                selector: '#tour-settings-button',
                side: 'top',
                showControls: true,
                showSkip: true
            }
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
