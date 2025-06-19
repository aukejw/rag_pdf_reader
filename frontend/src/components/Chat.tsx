import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { askQuestion, Question, Answer } from '../services/api';
import { MdHighlight, MdInfoOutline, MdExpandMore, MdExpandLess, MdDeleteOutline } from 'react-icons/md';

interface Message {
    question: string;
    answer: Answer;
}

interface ChatProps {
    onHighlightText: (
        text: string,
        chunkIndex?: number,
        charStart?: number,
        pageIndex?: number,
        startOfRelevantText?: number,
        endOfRelevantText?: number
    ) => void;
}

export const Chat: React.FC<ChatProps> = ({ onHighlightText }) => {
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
    const [inspectedIndex, setInspectedIndex] = useState<number | null>(null);
    const [contextTab, setContextTab] = useState<{ [key: number]: number }>({});
    const [collapsed, setCollapsed] = useState<{ [key: number]: boolean }>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;

        setIsLoading(true);
        try {
            const answer = await askQuestion({ text: question });
            setMessages([...messages, { question, answer }]);
            setQuestion('');
        } catch (error) {
            console.error('Failed to get answer:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleHighlightClick = (
        text: string,
        chunkIndex?: number,
        charStart?: number,
        pageIndex?: number,
        startOfRelevantText?: number,
        endOfRelevantText?: number
    ) => {
        setActiveHighlight(text);
        onHighlightText(text, chunkIndex, charStart, pageIndex, startOfRelevantText, endOfRelevantText);
    };

    const handleCollapse = (index: number) => {
        setCollapsed(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const handleDelete = (index: number) => {
        setMessages(msgs => msgs.filter((_, i) => i !== index));
        // Clean up collapsed/inspected/contextTab state for deleted index
        setCollapsed(prev => {
            const copy = { ...prev };
            delete copy[index];
            return copy;
        });
        setContextTab(prev => {
            const copy = { ...prev };
            delete copy[index];
            return copy;
        });
        if (inspectedIndex === index) setInspectedIndex(null);
    };

    const handleInspect = (index: number) => {
        setInspectedIndex(inspectedIndex === index ? null : index);
        // If inspecting, set the context tab to the chunk_index if available, else 0
        const chunkIdx = messages[index]?.answer?.relevant_text?.chunk_index;
        setContextTab(prev => ({ ...prev, [index]: typeof chunkIdx === 'number' ? chunkIdx : 0 }));
    };

    return (
        <div className="chat-container">
            <div className="chat-messages">
                {messages.map((message, index) => (
                    <div key={index} className="chat-message">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="question">Q: {message.question}</div>
                            <div className="message-actions">
                                <button
                                    title="Highlight"
                                    onClick={() => handleHighlightClick(
                                        message.answer.relevant_text.text,
                                        undefined,
                                        undefined,
                                        message.answer.relevant_text.page_index,
                                    )}
                                >
                                    <MdHighlight size={18} />
                                </button>
                                <button
                                    title="Inspect"
                                    onClick={() => handleInspect(index)}
                                    aria-pressed={inspectedIndex === index}
                                >
                                    <MdInfoOutline size={18} />
                                </button>
                                <button
                                    title={collapsed[index] ? 'Expand' : 'Collapse'}
                                    onClick={() => handleCollapse(index)}
                                >
                                    {collapsed[index] ? <MdExpandMore size={18} /> : <MdExpandLess size={18} />}
                                </button>
                                <button
                                    style={{ color: '#dc2626' }}
                                    title="Delete"
                                    onClick={() => handleDelete(index)}
                                >
                                    <MdDeleteOutline size={18} />
                                </button>
                            </div>
                        </div>
                        {!collapsed[index] && (
                            <>
                                <div className="answer">
                                    <ReactMarkdown children={message.answer.answer} />
                                </div>
                                {inspectedIndex === index && (
                                    <div className="inspect-box" style={{ border: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: 6, padding: 10, margin: '8px 0', fontSize: '0.96em' }}>
                                        <div style={{ margin: 0, fontWeight: 500 }}>
                                            Relevant text
                                            {message.answer.relevant_text.page_index !== undefined && message.answer.relevant_text.page_index !== -1 ? ` (page ${message.answer.relevant_text.page_index + 1})` : ''}
                                        </div>
                                        <pre style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4, padding: '6px 8px', margin: '4px 0 6px 0', fontSize: '0.95em', whiteSpace: 'pre-wrap' }}>{message.answer.relevant_text.text}</pre>
                                        <div style={{ marginTop: 4, fontSize: '0.93em' }}>
                                            <div className="context-tabs" style={{ margin: 0, marginBottom: 2 }}>
                                                {message.answer.context.map((chunk, i) => (
                                                    <button
                                                        key={i}
                                                        className={`context-tab${(contextTab[index] ?? 0) === i ? ' active' : ''}`}
                                                        style={{
                                                            marginRight: 2,
                                                            padding: '2px 7px',
                                                            border: (contextTab[index] ?? 0) === i ? '1px solid #6366f1' : '1px solid #e5e7eb',
                                                            background: (contextTab[index] ?? 0) === i ? '#eef2ff' : '#fff',
                                                            borderRadius: 3,
                                                            cursor: 'pointer',
                                                            fontWeight: (contextTab[index] ?? 0) === i ? 500 : 400,
                                                            fontSize: '0.93em',
                                                        }}
                                                        onClick={() => setContextTab({ ...contextTab, [index]: i })}
                                                    >
                                                        Chunk {i + 1}
                                                    </button>
                                                ))}
                                            </div>
                                            <pre className="context-box" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 3, padding: '5px 7px', margin: 0, fontSize: '0.93em', whiteSpace: 'pre-wrap' }}>{message.answer.context[contextTab[index] ?? 0].content}</pre>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>
            <form onSubmit={handleSubmit} className="chat-input">
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question about the PDF..."
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Thinking...' : 'Ask'}
                </button>
            </form>
        </div>
    );
}; 