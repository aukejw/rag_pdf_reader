import React, { useState, useRef } from 'react';
import { PDFViewer } from './components/PDFViewer';
import { Chat } from './components/Chat';
import { uploadPDF } from './services/api';
import { SettingsModal } from './components/SettingsModal';
import { MdSettings } from 'react-icons/md';

export const App: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [highlightText, setHighlightText] = useState<string | null>(null);
    const [highlightPageIndex, setHighlightPageIndex] = useState<number | null>(null);
    const [highlightStart, setHighlightStart] = useState<number | null>(null);
    const [highlightEnd, setHighlightEnd] = useState<number | null>(null);
    const [chatWidth, setChatWidth] = useState(400);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const dragging = useRef(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setIsUploading(true);
        setError(null);

        try {
            await uploadPDF(uploadedFile);
            setFile(uploadedFile);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to upload PDF');
            console.error('Upload error:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleHighlightText = (
        text: string,
        _chunkIndex?: number,
        _charStart?: number,
        pageIndex?: number,
        startOfRelevantText?: number,
        endOfRelevantText?: number
    ) => {
        setHighlightText(text);
        setHighlightPageIndex(pageIndex !== undefined && pageIndex !== -1 ? pageIndex : null);
        setHighlightStart(startOfRelevantText !== undefined && startOfRelevantText !== -1 ? startOfRelevantText : null);
        setHighlightEnd(endOfRelevantText !== undefined && endOfRelevantText !== -1 ? endOfRelevantText : null);
    };

    // Gutter drag logic
    const onMouseDown = (e: React.MouseEvent) => {
        dragging.current = true;
        document.body.style.cursor = 'col-resize';
    };
    const onMouseMove = (e: MouseEvent) => {
        if (!dragging.current) return;
        const minWidth = 250;
        const maxWidth = 700;
        const newWidth = window.innerWidth - e.clientX;
        setChatWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };
    const onMouseUp = () => {
        dragging.current = false;
        document.body.style.cursor = '';
    };
    React.useEffect(() => {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    });

    return (
        <div className="app">
            <header>
                <div className="upload-section">
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                    />
                    {isUploading && (
                        <>
                            <div style={{ width: '100%', height: 4, background: '#e0e7ef', margin: '8px 0', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)', animation: 'loading-bar 1s linear infinite' }} />
                            </div>
                            <span>Uploading...</span>
                        </>
                    )}
                    {error && <div className="error">{error}</div>}
                    <button style={{ marginLeft: '1em', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => setSettingsOpen(true)} title="Settings">
                        <MdSettings size={24} />
                    </button>
                </div>
            </header>
            <div className="main-layout">
                <div className="pdf-section">
                    <PDFViewer
                        file={file}
                        highlightText={highlightText || undefined}
                        highlightPageIndex={highlightPageIndex ?? undefined}
                        highlightStart={highlightStart ?? undefined}
                        highlightEnd={highlightEnd ?? undefined}
                    />
                </div>
                <div
                    className="gutter"
                    onMouseDown={onMouseDown}
                    style={{ userSelect: 'none' }}
                />
                <div
                    className="chat-section"
                    style={{ width: chatWidth }}
                >
                    <Chat onHighlightText={handleHighlightText} />
                </div>
            </div>
            <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
            <style>{`
@keyframes loading-bar {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}`}</style>
        </div>
    );
}; 