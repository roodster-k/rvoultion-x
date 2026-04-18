import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, AlertCircle, FileText, Globe, Building2, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ProtocolEditor from '../components/protocols/ProtocolEditor';

export default function ProtocolTemplates() {
  const { user } = useAuth();
  const clinicId = user?.clinic_id;

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null = list, 'new' = new, template obj = edit
  const [deleting, setDeleting] = useState(null); // template id being deleted

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('protocol_templates')
        .select('id, name, intervention_type, is_global, clinic_id, tasks, created_at')
        .or(`is_global.eq.true,clinic_id.eq.${clinicId}`)
        .order('is_global', { ascending: false })
        .order('name');

      if (err) throw err;
      setTemplates(data || []);
    } catch (err) {
      console.error('[ProtocolTemplates]', err);
      setError('Impossible de charger les protocoles.');
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleDelete = async (template) => {
    if (!window.confirm(`Supprimer "${template.name}" ?`)) return;
    setDeleting(template.id);
    try {
      const { error: err } = await supabase
        .from('protocol_templates')
        .delete()
        .eq('id', template.id);
      if (err) throw err;
      setTemplates(t => t.filter(x => x.id !== template.id));
    } catch (err) {
      console.error('[ProtocolTemplates] delete:', err);
      setError('Impossible de supprimer ce protocole.');
    } finally {
      setDeleting(null);
    }
  };

  // ─── Editor view ───
  if (editing !== null) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-[24px] border border-border shadow-sm p-6">
          <ProtocolEditor
            template={editing === 'new' ? null : editing}
            clinicId={clinicId}
            onSaved={() => { setEditing(null); fetchTemplates(); }}
            onCancel={() => setEditing(null)}
          />
        </div>
      </div>
    );
  }

  const globalTemplates = templates.filter(t => t.is_global);
  const clinicTemplates = templates.filter(t => !t.is_global && t.clinic_id === clinicId);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="font-serif text-[20px] font-bold text-text-dark">Protocoles post-op</h1>
          <p className="text-[12px] text-text-muted font-medium mt-0.5">
            {templates.length} protocole{templates.length !== 1 ? 's' : ''} disponible{templates.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-button transition-colors border-none cursor-pointer"
        >
          <Plus size={16} /> Nouveau protocole
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-[13px] font-semibold p-3 rounded-xl">
            <AlertCircle size={15} className="shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Protocoles globaux */}
            {globalTemplates.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={14} className="text-text-muted" />
                  <span className="text-[12px] font-bold text-text-muted uppercase tracking-wide">
                    Protocoles standards ({globalTemplates.length})
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <AnimatePresence>
                    {globalTemplates.map(t => (
                      <TemplateCard
                        key={t.id}
                        template={t}
                        isGlobal
                        onEdit={() => setEditing(t)}
                        onDelete={() => handleDelete(t)}
                        deleting={deleting === t.id}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Protocoles clinique */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={14} className="text-text-muted" />
                <span className="text-[12px] font-bold text-text-muted uppercase tracking-wide">
                  Protocoles de votre clinique ({clinicTemplates.length})
                </span>
              </div>
              {clinicTemplates.length === 0 ? (
                <div className="bg-white rounded-[16px] border border-dashed border-border p-10 text-center shadow-sm">
                  <FileText size={32} className="mx-auto text-text-muted opacity-30 mb-3" />
                  <p className="font-bold text-text-dark text-[14px] mb-1">Aucun protocole personnalisé</p>
                  <p className="text-text-muted text-[13px]">
                    Créez des protocoles spécifiques à votre clinique.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <AnimatePresence>
                    {clinicTemplates.map(t => (
                      <TemplateCard
                        key={t.id}
                        template={t}
                        isGlobal={false}
                        onEdit={() => setEditing(t)}
                        onDelete={() => handleDelete(t)}
                        deleting={deleting === t.id}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function TemplateCard({ template, isGlobal, onEdit, onDelete, deleting }) {
  const taskCount = template.tasks?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-white rounded-[14px] border border-border p-4 shadow-sm flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
        <FileText size={18} className="text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-bold text-text-dark text-[15px] truncate">{template.name}</div>
        <div className="flex items-center gap-2 mt-0.5 text-[12px] text-text-muted font-medium">
          <span>{template.intervention_type}</span>
          <span>·</span>
          <span>{taskCount} étape{taskCount !== 1 ? 's' : ''}</span>
          {isGlobal && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1 text-blue-600 font-bold">
                <Globe size={10} /> Standard
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="p-2 text-slate-400 hover:text-primary bg-transparent border-none cursor-pointer rounded-lg hover:bg-primary-light transition-colors"
          title="Modifier"
        >
          <Pencil size={15} />
        </button>
        {!isGlobal && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="p-2 text-slate-400 hover:text-red-500 bg-transparent border-none cursor-pointer rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
            title="Supprimer"
          >
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          </button>
        )}
        <ChevronRight size={15} className="text-slate-300 ml-1" />
      </div>
    </motion.div>
  );
}
