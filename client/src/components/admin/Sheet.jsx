import React, { useEffect, useRef, useState } from 'react';
import { X, Copy, Check, MessageSquareText, AlertTriangle } from 'lucide-react';

// Pop-up form: full screen on phones, centred card on larger screens. Esc closes it.
export default function Sheet({ title, icon: Icon, onClose, children, footer }) {
  const bodyRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {   // runs once: Esc to close, lock page scroll, focus the first field of the form
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    bodyRef.current?.querySelector('input, select, textarea, button')?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className="bg-white w-full sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl shadow-2xl flex flex-col">
        <div className="bg-primary px-4 sm:px-6 py-3.5 flex items-center gap-2 text-white sm:rounded-t-2xl shrink-0">
          {Icon && <Icon size={18} aria-hidden="true" />}
          <h3 className="font-display font-bold text-base flex-1 truncate">{title}</h3>
          <button onClick={onClose} aria-label="Close"
            className="w-11 h-11 -mr-2 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10">
            <X size={20} />
          </button>
        </div>
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-slate-100 px-4 sm:px-6 py-3 bg-white sm:rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

// Labelled field. Inputs use 16px text on phones so iPhones don't zoom in.
export function Field({ id, label, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
export const inputCls = 'input text-base sm:text-sm min-h-[44px]';

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="flex gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
      <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />{children}
    </div>
  );
}

// Shown once after staff create an account: the temporary password and whether the SMS went out.
export function NewAccountNotice({ account, who }) {
  const [copied, setCopied] = useState(false);
  if (!account) return null;
  if (!account.created) {
    return <p className="text-sm text-slate-600">Linked to the existing {who} account <b>{account.name}</b> ({account.phone}).</p>;
  }
  const text = `Geto Student login\nPhone: ${account.phone}\nPassword: ${account.temp_password}\nhttps://getostudent.co.tz/auth`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  const digits = String(account.phone).replace(/\D/g, '');
  const wa = `https://wa.me/${digits.startsWith('0') ? '255' + digits.slice(1) : digits}?text=${encodeURIComponent(text)}`;
  return (
    <div className="rounded-xl border border-accent-200 bg-accent-50 p-4 space-y-3">
      <p className="text-sm text-slate-700">New {who} account created for <b>{account.name}</b>.</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><div className="label mb-0.5">Phone</div><div className="font-mono font-semibold">{account.phone}</div></div>
        <div><div className="label mb-0.5">Temporary password</div><div className="font-mono font-bold text-lg text-primary">{account.temp_password}</div></div>
      </div>
      <p className={`text-xs font-medium ${account.sms_sent ? 'text-accent-700' : 'text-amber-700'}`}>
        {account.sms_sent ? 'Login details were sent by SMS.' : 'The SMS could not be sent. Share the details below.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn-sm min-h-[44px] sm:min-h-0 border border-slate-300 bg-white text-slate-700">
          {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy details'}
        </button>
        <a href={wa} target="_blank" rel="noreferrer" className="btn-sm min-h-[44px] sm:min-h-0 bg-accent-700 text-white">
          <MessageSquareText size={14} />Send on WhatsApp
        </a>
      </div>
      <p className="text-xs text-slate-500">This password is shown only once.</p>
    </div>
  );
}
