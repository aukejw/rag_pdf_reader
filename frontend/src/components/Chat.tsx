import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { askQuestion, Answer } from '../services/api';
import { MdInfoOutline, MdExpandMore, MdExpandLess, MdDeleteOutline } from 'react-icons/md';

interface Message {
    question: string;
    answer: Answer;
}

export const Chat: React.FC = () => {
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
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

        // Uncollapse this message
        setCollapsed(prev => ({ ...prev, [index]: false }));

        // Default to relevant chunk index if available, else 0
        const chunkIdx = messages[index]?.answer?.localization?.chunk_index;
        setContextTab(prev => ({ ...prev, [index]: (typeof chunkIdx === 'number' && chunkIdx >= 0) ? chunkIdx : 0 }));
    };

    return (
        <div className="chat-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <form onSubmit={handleSubmit} className="chat-input" style={{ display: 'flex', gap: 8, padding: '0 0 8px 0', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question about the PDF..."
                    disabled={isLoading}
                    style={{ flex: 1, fontSize: '1em', padding: '7px 10px', borderRadius: 5, border: '1px solid #e5e7eb' }}
                />
                <button type="submit" disabled={isLoading} style={{ fontSize: '1em', padding: '7px 18px', borderRadius: 5, background: '#6366f1', color: '#fff', border: 'none' }}>
                    {isLoading ? 'Thinking...' : 'Ask'}
                </button>
            </form>
            <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', marginTop: 0, display: 'flex', flexDirection: 'column' }}>
                {[...messages].reverse().map((message, revIndex, arr) => {
                    const index = messages.length - 1 - revIndex;
                    return (
                        <React.Fragment key={index}>
                            {revIndex > 0 && (
                                <div style={{ borderTop: '1px solid #ececec', margin: '2px 0 6px 0', width: '100%' }} />
                            )}
                            <div className="chat-message">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div className="question">Q: {message.question}</div>
                                    <div className="message-actions">
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
                                            <div className="inspect-box" style={{ border: '1px solid #e5e7eb', background: '#f9f9fb', borderRadius: 6, padding: 7, margin: '7px 0', fontSize: '0.93em' }}>
                                                {message.answer.evaluation && (
                                                    <div>
                                                        <span style={{ fontWeight: 500, color: '#000FFF', fontSize: '0.96em' }}>
                                                            Did we answer the question?
                                                        </span>
                                                        <div style={{ marginTop: 2 }}>
                                                            {message.answer.evaluation.evaluation && (
                                                                <span style={{ color: '#444', fontWeight: 400, fontStyle: 'italic', fontSize: '0.93em' }}>
                                                                    {message.answer.evaluation.evaluation}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {message.answer.evaluation.is_correct && message.answer.localization !== undefined && message.answer.localization.relevant_text !== undefined && (
                                                    <>
                                                        <div style={{ borderTop: '1px solid #ececec', margin: '8px 0 4px 0', width: '100%' }} />
                                                        <div style={{ marginBottom: 2 }}>
                                                            <span style={{ fontWeight: 500, color: '#000FFF', fontSize: '0.96em' }}>
                                                                Relevant text:
                                                            </span>
                                                            <span style={{ marginLeft: 3 }}>{message.answer.localization.relevant_text}</span>
                                                        </div>
                                                        {(message.answer.localization.page_index !== undefined && message.answer.localization.page_index !== -1) && (
                                                            <span style={{ fontSize: '0.93em', marginRight: 8 }}>
                                                                <span style={{ fontWeight: 500 }}>Page:</span> {message.answer.localization.page_index + 1}
                                                            </span>
                                                        )}
                                                        {(message.answer.localization.chunk_index !== undefined && message.answer.localization.chunk_index !== -1) && (
                                                            <span style={{ fontSize: '0.93em' }}>
                                                                <span style={{ fontWeight: 500 }}>Chunk:</span> {message.answer.localization.chunk_index}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                                {Array.isArray(message.answer.context) && message.answer.context.length > 0 && (
                                                    <>
                                                        <div style={{ borderTop: '1px solid #ececec', margin: '8px 0 4px 0', width: '100%' }} />
                                                        <span style={{ fontWeight: 500, color: '#000FFF', fontSize: '0.96em', marginBottom: 2, display: 'inline-block' }}>
                                                            {(() => {
                                                                const selectedChunk = message.answer.context[contextTab[index] ?? 0];
                                                                if (!selectedChunk)
                                                                    return null;

                                                                const score = typeof selectedChunk.relevance_score === 'number' ? selectedChunk.relevance_score.toFixed(2) : null;
                                                                const page = selectedChunk.metadata.page !== undefined && selectedChunk.metadata.page !== -1 ? selectedChunk.metadata.page + 1 : null;

                                                                let string = 'Context';
                                                                if (score !== undefined && score !== null) {
                                                                    string += `, relevance ${score}`;
                                                                }
                                                                if (page !== undefined && page !== null) {
                                                                    string += `, page ${page}`;
                                                                }
                                                                return string;
                                                            })()
                                                            }
                                                        </span>
                                                        <div>
                                                            <div className="context-tabs" style={{ display: 'flex', gap: 3, marginBottom: 4, position: 'sticky', top: 0, background: '#f9f9fb', zIndex: 2, padding: '1px 0' }}>
                                                                {message.answer.context.map((chunk, i) => (
                                                                    <button
                                                                        key={i}
                                                                        className={`context-tab${(contextTab[index] ?? 0) === i ? ' active' : ''}`}
                                                                        style={{
                                                                            marginRight: 1,
                                                                            padding: '1.5px 6px',
                                                                            border: (contextTab[index] ?? 0) === i ? '1.2px solid #6366f1' : '1px solid #e5e7eb',
                                                                            background: (contextTab[index] ?? 0) === i ? '#eef2ff' : '#fff',
                                                                            borderRadius: 3,
                                                                            cursor: 'pointer',
                                                                            fontWeight: (contextTab[index] ?? 0) === i ? 600 : 400,
                                                                            fontSize: '0.92em',
                                                                            minWidth: 22,
                                                                            lineHeight: 1.1,
                                                                        }}
                                                                        title={typeof chunk.relevance_score === 'number' ? `Score: ${chunk.relevance_score.toFixed(2)}` : ''}
                                                                        onClick={() => setContextTab({ ...contextTab, [index]: i })}
                                                                    >
                                                                        {i + 1}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <pre className="context-box" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 3, padding: '4px 6px', margin: 0, fontSize: '0.92em', whiteSpace: 'pre-wrap', color: '#222', maxHeight: 160, overflowY: 'auto' }}>{message.answer.context[contextTab[index] ?? 0]?.content}</pre>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </div >
    );
};