import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { typescript, javascript, python, json, bash, jsx, markup as html, sql } from 'react-syntax-highlighter/dist/esm/languages/prism'
import dracula from 'react-syntax-highlighter/dist/esm/styles/prism/dracula'
import classNames from 'classnames';
import PropTypes from 'prop-types';

SyntaxHighlighter.registerLanguage('javascript', javascript)
SyntaxHighlighter.registerLanguage('typescript', typescript)
SyntaxHighlighter.registerLanguage('python', python)
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('bash', bash)
SyntaxHighlighter.registerLanguage('jsx', jsx)
SyntaxHighlighter.registerLanguage('html', html)
SyntaxHighlighter.registerLanguage('sql', sql)

const CodeBlock = ({ inline, className, children, isHuman, title, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');

    if (!inline && match) {
        const language = match ? match[1].toLowerCase() : 'text';
        return (
            <div className="overflow-hidden rounded-lg">
                <div className="bg-gray-800 px-4 py-1.5 text-xs text-gray-200">
                    <span>{title || language}</span>
                </div>
                <SyntaxHighlighter
                    style={dracula}
                    language={language}
                    showLineNumbers={true}
                    customStyle={{
                        margin: 0,
                        padding: '0.75rem 1rem',
                        borderTopLeftRadius: 0,
                        borderTopRightRadius: 0,
                        fontSize: '0.875rem',
                    }}
                    {...props}
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            </div>
        );
    }
    // if no language is specified, use text
    return (
        <code
            className={classNames(
                "bg-gray-700 text-gray-100 rounded px-1.5 py-0.5 text-sm whitespace-pre-wrap break-words",
                { "text-white": isHuman }
            )}
            {...props}
        >
            {children}
        </code>
    );
};

CodeBlock.propTypes = {
    inline: PropTypes.bool,
    className: PropTypes.string,
    children: PropTypes.node,
    isHuman: PropTypes.bool,
    title: PropTypes.string,
};

export default CodeBlock;