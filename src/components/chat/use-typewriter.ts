"use client";

import { useEffect, useState } from "react";

/**
 * Hook tùy chỉnh để tạo hiệu ứng gõ phím
 * @param text Đoạn văn bản đầy đủ cần gõ
 * @param speed Tốc độ gõ (ms mỗi ký tự)
 * @param shouldAnimate Có chạy animation hay không
 * @returns Chuỗi văn bản đang được gõ dần
 */
export function useTypewriter(text: string, speed: number = 10, shouldAnimate: boolean = true) {
    const [displayedText, setDisplayedText] = useState(shouldAnimate ? "" : text);
    const [isComplete, setIsComplete] = useState(!shouldAnimate);

    useEffect(() => {
        // Nếu không cần animate, set ngay chuỗi đầy đủ và bỏ qua
        if (!shouldAnimate) {
            setDisplayedText(text);
            setIsComplete(true);
            return;
        }

        // Nếu mới render lại với text dài hơn (đang được stream) thì tiếp tục gõ phần dư
        if (text.length > displayedText.length) {
            setIsComplete(false);
            const timeoutId = setTimeout(() => {
                setDisplayedText(text.slice(0, displayedText.length + 1));
            }, speed);

            return () => clearTimeout(timeoutId);
        } else if (text.length === displayedText.length && text.length > 0) {
            // Khi gõ xong toàn bộ chuỗi hiện tại
            setIsComplete(true);
        }

        // Bắt lỗi nếu text truyền vào bị rút ngắn (đổi câu trả lời)
        if (text.length < displayedText.length) {
            setDisplayedText(text);
        }
    }, [text, speed, displayedText, shouldAnimate]);

    // Trả về text đã được "gõ" cùng với trạng thái hoàn thành
    return { displayedText, isComplete };
}
