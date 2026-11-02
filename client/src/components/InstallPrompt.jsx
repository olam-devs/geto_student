import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      window.__pwaInstallPrompt = e; // share with Navbar
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setVisible(false);
      window.__pwaInstallPrompt = null;
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setVisible(false);
  };

  if (installed || !visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50
                    bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
      {/* Green G-pointer — matches the PWA home screen icon */}
      <svg width="40" height="40" viewBox="0 0 512 512" fill="none" className="shrink-0" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ip-pin" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#4FE09E"/>
            <stop offset="100%" stopColor="#1AA870"/>
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="96" fill="#0D0F1A"/>
        <circle cx="256" cy="202" r="188" fill="none" stroke="#1FA872" strokeWidth="6" opacity="0.35"/>
        <circle cx="256" cy="202" r="168" fill="none" stroke="#1FA872" strokeWidth="5" opacity="0.25"/>
        <path d="M256 460 L138 308 A155 155 0 1 1 374 308 Z" fill="url(#ip-pin)"/>
        <text x="256" y="278" textAnchor="middle"
          fontFamily="'Arial Black','Arial Bold',Impact,Gadget,sans-serif"
          fontWeight="900" fontSize="202" fill="white" letterSpacing="-4">G</text>
      </svg>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">Install Geto Student</p>
        <p className="text-xs text-slate-500 mt-0.5">Add to home screen for quick access</p>
        <button onClick={install}
          className="mt-2 flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
          <Download size={12}/> Install
        </button>
      </div>
      <button onClick={() => setVisible(false)} className="text-slate-400 hover:text-slate-600 shrink-0">
        <X size={16}/>
      </button>
    </div>
  );
}
