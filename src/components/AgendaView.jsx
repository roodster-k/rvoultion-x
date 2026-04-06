import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import useAppointments from '../hooks/useAppointments';

export default function AgendaView({ onSelectPatient, patients }) {
  const { appointments, loading, toggleAppointment } = useAppointments();
  const [showDone, setShowDone] = useState(false);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const grouped = groupByDay(
    appointments.filter(a => showDone || !a.done),
    today
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl mb-2 font-bold text-text-dark">Agenda</h1>
          <p className="text-text-muted font-medium text-sm">Rendez-vous de suivi post-opératoire planifiés.</p>
        </div>
        <label className="flex items-center gap-2 text-[13px] font-semibold text-text-muted cursor-pointer select-none">
          <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)}
            className="accent-primary w-4 h-4 rounded" />
          Afficher effectués
        </label>
      </div>

      {loading && (
        <div className="flex justify-center py-16 text-text-muted text-sm">Chargement…</div>
      )}

      {!loading && grouped.length === 0 && (
        <div className="mt-10 text-center p-12 bg-white rounded-[40px] border-2 border-dashed border-slate-100 max-w-2xl mx-auto">
          <CalendarDays size={40} className="mx-auto mb-5 text-text-muted opacity-20" />
          <h3 className="text-xl font-serif font-black text-text-dark mb-3">Aucun rendez-vous à venir</h3>
          <p className="text-text-muted text-sm leading-relaxed">
            Planifiez des RDV depuis la fiche d'un patient (onglet RDV).
          </p>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {grouped.map(({ label, isToday, isTomorrow, appts }) => (
          <div key={label}>
            <div className={`flex items-center gap-2 mb-3 ${isToday ? 'text-primary' : isTomorrow ? 'text-amber-600' : 'text-text-muted'}`}>
              <CalendarDays size={16} />
              <span className="font-bold text-[13px] uppercase tracking-wide">
                {isToday ? 'Aujourd\'hui' : isTomorrow ? 'Demain' : label}
              </span>
              <span className="text-[12px] font-semibold opacity-60">· {appts.length} RDV</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {appts.map(appt => {
                const dt = new Date(appt.scheduledAt);
                const patient = patients?.find(p => p.id === appt.patientId);

                return (
                  <div key={appt.id}
                    className={`card p-4 shadow-sm flex items-start gap-4 transition-all
                      ${appt.done ? 'opacity-50' : ''}`}>

                    {/* Time column */}
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className={`text-[15px] font-extrabold ${isToday && !appt.done ? 'text-primary' : 'text-text-dark'}`}>
                        {dt.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-text-muted font-semibold mt-0.5">
                        {dt.toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>

                    {/* Separator */}
                    <div className={`w-0.5 self-stretch rounded-full flex-shrink-0 ${appt.done ? 'bg-slate-200' : isToday ? 'bg-primary' : 'bg-slate-200'}`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-[14px] ${appt.done ? 'line-through text-text-muted' : 'text-text-dark'}`}>
                        {appt.title}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {patient && (
                          <button
                            onClick={() => patient && onSelectPatient?.(patient)}
                            className="text-[12px] font-bold text-primary hover:text-primary-dark transition-colors"
                          >
                            {appt.patientName}
                          </button>
                        )}
                        {!patient && (
                          <span className="text-[12px] font-semibold text-text-muted">{appt.patientName}</span>
                        )}
                        {appt.intervention && (
                          <span className="text-[11px] text-text-muted font-semibold">{appt.intervention}</span>
                        )}
                        {appt.location && (
                          <span className="flex items-center gap-1 text-[11px] text-text-muted font-semibold">
                            <MapPin size={11} /> {appt.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Done toggle */}
                    <button
                      onClick={() => toggleAppointment(appt.id)}
                      className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
                        ${appt.done
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 hover:border-primary text-transparent hover:text-primary/40'}`}>
                      <span className="text-[13px] font-bold">✓</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function groupByDay(appointments, today) {
  const map = {};
  appointments.forEach(a => {
    const dt = new Date(a.scheduledAt);
    const dayKey = dt.toISOString().slice(0, 10);
    if (!map[dayKey]) map[dayKey] = [];
    map[dayKey].push(a);
  });

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, appts]) => {
      const dt = new Date(dateStr + 'T00:00:00');
      const isToday = dt.getTime() === today.getTime();
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
      const isTomorrow = dt.getTime() === tomorrow.getTime();
      const label = dt.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' });
      return { label, isToday, isTomorrow, appts: appts.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)) };
    });
}
