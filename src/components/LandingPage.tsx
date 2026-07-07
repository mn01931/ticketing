import { useState } from 'react';
import { PlusCircle, ShieldCheck, X } from 'lucide-react';
import { AdminLogin } from './AdminLogin';

interface LandingPageProps {
  onCreateTicket: () => void;
  onAdminLoginSuccess: () => void;
}

export function LandingPage({ onCreateTicket, onAdminLoginSuccess }: LandingPageProps) {
  const [openAdminModal, setOpenAdminModal] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f290c] font-sans selection:bg-[#f1cb43] selection:text-[#0f290c]">
      
      {/* WRAPPER FOR BLUR EFFECT */}
      <div className={`transition-all duration-500 ${openAdminModal ? 'blur-md scale-[0.98] pointer-events-none' : 'blur-0 scale-100'}`}>
        {/* Premium Background Layering */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#245d1d_0%,#0f290c_100%)]" />
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:3rem_3rem]" />
        </div>

        <header className="relative z-50 px-6 py-8 lg:px-16">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-white p-2 shadow-2xl shadow-black/20">
                <img src="/assets/logo.png" alt="Logo" className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-white sm:text-3xl">
                  Lake Shore
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-[#f1cb43]">
                  Ticketing Portal
                </span>
              </div>
            </div>

            <button
              onClick={() => setOpenAdminModal(true)}
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur-xl transition-all hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] active:scale-95"
            >
              <ShieldCheck className="h-4 w-4 text-[#f1cb43]" />
              <span className="tracking-wide">Admin Access</span>
            </button>
          </div>
        </header>

        <main className="relative z-10 flex min-h-[calc(100vh-128px)] items-center px-6">
          <div className="mx-auto w-full max-w-5xl text-center">
            <h1 className="text-6xl font-black leading-[1.05] tracking-tight text-white sm:text-8xl md:text-8xl">
              How can we <br />
              <span className="bg-gradient-to-b from-[#fceabb] to-[#f1cb43] bg-clip-text text-transparent">
                help you
              </span>
              &nbsp;today?
            </h1>

            <p className="mx-auto mt-10 max-w-2xl text-lg leading-relaxed text-white/50 sm:text-xl">
              Official gateway for <span className="font-bold text-white">Lake Shore Colleges</span> IT & Facilities support. 
              Streamlining your academic journey with enterprise-grade ticketing.
            </p>

            <div className="mt-16 flex flex-col items-center justify-center gap-6">
              <button
                onClick={onCreateTicket}
                className="group relative flex min-w-[320px] items-center justify-center gap-4 overflow-hidden rounded-2xl bg-[#f1cb43] px-12 py-6 text-xl font-black text-[#0f290c] shadow-[0_20px_50px_rgba(241,203,67,0.15)] transition-all hover:-translate-y-1.5 hover:bg-white active:scale-95"
              >
                <span className="relative z-10">Create New Ticket</span>
                <PlusCircle className="relative z-10 h-7 w-7 transition-transform group-hover:rotate-90" />
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
              </button>
            </div>
          </div>
        </main>

        <footer className="relative z-10 px-6 py-10 text-center">
          <div className="mx-auto h-px max-w-xs bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
            © {new Date().getFullYear()} Lake Shore Colleges • IT Department
          </p>
        </footer>
      </div>

      {/* Admin Login Modal Overlay */}
      {openAdminModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm animate-in fade-in duration-300">
          {/* Modal Container */}
          <div className="relative w-full max-w-xl overflow-hidden rounded-[3rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Custom Close Button inside the Modal container */}
            <button
              type="button"
              onClick={() => setOpenAdminModal(false)}
              className="absolute right-8 top-8 z-[110] flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-[#0f290c] transition-all hover:bg-red-50 hover:text-red-600 hover:rotate-90"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="max-h-[90vh] overflow-y-auto px-8 py-12 sm:px-16">
              <AdminLogin
                onLoginSuccess={onAdminLoginSuccess}
                onBack={() => setOpenAdminModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}