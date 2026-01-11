
import React, { useRef, useState, useEffect } from 'react';
import { Trainer, TrainerStatus } from '../types';
import { STATUS_COLORS } from '../constants';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface DigitalIDProps {
  trainer: Trainer;
  allowDownload?: boolean;
}

const ACADEMY_SEAL_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M50 5 L95 27.5 L95 72.5 L50 95 L5 72.5 L5 27.5 Z' fill='none' stroke='%233b82f6' stroke-width='2'/%3E%3Ctext x='50' y='55' font-family='Arial' font-size='12' fill='%23ffffff' text-anchor='middle' font-weight='bold'%3EILA%3C/text%3E%3C/svg%3E`;

export const DigitalID: React.FC<DigitalIDProps> = ({ trainer, allowDownload = true }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [processedPhotoUrl, setProcessedPhotoUrl] = useState<string>('');

  useEffect(() => {
    const loadImage = async () => {
      const originalUrl = trainer.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(trainer.fullName)}&background=050a14&color=fff&size=512`;
      if (originalUrl.startsWith('data:')) {
        setProcessedPhotoUrl(originalUrl);
        return;
      }
      try {
        const response = await fetch(originalUrl, { mode: 'cors' });
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => setProcessedPhotoUrl(reader.result as string);
        reader.readAsDataURL(blob);
      } catch (error) {
        setProcessedPhotoUrl(originalUrl);
      }
    };
    loadImage();
  }, [trainer.photoUrl, trainer.fullName]);

  const exportAsImage = async () => {
    const target = cardRef.current;
    if (!target) return;
    
    setIsExporting(true);
    try {
      const wasFlipped = isFlipped;
      if (wasFlipped) setIsFlipped(false);
      await new Promise(r => setTimeout(r, 600)); 
      
      const canvas = await html2canvas(target, {
        scale: 3, // High DPI for LinkedIn
        useCORS: true,
        backgroundColor: null,
        logging: false,
        width: 380, 
        height: 580,
      });
      
      const link = document.createElement('a');
      link.download = `ILA-ID-${trainer.fullName.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      
      if (wasFlipped) setIsFlipped(true);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-12">
      <div 
        className="relative w-[380px] h-[580px] perspective-2000 group cursor-pointer select-none"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-full transition-all duration-1000 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* FRONT: Absolute Premium ID */}
          <div 
            ref={cardRef} 
            className="absolute inset-0 backface-hidden bg-white rounded-[2.5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-slate-200 flex flex-col w-[380px] h-[580px]"
          >
            {/* Header */}
            <div className="h-44 bg-[#050a14] relative overflow-hidden flex flex-col items-center justify-center">
              <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%"><pattern id="card-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"/></pattern><rect width="100%" height="100%" fill="url(#card-grid)" /></svg>
              </div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-3 shadow-2xl shadow-blue-500/50">
                   <span className="text-white font-black text-xs">ILA</span>
                </div>
                <h1 className="text-white font-black text-xl tracking-tighter uppercase">International Legal Academy</h1>
                <p className="text-blue-500 text-[8px] font-black uppercase tracking-[0.5em] mt-2">Certified Legal Trainer</p>
              </div>
            </div>

            {/* Profile */}
            <div className="relative -mt-20 flex justify-center z-20">
              <div className="w-44 h-52 rounded-[2rem] border-[6px] border-white shadow-[0_20px_40px_rgba(0,0,0,0.15)] overflow-hidden bg-slate-100">
                <img src={processedPhotoUrl} className="w-full h-full object-cover" alt="Profile" />
              </div>
            </div>

            {/* Content */}
            <div className="px-10 py-8 text-center flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none mb-4">{trainer.fullName}</h2>
                <div className="flex justify-center">
                  <span className={`px-5 py-1.5 rounded-full text-[9px] font-black uppercase border shadow-sm ${STATUS_COLORS[trainer.status]}`}>
                    • {trainer.status} •
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <p className="text-[7px] text-slate-400 font-black uppercase tracking-[0.3em] mb-2">Institutional Credential Key</p>
                  <p className="font-mono text-2xl font-black text-slate-800 tracking-widest">{trainer.certificationId}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                    <p className="text-[7px] text-slate-400 font-black uppercase mb-1">Issued</p>
                    <p className="text-[12px] font-black text-slate-700">{trainer.issueDate}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
                    <p className="text-[7px] text-slate-400 font-black uppercase mb-1">Expires</p>
                    <p className="text-[12px] font-black text-blue-700">{trainer.expiryDate}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                <img src={ACADEMY_SEAL_SVG} className="w-8 h-8 opacity-20" alt="Seal" />
                <div className="text-right">
                  <p className="text-[9px] font-black italic text-slate-800 uppercase tracking-tighter">Authorized Academic Cadre</p>
                  <p className="text-[6px] text-slate-400 font-bold uppercase">ILA-CLT™ Governance Node</p>
                </div>
              </div>
            </div>
          </div>

          {/* BACK: Security Protocol */}
          <div className="absolute inset-0 backface-hidden bg-[#050a14] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 flex flex-col rotate-y-180 p-12 text-white text-center w-[380px] h-[580px]">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <svg width="100%" height="100%"><rect width="100%" height="100%" fill="url(#card-grid)" /></svg>
            </div>
            <div className="relative z-10 flex flex-col h-full items-center">
               <div className="mb-10">
                 <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.5em] mb-4">Security Protocol</p>
                 <h4 className="text-xl font-black uppercase italic tracking-tighter">Authenticated Asset</h4>
               </div>
               <div className="flex-1 flex flex-col items-center justify-center gap-8">
                  <img src={ACADEMY_SEAL_SVG} className="w-40 h-40 opacity-30 drop-shadow-[0_0_20px_rgba(59,130,246,0.2)]" alt="Seal" />
                  <div className="h-px w-32 bg-gradient-to-r from-transparent via-blue-600/30 to-transparent"></div>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-[240px] italic">"Institutional excellence in legal governance. This credential serves as a global authorization for certified trainers."</p>
               </div>
               <div className="mt-auto">
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.5em]">WWW.ILA-CLT.COM</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {allowDownload && (
        <div className="flex flex-col gap-4 items-center">
          <div className="flex gap-4">
            <button 
              onClick={exportAsImage}
              disabled={isExporting}
              className="px-10 py-5 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-4xl disabled:opacity-50 flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              {isExporting ? 'Generating PNG...' : 'Export for LinkedIn'}
            </button>
          </div>
          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Tap to flip • Ready for institutional use</p>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-2000 { perspective: 2000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
    </div>
  );
};
