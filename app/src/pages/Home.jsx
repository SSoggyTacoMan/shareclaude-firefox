import { Chrome, Globe, Link2, Github } from 'lucide-react';
import { Link } from 'react-router-dom';
import thumbnail from '../assets/thumbnail.webp';
import LiteYouTubeEmbed from 'react-lite-youtube-embed';
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css';

function Home() {
    return (
        <div className="min-h-screen overflow-x-hidden text-gray-200">
            <main>
                {/* Hero Section */}
                <div className="max-w-4xl px-4 py-12 mx-auto text-center sm:px-8 sm:py-24">
                    <h1 className="mb-6 text-4xl font-bold sm:text-6xl">
                        Share Your Claude Chats
                        <br />
                        <span className="text-shareClaude-accent">With One Click</span>
                    </h1>
                    <p className="max-w-2xl mx-auto mb-4 text-xl text-gray-400">
                        Instantly share your Claude.AI conversations with anyone. A simple browser extension
                        that makes collaboration effortless.
                    </p>
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex flex-col gap-4 sm:flex-row">
                            <a
                                href="https://chromewebstore.google.com/detail/pcpjdbnjhgofgjgegodlnebdnmiddmaa"
                                target="_blank"
                                className="inline-flex items-center px-6 py-3 text-lg font-semibold text-white rounded-lg bg-shareClaude-accent hover:bg-shareClaude-accent/80"
                            >
                                <Chrome className="w-6 h-6 mr-2" />
                                Chrome
                            </a>
                            <a
                                href="https://addons.mozilla.org/firefox/addon/shareclaude/"
                                target="_blank"
                                className="inline-flex items-center px-6 py-3 text-lg font-semibold text-white rounded-lg bg-shareClaude-accent hover:bg-shareClaude-accent/80"
                            >
                                <Globe className="w-6 h-6 mr-2" />
                                Firefox
                            </a>
                            <Link
                                to="/c/rhxw367ndulkfr24a5hssm5u"
                                className="inline-flex items-center px-6 py-3 text-lg font-semibold border-2 rounded-lg border-shareClaude-accent text-shareClaude-accent hover:bg-shareClaude-accent hover:text-white"
                            >
                                <Link2 className="w-6 h-6 mr-2" />
                                Get Share Link
                            </Link>
                        </div>
                        <p className="text-xs text-gray-400 opacity-75">
                            *Also available for Edge, Brave, Opera and other Chromium-based browsers
                        </p>
                    </div>
                </div>

                {/* YouTube Video */}
                <div className="max-w-4xl px-4 mx-auto my-0 sm:px-8">
                    <div className="overflow-hidden transition-all duration-300 border border-gray-600 shadow-lg aspect-video rounded-xl shadow-shareClaude-accent/50 hover:shadow-shareClaude-accent/80">
                        <LiteYouTubeEmbed
                            id="fhiBt878T34"
                            thumbnail={thumbnail}
                            title="ShareClaude - Browser Extension for Sharing Claude Conversations"
                        />
                    </div>
                </div>

                {/* Feature Card */}
                <div className="-mt-6 py-4">
                    <div className="max-w-4xl px-4 mx-auto sm:px-8">
                        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                            <div className="p-6 text-center rounded-lg bg-shareClaude-backgroundLight">
                                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-lg bg-shareClaude-background">
                                    <Link2 className="w-8 h-8 text-shareClaude-accent" />
                                </div>
                                <h3 className="mb-2 text-xl font-semibold">One-Click Sharing</h3>
                                <p className="text-gray-400">Share your entire Claude conversation with a single click, maintaining all formatting and context.</p>
                            </div>
                            <div className="p-6 text-center rounded-lg bg-shareClaude-backgroundLight">
                                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-lg bg-shareClaude-background">
                                    <Chrome className="w-8 h-8 text-shareClaude-accent" />
                                </div>
                                <h3 className="mb-2 text-xl font-semibold">Seamless Integration</h3>
                                <p className="text-gray-400">Integrates perfectly with Claude.AI&apos;s interface, providing a native sharing experience.</p>
                            </div>
                            <div className="p-6 text-center rounded-lg bg-shareClaude-backgroundLight">
                                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-lg bg-shareClaude-background">
                                    <Github className="w-8 h-8 text-shareClaude-accent" />
                                </div>
                                <h3 className="mb-2 text-xl font-semibold">Open Source</h3>
                                <p className="text-gray-400">Fully open-source and free. Contribute to improve sharing. Available on Chrome, Firefox, and all major browsers.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Home;