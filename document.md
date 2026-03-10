You are a senior Frontend Engineer and AI Product Designer.

Your task is to build an AI learning assistant interface for students using **Next.js (App Router)** and **ShadCN UI**.  
The system will function similarly to ChatGPT but designed specifically for **students from primary school to middle school (ages ~6–15)**.

The interface must be simple, friendly, colorful, and easy to understand for children while still maintaining good UX practices.

The AI responses will be generated using **Google Gemini API**.

Important:
- This system is primarily **frontend built with Next.js**
- Use **Stitch components / ShadCN UI** for building the interface
- Use **MCP Supabase** as the knowledge storage layer and admin data source
- Knowledge injected by admin will be stored and managed through **Supabase**
- Knowledge can come from **uploaded documents** such as `.txt`, `.docx`, `.pdf`, or other text-based files
- AI responses are fetched from **Gemini API**

---

# System Goal

Build an **AI learning assistant chat interface** that allows students to ask questions about different learning subjects such as:

- Programming
- Game Development
- Web Development
- Computer Science concepts

The AI should act as a friendly teacher assistant that explains concepts clearly and step-by-step.

---

# Tech Stack

Use the following technologies:

- Next.js (App Router)
- TypeScript
- TailwindCSS
- ShadCN UI + Stitch components
- Google Gemini API
- MCP Supabase (knowledge storage + admin data)
- Zustand or React Context for state management
- Markdown renderer for AI responses

---

# Main Features

## Student AI Chat Interface

Build a ChatGPT-like interface with:

Left sidebar
- New Chat
- Chat History
- Subject selection
  - Programming
  - Game Development
  - Web Development
  - Computer Science

Main chat area
- conversation messages
- student messages
- AI responses

Input area
- message input box
- send button
- optional prompt suggestions

The AI response should support:

- Markdown
- Code blocks
- Lists
- Step-by-step explanations

---

# UX Requirements for Kids (Very Important)

Since users are students aged **6–15**, the UI must:

- Use larger fonts
- Use soft colors
- Friendly rounded UI elements
- Clear visual hierarchy
- Avoid complex menus

Add helpful UI features:

- example questions
- suggested prompts
- simple icons
- encouraging tone

Example suggestions:

Explain loops in programming  
How does a website work?  
How do I make a simple game?

---

# AI Response Behavior

When sending a message:

1. Send prompt to **Gemini API**
2. Receive response
3. Render response in chat

AI response should:

- explain concepts simply
- break answers into steps
- include examples
- avoid overly technical language

---

# Gemini API Integration

Create a utility:

/lib/gemini.ts

Responsibilities:

- send prompt
- receive response
- return text output

Flow:

User message → Gemini API → Render response in chat

---

# Admin Knowledge Panel

Create a separate route:

/admin

Purpose:

Allow admins to inject knowledge and control AI behavior.

Admin features:

- Upload knowledge documents
- Manage subject knowledge
- Configure AI prompt style

---

# Knowledge Upload System

Admin can upload knowledge files including:

- .txt
- .docx
- .pdf
- other text-based documents

When a file is uploaded:

1. Extract text content from the document
2. Store the content in **Supabase**
3. Associate the knowledge with a specific subject

Example subjects:

- Programming
- Game Development
- Web Development
- Computer Science

Example stored data:

Subject Name  
Knowledge Content  
Prompt Instruction

Example:

Subject: Web Development

Knowledge:
HTML is used to structure a website.

Prompt style:
Explain concepts step-by-step for beginners.

---

# Project Structure

/app
  /chat
  /admin

/components
  chat-window
  message-bubble
  prompt-suggestions
  subject-selector

/lib
  gemini.ts
  supabase.ts
  ai-config.ts
  document-parser.ts

/store
  chat-store.ts

---

# UI Inspiration

The interface should feel similar to:

- ChatGPT
- Duolingo style friendliness
- Educational apps for kids

Focus on:

- clean layout
- easy readability
- simple navigation

---

# Deliverables

Build:

1. Chat interface
2. Gemini AI integration
3. Subject selector
4. Admin knowledge panel
5. Document upload system (.txt .docx .pdf)
6. Supabase knowledge storage
7. Modular components using Stitch / ShadCN

Ensure the code is clean, modular, and maintainable.

---

# Future Expansion

This system will evolve into:

AI4Student + AI4Teacher

Architecture should support:

- multiple AI subjects
- knowledge expansion
- teacher control panel
- scalable knowledge management