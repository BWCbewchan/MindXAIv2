export async function parseDocument(
    file: File
): Promise<{ text: string; filename: string }> {
    const filename = file.name;
    const ext = filename.split(".").pop()?.toLowerCase();

    switch (ext) {
        case "txt":
            return { text: await file.text(), filename };

        case "docx":
            return { text: await parseDocx(file), filename };

        case "pdf":
            return { text: await parsePdf(file), filename };

        default:
            // Try to read as text
            try {
                return { text: await file.text(), filename };
            } catch {
                throw new Error(`Unsupported file format: .${ext}`);
            }
    }
}

async function parseDocx(file: File): Promise<string> {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

async function parsePdf(file: File): Promise<string> {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await pdfParse(buffer);
    return result.text;
}
