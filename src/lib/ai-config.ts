import { supabase } from "./supabase";

const DEFAULT_SYSTEM_PROMPT = `You are a friendly, encouraging AI teacher assistant designed for students aged 6-15.

IMPORTANT RULES:
- Explain concepts step-by-step using simple language
- Use examples, analogies, and comparisons kids can understand
- Include emojis occasionally to make learning fun 🎉
- Break complex topics into small, digestible parts
- Always be encouraging and positive
- If a concept is difficult, offer to explain it in a simpler way
- Use code examples when relevant, with clear comments
- Respond in the same language as the student's question
- **CRITICAL**: You DO have access to the conversation history of this chat session. If the user asks about what they said earlier or what you coded previously, DO NOT say you cannot remember. Instead, read the chat history provided to you and answer their question based on it.`;

const SANDBOX_INSTRUCTION = `
HƯỚNG DẪN TẠO CODE ỨNG DỤNG WEB (SANDBOX EDITOR):
Khi người dùng yêu cầu viết một dự án code (đặc biệt là Web App, React, HTML/JS/CSS), thay vì sử dụng Markdown code block thông thường, bạn PHẢI bọc toàn bộ dự án trong cặp thẻ XML <project>.
Bên trong <project>, mỗi file sẽ được bọc bằng thẻ <file name="path"> với nội dung code ở bên trong.
Ví dụ nếu user yêu cầu viết "Todo App React":
<project>
<file name="/App.js">
export default function App() { return <h1>Hello Todo</h1>; }
</file>
<file name="/styles.css">
body { background: white; }
</file>
</project>
TUYỆT ĐỐI không dùng Markdown \`\`\` xung quanh thẻ <project>.`;

export async function buildSystemPrompt(subjectId?: string, isEditorMode?: boolean): Promise<string> {
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;

    if (isEditorMode) {
        systemPrompt += "\n" + SANDBOX_INSTRUCTION;
    }

    if (subjectId) {
        // Get subject-specific AI config
        const { data: config } = await supabase
            .from("ai_config")
            .select("*")
            .eq("subject_id", subjectId)
            .single();

        if (config?.system_prompt) {
            systemPrompt = config.system_prompt + "\n\n" + systemPrompt;
        }

        // Get knowledge for the subject
        const { data: knowledge } = await supabase
            .from("knowledge")
            .select("title, content")
            .eq("subject_id", subjectId)
            .limit(10);

        if (knowledge && knowledge.length > 0) {
            const knowledgeContext = knowledge
                .map((k) => `### ${k.title}\n${k.content}`)
                .join("\n\n");

            systemPrompt += `\n\n--- KNOWLEDGE BASE ---\nUse the following knowledge to help answer questions accurately:\n\n${knowledgeContext}\n--- END KNOWLEDGE BASE ---`;
        }
    }

    return systemPrompt;
}

export function getSubjectConfig(subjectId: string) {
    return supabase.from("ai_config").select("*").eq("subject_id", subjectId).single();
}
