export default function IdeLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#11111b" }}>
            {children}
        </div>
    );
}
