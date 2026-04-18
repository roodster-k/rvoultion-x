import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, Plus, LogOut, ShieldCheck, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import CreateClinicModal from '../components/admin/CreateClinicModal';

export default function AdminPanel() {
  const { logout, user } = useAuth();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ─── Fetch all clinics ───
  const fetchClinics = useCallback(async () => {
    setLoading(true);
    {
      try {
        const { data, error: fetchError } = await supabase
          .from('clinics')
          .select('id, name, primary_color, logo_url, created_at')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // For each clinic, count patients and staff
        const enriched = await Promise.all(
          (data || []).map(async (clinic) => {
            const [patientsRes, staffRes] = await Promise.all([
              supabase
                .from('patients')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinic.id),
              supabase
                .from('users')
                .select('id', { count: 'exact', head: true })
                .eq('clinic_id', clinic.id),
            ]);
            return {
              ...clinic,
              patientCount: patientsRes.count ?? 0,
              staffCount: staffRes.count ?? 0,
            };
          })
        );

        setClinics(enriched);
      } catch (err) {
        console.error('[AdminPanel] Fetch error:', err);
        setError('Impossible de charger les cliniques.');
      } finally {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { fetchClinics(); }, [fetchClinics]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shadow-sm">
            +
          </div>
          <div>
            <span className="font-serif font-bold text-primary text-[18px]">PostOp Tracker</span>
            <span className="ml-2 text-[11px] font-bold bg-primary-light text-primary px-2 py-0.5 rounded-full uppercase tracking-wide">
              Super Admin
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-primary bg-primary-light px-3 py-1.5 rounded-full font-bold">
            <ShieldCheck size={13} /> {user?.email}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full font-bold transition-colors cursor-pointer border-none"
          >
            <LogOut size={13} /> Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          {/* Title + Action */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-serif text-[26px] font-bold text-text-dark">Gestion des cliniques</h1>
              <p className="text-text-muted text-sm font-medium mt-0.5">
                {clinics.length} clinique{clinics.length !== 1 ? 's' : ''} enregistrée{clinics.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-button transition-colors border-none cursor-pointer"
            >
              <Plus size={16} /> Nouvelle clinique
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-[16px] border border-border p-4 text-center shadow-sm">
              <div className="text-[26px] font-bold text-primary">{clinics.length}</div>
              <div className="text-[12px] text-text-muted font-semibold uppercase tracking-wide mt-1">Cliniques</div>
            </div>
            <div className="bg-white rounded-[16px] border border-border p-4 text-center shadow-sm">
              <div className="text-[26px] font-bold text-primary">
                {clinics.reduce((acc, c) => acc + (c.patientCount || 0), 0)}
              </div>
              <div className="text-[12px] text-text-muted font-semibold uppercase tracking-wide mt-1">Patients total</div>
            </div>
            <div className="bg-white rounded-[16px] border border-border p-4 text-center shadow-sm">
              <div className="text-[26px] font-bold text-primary">
                {clinics.reduce((acc, c) => acc + (c.staffCount || 0), 0)}
              </div>
              <div className="text-[12px] text-text-muted font-semibold uppercase tracking-wide mt-1">Membres staff total</div>
            </div>
          </div>

          {/* Clinic List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-[16px] p-5 flex items-center gap-3 text-red-700">
              <AlertCircle size={20} />
              <span className="font-semibold text-sm">{error}</span>
            </div>
          ) : clinics.length === 0 ? (
            <div className="bg-white rounded-[20px] border border-border p-12 text-center shadow-sm">
              <Building2 size={40} className="mx-auto text-text-muted opacity-30 mb-4" />
              <p className="font-bold text-text-dark text-[16px] mb-1">Aucune clinique enregistrée</p>
              <p className="text-text-muted text-sm">Utilisez le bouton "Nouvelle clinique" pour en créer une.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {clinics.map((clinic) => (
                <motion.div
                  key={clinic.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[16px] border border-border p-5 shadow-sm hover:shadow-md transition-shadow flex items-start sm:items-center gap-4 flex-wrap"
                >
                  {/* Clinic color dot / logo */}
                  <div
                    className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 font-bold text-white text-[18px] shadow-sm"
                    style={{ background: clinic.primary_color || '#0f5f54' }}
                  >
                    {clinic.logo_url
                      ? <img src={clinic.logo_url} alt={clinic.name} className="w-10 h-10 object-contain rounded-xl" />
                      : clinic.name?.charAt(0).toUpperCase()
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-text-dark text-[16px]">{clinic.name}</div>
                    <div className="flex items-center gap-3 mt-1 text-[12px] text-text-muted font-medium">
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {clinic.patientCount} patient{clinic.patientCount !== 1 ? 's' : ''}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck size={12} /> {clinic.staffCount} staff
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(clinic.created_at).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
                    <CheckCircle2 size={12} /> Actif
                  </div>
                </motion.div>
              ))}
            </div>
          )}

        </motion.div>
      </main>

      {/* ─── Modal création clinique ─── */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateClinicModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              fetchClinics();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
