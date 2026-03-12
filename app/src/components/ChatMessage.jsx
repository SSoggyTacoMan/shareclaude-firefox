import { memo } from 'react'
import MarkdownRenderer from './MarkdownRenderer';

function ChatMessage({ chat }) {
    const isUser = chat.source === 'user';

    return (
        <article className="py-4" data-role={chat.source}>
            <div className={`text-xs font-semibold tracking-wide uppercase mb-2 ${isUser ? 'text-gray-400' : 'text-shareClaude-accent'}`}>
                {isUser ? 'You' : 'Claude'}
            </div>
            <div className={`rounded-xl px-5 py-4 ${
                isUser
                    ? 'bg-shareClaude-userChat border border-gray-700/40'
                    : 'bg-shareClaude-claudeChat border border-gray-700/20'
            }`}>
                <div className="break-words">
                    <MarkdownRenderer
                        content={chat.message}
                        isHuman={isUser}
                    />
                </div>
            </div>
        </article>
    );
}

export default memo(ChatMessage);
