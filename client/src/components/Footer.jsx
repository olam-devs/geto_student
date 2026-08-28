import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail } from 'lucide-react';

function IgIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.16 8.16 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z"/>
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-primary-700 text-slate-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-accent-600 flex items-center justify-center font-display font-bold text-white text-lg">G</div>
            <span className="font-display font-bold text-white text-lg">Geto <span className="text-accent-500">Student</span></span>
          </div>
          <p className="text-sm leading-relaxed mb-4">Tanzania's trusted platform for verified student accommodation. Find → Compare → Verify → Book → Move In.</p>
          <div className="flex gap-3">
            <a href="https://www.instagram.com/getostudent?igsi=MXBmMDJpYmZ3OG1xbQ==" target="_blank" rel="noreferrer"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-accent-600 flex items-center justify-center transition-colors"><IgIcon/></a>
            <a href="https://www.tiktok.com/@getostudent?_r=1&_t=ZS-99FgwBFH7QN" target="_blank" rel="noreferrer"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-accent-600 flex items-center justify-center transition-colors"><TikTokIcon/></a>
            <a href="https://wa.me/255657925368" target="_blank" rel="noreferrer"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-accent-600 flex items-center justify-center transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            </a>
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h4 className="font-display font-semibold text-white text-sm mb-4">For Students</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/browse" className="hover:text-accent-500 transition-colors">Browse Rooms</Link></li>
            <li><Link to="/browse?verified=true" className="hover:text-accent-500 transition-colors">Verified Properties</Link></li>
            <li><Link to="/auth?tab=register" className="hover:text-accent-500 transition-colors">Register Free</Link></li>
            <li><Link to="/dashboard" className="hover:text-accent-500 transition-colors">My Dashboard</Link></li>
          </ul>
        </div>

        {/* Agents */}
        <div>
          <h4 className="font-display font-semibold text-white text-sm mb-4">For Agents</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/auth?tab=agent-register" className="hover:text-accent-500 transition-colors">Register as Agent</Link></li>
            <li><Link to="/agent" className="hover:text-accent-500 transition-colors">Agent Portal</Link></li>
            <li><a href="#" className="hover:text-accent-500 transition-colors">How Verification Works</a></li>
            <li><a href="#" className="hover:text-accent-500 transition-colors">Agent Guidelines</a></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-display font-semibold text-white text-sm mb-4">Contact Us</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2"><MapPin size={14} className="text-accent-500 mt-0.5 shrink-0"/><span>Dar es Salaam, Tanzania</span></li>
            <li className="flex items-center gap-2"><Phone size={14} className="text-accent-500"/><a href="tel:+255657925368" className="hover:text-white">+255 657 925 368</a></li>
            <li className="flex items-center gap-2"><Phone size={14} className="text-accent-500"/><a href="https://wa.me/255657925368" target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp: +255 657 925 368</a></li>
            <li className="flex items-center gap-2"><Mail size={14} className="text-accent-500"/><a href="mailto:info@getostudent.tz" className="hover:text-white">info@getostudent.tz</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 sm:px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
        <span>© 2026 Geto Student. All rights reserved.</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-slate-300">Privacy Policy</a>
          <a href="#" className="hover:text-slate-300">Terms of Service</a>
          <a href="#" className="hover:text-slate-300">Support</a>
        </div>
      </div>
    </footer>
  );
}
