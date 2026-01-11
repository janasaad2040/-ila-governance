
import React, { useState, useEffect, useRef } from 'react';
import { Trainer } from '../types';
import { DigitalID } from './DigitalID';
import { PublicDirectory } from './PublicDirectory';
import { speakVerificationResult } from '../services/geminiService';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface VerificationPortalProps {
  trainers: Trainer[];
}

export const VerificationPortal: React.FC<VerificationPortalProps> = ({ trainers }) => {
  const [searchId, setSearchId] = useState('');
  const [result, setResult] = useState<Trainer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'CARD' | 'PROFILE'>('CARD');
  const [portalView, setPortalView] = useState<'SEARCH' | 'CADRE'>('SEARCH');
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyId = params.get('verify');
    if (verifyId && trainers.length > 0) {
      setSearchId(verifyId);
      handleVerify(verifyId);
    }
  }, [trainers]);

  const handleVerify = async (idToSearch?: string) => {
    const term = (idToSearch || searchId).trim().toUpperCase();
    if (!term) return;
    setIsSearching(true);
    setError(null);
    
    await new Promise(r => setTimeout(r, 600)); 
    
    const found = trainers.find(t => t.certificationId.toUpperCase() === term || t.id === term);
    if (found) {
      setResult(found);
      setPortalView('SEARCH');
      setActiveTab('CARD');
      speakVerificationResult(found.fullName, found.status);
    } else {
      setResult(null);
      setError("No matching record found in the official registry.");
    }
    setIsSearching(false);
  };

  return (
    <div className="min-h-screen bg-[#050a14] text-white">
      {/* Background Refined */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900/20 blur-[150px] rounded-full"></div>
      </div>

      <section className="relative pt-40 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          
          {/* Official Indicator */}
          <div className="flex flex-col items-center gap-6">
            <div className="px-6 py-2 border border-white/10 rounded-full bg-white/5 backdrop-blur-lg">
               <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-blue-400">Security Verification Terminal</span>
            </div>

            <div className="flex bg-[#112240] p-1.5 rounded-2xl border border-white/5 gap-2">
              <button 
                onClick={() => setPortalView('SEARCH')}
                className={`px-8 py-3 rounded-xl font-bold text-[11px] transition-all uppercase tracking-widest ${portalView === 'SEARCH' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
              >
                Verification
              </button>
              <button 
                onClick={() => { setPortalView('CADRE'); setResult(null); }}
                className={`px-8 py-3 rounded-xl font-bold text-[11px] transition-all uppercase tracking-widest ${portalView === 'CADRE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
              >
                Public Cadre
              </button>
            </div>
          </div>

          {portalView === 'SEARCH' && (
            <>
              <div className="space-y-4">
                <h1 className="text-7xl font-black tracking-tight leading-tight uppercase italic opacity-90">
                  Credential <br/> Authentication
                </h1>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.5em]">Verify Global Legal Expertise</p>
              </div>

              <div className="max-w-2xl mx-auto pt-10">
                <div className="relative bg-[#112240] p-3 rounded-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row gap-3 items-center">
                  <input 
                    type="text" 
                    placeholder="ENTER CERTIFICATION ID (e.g. ILA-CLT-2024-0001)"
                    className="flex-1 px-8 py-5 rounded-xl bg-transparent outline-none text-center md:text-right font-bold text-white text-lg placeholder-white/5 uppercase w-full"
                    value={searchId}
                    onChange={e => setSearchId(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleVerify()}
                  />
                  <button 
                    onClick={() => handleVerify()}
                    disabled={isSearching}
                    className="w-full md:w-auto bg-blue-600 text-white px-10 py-5 rounded-xl font-bold hover:bg-blue-500 transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
                  >
                    {isSearching ? 'Verifying...' : 'Validate'}
                  </button>
                </div>
                {error && <p className="mt-8 text-red-500 font-bold uppercase text-[10px] tracking-widest">{error}</p>}
              </div>
            </>
          )}
        </div>
      </section>

      {portalView === 'CADRE' && (
        <PublicDirectory trainers={trainers} onSelectTrainer={(id) => { setSearchId(id); handleVerify(id); window.scrollTo({top:0, behavior:'smooth'}); }} />
      )}

      {portalView === 'SEARCH' && result && (
        <section className="pb-32 px-6">
          <div className="max-w-5xl mx-auto">
             <div className="flex justify-center bg-[#112240]/50 p-1.5 rounded-2xl border border-white/5 mb-16 gap-2 w-max mx-auto">
                <button 
                  onClick={() => setActiveTab('CARD')}
                  className={`px-10 py-3 rounded-xl font-bold text-[10px] transition-all uppercase tracking-widest ${activeTab === 'CARD' ? 'bg-white text-[#050a14]' : 'text-slate-500 hover:text-white'}`}
                >Digital ID</button>
                <button 
                  onClick={() => setActiveTab('PROFILE')}
                  className={`px-10 py-3 rounded-xl font-bold text-[10px] transition-all uppercase tracking-widest ${activeTab === 'PROFILE' ? 'bg-white text-[#050a14]' : 'text-slate-500 hover:text-white'}`}
                >Academic Record</button>
             </div>

             {activeTab === 'CARD' ? (
                <div className="flex justify-center">
                  <DigitalID trainer={result} />
                </div>
             ) : (
                <div className="bg-[#112240] rounded-3xl p-16 shadow-2xl border border-white/5 text-right">
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                      <div className="lg:col-span-2 space-y-12">
                         <div>
                            <span className="text-blue-500 text-[10px] font-bold uppercase tracking-[0.4em] mb-4 block">Official Master Trainer</span>
                            <h3 className="text-5xl font-black text-white italic">{result.fullName}</h3>
                         </div>
                         <div className="space-y-6">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Professional Summary</h4>
                            <p className="text-slate-300 leading-relaxed text-xl font-medium opacity-90">{result.bio || 'Credentials under institutional review.'}</p>
                         </div>
                      </div>
                      <div className="bg-[#050a14] rounded-2xl p-8 space-y-8 border border-white/5">
                         <div>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Registry Hash</p>
                            <p className="text-lg font-bold text-white font-mono tracking-wider">{result.certificationId}</p>
                         </div>
                         <div>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Contact Link</p>
                            <p className="text-sm font-bold text-blue-400 underline">{result.email}</p>
                         </div>
                      </div>
                   </div>
                </div>
             )}
          </div>
        </section>
      )}

      <footer className="py-20 text-center border-t border-white/5">
        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[1em] opacity-40">International Legal Academy Institutional Security</p>
      </footer>
    </div>
  );
};
