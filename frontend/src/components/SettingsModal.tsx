import React, { useEffect, useState } from 'react';
import { getConfig, updateConfig } from '../services/api';

interface SettingsModalProps {
    open: boolean;
    onClose: () => void;
}

function isNumberField(key: string, value: any) {
    return typeof value === 'number' || key.toLowerCase().includes('num') || key.toLowerCase().includes('seed');
}

function isPromptField(key: string, value: any) {
    return key.toLowerCase().includes('prompt') || (typeof value === 'string' && value.includes('{') && value.includes('}')) || (typeof value === 'string' && value.includes('\n'));
}

function isObjectField(value: any) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
    const [config, setConfig] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [jsonErrors, setJsonErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (open) {
            getConfig().then(setConfig).catch(e => setError(e.message));
        }
    }, [open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'textarea' && isObjectField(config[name])) {
            // Try to parse JSON
            try {
                setConfig({ ...config, [name]: JSON.parse(value) });
                setJsonErrors({ ...jsonErrors, [name]: '' });
            } catch (err) {
                setJsonErrors({ ...jsonErrors, [name]: 'Invalid JSON' });
            }
        } else {
            setConfig({
                ...config,
                [name]: type === 'number' ? Number(value) : value,
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);
        if (Object.values(jsonErrors).some(Boolean)) {
            setError('Please fix JSON errors before saving.');
            setSaving(false);
            return;
        }
        try {
            await updateConfig(config);
            setSuccess(true);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal">
                <h2>Settings</h2>
                {error && <div className="error">{error}</div>}
                {success && <div className="success">Config updated! Please restart the backend for changes to take effect.</div>}
                {config ? (
                    <form onSubmit={handleSubmit}>
                        {Object.entries(config).map(([key, value], idx, arr) => (
                            isObjectField(value) || isPromptField(key, value) || isNumberField(key, value) ? (
                                <div className="settings-entry" key={key}>
                                    <label style={{ width: '100%' }}>
                                        {key}:
                                        {isObjectField(value) ? (
                                            <>
                                                <textarea
                                                    name={key}
                                                    value={JSON.stringify(value, null, 2)}
                                                    onChange={handleChange}
                                                    rows={7}
                                                    style={{ width: '100%', fontFamily: 'monospace', marginTop: '0.2em' }}
                                                />
                                                {jsonErrors[key] && <div className="error">{jsonErrors[key]}</div>}
                                            </>
                                        ) : isPromptField(key, value) ? (
                                            <textarea
                                                name={key}
                                                value={String(value)}
                                                onChange={handleChange}
                                                rows={7}
                                                style={{ width: '100%', fontFamily: 'monospace', marginTop: '0.2em' }}
                                            />
                                        ) : (
                                            <input
                                                name={key}
                                                type="number"
                                                value={Number(value)}
                                                onChange={handleChange}
                                                style={{ width: '100%', marginTop: '0.2em' }}
                                            />
                                        )}
                                    </label>
                                </div>
                            ) : (
                                <div className="settings-row" key={key}>
                                    <label htmlFor={key}>{key}:</label>
                                    <input
                                        id={key}
                                        name={key}
                                        type="text"
                                        value={String(value)}
                                        onChange={handleChange}
                                    />
                                </div>
                            )
                        ))}
                        <div style={{ marginTop: '1em' }}>
                            <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                            <button type="button" onClick={onClose} style={{ marginLeft: '1em' }}>Close</button>
                        </div>
                    </form>
                ) : (
                    <div>Loading...</div>
                )}
            </div>
        </div>
    );
}; 