
import React, { useState, useRef } from 'react';
import { Trainer, TrainerStatus } from '../types';
import { generateTrainerBio, analyzeCertificateImage } from '../services/geminiService';

interface TrainerFormProps {
  initialData?: Partial<Trainer>;
  onSubmit: (data: Partial<Trainer>) => void;
  onCancel: () => void;
}

export const TrainerForm: React.FC<TrainerFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const isEditMode = !!initialData?.id;

  const [formData, setFormData] = useState<Partial<Trainer>>(initialData || {
    fullName: '',
    email: '',
    specialties: [],
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    renewalDueDate: '',
    status: TrainerStatus.ACTIVE,
    photoUrl: '',
    bio: '',
    files: []
  });
  
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [tempSpecialty, setTempSpecialty] = useState('');
  const aiScanRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAiScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const data = await analyzeCertificateImage(base64);
      if (data) {
        setFormData(prev => ({
          ...prev,
          fullName: data.fullName || prev.fullName,
          expiryDate: data.expiryDate || prev.expiryDate,
          certificationId: data.certificationId || prev.certificationId
        }));
      }
      setIsAiScanning(false);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateBio = async () => {
    if (!formData.fullName || (formData.specialties?.length === 0)) {
      alert("Please provide the full name and at least one specialty to generate a professional bio.");
      return;
    }
    setIsGeneratingBio(true);
    const bio = await generateTrainerBio(formData.fullName, formData.specialties || []);
    if (bio) {
      setFormData(prev => ({ ...prev, bio }));
    }
    setIsGeneratingBio(false);
  };

  const validateAndSubmit = () => {
    if (!formData.fullName || !formData.email) {
      alert("Full Name and Email are mandatory fields for institutional registration.");
      return;
    }

    // Clean dates to avoid empty string errors in Supabase
    const submissionData = { ...formData };
    if (submissionData.issueDate === "") submissionData.issueDate = null;
    if (submissionData.expiryDate === "") submissionData.expiryDate = null;
    if (submissionData.renewalDueDate === "") submissionData.renewalDueDate = null;

    onSubmit(submissionData);
  };

  const addSpecialty = () => {
    if (tempSpecialty.trim()) {
      setFormData(prev => ({
        ...prev,
        specialties: [...(prev.specialties || []), tempSpecialty.trim()]
      }));
      setTempSpecialty('');
    }
  };

  const inputClasses = "w-full bg-[#050a14] border border-white/10 p-4 rounded-xl outline-none focus:border-blue-500 text-white transition-all text-right font-medium text-sm placeholder-white/5";
  const labelClasses = "block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 pr-2";

  return (
    <div className="bg-[#112240] rounded-[3rem] border border-white/5 text-right relative overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
      {/* Formal Header Stripe */}
      <div className="h-2 bg-blue-600 w-full"></div>
      
      <div className="p-12">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div className="flex gap-4">
            <button 
              onClick={() => aiScanRef.current?.click()}
              className="bg-blue-600 text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg"
            >
              {isAiScanning ? 'Processing...' : 'Scan Certificate (AI)'}
            </button>
            <input type="file" ref={aiScanRef} className="hidden" accept="image/*" onChange={handleAiScan} />
          </div>
          <div className="text-center md:text-right">
            <h2 className="text-3xl font-black text-white uppercase tracking-tight italic leading-tight">{isEditMode ? 'Update Governance Record' : 'Institutional Onboarding'}</h2>
            <p className="text-blue-500 text-[9px] font-black uppercase tracking-[0.4em] mt-2">ILA Global Registry Management</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Sidebar: Photo & Status */}
          <div className="lg:col-span-4 space-y-10">
            <div className="bg-[#050a14] p-10 rounded-[2.5rem] border border-white/5 flex flex-col items-center">
              <div className="w-48 h-56 rounded-[2rem] bg-[#112240] overflow-hidden mb-8 border border-white/10 shadow-2xl relative group">
                <img 
                  src={formData.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fullName || 'User')}&background=050a14&color=fff&size=512`} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                  alt="Profile" 
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black uppercase text-white tracking-widest"
                >
                  Upload Clear Portrait
                </button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
                  reader.readAsDataURL(file);
                }
              }} />
              
              <div className="w-full space-y-6">
                <div>
                  <label className={labelClasses}>Credential Status</label>
                  <select 
                    className={`${inputClasses} appearance-none cursor-pointer bg-blue-600/5 font-black text-center`} 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value as TrainerStatus})}
                  >
                    {Object.values(TrainerStatus).map(s => <option key={s} value={s} className="bg-[#050a14] text-white">{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-600/5 p-8 rounded-3xl border border-blue-600/10">
               <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-3">Institutional Protocol</p>
               <p className="text-slate-400 text-[11px] font-medium leading-relaxed italic">Changes to identity credentials are logged for auditing. Ensure photos are professional high-resolution headshots for optimal Digital ID quality.</p>
            </div>
          </div>

          {/* Main Data Area */}
          <div className="lg:col-span-8 space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <label className={labelClasses}>Legal Name (FullName)</label>
                <input type="text" className={inputClasses} value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="Official Identity Name" />
              </div>
              <div>
                <label className={labelClasses}>Institutional Email</label>
                <input type="email" className={inputClasses} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="legal@ila-clt.com" />
              </div>
            </div>

            <div className="bg-white/5 p-8 rounded-3xl border border-white/5">
              <label className={labelClasses}>Specialized Jurisdictions</label>
              <div className="flex gap-4 mb-6">
                <button type="button" onClick={addSpecialty} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase hover:bg-blue-500 transition-all">Assign</button>
                <input 
                  type="text" 
                  className={inputClasses} 
                  value={tempSpecialty} 
                  onChange={e => setTempSpecialty(e.target.value)} 
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSpecialty())} 
                  placeholder="e.g. Criminal Law, AI Governance..." 
                />
              </div>
              <div className="flex flex-wrap gap-3 justify-end">
                {formData.specialties?.map((s, i) => (
                  <span key={i} className="bg-[#050a14] px-5 py-2.5 rounded-xl text-[10px] font-black border border-white/10 text-blue-400 flex items-center gap-4 hover:border-red-500/50 transition-all">
                    {s}
                    <button onClick={() => setFormData(prev => ({ ...prev, specialties: prev.specialties?.filter((_, idx) => idx !== i) }))} className="text-red-500 font-black hover:scale-125 transition-transform">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-10">
              <div>
                <label className={labelClasses}>Accreditation Date</label>
                <input type="date" className={inputClasses} value={formData.issueDate || ""} onChange={e => setFormData({...formData, issueDate: e.target.value})} />
              </div>
              <div>
                <label className={labelClasses}>Term Expiration</label>
                <input type="date" className={inputClasses} value={formData.expiryDate || ""} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <button 
                  type="button" 
                  onClick={handleGenerateBio} 
                  disabled={isGeneratingBio}
                  className="bg-blue-600/10 text-blue-400 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-600/20 hover:bg-blue-600/20 transition-all disabled:opacity-50"
                >
                  {isGeneratingBio ? 'Analyzing Profile...' : '✨ Generate Executive Bio'}
                </button>
                <label className={labelClasses}>Professional Academic Profile</label>
              </div>
              <textarea 
                className={`${inputClasses} h-40 resize-none leading-relaxed text-slate-300`} 
                value={formData.bio} 
                onChange={e => setFormData({...formData, bio: e.target.value})} 
                placeholder="Executive professional summary..."
              ></textarea>
            </div>
          </div>
        </div>

        <div className="flex gap-6 mt-16 justify-end pt-12 border-t border-white/10">
          <button type="button" onClick={onCancel} className="px-12 py-5 rounded-2xl border border-white/10 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-white/5 transition-all">Cancel</button>
          <button 
            type="button" 
            onClick={validateAndSubmit} 
            className="px-16 py-5 rounded-2xl bg-blue-600 text-white font-black shadow-2xl uppercase text-[10px] tracking-[0.3em] hover:bg-blue-500 transition-all"
          >
            {isEditMode ? 'Authorize & Update Registry' : 'Finalize Registration'}
          </button>
        </div>
      </div>
    </div>
  );
};
