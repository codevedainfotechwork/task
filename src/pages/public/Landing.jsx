import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, ContactShadows, PresentationControls } from '@react-three/drei';
import { Zap, Shield, Activity, Users, ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';
import * as THREE from 'three';

// --- 3D Components ---
function AbstractShape() {
  const meshRef = useRef();
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
      meshRef.current.rotation.x += delta * 0.05;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={meshRef} scale={typeof window !== 'undefined' && window.innerWidth < 768 ? 0.55 : 1}>
        <icosahedronGeometry args={[2, 1]} />
        <meshPhysicalMaterial 
          color="#00d4ff" 
          emissive="#bf00ff"
          emissiveIntensity={0.3}
          wireframe={true}
          roughness={0.1}
          metalness={0.8}
          transparent={true}
          opacity={0.85}
        />
      </mesh>
    </Float>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
      <PresentationControls
        global
        rotation={[0.13, 0.1, 0]}
        polar={[-0.4, 0.2]}
        azimuth={[-1, 0.75]}
        config={{ mass: 2, tension: 400 }}
        snap={{ mass: 4, tension: 400 }}
      >
        <AbstractShape />
      </PresentationControls>
      <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />
      <Environment preset="city" />
    </>
  );
}

// --- UI Components ---
const NavBar = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-4 bg-[#030712]/80 backdrop-blur-xl border-b border-white/5' : 'py-6 bg-transparent'}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-8 h-8 rounded-lg outline outline-1 outline-cyan-500/30 flex items-center justify-center bg-gradient-to-br from-cyan-500/10 to-purple-500/10 backdrop-blur">
            <Zap size={16} className="text-cyan-400" />
          </div>
          <span className="text-white font-bold tracking-[0.2em] text-sm">{t('brand_name')}</span>
        </div>
        
        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs font-mono text-slate-400 hover:text-white transition-colors tracking-widest uppercase">{t('nav_features')}</a>
            <a href="#benefits" className="text-xs font-mono text-slate-400 hover:text-white transition-colors tracking-widest uppercase">{t('nav_benefits')}</a>
          </div>

          <button 
            onClick={() => navigate('/login')}
            className="group relative px-4 py-2 md:px-6 md:py-2.5 rounded-full bg-[#ffffff] text-black text-[10px] md:text-xs font-bold tracking-wide md:tracking-widest overflow-hidden transition-all hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 group-hover:text-white transition-colors duration-300 uppercase">{t('access_workspace')}</span>
          </button>
        </div>
      </div>
    </motion.nav>
  );
};

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -300]);

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-hidden selection:bg-cyan-500/30">
      <NavBar />
      
      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[85vh] md:min-h-screen flex flex-col items-center justify-center py-20 md:pt-20">
        {/* 3D Canvas - DESKTOP ONLY (WebGL doesn't work on most mobile browsers) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] z-0 pointer-events-none opacity-50 hidden md:block">
          <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
            <Scene />
          </Canvas>
        </div>

        {/* CSS Animated Sphere - MOBILE ONLY (always renders, no WebGL needed) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] z-0 pointer-events-none md:hidden">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 rounded-full border border-cyan-500/20"
            style={{ animation: 'spin 12s linear infinite' }} />
          {/* Middle rotating ring - opposite direction */}
          <div className="absolute inset-3 rounded-full border border-purple-500/25"
            style={{ animation: 'spin 8s linear infinite reverse' }} />
          {/* Inner glow core */}
          <div className="absolute inset-8 rounded-full border border-cyan-400/15"
            style={{ animation: 'spin 15s linear infinite' }} />
          {/* Central glowing orb */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] h-[120px] rounded-full animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, rgba(191,0,255,0.1) 50%, transparent 70%)',
              boxShadow: '0 0 60px rgba(0,212,255,0.15), 0 0 120px rgba(191,0,255,0.08)',
            }}
          />
          {/* Wireframe cross lines */}
          <div className="absolute top-1/2 left-0 right-0 h-[1px] -translate-y-1/2 opacity-20"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent)', animation: 'spin 20s linear infinite' }} />
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2 opacity-20"
            style={{ background: 'linear-gradient(180deg, transparent, rgba(191,0,255,0.5), transparent)', animation: 'spin 20s linear infinite' }} />
          {/* Elliptical orbit ring */}
          <div className="absolute inset-6 rounded-full border border-cyan-500/10"
            style={{ transform: 'rotateX(60deg)', animation: 'spin 10s linear infinite' }} />
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[800px] md:h-[800px] rounded-full blur-[80px] md:blur-[150px] bg-gradient-to-tr from-purple-500/15 to-cyan-500/15 md:from-purple-500/10 md:to-cyan-500/10 pointer-events-none z-0" />

        <div className="relative z-[2] w-full max-w-5xl mx-auto px-4 md:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 mb-5 md:mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">{t('sys_ops_os')}</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-4xl md:text-7xl font-bold tracking-tight mb-6 md:mb-8 leading-[1.2] md:leading-[1.1]"
          >
            {t('landing_hero_title')} <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 leading-tight">
              {t('landing_hero_highlight')}
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-base md:text-xl text-slate-400 max-w-2xl mx-auto mb-8 md:mb-12 font-light leading-relaxed px-2"
          >
            {t('landing_hero_subtitle')}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full"
          >
            <button 
              onClick={() => navigate('/login')}
              className="px-6 py-3.5 md:px-8 md:py-4 rounded-full bg-white text-black font-semibold tracking-wide hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 w-[90%] sm:w-auto"
            >
              {t('landing_signin_btn')} <ArrowRight size={18} />
            </button>
            <button className="px-6 py-3.5 md:px-8 md:py-4 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-slate-300 font-semibold tracking-wide justify-center w-[90%] sm:w-auto">
              {t('landing_docs_btn')}
            </button>
          </motion.div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-16 md:py-32 relative z-10 bg-[#030712]">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          <div className="mb-10 md:mb-20">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('feature_title')}</h2>
            <p className="text-slate-400 text-lg">{t('feature_subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="md:col-span-2 p-5 md:p-8 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] hover:border-cyan-500/20 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield weight="duotone" className="text-cyan-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('feature_1_title')}</h3>
              <p className="text-slate-400 font-light leading-relaxed mb-8 max-w-md">
                {t('feature_1_desc')}
              </p>
              <img src="https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&q=80&w=1200" alt="Security abstract" className="w-full h-48 object-cover rounded-xl opacity-40 mix-blend-overlay grayscale group-hover:grayscale-0 transition-all duration-500" />
            </div>

            {/* Feature 2 */}
            <div className="p-5 md:p-8 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] hover:border-purple-500/20 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Activity weight="duotone" className="text-purple-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('feature_2_title')}</h3>
              <p className="text-slate-400 font-light leading-relaxed">
                {t('feature_2_desc')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 md:p-8 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] hover:border-pink-500/20 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap weight="duotone" className="text-pink-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('feature_3_title')}</h3>
              <p className="text-slate-400 font-light leading-relaxed">
                {t('feature_3_desc')}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="md:col-span-2 p-5 md:p-8 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] hover:border-emerald-500/20 transition-colors group overflow-hidden relative">
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 w-full md:w-1/2">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users weight="duotone" className="text-emerald-400" size={24} />
                </div>
                <h3 className="text-xl font-semibold mb-3">{t('feature_4_title')}</h3>
                <p className="text-slate-400 font-light leading-relaxed">
                  {t('feature_4_desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS --- */}
      <section id="testimonials" className="py-16 md:py-32 relative bg-[#020408] border-y border-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          <h2 className="text-center text-2xl md:text-3xl font-bold mb-8 md:mb-16">{t('trusted_by')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { text: t('testimonial_1_text'), author: t('testimonial_1_author'), role: t('testimonial_1_role') },
              { text: t('testimonial_2_text'), author: t('testimonial_2_author'), role: t('testimonial_2_role') },
              { text: t('testimonial_3_text'), author: t('testimonial_3_author'), role: t('testimonial_3_role') }
            ].map((t_item, i) => (
              <div key={i} className="p-5 md:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex gap-1 mb-6">
                  {[1,2,3,4,5].map(s => <span key={s} className="text-cyan-500 text-sm">★</span>)}
                </div>
                <p className="text-slate-300 italic mb-6">"{t_item.text}"</p>
                <div>
                  <p className="font-medium text-white">{t_item.author}</p>
                  <p className="text-xs font-mono text-slate-500 uppercase mt-1 tracking-wider">{t_item.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA / FOOTER --- */}
      <section className="py-16 md:py-32 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-64 bg-cyan-500/10 blur-[100px] rounded-full" />
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 md:mb-8">{t('cta_title')}</h2>
          <p className="text-slate-400 mb-6 md:mb-10 max-w-xl mx-auto text-sm md:text-base">{t('cta_subtitle')}</p>
          <button 
            onClick={() => navigate('/login')}
            className="px-8 py-4 md:px-10 md:py-5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold tracking-wider md:tracking-widest text-xs md:text-sm hover:shadow-[0_0_40px_rgba(0,212,255,0.4)] transition-shadow"
          >
            {t('cta_btn')}
          </button>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 md:py-12 text-center text-slate-600 text-xs font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>{t('footer_rights')}</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">{t('nav_sys_status')}</a>
            <a href="#" className="hover:text-white transition-colors">{t('nav_privacy')}</a>
            <a href="#" className="hover:text-white transition-colors">{t('nav_terms')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
