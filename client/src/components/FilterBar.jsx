import { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { useTasks } from '../context/TaskContext';

const STATUSES = [
  { value: 'abierto',     label: 'Abierto' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'terminado',   label: 'Terminado' },
  { value: 'cerrado',     label: 'Cerrado' },
];

const PRIORITIES = [
  { value: 'muy_alta', label: 'Más alta' },
  { value: 'alta',     label: 'Alta' },
  { value: 'media',    label: 'Media' },
  { value: 'baja',     label: 'Baja' },
  { value: 'muy_baja', label: 'Muy baja' },
];

const STATUS_COLORS = {
  abierto: '#9ca3af', en_progreso: '#3b82f6', terminado: '#10b981', cerrado: '#374151',
};
const PRIORITY_COLORS = {
  muy_alta: '#ef4444', alta: '#f97316', media: '#eab308', baja: '#3b82f6', muy_baja: '#9ca3af',
};

// Simple dropdown component
function Dropdown({ label, options, selected, onToggle, colorMap, icon }) {
  const [open, setOpen] = useState(false);
  const hasActive = selected.length > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
        style={{
          border: hasActive ? '1px solid #3b82f6' : '1px solid #e5e7eb',
          background: hasActive ? '#eff6ff' : '#fff',
          color: hasActive ? '#3b82f6' : '#6b7280',
        }}
      >
        {icon}
        {label}
        {hasActive && (
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-xs font-bold">
            {selected.length}
          </span>
        )}
        <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <>
          {/* Overlay to close */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 min-w-[160px]">
            {options.map(opt => {
              const active = selected.includes(opt.value);
              return (
                <button key={opt.value}
                  onClick={() => onToggle(opt.value)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="w-4 h-4 rounded flex items-center justify-center border flex-shrink-0"
                    style={{ background: active ? '#3b82f6' : '#fff', borderColor: active ? '#3b82f6' : '#d1d5db' }}>
                    {active && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                  {colorMap && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colorMap[opt.value] }} />
                  )}
                  <span style={{ color: '#374151' }}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function FilterBar({ filters, setFilters }) {
  const { tasks } = useTasks();

  // Collect unique assignees from tasks
  const assignees = [...new Set(tasks.map(t => t.assignee).filter(Boolean))];

  const toggle = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }));
  };

  const clearAll = () => setFilters({ status: [], priority: [], assignee: [], search: '' });

  const totalActive = filters.status.length + filters.priority.length + filters.assignee.length + (filters.search ? 1 : 0);

  return (
    <div className="flex items-center gap-2 px-5 py-2 bg-white border-b border-gray-100 flex-wrap">
      {/* Filter icon */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium flex-shrink-0">
        <Filter size={13} />
        Filtrar
      </div>

      <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

      {/* Search */}
      <div className="relative flex-shrink-0">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={filters.search}
          onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 w-44 placeholder-gray-400"
        />
        {filters.search && (
          <button onClick={() => setFilters(p => ({ ...p, search: '' }))}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={11} />
          </button>
        )}
      </div>

      {/* Estado */}
      <Dropdown
        label="Estado"
        options={STATUSES}
        selected={filters.status}
        onToggle={v => toggle('status', v)}
        colorMap={STATUS_COLORS}
      />

      {/* Prioridad */}
      <Dropdown
        label="Prioridad"
        options={PRIORITIES}
        selected={filters.priority}
        onToggle={v => toggle('priority', v)}
        colorMap={PRIORITY_COLORS}
      />

      {/* Asignado */}
      {assignees.length > 0 && (
        <Dropdown
          label="Asignado"
          options={assignees.map(a => ({ value: a, label: a }))}
          selected={filters.assignee}
          onToggle={v => toggle('assignee', v)}
        />
      )}

      {/* Clear all */}
      {totalActive > 0 && (
        <button onClick={clearAll}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors ml-1">
          <X size={12} />
          Limpiar ({totalActive})
        </button>
      )}

      {/* Results count */}
      {totalActive > 0 && (
        <span className="text-xs text-gray-400 ml-auto">
          Mostrando resultados filtrados
        </span>
      )}
    </div>
  );
}
