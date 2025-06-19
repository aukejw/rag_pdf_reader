const API_URL = 'http://localhost:8000';

export interface Question {
    text: string;
}

export interface ContextChunk {
    content: string;
    relevance_score: number;
}

export interface RelevantText {
    text: string;
    page_index: number;
    chunk_index?: number;
}

export interface Answer {
    answer: string;
    relevant_text: RelevantText;
    context: ContextChunk[];
}

export const uploadPDF = async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload PDF');
    }
};

export const askQuestion = async (question: Question): Promise<Answer> => {
    const response = await fetch(`${API_URL}/ask`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(question),
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to get answer');
    }

    return response.json();
};

export const getConfig = async (): Promise<any> => {
    const response = await fetch('http://localhost:8000/config');
    if (!response.ok) throw new Error('Failed to fetch config');
    return response.json();
};

export const updateConfig = async (config: any): Promise<void> => {
    const response = await fetch('http://localhost:8000/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error('Failed to update config');
}; 