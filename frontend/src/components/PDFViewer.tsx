import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PDFViewer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
    file: File | null;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ file }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const minScale = 0.5;
    const maxScale = 2.5;
    const scaleStep = 0.1;

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    useEffect(() => {
        // Reset page and zoom when a new file is loaded
        setPageNumber(1);
        setScale(1.0);
    }, [file]);

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