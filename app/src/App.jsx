import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, Outlet } from 'react-router-dom';

const Home = lazy(() => import('./pages/Home'));
const ChatViewer = lazy(() => import('./components/ChatViewer'));
const RawViewer = lazy(() => import('./components/RawViewer'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Header = lazy(() => import('./components/Header'));
const Footer = lazy(() => import('./components/Footer'));

const loadingSpinner = (
  <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center text-gray-400">
    <div className="w-12 h-12 border-4 border-shareClaude-accent border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function Layout() {
  return (
    <div className="min-h-screen bg-shareClaude-background flex flex-col overflow-x-hidden">
      <Header />
      <main className="flex-grow">
        <Suspense fallback={loadingSpinner}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/c/:chatId/raw" element={
          <Suspense fallback={null}><RawViewer /></Suspense>
        } />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/c/:chatId" element={<ChatViewer />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App