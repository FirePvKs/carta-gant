import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useTasks } from '../context/TaskContext';

const COLORS = ['#378ADD','#1D9E75','#EF9F27','#D4537E','#7F77DD','#D85A30','#0EA5E9','#F59E0B'];

const STATUSES = [
  { value: 'abierto',      label: 'Abierto',      bg: '#f3f4f6', color: '#6b7280' },
  { value: 'en_progreso',  label: 'En progreso',  bg: '#eff6ff', color: '#3b82f6' },
  { value: 'terminado',    label: 'Terminado',    bg: '#ecfdf5', color: '#10b981' },
  { value: 'cerrado',      label: 'Cerrado',      bg: '#1f2937', color: '#f9fafb' },
];

/** Calcula días entre dos fechas */
const daysBetween = (start, end) => {
  const diff = new Date(end) - new Date(start);
  return Math.max(0, Math.round(diff / 86400000));
};

export default function EditTaskModal({ task, onClose }) {
  const { addTask, updateTask, deleteTask, tasks } = useTasks();
  const isNew = !task?.id;

  const today = new Date().toISOString().split('T')[0];
  const nextWeek = (() => { const d = new Date(); d.setDate(d.getDate()+7); return d.toISOString().split('T')[0]; })();

  const [form, setForm] = useState({
    name: '', assignee: '', status: 'abierto',
    start: today, end: nextWeek,
    progress: 0, color: COLORS[0],
    description: '', estimation: '',
  });

  // Carga los datos de la tarea al abrir en modo edición
  useEffect(() => {
    if (task?.id) {
      setForm({
        name: task.name ?? '',
        assignee: task.assignee ?? '',
        status: task.status ?? 'abierto',
        start: task.start ?? today,
        end: task.end ?? nextWeek,
        progress: task.progress ?? 0,
        color: task.color ?? COLORS[0],
        description: task.description ?? '',
        estimation: task.estimation ?? '',
      });
    }
  }, [task]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const duration = daysBetween(form.start, form.end);

  /** Ajusta la fecha fin cuando cambia la duración */
  const handleDurationChange = (days) => {
    const d = new Date(form.start);
    d.setDate(d.getDate() + Math.max(1, days));
    set('end', d.toISOString().split('T')[0]);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (isNew) {
      addTask({ ...form, name: form.name.trim() });
    } else {
      updateTask(task.id, { ...form, name: form.name.trim() });
    }
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`¿Eliminar "${task.name}" y todas sus subtareas?`)) {
      deleteTask(task.id);
      onClose();
    }
  };

  const isParent = task?.isParent;
  const currentStatus = STATUSES.find(s => s.value === form.status) ?? STATUSES[0];

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-sm font-semibold text-gray-700">
            {isNew ? 'Nueva tarea' : 'Editar tarea'}
          </h2>
          <div className="flex items-center gap-2">
            {!isNew && (
              <button onClick={handleDelete} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                <Trash2 size={15} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</label>
            <input
              autoFocus
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Nombre de la tarea"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          {/* Asignado a */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Asignado a</label>
            <input
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Nombre del responsable"
              value={form.assignee}
              onChange={e => set('assignee', e.target.value)}
            />
          </div>

          {/* Estado */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</label>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => set('status', s.value)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                  style={{
                    background: form.status === s.value ? s.bg : '#f9fafb',
                    color: form.status === s.value ? s.color : '#9ca3af',
                    borderColor: form.status === s.value ? s.color + '60' : '#e5e7eb',
                    fontWeight: form.status === s.value ? 600 : 400,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fechas + Duración */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Inicio</label>
              <input type="date" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.start} onChange={e => set('start', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fin</label>
              <input type="date" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.end} onChange={e => set('end', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Duración</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <input
                  type="number" min="1"
                  className="flex-1 px-3 py-2.5 text-sm focus:outline-none w-0"
                  value={duration}
                  onChange={e => handleDurationChange(parseInt(e.target.value) || 1)}
                />
                <span className="px-2 text-xs text-gray-400 border-l border-gray-200 py-2.5">días</span>
              </div>
            </div>
          </div>

          {/* Progreso */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Progreso</label>
              <span className="text-sm font-semibold" style={{ color: form.color }}>
                {isParent ? `${task?.computedProgress ?? 0}% (auto)` : `${form.progress}%`}
              </span>
            </div>
            {isParent ? (
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-400 text-center border border-dashed border-gray-200">
                El progreso se calcula automáticamente desde las subtareas
              </div>
            ) : (
              <div className="flex gap-1.5 flex-wrap">
                {[0,10,20,30,40,50,60,70,80,90,100].map(n => (
                  <button
                    key={n}
                    onClick={() => set('progress', n)}
                    className="flex-1 min-w-[36px] py-1.5 rounded-lg text-xs font-medium transition-all border"
                    style={{
                      background: form.progress >= n ? form.color : '#f9fafb',
                      color: form.progress >= n ? '#fff' : '#9ca3af',
                      borderColor: form.progress === n ? form.color : '#e5e7eb',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Estimación */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estimación</label>
            <input
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Ej: 3 días, 2 semanas…"
              value={form.estimation}
              onChange={e => set('estimation', e.target.value)}
            />
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Descripción</label>
            <textarea
              rows={3}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="Detalles de la tarea…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Color */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => set('color', c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{ background: c, outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-200 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {isNew ? 'Crear tarea' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
