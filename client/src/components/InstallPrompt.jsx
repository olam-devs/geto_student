import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstalled(true); setVisible(false); });
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
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-display font-bold text-accent text-xl shrink-0">G</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">Sakinisha Geto Student</p>
        <p className="text-xs text-slate-500 mt-0.5">Ongeza kwenye skrini ya nyumbani kwa ufikio wa haraka</p>
        <button onClick={install}
          className="mt-2 flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
          <Download size={12}/> Sakinisha
        </button>
      </div>
      <button onClick={() => setVisible(false)} className="text-slate-400 hover:text-slate-600 shrink-0">
        <X size={16}/>
      </button>
    </div>
  );
}
