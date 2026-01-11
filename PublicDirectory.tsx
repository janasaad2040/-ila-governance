
import React, { useState } from 'react';
import { Trainer, TrainerStatus } from '../types';
import { STATUS_COLORS } from '../constants';

interface PublicDirectoryProps {
  trainers: Trainer[];
  onSelectTrainer: (id: string) => void;
}

export const PublicDirectory: React.FC<PublicDirectoryProps> = ({ trainers, onSelectTrainer }) => {
  const [filter, setFilter] = useState('');

  const filteredTrainers = trainers.filter(t => 
    t.fullName.toLowerCase().includes(filter.toLowerCase()) || 
    t.specialties.some(s => s.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-24">
      {/* Header Section: Very Formal */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-20 gap-8 text-right border-b border-white/10 pb-12">
        <div className="w-full md:w-80">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 pr-2">FILTER BY CREDENTIALS</label>
          <input 
            type="text" 
            placeholder="Name or Specialization..."
            className="w-full bg-[#112240] border border-white/10 p-4 rounded-xl text-white text-right outline-none focus:border-blue-500 transition-all font-medium text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="text-center md:text-right">
          <h3 className="text-4xl font-black text-white uppercase tracking-tight mb-2">Registry of Certified Legal Trainers</h3>
          <p className="text-blue-500 font-bold uppercase text-[10px] tracking-[0.3em]">Official Institutional Cadre - International Legal Academy</p>
        </div>
      </div>

      {/* Grid: Formal Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredTrainers.map((trainer) => (
          <div 
            key={trainer.id}
            onClick={() => onSelectTrainer(trainer.certificationId)}
            className="group relative bg-[#0f172a] rounded-2xl border border-white/5 overflow-hidden cursor-pointer hover:border-blue-500/50 transition-all duration-300 shadow-xl"
          >
            {/* Top Image: Academic Style */}
            <div className="h-56 overflow-hidden relative grayscale group-hover:grayscale-0 transition-all duration-500">
              <img 
                src={trainer.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(trainer.fullName)}&background=0f172a&color=fff&size=512`} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                alt={trainer.fullName}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent"></div>
              <div className="absolute top-4 left-4">
                 <span className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase border backdrop-blur-md ${STATUS_COLORS[trainer.status]}`}>
                  {trainer.status}
                </span>
              </div>
            </div>
            
            {/* Body: High Legibility */}
            <div className="p-8 text-right border-t border-white/5">
              <h4 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{trainer.fullName}</h4>
              <p className="text-[11px] text-blue-500 font-bold tracking-widest mb-6 opacity-80 uppercase">{trainer.certificationId}</p>
              
              <div className="flex flex-wrap gap-2 justify-end">
                {trainer.specialties.slice(0, 3).map((s, i) => (
                  <span key={i} className="text-[9px] bg-white/5 text-slate-400 border border-white/10 px-3 py-1 rounded-md font-bold uppercase">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Subtle Action Indicator */}
            <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">View Credentials →</span>
            </div>
          </div>
        ))}
      </div>

      {filteredTrainers.length === 0 && (
        <div className="py-32 text-center border border-dashed border-white/5 rounded-3xl">
           <p className="text-slate-600 font-bold uppercase tracking-[0.5em] text-xs">Registry Entry Not Found</p>
        </div>
      )}
    </div>
  );
};
