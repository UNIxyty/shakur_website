import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import ProjectDetail from './pages/ProjectDetail';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';
import RequireAuth from './admin/RequireAuth';
import { useLang } from './lang';
import { pageTransition } from './motion';

/** The design scrolls to the top on every route change. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PublicSite() {
  const location = useLocation();
  const { lang } = useLang();

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white text-ink">
      <Header />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {/* Keying on lang too means a language switch replays the page transition,
              matching the design's `pageKey = route|param|lang`. */}
          <motion.div
            key={`${location.pathname}|${lang}`}
            variants={pageTransition}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/services" element={<Services />} />
              <Route path="/service/:slug" element={<ServiceDetail />} />
              <Route path="/project/:slug" element={<ProjectDetail />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ScrollToTop />
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/*"
          element={
            <RequireAuth>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route path="*" element={<PublicSite />} />
      </Routes>
    </MotionConfig>
  );
}
