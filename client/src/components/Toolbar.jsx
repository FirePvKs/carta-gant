import { useState } from 'react';
import { Download, Loader2, Undo2, Redo2, ChevronLeft } from 'lucide-react';
import { exportGanttToPDF } from '../utils/exportPDF';
import { useTasks } from '../context/TaskContext';
import logo from '../assets/logo.png';

const BRAND_COLOR = '#70a957';

export default function Toolbar({ project, onBack }) {
  const { tasks, canUndo, canRedo, undo, redo } = useTasks();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress]   = useState(0);

  const handleExport = async () => {
    if (!tasks.length) return alert('Agrega tareas antes de exportar.');
    setExporting(true);
    try { await exportGanttToPDF('gantt-container', project?.name ?? 'Proyecto', setProgress); }
    catch (err) { alert('Error: ' + err.message); }
    finally { setExporting(false); setProgress(0); }
  };

  const done    = tasks.filter(t => t.status === 'terminado').length;
  const overdue = tasks.filter(t =>
    ['abierto','en_progreso'].includes(t.status) &&
    t.taskType !== 'milestone' &&
    new Date(t.end + 'T23:59:59') < new Date()
  ).length;

  return (
    /* Barra delgada horizontal con color de marca */
    <div style={{ background: BRAND_COLOR, height: 40, flexShrink: 0 }}
      className="flex items-center justify-between px-4 w-full">

      {/* Left: logo + back + project name */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Logo */}
        <img src={logo} alt="V.Gant" style={{ height: 22, width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)', flexShrink: 0 }} />

        <div className="w-px h-4 bg-white opacity-30 flex-shrink-0" />

        {/* Back button */}
        <button onClick={onBack}
          className="flex items-center gap-1 text-xs text-white font-medium opacity-90 hover:opacity-100 transition-opacity flex-shrink-0">
          <ChevronLeft size={14} />
          Proyectos
        </button>

        <div className="w-px h-4 bg-white opacity-30 flex-shrink-0" />

        {/* Project name */}
        <span className="text-xs font-semibold text-white truncate max-w-[200px]">
          {project?.name ?? 'Proyecto'}
        </span>

        {/* Stats */}
        <div className="flex items-center gap-2 ml-1">
          <span className="text-xs text-white opacity-70">
            {tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}
          </span>
          {tasks.length > 0 && (
            <span className="text-xs text-white opacity-70">{done}/{tasks.length} terminadas</span>
          )}
          {overdue > 0 && (
            <span className="text-xs font-semibold text-white bg-red-500 px-1.5 py-0.5 rounded-full">
              {overdue} vencida{overdue > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Right: undo/redo + export */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={undo} disabled={!canUndo} title="Deshacer (Ctrl+Z)"
          className="flex items-center justify-center w-7 h-7 rounded text-white opacity-80 hover:opacity-100 hover:bg-white hover:bg-opacity-20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <Undo2 size={13} />
        </button>
        <button onClick={redo} disabled={!canRedo} title="Rehacer (Ctrl+Y)"
          className="flex items-center justify-center w-7 h-7 rounded text-white opacity-80 hover:opacity-100 hover:bg-white hover:bg-opacity-20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <Redo2 size={13} />
        </button>

        <div className="w-px h-4 bg-white opacity-30 mx-1" />

        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-1.5 text-xs font-medium text-white bg-white bg-opacity-20 hover:bg-opacity-30 disabled:opacity-40 px-3 py-1.5 rounded transition-all">
          {exporting
            ? <><Loader2 size={12} className="animate-spin" />{progress}%</>
            : <><Download size={12} />Exportar PDF</>}
        </button>
      </div>
    </div>
  );
}
