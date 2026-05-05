import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { exportGanttToPDF } from '../utils/exportPDF';
import { useTasks } from '../context/TaskContext';

export default function Toolbar({ viewMode, onViewChange, projectName }) {
  const { tasks } = useTasks();
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = async () => {
    if (!tasks.length) return alert('Agrega tareas antes de exportar.');
    setExporting(true);
    setExportProgress(0);
    try {
      await exportGanttToPDF('gantt-container', projectName, setExportProgress);
    } catch (err) {
      alert('Error al exportar: ' + err.message);
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  const views = ['Day', 'Week', 'Month', 'Year'];

  return (
    <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 gap-4 flex-wrap">
      {/* Título con icono */}
      <div className="flex items-center gap-2">
        <h1 className="text-base font-semibold text-gray-800">{projectName}</h1>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          {tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Selector de vista */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          {views.map(v => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === v
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              {v === 'Day' ? 'Día' : v === 'Week' ? 'Semana' : v === 'Month' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>

        {/* Botón exportar PDF */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {exporting
            ? <><Loader2 size={13} className="animate-spin" /> {exportProgress}%</>
            : <><Download size={13} /> Exportar PDF</>
          }
        </button>
      </div>
    </div>
  );
}
