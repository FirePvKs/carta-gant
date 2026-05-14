import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useTasks } from '../context/TaskContext';

const COLORS = ['#378ADD','#1D9E75','#EF9F27','#D4537E','#7F77DD','#D85A30','#0EA5E9','#F59E0B'];

const STATUSES = [
  { value: 'abierto',     label: 'Abierto',     bg: '#f3f4f6', color: '#6b7280' },
  { value: 'en_progreso', label: 'En progreso', bg: '#eff6ff', color: '#3b82f6' },
  { value: 'terminado',   label: 'Terminado',   bg: '#ecfdf5', color: '#10b981' },
  { value: 'cerrado',     label: 'Cerrado',     bg: '#1f2937', color: '#f9fafb' },
];

const PRIORITIES = [
  { value: 'muy_alta', label: 'Más alta', color: '#ef4444', bg: '#fef2f2', dot: '🔴' },
  { value: 'alta',     label: 'Alta',     color: '#f97316', bg: '#fff7ed', dot: '🟠' },
  { value: 'media',    label: 'Media',    color: '#eab308', bg: '#fefce8', dot: '🟡' },
  { value: 'baja',     label: 'Baja',     color: '#3b82f6', bg: '#eff6ff', dot: '🔵' },
  { value: 'muy_baja', label: 'Muy baja', color: '#9ca3af', bg: '#f9fafb', dot: '⚪' },
];

const DURATION_UNITS = [
  { value: 'min', label: 'min' },
  { value: 'h',   label: 'h'   },
  { value: 'd',   label: 'd'   },
  { value: 'sem', label: 'sem' },
  { value: 'mes', label: 'mes' },
];

const today    = () => new Date().toISOString().split('T')[0];
const nextWeek = () => { const d = new Date(); d.setDate(d.getDate()+7); return d.toISOString().split('T')[0]; };

export default function EditTaskModal({ task, onClose }) {
  const { addTask, updateTask, deleteTask, tasks } = useTasks();
  const isNew    = !task?.id;
  const isParent = task?.isParent;

  const [form, setForm] = useState({
    taskType: 'task',
    name: '', assignee: '', status: 'abierto',
    start: today(), end: nextWeek(),
    progress: 0, color: COLORS[0],
    description: '',
    durationValue: 7, durationUnit: 'd',
    durationRaw: '7d', durationError: '',
    estimationValue: '', estimationUnit: 'd',
    estimationRaw: '', estimationError: '',
    deadlineEnabled: false, deadline: nextWeek(),
    priority: 'media',
  });

  /* Carga datos al abrir en modo edición */
  useEffect(() => {
    if (!task?.id) return;
    const dur = parseDuration(task.duration);
    const est = parseDuration(task.estimation);
    setForm({
      taskType:        task.taskType    ?? 'task',
      name:            task.name        ?? '',
      assignee:        task.assignee    ?? '',
      status:          task.status      ?? 'abierto',
      start:           task.start       ?? today(),
      end:             task.end         ?? nextWeek(),
      progress:        task.progress    ?? 0,
      color:           task.color       ?? COLORS[0],
      description:     task.description ?? '',
      durationValue:   dur.value,
      durationUnit:    dur.unit,
      durationRaw:     task.duration ?? `${dur.value}${dur.unit}`,
      durationError:   '',
      estimationValue: est.value,
      estimationUnit:  est.unit,
      estimationRaw:   task.estimation ?? (est.value ? `${est.value}${est.unit}` : ''),
      estimationError: '',
      deadlineEnabled: task.deadlineEnabled ?? false,
      deadline:        task.deadline    ?? task.end ?? nextWeek(),
      priority:        task.priority    ?? 'media',
    });
  }, [task?.id]);

  /* Sincroniza duración cuando cambian las fechas */
  useEffect(() => {
    const diff = Math.max(1, Math.round((new Date(form.end) - new Date(form.start)) / 86400000));
    setForm(p => ({ ...p, durationValue: diff, durationUnit: 'd' }));
  }, [form.start, form.end]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  /* Aplica duración a la fecha fin */
  const applyDuration = (val, unit) => {
    const d = new Date(form.start);
    const n = parseInt(val) || 1;
    const map = { min: n / 1440, h: n / 24, d: n, sem: n * 7, mes: n * 30 };
    d.setDate(d.getDate() + Math.max(1, Math.round(map[unit] ?? n)));
    set('end', d.toISOString().split('T')[0]);
  };

  /** Valida formato tipo "3d", "2sem", "30min" etc */
  const DURATION_RE = /^\d+(\.\d+)?(min|h|d|sem|mes)$/i;

  const handleDurationRaw = (val) => {
    const trimmed = val.trim();
    if (trimmed === '') {
      set('durationRaw', '');
      setForm(p => ({ ...p, durationRaw: '', durationError: '', durationValue: 7, durationUnit: 'd' }));
      return;
    }
    if (!DURATION_RE.test(trimmed)) {
      setForm(p => ({ ...p, durationRaw: val, durationError: 'Formato inválido. Ej: 3d · 2sem · 4h · 30min · 1mes' }));
      return;
    }
    const match = trimmed.match(/^(\d+(?:\.\d+)?)(min|h|d|sem|mes)$/i);
    const numVal = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    setForm(p => ({ ...p, durationRaw: val, durationError: '', durationValue: numVal, durationUnit: unit }));
    applyDuration(numVal, unit);
  };

  const handleEstimationRaw = (val) => {
    const trimmed = val.trim();
    if (trimmed === '') {
      setForm(p => ({ ...p, estimationRaw: '', estimationError: '', estimationValue: '', estimationUnit: 'd' }));
      return;
    }
    if (!DURATION_RE.test(trimmed)) {
      setForm(p => ({ ...p, estimationRaw: val, estimationError: 'Formato inválido. Ej: 3d · 2sem · 4h · 30min · 1mes' }));
      return;
    }
    const match = trimmed.match(/^(\d+(?:\.\d+)?)(min|h|d|sem|mes)$/i);
    setForm(p => ({ ...p, estimationRaw: val, estimationError: '', estimationValue: parseFloat(match[1]), estimationUnit: match[2].toLowerCase() }));
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (form.durationError || form.estimationError) return;
    const milestoneEnd = form.taskType === 'milestone' ? form.start : form.end;
    const payload = {
      ...form,
      end:        milestoneEnd,
      name:       form.name.trim(),
      duration:   `${form.durationValue}${form.durationUnit}`,
      estimation: form.estimationValue ? `${form.estimationValue}${form.estimationUnit}` : '',
    };
    isNew ? addTask(payload) : updateTask(task.id, payload);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`¿Eliminar "${task.name}" y todas sus subtareas?`)) {
      deleteTask(task.id); onClose();
    }
  };

  const pct = isParent ? (task?.computedProgress ?? 0) : form.progress;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            {isNew ? 'Nueva tarea' : 'Editar tarea'}
          </h2>
          <div className="flex items-center gap-2">
            {!isNew && (
              <button onClick={handleDelete}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                <Trash2 size={15} />
              </button>
            )}
            <button onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-4">

          {/* Nombre */}
          <Field label="Nombre">
            <input autoFocus
              className="input"
              placeholder="Nombre de la tarea"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </Field>

          {/* Tipo de tarea */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 ml-2">
              <button
                onClick={() => set('taskType', 'task')}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ background: form.taskType === 'task' ? '#3b82f6' : '#f9fafb', color: form.taskType === 'task' ? '#fff' : '#6b7280' }}
              >
                Tarea
              </button>
              <button
                onClick={() => set('taskType', 'milestone')}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ background: form.taskType === 'milestone' ? '#7c3aed' : '#f9fafb', color: form.taskType === 'milestone' ? '#fff' : '#6b7280' }}
              >
                Hito
              </button>
            </div>
          </div>

          {/* Asignado */}
          <Field label="Asignado a">
            <input className="input" placeholder="Nombre del responsable"
              value={form.assignee} onChange={e => set('assignee', e.target.value)} />
          </Field>

          {/* Estado + Prioridad */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Estado">
              <select className="input"
                value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Prioridad">
              <select className="input"
                value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.dot} {p.label}</option>)}
              </select>
            </Field>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Inicio">
              <input type="date" className="input"
                value={form.start} onChange={e => set('start', e.target.value)} />
            </Field>
            <Field label="Fin">
              <input type="date" className="input"
                value={form.end} onChange={e => set('end', e.target.value)} />
            </Field>
          </div>

          {/* Duración */}
          <Field label="Duración">
            <input
              className={`input ${form.durationError ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="Ej: 3d, 2sem, 1mes, 4h, 30min"
              value={form.durationRaw}
              onChange={e => handleDurationRaw(e.target.value)}
            />
            {form.durationError && (
              <p className="text-xs text-red-500 mt-1">{form.durationError}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Formatos: <span className="font-mono">min · h · d · sem · mes</span>
            </p>
          </Field>

          {/* Estimación */}
          <Field label="Estimación">
            <input
              className={`input ${form.estimationError ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="Ej: 2d, 1sem, 4h  (opcional)"
              value={form.estimationRaw}
              onChange={e => handleEstimationRaw(e.target.value)}
            />
            {form.estimationError && (
              <p className="text-xs text-red-500 mt-1">{form.estimationError}</p>
            )}
          </Field>

          {/* Progreso */}
          <Field label={`Progreso — ${pct}%`}>
            {isParent ? (
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-400 text-center border border-dashed border-gray-200">
                Calculado automáticamente desde las subtareas
              </div>
            ) : (
              <input
                type="range" min="0" max="100" step="10"
                value={form.progress}
                onChange={e => set('progress', parseInt(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${form.color} 0%, ${form.color} ${form.progress}%, #e5e7eb ${form.progress}%, #e5e7eb 100%)`,
                  accentColor: form.color,
                }}
              />
            )}
          </Field>

          {/* Fecha límite */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Fecha límite
              </label>
              {/* Switch */}
              <button
                onClick={() => set('deadlineEnabled', !form.deadlineEnabled)}
                className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                style={{ background: form.deadlineEnabled ? form.color : '#e5e7eb' }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                  style={{ transform: form.deadlineEnabled ? 'translateX(22px)' : 'translateX(2px)' }}
                />
              </button>
            </div>
            {form.deadlineEnabled && (
              <input type="date" className="input"
                value={form.deadline}
                onChange={e => set('deadline', e.target.value)}
              />
            )}
          </div>

          {/* Descripción */}
          <Field label="Descripción">
            <textarea rows={3} className="input resize-none"
              placeholder="Detalles de la tarea…"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </Field>

          {/* Color */}
          <Field label="Color">
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => set('color', c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{ background: c, outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }}
                />
              ))}
            </div>
          </Field>

        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-2 flex gap-3 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!form.name.trim()}
            className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-200 text-white text-sm font-semibold rounded-xl transition-colors">
            {isNew ? 'Crear tarea' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Componente auxiliar de campo con label */
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

/* Parsea strings tipo "7d", "2sem" → { value, unit } */
function parseDuration(str) {
  if (!str) return { value: 7, unit: 'd' };
  const match = String(str).match(/^(\d+)(min|h|d|sem|mes)$/);
  return match ? { value: parseInt(match[1]), unit: match[2] } : { value: parseInt(str) || 7, unit: 'd' };
}
