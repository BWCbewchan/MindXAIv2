import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function run() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: "You are an AI assistant. You DO have access to the conversation history. Do not say you cannot remember what was sent."
    });

    const chat = model.startChat({
        history: [
            {
                role: "user",
                parts: [{ text: "viết cho tôi thuật toán tìm số nguyên tố bằng python" }]
            },
            {
                role: "model",
                parts: [{ text: "Đây là thuật toán tìm số nguyên tố bằng Python:\n\n```python\ndef is_prime(n):\n    if n <= 1:\n        return False\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n```" }]
            },
            {
                role: "user",
                parts: [{ text: "viết source code cửa hàng bán quần áo" }]
            },
            {
                role: "model",
                parts: [{ text: "Đây là code giả lập cửa hàng bán quần áo..." }]
            }
        ]
    });

    try {
        const result = await chat.sendMessage("Tôi đã nhờ bạn viết những code gì nãy giờ?");
        console.log("Response:", result.response.text());
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
