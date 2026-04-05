import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const { profile, clinicSettings, refreshProfile } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    primary_color: '#0f5f54',
    logo_url: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (clinicSettings) {
      setFormData({
        name: clinicSettings.name || '',
        primary_color: clinicSettings.primary_color || '#0f5f54',
        logo_url: clinicSettings.logo_url || ''
      });
    }
  }, [clinicSettings]);

  if (profile?.role !== 'clinic_admin' && profile?.role !== 'super_admin') {
    return (
      <div className="p-8 text-center text-text-muted font-medium">
        Accès refusé. Réservé aux administrateurs de la clinique.
      </div>
    );
  }

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('clinics')
        .update({
          name: formData.name,
          primary_color: formData.primary_color,
          logo_url: formData.logo_url
        })
        .eq('id', profile.clinic_id);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Paramètres mis à jour avec succès.' });
      await refreshProfile(); // Refresh AuthContext to cascade CSS vars
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.clinic_id}_logo.${fileExt}`;
      const filePath = `clinics/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, logo_url: data.publicUrl }));
      setMessage({ type: 'success', text: 'Logo uploadé avec succès. N\'oubliez pas de sauvegarder.' });
    } catch (err) {
      console.error('Logo upload error:', err);
      setMessage({ type: 'error', text: 'Erreur lors du téléchargement du logo.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header className="mb-6">
        <h1 className="font-serif text-3xl mb-2 font-bold text-text-dark">Paramètres Clinique (White-Label)</h1>
        <p className="text-text-muted font-medium">Personnalisez l'apparence et l'identité de votre clinique pour vos patients.</p>
      </header>

      {message && (
        <div className={`p-4 mb-6 rounded-xl font-medium text-sm ${message.type === 'success' ? 'bg-status-normal-bg text-status-normal border border-emerald-200' : 'bg-status-complication-bg text-status-complication border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-[20px] p-6 shadow-card border border-border max-w-2xl">
        <div className="space-y-6">
          
          {/* Nom */}
          <div>
            <label className="block text-sm font-bold text-text-dark mb-2">Nom de la clinique</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-surface-main border border-border rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-sans text-sm text-text-dark"
            />
          </div>

          {/* Couleur Primaire */}
          <div>
            <label className="block text-sm font-bold text-text-dark mb-2">Couleur Primaire (Marque)</label>
            <div className="flex items-center gap-4">
              <input 
                type="color" 
                value={formData.primary_color}
                onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                className="w-14 h-14 rounded-xl cursor-pointer border-0 p-0"
              />
              <input 
                type="text" 
                value={formData.primary_color}
                onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                className="w-32 bg-surface-main border border-border rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-sans text-sm text-text-dark uppercase"
              />
            </div>
            <p className="text-xs text-text-muted mt-2">Cette couleur sera utilisée pour les boutons et l'interface patient.</p>
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-bold text-text-dark mb-2">Logo de la clinique</label>
            <div className="flex items-center gap-6">
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="Logo preview" className="w-20 h-20 object-contain bg-surface-main rounded-xl border border-border p-2" />
              ) : (
                <div className="w-20 h-20 bg-surface-main rounded-xl border border-dashed border-border flex items-center justify-center text-text-muted text-xs text-center p-2">
                  Aucun logo
                </div>
              )}
              <div>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                  disabled={loading}
                />
                <label htmlFor="logo-upload" className="cursor-pointer bg-primary-light text-primary hover:bg-primary-hover font-bold text-sm py-2 px-4 rounded-xl inline-flex items-center gap-2 transition-colors">
                  <Upload size={16} /> Parcourir...
                </label>
              </div>
            </div>
          </div>

          <hr className="border-border my-6" />

          {/* Save Action */}
          <div className="flex justify-end">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="bg-primary hover:bg-primary-dark text-white font-bold text-sm py-3 px-6 rounded-xl flex items-center gap-2 shadow-button transition-all disabled:opacity-50"
            >
              <Save size={18} /> {loading ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
            </button>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
