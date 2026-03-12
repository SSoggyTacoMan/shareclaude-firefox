function PrivacyPolicy() {
    return (
        <div className="flex items-center justify-center min-h-screen px-4 py-16 text-gray-200 sm:py-24">
            <div className="max-w-3xl p-8 text-center border border-gray-700 rounded-lg sm:p-12">
                <h1 className="mb-6 text-xl font-bold">Privacy Policy</h1>

                <p className="text-gray-300">
                    We only collect the content of your Claude AI conversations to generate
                    shareable URLs. No analytics or tracking tools are used, and no additional
                    data is collected. The extension is open source for transparency. You can
                    review the code to see how it works.
                </p>

                <h2 className="mt-8 mb-6 text-xl font-bold">How It Works</h2>

                <p className="mb-4 text-gray-300">
                    When you share a conversation, the extension saves it to ShareClaude&apos;s
                    database, not Claude&apos;s. Each conversation is assigned a unique URL,
                    similar to an unlisted YouTube video. This URL can be shared with others,
                    but it won&apos;t appear in search results on Google. Subsequent conversations
                    are served from ShareClaude&apos;s database, not directly from Claude.
                </p>

                <p className="italic text-gray-300">
                    Important: While the URL is private and not searchable, anyone with the URL can still view the conversation. Please avoid sharing sensitive or personal information.
                </p>
            </div>
        </div>
    );
}

export default PrivacyPolicy;
