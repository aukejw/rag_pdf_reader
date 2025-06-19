import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PDFViewer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
    file: File | null;
    highlightText?: string;
    highlightPageIndex?: number;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ file, highlightText, highlightPageIndex }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const minScale = 0.5;
    const maxScale = 2.5;
    const scaleStep = 0.1;

    useEffect(() => {
        // If we have a page index, go to that page (pageIndex is 0-based, setPageNumber is 1-based)
        if (highlightPageIndex !== undefined && highlightPageIndex !== null && file) {
            setPageNumber(highlightPageIndex + 1);
        }
    }, [highlightPageIndex, file]);

    // Best-effort highlight: highlight from first to last word of highlightText
    useEffect(() => {
        if (highlightText) {
            const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
            const words = highlightText.match(/\b\w+\b/g);
            if (!words || words.length === 0) return;
            const firstWord = normalize(words[0]);
            const lastWord = normalize(words[words.length - 1]);
            const textLayer = document.querySelector('.react-pdf__Page__textContent');
            if (textLayer) {
                const spans = Array.from(textLayer.querySelectorAll('span'));
                let firstIdx = -1;
                let lastIdx = -1;
                spans.forEach((span, i) => {
                    const norm = normalize(span.textContent || '');
                    if (firstIdx === -1 && norm.includes(firstWord)) firstIdx = i;
                    if (norm.includes(lastWord)) lastIdx = i;
                });
                spans.forEach((span, i) => {
                    span.classList.remove('highlight');
                    if (
                        (firstIdx !== -1 && lastIdx !== -1 && i >= firstIdx && i <= lastIdx) ||
                        (firstIdx !== -1 && lastIdx === -1 && i === firstIdx) ||
                        (lastIdx !== -1 && firstIdx === -1 && i === lastIdx)
                    ) {
                        span.classList.add('highlight');
                        if (i === firstIdx) span.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
            }
        } else {
            // Remove highlight if no highlightText
            const textLayer = document.querySelector('.react-pdf__Page__textContent');
            if (textLayer) {
                const spans = textLayer.querySelectorAll('span');
                spans.forEach(span => span.classList.remove('highlight'));
            }
        }
    }, [highlightText, pageNumber]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    if (!file) {
        return <div>Please upload a PDF file</div>;
    }

    return (
        <div className="pdf-viewer" style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="pdf-controls" style={{ position: 'sticky', top: 0, zIndex: 10, padding: '4px 10px', fontSize: '0.97em', margin: 0, minHeight: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', background: '#f3f4f6' }}>
                <button
                    disabled={pageNumber <= 1}
                    onClick={() => setPageNumber(pageNumber - 1)}
                    style={{ padding: '3px 10px', fontSize: '0.97em' }}
                >
                    Previous
                </button>
                <span style={{ padding: '2px 8px', fontSize: '0.97em' }}>
                    Page {pageNumber} of {numPages}
                </span>
                <button
                    disabled={numPages === null || pageNumber >= numPages}
                    onClick={() => setPageNumber(pageNumber + 1)}
                    style={{ padding: '3px 10px', fontSize: '0.97em' }}
                >
                    Next
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12 }}>
                    <button
                        onClick={() => setScale(s => Math.max(minScale, +(s - scaleStep).toFixed(2)))}
                        disabled={scale <= minScale}
                        title="Zoom out"
                        style={{ padding: '3px 10px', fontSize: '0.97em' }}
                    >
                        –
                    </button>
                    <span style={{ minWidth: 38, textAlign: 'center', fontSize: '0.97em' }}>{Math.round(scale * 100)}%</span>
                    <button
                        onClick={() => setScale(s => Math.min(maxScale, +(s + scaleStep).toFixed(2)))}
                        disabled={scale >= maxScale}
                        title="Zoom in"
                        style={{ padding: '3px 10px', fontSize: '0.97em' }}
                    >
                        +
                    </button>
                    <button
                        onClick={() => setScale(1.0)}
                        disabled={scale === 1.0}
                        title="Reset zoom"
                        style={{ marginLeft: 2, padding: '3px 10px', fontSize: '0.97em' }}
                    >
                        Reset
                    </button>
                </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, height: '100%', overflowY: 'auto' }}>
                <Document
                    file={file}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="pdf-document"
                >
                    <Page
                        pageNumber={pageNumber}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        scale={scale}
                    />
                </Document>
            </div>
        </div>
    );
}; 