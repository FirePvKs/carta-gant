import { useState } from 'react';
import { Download, Loader2, Undo2, Redo2 } from 'lucide-react';
import { exportGanttToPDF } from '../utils/exportPDF';
import { useTasks } from '../context/TaskContext';

export default function Toolbar() {
  const { tasks, canUndo, canRedo, undo, redo } = useTasks();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress]   = useState(0);

  const handleExport = async () => {
    if (!tasks.length) return alert('Agrega tareas antes de exportar.');
    setExporting(true);
    try { await exportGanttToPDF('gantt-container', 'Mi Proyecto Gantt', setProgress); }
    catch (err) { alert('Error: ' + err.message); }
    finally { setExporting(false); setProgress(0); }
  };

  const done = tasks.filter(t => t.status === 'terminado').length;

  return (
    <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 gap-4 flex-wrap">
      {/* Left: title + stats */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-gray-700">Mi Proyecto Gantt</h1>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          {tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}
        </span>
        {tasks.length > 0 && (
          <span className="text-xs text-emerald-600 font-medium">{done}/{tasks.length} terminadas</span>
        )}
      </div>

      {/* Right: undo/redo + export */}
      <div className="flex items-center gap-2">
        {/* Undo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Deshacer (Ctrl+Z)"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <Undo2 size={14} />
        </button>

        {/* Redo */}
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Rehacer (Ctrl+Y)"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <Redo2 size={14} />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Export PDF */}
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors">
          {exporting
            ? <><Loader2 size={13} className="animate-spin" />{progress}%</>
            : <><Download size={13} />Exportar PDF</>}
        </button>
      </div>
    </div>
  );
}
