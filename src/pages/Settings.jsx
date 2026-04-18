import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Save, Upload, Plus, Trash2, Edit2, X, Check, Users, ChevronDown, ChevronUp, FileText, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { interventionLabels } from '../data/constants';

const roleLabels = {
  clinic_admin: 'Administrateur',
  surgeon: 'Chirurgien',
  nurse: 'Infirmier(e)',
  super_admin: 'Super Admin',
};

const roleColors = {
  clinic_admin: 'bg-purple-100 text-purple-700',
  surgeon: 'bg-blue-100 text-blue-700',
  nurse: 'bg-emerald-100 text-emerald-700',
  super_admin: 'bg-red-100 text-red-700',
};

export default function Settings() {
  const { profile, clinicSettings, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('clinique');

  const isAdmin = profile?.role === 'clinic_admin' || profile?.role === 'super_admin';

  // Non-admins can only see the team tab (read-only)
  if (!isAdmin) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <header className="mb-6">
          <h1 className="font-serif text-3xl mb-2 font-bold text-text-dark">Équipe</h1>
          <p className="text-text-muted font-medium">Membres de votre clinique.</p>
        </header>
        <TeamTab profile={profile} readOnly />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header className="mb-6">
        <h1 className="font-serif text-3xl mb-2 font-bold text-text-dark">Paramètres</h1>
        <p className="text-text-muted font-medium">Gérez votre clinique, vos protocoles et votre équipe.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'clinique', label: '🏥 Clinique' },
          { key: 'protocoles', label: '📋 Protocoles' },
          { key: 'equipe', label: '👥 Équipe' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`py-2.5 px-5 rounded-xl border-none font-bold text-[13px] cursor-pointer transition-all
              ${activeTab === tab.key ? 'bg-primary text-white shadow-md' : 'bg-white text-text-muted shadow-sm hover:bg-slate-50 hover:text-text-dark'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'clinique' && <ClinicTab profile={profile} clinicSettings={clinicSettings} refreshProfile={refreshProfile} />}
      {activeTab === 'protocoles' && <ProtocolsTab profile={profile} />}
      {activeTab === 'equipe' && <TeamTab profile={profile} />}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONGLET CLINIQUE
// ─────────────────────────────────────────────────────────────────────────────
function ClinicTab({ profile, clinicSettings, refreshProfile }) {
  const [formData, setFormData] = useState({ name: '', primary_color: '#0f5f54', logo_url: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (clinicSettings) {
      setFormData({
        name: clinicSettings.name || '',
        primary_color: clinicSettings.primary_color || '#0f5f54',
        logo_url: clinicSettings.logo_url || '',
      });
    }
  }, [clinicSettings]);

  const applyPrimaryColor = (hex) => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
    document.documentElement.style.setProperty('--color-primary', hex);
    // Generate simple dark/light variants by adjusting brightness
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dark = `rgb(${Math.round(r * 0.75)},${Math.round(g * 0.75)},${Math.round(b * 0.75)})`;
    const light = `rgba(${r},${g},${b},0.12)`;
    document.documentElement.style.setProperty('--color-primary-dark', dark);
    document.documentElement.style.setProperty('--color-primary-light', light);
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.from('clinics').update({
        name: formData.name,
        primary_color: formData.primary_color,
        logo_url: formData.logo_url,
      }).eq('id', profile.clinic_id);
      if (error) throw error;
      applyPrimaryColor(formData.primary_color);
      setMessage({ type: 'success', text: 'Paramètres mis à jour avec succès.' });
      await refreshProfile();
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Validate file type
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      setMessage({ type: 'error', text: 'Format non supporté. Utilisez PNG, JPEG, WebP ou SVG.' });
      return;
    }
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Fichier trop volumineux. Maximum 2 Mo.' });
      return;
    }
    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop().toLowerCase();
      const filePath = `${profile.clinic_id}/logo.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('clinic-logos')
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('clinic-logos').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, logo_url: data.publicUrl }));
      setMessage({ type: 'success', text: "Logo uploadé. N'oubliez pas de sauvegarder." });
    } catch (err) {
      console.error('[Logo upload]', err);
      setMessage({ type: 'error', text: `Erreur : ${err.message || 'Téléchargement échoué.'}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-card border border-border max-w-2xl">
      {message && (
        <div className={`p-4 mb-6 rounded-xl font-medium text-sm ${message.type === 'success' ? 'bg-status-normal-bg text-status-normal border border-emerald-200' : 'bg-status-complication-bg text-status-complication border border-red-200'}`}>
          {message.text}
        </div>
      )}
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-text-dark mb-2">Nom de la clinique</label>
          <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-surface-main border border-border rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm text-text-dark" />
        </div>
        <div>
          <label className="block text-sm font-bold text-text-dark mb-2">Couleur Primaire (Marque)</label>
          <div className="flex items-center gap-4">
            <input type="color" value={formData.primary_color} onChange={e => {
                setFormData({ ...formData, primary_color: e.target.value });
                applyPrimaryColor(e.target.value);
              }}
              className="w-14 h-14 rounded-xl cursor-pointer border-0 p-0" />
            <input type="text" value={formData.primary_color} onChange={e => {
                setFormData({ ...formData, primary_color: e.target.value });
                applyPrimaryColor(e.target.value);
              }}
              className="w-32 bg-surface-main border border-border rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm text-text-dark uppercase" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-text-dark mb-2">Logo de la clinique</label>
          <div className="flex items-center gap-6">
            {formData.logo_url ? (
              <img src={formData.logo_url} alt="Logo preview" className="w-20 h-20 object-contain bg-surface-main rounded-xl border border-border p-2" />
            ) : (
              <div className="w-20 h-20 bg-surface-main rounded-xl border border-dashed border-border flex items-center justify-center text-text-muted text-xs text-center p-2">Aucun logo</div>
            )}
            <div>
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" onChange={handleLogoUpload} className="hidden" id="logo-upload" disabled={loading} />
              <label htmlFor="logo-upload" className="cursor-pointer bg-primary-light text-primary hover:bg-primary-hover font-bold text-sm py-2 px-4 rounded-xl inline-flex items-center gap-2 transition-colors">
                <Upload size={16} /> {loading ? 'Upload...' : 'Parcourir...'}
              </label>
              <p className="text-[11px] text-text-muted mt-2">PNG, JPEG, WebP ou SVG — max 2 Mo</p>
            </div>
          </div>
        </div>
        <hr className="border-border" />
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={loading}
            className="bg-primary hover:bg-primary-dark text-white font-bold text-sm py-3 px-6 rounded-xl flex items-center gap-2 shadow-button transition-all disabled:opacity-50">
            <Save size={18} /> {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONGLET PROTOCOLES
// ─────────────────────────────────────────────────────────────────────────────
function ProtocolsTab() {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-[20px] border border-border p-8 shadow-sm flex flex-col items-center text-center gap-5">
        <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center">
          <FileText size={28} className="text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-[17px] text-text-dark mb-1.5">Protocoles post-opératoires</h3>
          <p className="text-text-muted text-[13px] leading-relaxed max-w-sm">
            Créez et gérez vos protocoles standards et personnalisés. Assignez-les à vos patients depuis leur dossier.
          </p>
        </div>
        <button
          onClick={() => navigate('/protocols')}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-bold text-sm shadow-button transition-colors border-none cursor-pointer"
        >
          <FileText size={16} /> Gérer les protocoles <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONGLET ÉQUIPE
// ─────────────────────────────────────────────────────────────────────────────
function TeamTab({ profile, readOnly = false }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ full_name: '', email: '', role: 'nurse', phone: '' });
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, phone, is_active, created_at')
      .eq('clinic_id', profile.clinic_id)
      .order('created_at', { ascending: false });
    if (!error) setStaff(data || []);
    setLoading(false);
  }, [profile.clinic_id]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleToggleActive = async (memberId, currentActive) => {
    if (memberId === profile.id) {
      setMessage({ type: 'error', text: 'Vous ne pouvez pas désactiver votre propre compte.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    const { error } = await supabase.from('users').update({ is_active: !currentActive }).eq('id', memberId);
    if (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour.' });
    } else {
      fetchStaff();
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.full_name.trim() || !inviteForm.email.trim()) {
      setMessage({ type: 'error', text: 'Nom et email sont obligatoires.' });
      return;
    }
    setInviting(true);
    setMessage(null);

    try {
      // Encode staff metadata into the redirect URL rather than options.data.
      // signInWithOtp with options.data can throw in some Supabase project configs.
      // URL params are safer: they survive the OTP redirect intact.
      const params = new URLSearchParams({
        clinic_id: profile.clinic_id,
        full_name: inviteForm.full_name.trim(),
        role: inviteForm.role,
        ...(inviteForm.phone.trim() ? { phone: inviteForm.phone.trim() } : {}),
      });
      const redirectTo = `${window.location.origin}/staff/activate?${params.toString()}`;

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: inviteForm.email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectTo,
        },
      });

      if (otpError) {
        setMessage({ type: 'error', text: otpError.message || "Erreur lors de l'envoi de l'invitation." });
      } else {
        setMessage({
          type: 'success',
          text: `Invitation envoyée à ${inviteForm.email}. Le membre recevra un lien par email pour créer son compte.`,
        });
        setInviteForm({ full_name: '', email: '', role: 'nurse', phone: '' });
        setInviteOpen(false);
        fetchStaff();
        setTimeout(() => setMessage(null), 6000);
      }
    } catch (err) {
      console.error('[handleInvite] Unexpected error:', err);
      setMessage({ type: 'error', text: err?.message || "Une erreur inattendue est survenue. Réessayez." });
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      {message && (
        <div className={`p-3 mb-4 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
          {message.text}
        </div>
      )}

      {/* Formulaire d'invitation — admin only */}
      {!readOnly && <div className="bg-white rounded-[16px] border border-border shadow-sm mb-4 overflow-hidden">
        <button onClick={() => setInviteOpen(o => !o)}
          className="w-full flex justify-between items-center px-5 py-4 cursor-pointer bg-transparent border-none text-left hover:bg-slate-50 transition-colors">
          <span className="flex items-center gap-2 font-bold text-text-dark">
            <Users size={18} className="text-primary" /> Inviter un membre de l'équipe
          </span>
          {inviteOpen ? <ChevronUp size={18} className="text-text-muted" /> : <ChevronDown size={18} className="text-text-muted" />}
        </button>
        {inviteOpen && (
          <form onSubmit={handleInvite} className="px-5 pb-5 border-t border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 mb-4">
              <div>
                <label className="block text-[12px] font-bold text-text-dark mb-1.5">Nom complet *</label>
                <input value={inviteForm.full_name} onChange={e => setInviteForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Dr. Martin"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-text-dark mb-1.5">Email professionnel *</label>
                <input type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="nom@clinique.be"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-text-dark mb-1.5">Rôle</label>
                <select value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white">
                  <option value="nurse">Infirmier(e)</option>
                  <option value="surgeon">Chirurgien</option>
                  <option value="clinic_admin">Administrateur</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-text-dark mb-1.5">Téléphone (optionnel)</label>
                <input value={inviteForm.phone} onChange={e => setInviteForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+32 ..."
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={inviting}
                className="bg-primary hover:bg-primary-dark text-white border-none px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-60 flex items-center gap-2 shadow-sm transition-colors">
                <Plus size={16} /> {inviting ? 'Invitation...' : "Envoyer l'invitation"}
              </button>
            </div>
          </form>
        )}
      </div>}

      {/* Liste équipe */}
      {loading ? (
        <div className="text-center py-10 text-text-muted">Chargement...</div>
      ) : (
        <div className="flex flex-col gap-3">
          {staff.map(member => (
            <div key={member.id} className={`bg-white rounded-[16px] p-4 border shadow-sm flex justify-between items-center gap-4 flex-wrap
              ${!member.is_active ? 'opacity-50' : 'border-border'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[15px] text-text-dark">{member.full_name}</span>
                  {member.id === profile.id && <span className="text-[10px] bg-primary-light text-primary px-2 py-0.5 rounded-full font-bold">Vous</span>}
                  {!member.is_active && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">Désactivé</span>}
                </div>
                <div className="text-[13px] text-text-muted mt-0.5">{member.email}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${roleColors[member.role] || 'bg-slate-100 text-slate-600'}`}>
                  {roleLabels[member.role] || member.role}
                </span>
                {!readOnly && member.id !== profile.id && (
                  <button onClick={() => handleToggleActive(member.id, member.is_active)}
                    className={`p-2 rounded-lg border-none cursor-pointer transition-colors text-sm font-bold
                      ${member.is_active
                        ? 'text-text-muted hover:text-red-600 hover:bg-red-50 bg-transparent'
                        : 'text-emerald-600 hover:bg-emerald-50 bg-transparent'}`}>
                    {member.is_active ? <X size={15} /> : <Check size={15} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
