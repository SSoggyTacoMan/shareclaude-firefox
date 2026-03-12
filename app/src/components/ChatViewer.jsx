import { useEffect, useState } from 'react';
import ChatMessage from './ChatMessage';
import { useParams } from 'react-router-dom';

function ChatViewer() {
    const [chatData, setChatData] = useState(null);
    const [error, setError] = useState(null);
    const { chatId } = useParams();

    useEffect(() => {
        const fetchChatData = async () => {
            try {
                const apiURL = "https://shareclaude.pages.dev/api/chats";
                const response = await fetch(`${apiURL}/${chatId}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const data = await response.json();
                document.title = data?.title ?? 'Chats - ShareClaude';
                setChatData(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            }
        };

        fetchChatData();
    }, [chatId]);

    if (error) return (
        <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-red-600">
            Error: {error}
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-grow w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {chatData && (
                    <header className="mb-6 text-center">
                        <h1 className="text-2xl font-bold text-gray-100">
                            {chatData.title}
                        </h1>
                        <div className="mt-2 h-0.5 w-12 mx-auto rounded-full bg-shareClaude-accent/60" />
                    </header>
                )}

                <section className="divide-y divide-gray-700/30">
                    {chatData ? (
                        chatData.content.map((chat, index) => (
                            <ChatMessage key={index} chat={chat} />
                        ))
                    ) : (
                        <div className="flex justify-center py-16">
                            <div className="w-10 h-10 border-4 border-shareClaude-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default ChatViewer;
