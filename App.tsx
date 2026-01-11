
import React, { useState, useEffect } from 'react';
import { Trainer, TrainerStatus, DashboardStats, NotificationType, EmailLog } from './types';
import { STATUS_COLORS } from './constants';
import { TrainerForm } from './components/TrainerForm';
import { VerificationPortal } from './components/VerificationPortal';
import { db, supabase } from './services/database';
import { getExecutiveInsights } from './services/geminiService';
import { notificationService } from './services/notificationService';
import { User } from '@supabase/supabase-js';

type AppMode = 'PUBLIC' | 'LOGIN' | 'ADMIN';
type AdminTab = 'REGISTRY' | 'LOGS' | 'COMMS';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('PUBLIC');
  const [user, setUser] = useState<User | null>(null);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('REGISTRY');
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);
  const [systemLogs, setSystemLogs] = useState<{id: string, action: string, time: string, status: string}[]>([]);
  
  const [toast, setToast] = useState<{show: boolean, msg: string, type: 'SUCCESS' | 'ERROR'} | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [emailPreview, setEmailPreview] = useState<{show: boolean, trainer?: Trainer, type?: NotificationType, subject?: string, body?: string}>({ show: false });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [executiveSummary, setExecutiveSummary] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await db.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setMode('ADMIN');
      }
      await loadData();
    };
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) setMode('PUBLIC'); else setMode('ADMIN');
    });
    return () => subscription.unsubscribe();
  }, []);

  const showToast = (msg: string, type: 'SUCCESS' | 'ERROR') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const addSystemLog = (action: string, status: string = 'SUCCESS') => {
    const newLog = { id: Math.random().toString(36).substr(2, 9), action, time: new Date().toLocaleTimeString(), status };
    setSystemLogs(prev => [newLog, ...prev].slice(0, 20));
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [trainerData, logsData] = await Promise.all([
        db.getTrainers(),
        notificationService.getLogs()
      ]);
      setTrainers(trainerData);
      setEmailLogs(logsData);
      const insights = await getExecutiveInsights(trainerData);
      setExecutiveSummary(insights);
    } catch (err: any) {
      console.error("Loading data error:", err);
      if (err.message?.toLowerCase().includes('schema cache')) {
        setShowSetupGuide(true);
      }
      addSystemLog("Sync Interrupted", "CRITICAL");
      showToast(err.message || "Failed to fetch data from cloud.", 'ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOrUpdate = async (data: Partial<Trainer>) => {
    setIsSyncing(true);
    try {
      let updatedList = trainers;
      if (editingTrainer?.id) {
        const updated = await db.updateTrainer(editingTrainer.id, data);
        updatedList = trainers.map(t => t.id === updated.id ? updated : t);
        setTrainers(updatedList);
        showToast("Asset credentials successfully updated in the official registry.", 'SUCCESS');
        addSystemLog(`Updated credentials for ${data.fullName}`);
      } else {
        const created = await db.createTrainer(data as any);
        updatedList = [created, ...trainers];
        setTrainers(updatedList);
        showToast("New asset successfully authorized and registered.", 'SUCCESS');
        addSystemLog(`Registered new asset: ${data.fullName}`);
      }
      setShowForm(false);
      setEditingTrainer(null);
      getExecutiveInsights(updatedList).then(setExecutiveSummary);
    } catch (err: any) {
      showToast(err.message || "Institutional Save Failure.", 'ERROR');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (trainer: Trainer) => {
    if (!window.confirm(`Are you sure you want to permanently revoke all credentials for ${trainer.fullName}?`)) return;
    setIsSyncing(true);
    try {
      await db.deleteTrainer(trainer.id);
      setTrainers(prev => prev.filter(t => t.id !== trainer.id));
      showToast("Asset successfully purged from the registry.", 'SUCCESS');
      addSystemLog(`Revoked credentials for ${trainer.fullName}`);
    } catch (err: any) {
      showToast(err.message || "Purge Failure", 'ERROR');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTriggerEmail = async (trainer: Trainer, type: NotificationType) => {
    if (!trainer.email) {
      showToast("Selected asset lacks a valid institutional email address.", 'ERROR');
      return;
    }
    setIsSyncing(true);
    const draft = await notificationService.draftEmail(type, trainer.fullName);
    if (draft) setEmailPreview({ show: true, trainer, type, ...draft });
    setIsSyncing(false);
  };

  const handleSendEmail = async () => {
    if (!emailPreview.trainer?.email) return;
    setIsSyncing(true);
    try {
      const log = await notificationService.sendEmail(
        emailPreview.trainer.id, emailPreview.trainer.fullName, emailPreview.trainer.email,
        emailPreview.type!, emailPreview.subject!, emailPreview.body!
      );
      setEmailLogs(prev => [log, ...prev]);
      showToast(`Communication successfully transmitted.`, 'SUCCESS');
      setEmailPreview({ show: false });
    } catch (err: any) {
      showToast(err.message || "Transmission failure.", 'ERROR');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) return;
    setIsSyncing(true);
    try {
      await db.login(email, password);
    } catch (err: any) {
      setAuthError("Authentication failed. Invalid credentials.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#050a14]"><div className="w-16 h-16 border-t-2 border-blue-500 rounded-full animate-spin"></div></div>;

  if (mode === 'PUBLIC') {
    return (
      <div className="relative min-h-screen">
        <header className="absolute top-0 w-full p-12 flex justify-between items-center z-50">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-3xl text-white flex items-center justify-center rounded-2xl font-black text-lg border border-white/20">ILA</div>
            <span className="font-black text-white tracking-widest text-xs uppercase opacity-60">Registry Portal</span>
          </div>
          <button onClick={() => setMode('LOGIN')} className="text-[10px] font-black uppercase text-white bg-blue-600 px-8 py-4 rounded-full shadow-4xl hover:bg-blue-500 transition-all tracking-widest">Control Node</button>
        </header>
        <VerificationPortal trainers={trainers} />
      </div>
    );
  }

  if (mode === 'LOGIN') {
    return (
      <div className="min-h-screen bg-[#050a14] flex items-center justify-center p-6 text-right">
        <div className="max-w-md w-full bg-[#112240] rounded-[4rem] p-16 border border-white/10 shadow-5xl">
          <button onClick={() => setMode('PUBLIC')} className="text-slate-500 text-[10px] mb-12 block w-full text-right font-black tracking-widest uppercase">← Back</button>
          <div className="text-center mb-12">
             <div className="w-20 h-20 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center text-3xl font-black mx-auto mb-6 shadow-3xl">ILA</div>
             <h2 className="text-3xl font-black text-white italic">Security Vault</h2>
          </div>
          <div className="space-y-6">
            <input type="email" className="w-full bg-[#050a14] border border-white/10 p-5 rounded-3xl text-white text-right" placeholder="Institutional Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" className="w-full bg-[#050a14] border border-white/10 p-5 rounded-3xl text-white text-right" placeholder="Access Key" value={password} onChange={e => setPassword(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleLogin()} />
            {authError && <p className="text-red-400 text-[10px] font-black text-center">{authError}</p>}
            <button onClick={handleLogin} disabled={isSyncing} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black shadow-4xl disabled:opacity-50">
              {isSyncing ? 'AUTHENTICATING...' : 'AUTHORIZE ACCESS'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#050a14] text-white">
      {toast && <div className={`fixed bottom-12 right-12 z-[200] px-10 py-5 rounded-3xl font-black text-xs border shadow-5xl max-w-md leading-relaxed ${toast.type === 'SUCCESS' ? 'bg-emerald-600 border-emerald-400' : 'bg-red-600 border-red-400'}`}>{toast.msg}</div>}
      {isSyncing && (
        <div className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm flex items-center justify-center cursor-wait">
           <div className="bg-[#112240] p-8 rounded-3xl border border-white/10 flex items-center gap-4">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-black uppercase tracking-widest">Processing...</span>
           </div>
        </div>
      )}

      <aside className="w-80 bg-[#112240] border-l border-white/5 p-12 hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="mb-20 flex items-center gap-4">
           <div className="w-12 h-12 bg-white text-[#050a14] rounded-[1.2rem] flex items-center justify-center font-black text-xl">ILA</div>
           <h1 className="text-xl font-black italic">EXECUTIVE</h1>
        </div>
        <nav className="flex-1 space-y-3">
          {['REGISTRY', 'COMMS', 'LOGS'].map(id => (
            <button key={id} onClick={() => setActiveAdminTab(id as AdminTab)} className={`w-full text-right px-8 py-5 rounded-[1.8rem] font-black text-xs transition-all ${activeAdminTab === id ? 'bg-blue-600 text-white shadow-3xl' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
              {id === 'REGISTRY' ? 'Assets Registry' : id === 'COMMS' ? 'Communications' : 'Security Intel'}
            </button>
          ))}
        </nav>
        <button onClick={() => db.logout()} className="w-full bg-[#050a14] text-slate-600 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest">Logout</button>
      </aside>

      <main className="flex-1 p-12 lg:p-20 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {activeAdminTab === 'REGISTRY' && (
             <>
              <header className="flex justify-between items-center mb-12">
                <div className="text-right">
                  <h2 className="text-6xl font-black text-white italic uppercase tracking-tighter">Registry <span className="text-blue-600">Ops</span></h2>
                  <p className="text-slate-500 mt-4 font-black uppercase text-[10px] tracking-[0.6em]">Official ILA Governance</p>
                </div>
                {!showForm && (
                  <button onClick={() => { setShowForm(true); setEditingTrainer(null); }} className="bg-white text-[#050a14] px-16 py-6 rounded-full font-black text-[11px] uppercase tracking-widest shadow-3xl">+ New Asset</button>
                )}
              </header>

              {/* Gemini Intelligence Summary Bar */}
              {executiveSummary && !showForm && (
                <div className="mb-12 bg-blue-600/5 border border-blue-600/20 p-8 rounded-[3rem] flex items-start gap-8 shadow-inner">
                   <div className="bg-blue-600 p-4 rounded-3xl text-white font-black text-xs uppercase shadow-xl">AI INSIGHT</div>
                   <div className="text-right flex-1">
                      <p className="text-slate-300 font-medium leading-relaxed italic text-lg pr-4">{executiveSummary}</p>
                   </div>
                </div>
              )}

              {showForm ? (
                <div className="max-w-5xl mx-auto mb-20">
                  <TrainerForm initialData={editingTrainer || undefined} onSubmit={handleAddOrUpdate} onCancel={() => { setShowForm(false); setEditingTrainer(null); }} />
                </div>
              ) : (
                <div className="bg-[#112240] rounded-[3.5rem] border border-white/5 overflow-hidden shadow-5xl text-right">
                  <table className="w-full text-right">
                    <thead className="bg-[#050a14]/50 text-[11px] font-black uppercase text-slate-500 border-b border-white/5">
                      <tr><th className="p-10">Asset Name</th><th className="p-10 text-center">Status</th><th className="p-10 text-left">Actions</th></tr>
                    </thead>
                    <tbody>
                      {trainers.map(t => (
                        <tr key={t.id} className="hover:bg-white/[0.03] border-b border-white/5 transition-all">
                          <td className="p-10 flex items-center gap-6 justify-start flex-row-reverse text-right">
                            <img src={t.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.fullName)}&size=512`} className="w-16 h-16 rounded-[1.5rem] object-cover border border-white/10 shadow-lg" />
                            <div><p className="font-black text-xl text-white italic">{t.fullName}</p><p className="text-[9px] text-slate-500 uppercase tracking-widest">{t.certificationId}</p></div>
                          </td>
                          <td className="p-10 text-center"><span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase border ${STATUS_COLORS[t.status as any]}`}>{t.status}</span></td>
                          <td className="p-10 text-left">
                            <div className="flex gap-2">
                               <button onClick={() => { setEditingTrainer(t); setShowForm(true); }} className="p-3 text-blue-400 border border-white/5 hover:bg-blue-600/20 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                               <button onClick={() => handleDelete(t)} className="p-3 text-red-400 border border-white/5 hover:bg-red-600/20 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
             </>
          )}

          {activeAdminTab === 'COMMS' && (
            <div className="max-w-4xl mx-auto space-y-12 text-right">
               <h2 className="text-5xl font-black italic uppercase tracking-tighter">Comms <span className="text-blue-600">Hub</span></h2>
               <div className="bg-[#112240] rounded-[3.5rem] p-12 border border-white/5 h-[600px] overflow-y-auto">
                  {emailLogs.map(log => (
                    <div key={log.id} className="bg-[#050a14]/50 p-6 rounded-[2rem] border border-white/5 mb-4 flex justify-between items-center">
                       <div className="text-right"><p className="font-black text-white text-lg">{log.trainerName}</p><p className="text-[9px] text-slate-500 uppercase">{log.type}</p></div>
                       <span className={`px-4 py-1 rounded-full text-[9px] font-black border uppercase ${log.status === 'DELIVERED' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-red-400'}`}>{log.status}</span>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeAdminTab === 'LOGS' && (
            <div className="max-w-4xl mx-auto space-y-12 text-right">
               <h2 className="text-5xl font-black italic uppercase tracking-tighter">Security <span className="text-blue-600">Intel</span></h2>
               <div className="bg-[#112240] rounded-[3rem] border border-white/5 p-10 font-mono text-sm h-[600px] overflow-y-auto shadow-5xl text-left" dir="ltr">
                  {systemLogs.map(log => (
                    <div key={log.id} className="flex justify-between items-center border-b border-white/5 pb-4 mb-4 opacity-80">
                      <div className="flex gap-4 items-center">
                        <span className={`text-[10px] px-2 py-1 rounded border font-black ${log.status === 'SUCCESS' ? 'text-emerald-500 border-emerald-500/30' : 'text-red-500'}`}>{log.status}</span>
                        <span className="text-slate-400 font-bold">{log.action}</span>
                      </div>
                      <span className="text-slate-600 text-[10px] font-black uppercase">{log.time}</span>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
