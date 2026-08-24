import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Facebook, Instagram, Twitter } from 'lucide-react';

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
            <a href="#" className="w-8 h-8 rounded-full bg-white/10 hover:bg-accent-600 flex items-center justify-center transition-colors"><Facebook size={15}/></a>
            <a href="#" className="w-8 h-8 rounded-full bg-white/10 hover:bg-accent-600 flex items-center justify-center transition-colors"><Instagram size={15}/></a>
            <a href="#" className="w-8 h-8 rounded-full bg-white/10 hover:bg-accent-600 flex items-center justify-center transition-colors"><Twitter size={15}/></a>
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
            <li className="flex items-center gap-2"><Phone size={14} className="text-accent-500"/><a href="tel:+255755000000" className="hover:text-white">+255 755 000 000</a></li>
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
