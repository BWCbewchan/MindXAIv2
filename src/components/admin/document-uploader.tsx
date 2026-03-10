"use client";

import { AlertCircle, CheckCircle2, FileText, Upload as UploadIcon } from "lucide-react";
import React, { useEffect, useState } from "react";

interface Subject {
    id: string;
    name: string;
}

export const DocumentUploader = () => {
    const [file, setFile] = useState<File | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState("");
    const [title, setTitle] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        fetch("/api/subjects")
            .then((res) => res.json())
            .then((data) => {
                if (data && !data.error) setSubjects(data);
            });
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !selectedSubject) {
            setMessage({ type: "error", text: "Vui lòng chọn file và môn học." });
            return;
        }

        setIsUploading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("subject_id", selectedSubject);
        formData.append("title", title || file.name);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: "success", text: `Đã tải lên thành công! Đã trích xuất ${data.textLength} ký tự.` });
                setFile(null);
                setTitle("");
                (document.getElementById("doc-upload") as HTMLInputElement).value = "";
            } else {
                setMessage({ type: "error", text: data.error || "Có lỗi xảy ra khi tải lên." });
            }
        } catch (error) {
            setMessage({ type: "error", text: "Lỗi kết nối máy chủ." });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <UploadIcon size={20} className="text-blue-500" /> Tải lên tài liệu kiến thức
            </h2>

            {message && (
                <div className={`p-4 rounded-lg mb-6 flex items-start gap-3 ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
                    }`}>
                    {message.type === "success" ? <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />}
                    <p>{message.text}</p>
                </div>
            )}

            <form onSubmit={handleUpload} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chọn môn học *</label>
                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full md:w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        required
                    >
                        <option value="">-- Lựa chọn môn học --</option>
                        {subjects.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tiêu đề tài liệu (Tùy chọn)</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ví dụ: Định nghĩa vòng lặp For"
                        className="w-full md:w-1/2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tài liệu tải lên *</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                        <input
                            id="doc-upload"
                            type="file"
                            accept=".txt,.pdf,.docx"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <label htmlFor="doc-upload" className="cursor-pointer flex flex-col items-center">
                            <div className="p-4 bg-white rounded-full shadow-sm mb-4 text-blue-500">
                                {file ? <FileText size={32} /> : <UploadIcon size={32} />}
                            </div>
                            <span className="font-semibold text-gray-700">
                                {file ? file.name : "Nhấp để chọn file"}
                            </span>
                            <p className="text-sm text-gray-500 mt-2">
                                Hỗ trợ định dạng: .txt, .pdf, .docx
                            </p>
                        </label>
                    </div>
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={isUploading || !file || !selectedSubject}
                        className={`px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${isUploading || !file || !selectedSubject
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                            }`}
                    >
                        {isUploading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Đang xử lý...
                            </>
                        ) : (
                            <>
                                <UploadIcon size={18} /> Tạo kiến thức
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
