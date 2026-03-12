import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';
import mermaid from 'mermaid';
import { useEffect, useRef } from 'react';

// splits a markdown string on excerpt_from_previous_claude_message.txt blocks
// returns array of { type: 'markdown'|'excerpt', content: string }
const EXCERPT_RE = /excerpt_from_previous_claude_message\.txt:\n\n(?:```\w*\n([\s\S]*?)\n```|([\s\S]*?))(?=\n\n|\n?$)/g;

function splitOnExcerpts(text) {
    const parts = [];
    let lastIndex = 0;
    const re = new RegExp(EXCERPT_RE.source, 'g');
    let match;
    while ((match = re.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: 'markdown', content: text.slice(lastIndex, match.index) });
        }
        // group 1 = fenced code content, group 2 = plain content
        const quotedText = (match[1] ?? match[2] ?? '').trim();
        parts.push({ type: 'excerpt', content: quotedText });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        parts.push({ type: 'markdown', content: text.slice(lastIndex) });
    }
    return parts.length > 0 ? parts : [{ type: 'markdown', content: text }];
}

mermaid.initialize({
    startOnLoad: true,
    theme: 'dark'
})

const MarkdownRenderer = ({ content, isHuman }) => {
    const mermaidRef = useRef(null);

    useEffect(() => {
        if (mermaidRef.current) {
            mermaid.init(undefined, '.mermaid');
        }
    }, [content]);

    const parseAntArtifact = (text) => {
        const identifierMatch = text.match(/identifier="([^"]*)"/);
        const typeMatch = text.match(/type="([^"]*)"/);
        const titleMatch = text.match(/title="([^"]*)"/);
        const languageMatch = text.match(/language="([^"]*)"/);

        const contentMatch = text.match(/<antArtifact[^>]*>([\s\S]*?)<\/antArtifact>/);

        if (identifierMatch && typeMatch && titleMatch && contentMatch) {
            return {
                identifier: identifierMatch[1],
                type: typeMatch[1],
                title: titleMatch[1],
                language: languageMatch ? languageMatch[1] : null,
                content: contentMatch[1].trim()
            };
        }
        return null;
    };

    const renderArtifact = (artifact, index) => {
        switch (artifact.type) {
            case 'application/vnd.ant.mermaid':
                return (
                    <div key={index} className="my-4" ref={mermaidRef}>
                        <div className="bg-gray-800 px-4 py-2 text-xs text-gray-200">
                            {artifact.title}
                        </div>
                        <div className="bg-gray-900 p-4">
                            <pre className="mermaid">
                                {artifact.content}
                            </pre>
                        </div>
                    </div>
                );

            case 'application/vnd.ant.react':
                return (
                    <CodeBlock
                        key={index}
                        className="language-jsx"
                        isHuman={isHuman}
                        title={artifact.title}
                    >
                        {artifact.content}
                    </CodeBlock>
                );

            case 'text/html':
                return (
                    <CodeBlock
                        key={index}
                        className="language-html"
                        isHuman={isHuman}
                        title={artifact.title}
                    >
                        {artifact.content}
                    </CodeBlock>
                );

            case 'text/markdown':
                return (
                    <div key={index} className="my-4">
                        <div className="bg-gray-800 px-4 py-2 text-xs text-gray-200">
                            {artifact.title}
                        </div>
                        <div className="bg-gray-900 p-4">
                            {renderMarkdown(artifact.content)}
                        </div>
                    </div>
                );

            case 'application/vnd.ant.code':
                return (
                    <CodeBlock
                        key={index}
                        className={`language-${artifact.language || 'text'}`}
                        isHuman={isHuman}
                        title={artifact.title}
                    >
                        {artifact.content}
                    </CodeBlock>
                );

            default:
                return (
                    <CodeBlock
                        key={index}
                        className="language-text"
                        isHuman={isHuman}
                        title={artifact.title}
                    >
                        {artifact.content}
                    </CodeBlock>
                );
        }
    };

    const renderExcerpt = (quotedText, key) => (
        <div key={key} className="my-2 pl-3 border-l-2 border-[#D97757] rounded-r-sm bg-black/10">
            <div className="text-xs text-[#D97757] mb-1 font-medium flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v6.44l1.97-1.97a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 8.28a.75.75 0 0 1 1.06-1.06L7.25 9.19V2.75A.75.75 0 0 1 8 2Z" clipRule="evenodd" />
                    <path d="M3.5 13.25a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Z" />
                </svg>
                Quoting
            </div>
            <div className="text-sm text-gray-400 whitespace-pre-wrap">{quotedText}</div>
        </div>
    );

    const renderMarkdown = (content, index) => (
        <ReactMarkdown
            key={index}
            remarkPlugins={[remarkGfm]}
            className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-blockquote:border-gray-700 prose-blockquote:text-gray-300 prose-hr:border-gray-700 prose-headings:text-gray-200 prose-li:my-0.5 prose-li:marker:text-gray-500"
            components={{
                code: (props) => <CodeBlock {...props} isHuman={isHuman} />,
                pre: ({ children }) => (
                    <div className="rounded-lg overflow-hidden">{children}</div>
                ),
                a: ({ children, href }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                ),
                table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                        <table className="min-w-full border-collapse border border-gray-700">{children}</table>
                    </div>
                ),
                th: ({ children }) => (
                    <th className="px-3 py-2 bg-gray-800 font-semibold text-gray-200 border border-gray-700 text-left">{children}</th>
                ),
                td: ({ children }) => (
                    <td className="px-3 py-2 border border-gray-700 text-gray-300">{children}</td>
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    );

    const renderPart = (text, index) => {
        const subParts = splitOnExcerpts(text);
        return subParts.map((sub, si) =>
            sub.type === 'excerpt'
                ? renderExcerpt(sub.content, `${index}-${si}`)
                : renderMarkdown(sub.content, `${index}-${si}`)
        );
    };

    const parts = content.split(/(<antArtifact.*?<\/antArtifact>)/s);

    return (
        <>
            {parts.map((part, index) => {
                if (part.startsWith('<antArtifact')) {
                    const artifact = parseAntArtifact(part);
                    return artifact ? renderArtifact(artifact, index) : null;
                }
                return renderPart(part, index);
            })}
        </>
    );
};

export default MarkdownRenderer;