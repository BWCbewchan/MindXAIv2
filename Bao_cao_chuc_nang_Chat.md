# BÁO CÁO TIẾN ĐỘ: CÁC CHỨC NĂNG CỦA HỆ THỐNG CHAT AI (AI4STUDENT)

Dưới đây là tổng hợp các tính năng và cải tiến đã được hoàn thiện cho phân hệ Chat AI của dự án, nhằm nâng cao trải nghiệm học tập và tương tác của học viên.

## 1. Trải nghiệm Tương tác Hiện đại (UX/UI & Interactions)
*   **Hiệu ứng Gõ chữ (Typewriter Effect):** Tích hợp hiệu ứng hiển thị dần từng ký tự mô phỏng máy đánh chữ khi AI phản hồi, giúp cuộc hội thoại trở nên tự nhiên, thân thiện và giống con người hơn.
*   **Dừng luồng trả lời (Stop Generation):** Bổ sung nút "Dừng tạo câu trả lời" để người dùng có thể linh hoạt ngắt ngang khi AI đang tạo văn bản quá dài hoặc không đúng ý muốn.
*   **Tối ưu Không gian làm việc (Collapsible Desktop Sidebar):** Thanh menu bên trái (Sidebar) nay đã có khả năng thu gọn (collapse) trên giao diện Desktop, giúp mở rộng tối đa diện tích tập trung cho khung Chat và khung Code.
*   **Cải tiến Message Bubble:** Tùy chỉnh độ rộng (max-width) và luồng hiển thị tin nhắn, giúp nội dung (nhất là code) hiển thị rõ ràng, không bị tràn hay bó hẹp màn hình.

## 2. Nhập liệu Bằng Giọng Nói (Intelligent Voice Input)
*   **Chuyển đổi Giọng nói sang Văn bản (Speech-to-Text):** Tích hợp thành công Web Speech API, tối ưu hóa đặc biệt cho Tiếng Việt.
*   **Giao diện Theo dõi Thời gian thực (Real-time Transcript):** Người dùng có thể nhìn thấy chữ hiện ra ngay lập tức trong lúc đang nói mà không cần chờ đến khi nói xong.
*   **Cơ chế Xét duyệt văn bản (Review & Edit):** Sau khi ngừng thu âm, hệ thống hiển thị một Bảng phụ (Modal / Popup). Tại đây, người dùng có cơ hội đọc lại, chỉnh sửa thủ công các từ ngữ máy nghe nhầm trước khi bấm "Đồng ý" để chèn vào khung chat.

## 3. Hướng Dẫn Người Dùng Mới (Smart Onboarding Tour)
*   **Quy trình hướng dẫn tương tác (Interactive Tour):** Thay thế hướng dẫn văn bản tĩnh bằng hệ thống popup chỉ dẫn nổi bọt sử dụng thư viện `nextstepjs`.
*   **Chỉ dẫn theo ngữ cảnh:** Giới thiệu trực tiếp các nút chức năng (Live Editor, Voice, Settings) ngay trên giao diện thực.
*   **Tự động nhận diện:** Tự động kích hoạt luồng hướng dẫn đối với tài khoản truy cập lần đầu tiên vào ứng dụng.

## 4. Khu vực Chạy Mã Nguồn & Biên Dịch (Live Editor & Sandbox)
*   **Nâng cấp Web Sandbox:** Khắc phục triệt để lỗi giật/nhảy kích thước khung hiển thị khi code thay đổi. Cập nhật sửa lỗi kết xuất (render) file cấu hình tĩnh để hệ thống hiển thị chính xác kết quả HTML/React.
*   **Tích hợp Trình chạy Python Mở rộng:** Hệ thống Markdown Renderer đã được mở rộng để đọc hiểu và xử lý thẻ `<python>` và `<pyproject>`. Cung cấp khả năng chạy code Python đa file, có giả lập điểm đầu vào dữ liệu `<stdin>`, và hỗ trợ in biểu đồ `matplotlib`.
*   **Hỗ trợ nền tảng Jupyter Notebook:** Các câu trả lời thuộc định dạng cell của `<notebook>` đã được tích hợp engine phù hợp.
*   **System Prompt theo Môn học:** Tự động đổi luồng hướng dẫn của AI (AI Instructions) tùy theo môn học (Python, Khoa học Máy tính, Web) để xuất ra định dạng Code block tương thích với từng môi trường biên dịch riêng lẻ của người dùng.
