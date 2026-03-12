import { Flame, Chrome, Github, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';

function Footer() {
    return (
        <footer className="py-4 border-t border-gray-700">
            <div className="flex flex-col items-center justify-between px-4 mx-auto space-y-4 max-w-7xl sm:flex-row sm:space-y-0">
                <div className="flex space-x-6">
                    <a href="https://chromewebstore.google.com/detail/pcpjdbnjhgofgjgegodlnebdnmiddmaa" target="_blank" rel="noopener noreferrer">
                        <Chrome className="w-5 h-5 text-gray-400 hover:text-gray-200" />
                    </a>
                    <a href="https://addons.mozilla.org/firefox/addon/shareclaude/" target="_blank" rel="noopener noreferrer">
                        <Flame className="w-5 h-5 text-gray-400 hover:text-gray-200" />
                    </a>
                    <a href="https://github.com/rohit1kumar/shareclaude" target="_blank" rel="noopener noreferrer">
                        <Github className="w-5 h-5 text-gray-400 hover:text-gray-200" />
                    </a>
                    <a href="https://twitter.com/roh1tkumar" target="_blank" rel="noopener noreferrer">
                        <Twitter className="w-5 h-5 text-gray-400 hover:text-gray-200" />
                    </a>
                </div>
                <Link
                    to="/privacy-policy"
                    className="text-sm text-gray-400 hover:text-gray-200 hover:underline"
                >
                    Privacy Policy
                </Link>
            </div>
        </footer>
    );
}

export default Footer;
