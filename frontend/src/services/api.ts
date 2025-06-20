const API_URL = 'http://localhost:8000';

export interface Question {
    text: string;
}

export interface RetrievedDocument {
    content: string;
    metadata: { page?: number };
    relevance_score: number;
}

export interface Localization {
    relevant_text: string;
    page_index: number;
    chunk_index?: number;
}

export interface Evaluation {
    is_correct: boolean;
    evaluation: string;
}

export interface Answer {
    answer: string;
    localization: Localization;
    context: RetrievedDocument[];
    evaluation: Evaluation;
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