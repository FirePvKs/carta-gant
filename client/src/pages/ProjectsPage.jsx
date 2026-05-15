import { useState } from 'react';
import { Plus, BarChart2, Trash2, Clock } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import logo from '../assets/logo.png';

const BRAND_COLOR = '#70a957';

const COLORS = ['#378ADD','#1D9E75','#7F77DD','#EF9F27','#D4537E','#D85A30','#0EA5E9','#F59E0B'];

/* ── New project modal ─────────────────────────────────────────────────────── */
function NewProjectModal({ onClose, onCreate }) {
  const [name, setName]   = useState('');
  const [desc, setDesc]   = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!name.trim()) { setError('El nombre es requerido.'); return; }
    onCreate(name, desc, color);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5">
        <h2 className="text-base font-semibold text-gray-800">Nuevo proyecto</h2>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full transition-all"
              style={{ background: c, outline: color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</label>
          <input autoFocus
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ej: Rediseño Web 2026"
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Descripción (opcional)</label>
          <textarea rows={2}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            placeholder="Breve descripción del proyecto..."
            value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleCreate} disabled={!name.trim()}
            className="flex-1 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
            style={{ background: color }}>
            Crear proyecto
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Recent project card (small, horizontal) ───────────────────────────────── */
function RecentCard({ project, onOpen, onDelete }) {
  const [hover, setHover]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fmt = iso => {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff/60)} min`;
    if (diff < 86400) return `Hoy a las ${d.toLocaleTimeString('es', { hour:'2-digit', minute:'2-digit' })}`;
    if (diff < 172800) return `Ayer a las ${d.toLocaleTimeString('es', { hour:'2-digit', minute:'2-digit' })}`;
    return d.toLocaleDateString('es', { day:'2-digit', month:'short', year:'numeric' });
  };

  return (
    <div
      className="relative flex items-center gap-4 p-4 rounded-xl border border-gray-200 cursor-pointer transition-all hover:border-gray-300 hover:shadow-sm group"
      style={{ background: hover ? '#fafafa' : '#fff' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => !confirmDelete && onOpen(project.id)}
    >
      {/* Color icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: project.color + '20' }}>
        <BarChart2 size={18} style={{ color: project.color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{project.name}</p>
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
          <Clock size={11} />
          {fmt(project.updatedAt)}
        </p>
      </div>

      {/* Delete */}
      <button
        onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0">
        <Trash2 size={14} />
      </button>

      {/* Confirm overlay */}
      {confirmDelete && (
        <div className="absolute inset-0 bg-white rounded-xl flex items-center justify-center gap-3 px-4 z-10 border border-gray-200"
          onClick={e => e.stopPropagation()}>
          <p className="text-xs text-gray-600 flex-1">¿Eliminar "{project.name}"?</p>
          <button onClick={() => setConfirmDelete(false)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex-shrink-0">
            No
          </button>
          <button onClick={() => onDelete(project.id)}
            className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium flex-shrink-0">
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────────── */
export default function ProjectsPage() {
  const { projects, createProject, deleteProject, setActiveProjectId } = useProjects();
  const [showModal, setShowModal] = useState(false);

  // Sort by most recently updated
  const sorted = [...projects].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return (
    <div className="min-h-screen" style={{ background: '#f3f4f6' }}>

      {/* Top brand bar */}
      <header style={{ background: BRAND_COLOR, height: 40 }}
        className="flex items-center px-6 w-full flex-shrink-0">
        <img src={logo} alt="V.Gant"
          style={{ height: 22, width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
      </header>

      {/* Hero banner */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #3b82f6 100%)', minHeight: 160 }}
        className="flex items-center px-10 py-8">
        <div>
          <img src={logo} alt="V.Gant"
            style={{ height: 44, width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)', marginBottom: 16 }} />
          <p className="text-white text-sm opacity-80 mb-4">Gestiona tus proyectos con cartas Gantt interactivas</p>
          <div className="flex gap-3">
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-white text-blue-600 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-50 transition-colors shadow-sm">
              <Plus size={16} />
              Crear proyecto en blanco
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-8">

        {projects.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
              <BarChart2 size={24} className="text-gray-400" />
            </div>
            <p className="text-base font-medium text-gray-600">No tienes proyectos todavía</p>
            <p className="text-sm text-gray-400">Crea tu primer proyecto usando el botón de arriba</p>
          </div>
        ) : (
          /* Recent projects */
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Continúa editando
            </h2>
            <div className="flex flex-col gap-2">
              {sorted.map(p => (
                <RecentCard
                  key={p.id}
                  project={p}
                  onOpen={setActiveProjectId}
                  onDelete={deleteProject}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <NewProjectModal onClose={() => setShowModal(false)} onCreate={createProject} />
      )}
    </div>
  );
}
