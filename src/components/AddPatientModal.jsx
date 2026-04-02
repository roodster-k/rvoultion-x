import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { countryCodes, interventionLabels, chirurgienLabels } from '../data/constants';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export default function AddPatientModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { addPatient } = useData();
  const [newPatientForm, setNewPatientForm] = useState({
    name: '', intervention: '', chirurgien: '', email: '',
    phoneCode: '+32', phoneNumber: '', whatsapp: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPatientForm.name && newPatientForm.intervention) {
      const phone = `${newPatientForm.phoneCode} ${newPatientForm.phoneNumber}`;
      addPatient({
        ...newPatientForm,
        phone,
        whatsapp: newPatientForm.whatsapp || phone.replace(/\s/g, ''),
      }, user?.name);
      setNewPatientForm({ name: '', intervention: '', chirurgien: '', email: '', phoneCode: '+32', phoneNumber: '', whatsapp: '' });
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          className="bg-white p-6 sm:p-8 rounded-[24px] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-modal"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-serif text-[22px] font-bold text-text-dark">Créer Dossier Patient</h2>
            <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 border-none w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors text-text-muted">
              <X size={16} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label">Nom complet *</label>
              <input required value={newPatientForm.name} onChange={e=>setNewPatientForm({...newPatientForm, name: e.target.value})} type="text" placeholder="Ex: Jean Dupont" className="input" />
            </div>
            <div>
              <label className="label">Intervention(s) * <span className="font-normal normal-case text-[11px]">— séparer par virgule si plusieurs</span></label>
              <input required list="intervention-list" value={newPatientForm.intervention} onChange={e=>setNewPatientForm({...newPatientForm, intervention: e.target.value})} type="text" placeholder="Ex: Rhinoplastie, Blépharoplastie" className="input" />
              <datalist id="intervention-list">{interventionLabels.map(l=><option key={l} value={l} />)}</datalist>
            </div>
            <div>
              <label className="label">Chirurgien</label>
              <input list="chirurgien-list" value={newPatientForm.chirurgien} onChange={e=>setNewPatientForm({...newPatientForm, chirurgien: e.target.value})} type="text" placeholder="Ex: Dr. Renaud" className="input" />
              <datalist id="chirurgien-list">{chirurgienLabels.map(l=><option key={l} value={l} />)}</datalist>
            </div>
            
            <hr className="border-t border-border my-2" />
            <p className="text-xs font-bold text-primary uppercase tracking-wide">Coordonnées Patient</p>

            <div>
              <label className="label">E-mail</label>
              <input value={newPatientForm.email} onChange={e=>setNewPatientForm({...newPatientForm, email: e.target.value})} type="email" placeholder="patient@email.com" className="input" />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <div className="flex gap-2">
                <select value={newPatientForm.phoneCode} onChange={e=>setNewPatientForm({...newPatientForm, phoneCode: e.target.value})} className="px-3 py-3 rounded-xl border border-border text-[13px] min-w-[130px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white">
                  {countryCodes.map(cc => <option key={cc.code} value={cc.code}>{cc.flag} {cc.code}</option>)}
                </select>
                <input value={newPatientForm.phoneNumber} onChange={e=>setNewPatientForm({...newPatientForm, phoneNumber: e.target.value})} type="tel" placeholder="475 12 34 56" className="input flex-1" />
              </div>
            </div>
            
            <button type="submit" className="btn-primary mt-2 flex justify-center items-center py-4 text-[15px] shadow-button w-full">
              Créer le dossier
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
