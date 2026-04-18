import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronUp, ChevronDown, Save, Loader2, X, AlertCircle, Info, CheckSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const TASK_TYPES = [
  { value: 'info',    label: 'Information',   icon: <Info size={14} />,        color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'task',    label: 'Tâche patient',  icon: <CheckSquare size={14} />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'alert',   label: 'Alerte médicale',icon: <AlertCircle size={14} />, color: 'bg-red-50 text-red-700 border-red-200' },
];

function newStep(sortOrder) {
  return {
    _id: `tmp_${Date.now()}_${Math.random()}`,
    label: '',
    description: '',
    jour_post_op_ref: 1,
    patient_can_check: false,
    sort_order: sortOrder,
    type: 'task',
  };
}

export default function ProtocolEditor({ template, clinicId, onSaved, onCancel }) {
  const isNew = !template?.id;

  const [name, setName] = useState(template?.name || '');
  const [interventionType, setInterventionType] = useState(template?.intervention_type || '');
  const [steps, setSteps] = useState(() =>
    (template?.tasks || []).map((t, i) => ({ ...t, _id: `existing_${i}`, type: t.patient_can_check ? 'task' : 'info' }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ─── Step mutations ───
  const addStep = () => setSteps(s => [...s, newStep(s.length + 1)]);

  const removeStep = (id) => setSteps(s => s.filter(t => t._id !== id));

  const updateStep = (id, key, val) =>
    setSteps(s => s.map(t => t._id === id ? { ...t, [key]: val } : t));

  const moveStep = (id, dir) => {
    const idx = steps.findIndex(t => t._id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= steps.length) return;
    const arr = [...steps];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setSteps(arr.map((t, i) => ({ ...t, sort_order: i + 1 })));
  };

  // ─── Save ───
  const handleSave = async () => {
    if (!name.trim()) { setError('Le nom du protocole est requis.'); return; }
    if (!interventionType.trim()) { setError('Le type d\'intervention est requis.'); return; }
    if (steps.length === 0) { setError('Ajoutez au moins une étape.'); return; }
    if (steps.some(s => !s.label.trim())) { setError('Toutes les étapes doivent avoir un titre.'); return; }

    setSaving(true);
    setError('');

    const payload = {
      name: name.trim(),
      intervention_type: interventionType.trim(),
      clinic_id: clinicId,
      is_global: false,
      tasks: steps.map((s, i) => ({
        label: s.label.trim(),
        description: s.description?.trim() || null,
        jour_post_op_ref: Number(s.jour_post_op_ref) || 1,
        patient_can_check: s.type === 'task',
        sort_order: i + 1,
      })),
    };

    try {
      if (isNew) {
        const { error: err } = await supabase.from('protocol_templates').insert(payload);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('protocol_templates')
          .update(payload)
          .eq('id', template.id);
        if (err) throw err;
      }
      onSaved?.();
    } catch (err) {
      console.error('[ProtocolEditor]', err);
      setError(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header du formulaire */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-[20px] font-bold text-text-dark">
          {isNew ? 'Nouveau protocole' : 'Modifier le protocole'}
        </h2>
        <button onClick={onCancel} className="text-text-muted hover:text-text-dark bg-transparent border-none cursor-pointer p-1">
          <X size={20} />
        </button>
      </div>

      {/* Métadonnées */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-[12px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Nom du protocole</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Protocole Rhinoplastie Standard"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border text-[14px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Type d'intervention</label>
          <input
            type="text"
            value={interventionType}
            onChange={e => setInterventionType(e.target.value)}
            placeholder="Ex: Rhinoplastie"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border text-[14px] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Liste des étapes */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-bold text-text-dark">
          Étapes ({steps.length})
        </span>
        <button
          type="button"
          onClick={addStep}
          className="flex items-center gap-1.5 text-[12px] font-bold text-primary hover:text-primary-dark bg-primary-light px-3 py-1.5 rounded-lg border-none cursor-pointer transition-colors"
        >
          <Plus size={14} /> Ajouter une étape
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1" style={{ maxHeight: '420px' }}>
        <AnimatePresence>
          {steps.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-border text-text-muted text-sm font-medium">
              Aucune étape. Cliquez sur "Ajouter une étape".
            </div>
          ) : (
            steps.map((step, idx) => (
              <motion.div
                key={step._id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white border border-border rounded-[14px] p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {/* Jour J+ */}
                  <div className="shrink-0 text-center">
                    <div className="text-[10px] font-bold text-text-muted uppercase mb-1">Jour</div>
                    <div className="flex items-center">
                      <span className="text-[12px] font-bold text-text-muted mr-0.5">J+</span>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={step.jour_post_op_ref}
                        onChange={e => updateStep(step._id, 'jour_post_op_ref', e.target.value)}
                        className="w-12 text-center border border-border rounded-lg py-1 text-[13px] font-bold text-primary outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={step.label}
                      onChange={e => updateStep(step._id, 'label', e.target.value)}
                      placeholder="Titre de l'étape…"
                      className="w-full border-none outline-none text-[14px] font-bold text-text-dark placeholder-slate-300 mb-1 bg-transparent"
                    />
                    <input
                      type="text"
                      value={step.description || ''}
                      onChange={e => updateStep(step._id, 'description', e.target.value)}
                      placeholder="Description (optionnel)…"
                      className="w-full border-none outline-none text-[12px] text-text-muted placeholder-slate-300 bg-transparent"
                    />
                    {/* Type */}
                    <div className="flex gap-1.5 mt-2">
                      {TASK_TYPES.map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => updateStep(step._id, 'type', t.value)}
                          className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border transition-all cursor-pointer
                            ${step.type === t.value ? t.color : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'}`}
                        >
                          {t.icon} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <button type="button" onClick={() => moveStep(step._id, -1)} disabled={idx === 0}
                      className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer disabled:opacity-30 p-0.5">
                      <ChevronUp size={16} />
                    </button>
                    <button type="button" onClick={() => moveStep(step._id, 1)} disabled={idx === steps.length - 1}
                      className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer disabled:opacity-30 p-0.5">
                      <ChevronDown size={16} />
                    </button>
                    <button type="button" onClick={() => removeStep(step._id)}
                      className="text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer p-0.5">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-[13px] font-semibold p-3 rounded-xl mb-3">
          <AlertCircle size={15} className="shrink-0" /> {error}
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-3 pt-3 border-t border-border">
        <button onClick={onCancel}
          className="px-5 py-2.5 rounded-xl font-bold text-sm text-text-muted hover:text-text-dark border border-border bg-white cursor-pointer transition-colors">
          Annuler
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white border-none rounded-xl font-bold text-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 shadow-button transition-colors">
          {saving ? <><Loader2 size={16} className="animate-spin" /> Sauvegarde…</> : <><Save size={15} /> Sauvegarder</>}
        </button>
      </div>
    </div>
  );
}
