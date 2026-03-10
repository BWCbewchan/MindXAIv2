import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
    subsets: ["latin", "vietnamese"],
    variable: "--font-display",
    weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
    title: "AI4Student - Trợ lý học tập AI",
    description:
        "Trợ lý học tập AI thông minh cho học sinh từ lớp 1 đến lớp 9. Học lập trình, GameMaker, Web Development và Computer Science một cách vui vẻ!",
    keywords: ["AI", "learning", "student", "programming", "gamemaker", "education"],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="vi">
            <body className={`${nunito.variable} antialiased`}>
                {children}
            </body>
        </html>
    );
}
