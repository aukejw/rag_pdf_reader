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
            <div className="modal" style={{ padding: '18px 22px', borderRadius: 10, minWidth: 520, maxWidth: 700, width: '90vw', fontSize: '0.97em' }}>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '1.2em' }}>Settings</h2>
                {error && <div className="error">{error}</div>}
                {success && <div className="success">Config updated! Please restart the backend for changes to take effect.</div>}
                {config ? (
                    <form onSubmit={handleSubmit} style={{ margin: 0 }}>
                        {Object.entries(config).map(([key, value], idx, arr) => (
                            isObjectField(value) || isPromptField(key, value) || isNumberField(key, value) ? (
                                <div className="settings-entry" key={key} style={{ marginBottom: 10 }}>
                                    <label style={{ width: '100%', fontWeight: 500, marginBottom: 2 }}>
                                        {key}:
                                        {isObjectField(value) ? (
                                            <>
                                                <textarea
                                                    name={key}
                                                    value={JSON.stringify(value, null, 2)}
                                                    onChange={handleChange}
                                                    rows={5}
                                                    style={{ width: '100%', fontFamily: 'monospace', marginTop: '0.15em', fontSize: '0.96em', padding: '5px 7px', borderRadius: 5 }}
                                                />
                                                {jsonErrors[key] && <div className="error">{jsonErrors[key]}</div>}
                                            </>
                                        ) : isPromptField(key, value) ? (
                                            <textarea
                                                name={key}
                                                value={String(value)}
                                                onChange={handleChange}
                                                rows={4}
                                                style={{ width: '100%', fontFamily: 'monospace', marginTop: '0.15em', fontSize: '0.96em', padding: '5px 7px', borderRadius: 5 }}
                                            />
                                        ) : (
                                            <input
                                                name={key}
                                                type="number"
                                                value={Number(value)}
                                                onChange={handleChange}
                                                style={{ width: '100%', marginTop: '0.15em', fontSize: '0.96em', padding: '4px 7px', borderRadius: 5 }}
                                            />
                                        )}
                                    </label>
                                </div>
                            ) : (
                                <div className="settings-row" key={key} style={{ marginBottom: 8 }}>
                                    <label htmlFor={key} style={{ fontWeight: 500, marginRight: 6 }}>{key}:</label>
                                    <input
                                        id={key}
                                        name={key}
                                        type="text"
                                        value={String(value)}
                                        onChange={handleChange}
                                        style={{ fontSize: '0.96em', padding: '4px 7px', borderRadius: 5 }}
                                    />
                                </div>
                            )
                        ))}
                        <div style={{ marginTop: '0.7em', display: 'flex', gap: 8 }}>
                            <button type="submit" disabled={saving} style={{ fontSize: '0.97em', padding: '5px 16px', borderRadius: 5 }}>{saving ? 'Saving...' : 'Save'}</button>
                            <button type="button" onClick={onClose} style={{ marginLeft: 0, fontSize: '0.97em', padding: '5px 16px', borderRadius: 5 }}>Close</button>
                        </div>
                    </form>
                ) : (
                    <div>Loading...</div>
                )}
            </div>
        </div>
    );
}; 