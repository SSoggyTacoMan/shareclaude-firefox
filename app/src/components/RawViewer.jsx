import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const LOCAL_API_ORIGIN = 'http://localhost:4000';
const PROD_API_ORIGIN = 'https://shareclaude.pages.dev';

function isLocalDevHost() {
    const { hostname } = window.location;
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

function formatChatAsText(chatData) {
    const lines = [`# ${chatData.title}`, ''];
    const messages = Array.isArray(chatData.content) ? chatData.content : [];
    for (const { source, message } of messages) {
        const role = source === 'user' ? 'You' : 'Claude';
        lines.push(`## ${role}`, '', message ?? '', '', '---', '');
    }
    return lines.join('\n');
}

function RawViewer() {
    const { chatId } = useParams();
    const [text, setText] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const origins = isLocalDevHost()
                    ? [window.location.origin, LOCAL_API_ORIGIN, PROD_API_ORIGIN]
                    : [window.location.origin];

                let data = null;
                let lastErr = null;

                for (const origin of origins) {
                    try {
                        const res = await fetch(`${origin}/api/chats/${chatId}`);
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const ct = res.headers.get('content-type') ?? '';
                        if (!ct.includes('application/json')) throw new Error('Non-JSON response');
                        data = await res.json();
                        break;
                    } catch (e) {
                        lastErr = e;
                    }
                }

                if (!data) throw lastErr ?? new Error('Failed to load chat');
                document.title = `${data.title} — raw`;
                setText(formatChatAsText(data));
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to load');
            }
        };
        load();
    }, [chatId]);

    const preStyle = {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '0.875rem',
        lineHeight: '1.7',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        padding: '2rem',
        maxWidth: '860px',
        margin: '0 auto',
        color: error ? '#f87171' : '#d1d5db',
    };

    return (
        <div style={{ minHeight: '100vh', background: '#1a1a2e' }}>
            <pre style={preStyle}>
                {error ? `Error: ${error}` : (text ?? 'Loading…')}
            </pre>
        </div>
    );
}

export default RawViewer;
