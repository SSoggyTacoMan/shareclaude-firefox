import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';
import mermaid from 'mermaid';
import { useEffect, useRef } from 'react';

// Initialize mermaid with dark theme config
mermaid.initialize({
    startOnLoad: true,
    theme: 'dark'
})

const MarkdownRenderer = ({ content, isHuman }) => {
    const mermaidRef = useRef(null);

    useEffect(() => {
        // Re-render all mermaid diagrams when content changes
        if (mermaidRef.current) {
            mermaid.init(undefined, '.mermaid');
        }
    }, [content]);

    const parseAntArtifact = (text) => {
        const identifierMatch = text.match(/identifier="([^"]*)"/);
        const typeMatch = text.match(/type="([^"]*)"/);
        const titleMatch = text.match(/title="([^"]*)"/);
        const languageMatch = text.match(/language="([^"]*)"/);

        // Extract content between opening and closing tags
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

    const renderMarkdown = (content, index) => (
        <ReactMarkdown
            key={index}
            remarkPlugins={[remarkGfm]}
            className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-blockquote:border-gray-700 prose-blockquote:text-gray-300 prose-th:bg-gray-800 prose-td:border-gray-700 prose-hr:border-gray-700 prose-headings:text-gray-200 prose-li:my-0.5 prose-li:marker:text-gray-500 prose-table:border prose-table:border-gray-700"
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
                        <table className="min-w-full divide-y divide-gray-700 border border-gray-700">{children}</table>
                    </div>
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    );

    const parts = content.split(/(<antArtifact.*?<\/antArtifact>)/s);

    return (
        <>
            {parts.map((part, index) => {
                if (part.startsWith('<antArtifact')) {
                    const artifact = parseAntArtifact(part);
                    return artifact ? renderArtifact(artifact, index) : null;
                }
                return renderMarkdown(part, index);
            })}
        </>
    );
};

export default MarkdownRenderer;