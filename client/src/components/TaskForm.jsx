import { useState } from 'react';
import { PlusCircle, AlertCircle } from 'lucide-react';
import { useTasks } from '../context/TaskContext';

const COLORS = [
  { hex: '#378ADD', label: 'Azul' },
  { hex: '#1D9E75', label: 'Verde' },
  { hex: '#EF9F27', label: 'Ámbar' },
  { hex: '#D4537E', label: 'Rosa' },
  { hex: '#7F77DD', label: 'Morado' },
  { hex: '#D85A30', label: 'Coral' },
];

const today = () => new Date().toISOString().split('T')[0];
const nextWeek = () => {
  const d = new Date(); d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
};

export default function TaskForm() {
  const { addTask } = useTasks();
  const [form, setForm] = useState({
    name: '', start: today(), end: nextWeek(), progress: 0, color: COLORS[0].hex,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('El nombre es requerido.'); return; }
    if (!form.start || !form.end) { setError('Selecciona fechas de inicio y fin.'); return; }
    if (new Date(form.end) <= new Date(form.start)) {
      setError('La fecha de fin debe ser posterior al inicio.'); return;
    }
    setError('');
    setSaving(true);
    try {
      await addTask({ ...form, name: form.name.trim() });
      setForm({ name: '', start: today(), end: nextWeek(), progress: 0, color: form.color });
    } catch {
      setError('Error al guardar la tarea. ¿Está corriendo el servidor?');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-5 flex-1 overflow-y-auto">
      {/* Nombre */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</label>
        <input
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
          placeholder="Ej: nombrex"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
      </div>

      {/* Fecha inicio */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Inicio</label>
        <input
          type="date"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          value={form.start}
          onChange={e => set('start', e.target.value)}
        />
      </div>

      {/* Fecha fin */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fin</label>
        <input
          type="date"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          value={form.end}
          onChange={e => set('end', e.target.value)}
        />
      </div>

      {/* Progreso */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Progreso <span className="text-blue-500 font-semibold">{form.progress}%</span>
        </label>
        <input
          type="range" min="0" max="100" step="5"
          value={form.progress}
          onChange={e => set('progress', parseInt(e.target.value))}
          className="accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>

      {/* Color */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c.hex}
              title={c.label}
              onClick={() => set('color', c.hex)}
              className={`w-7 h-7 rounded-full transition-all duration-150 ${
                form.color === c.hex
                  ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                  : 'hover:scale-105 opacity-80 hover:opacity-100'
              }`}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 text-xs p-2.5 rounded-lg border border-red-200">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview de color */}
      <div
        className="rounded-lg p-2.5 text-sm font-medium truncate mt-1 transition-colors"
        style={{ background: form.color + '20', color: form.color, border: `1px solid ${form.color}40` }}
      >
        {form.name || 'Vista previa de la tarea'}
      </div>

      {/* Botón */}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="mt-auto flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium py-2.5 rounded-lg transition-colors cursor-pointer"
      >
        <PlusCircle size={16} />
        {saving ? 'Guardando…' : 'Agregar tarea'}
      </button>
    </div>
  );
}
