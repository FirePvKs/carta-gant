import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { exportGanttToPDF } from '../utils/exportPDF';
import { useTasks } from '../context/TaskContext';

const VIEWS = [
  { key: 'Day', label: 'Día' },
  { key: 'Week', label: 'Semana' },
  { key: 'Month', label: 'Mes' },
  { key: 'Year', label: 'Año' },
];

export default function Toolbar({ viewMode, onViewChange }) {
  const { tasks } = useTasks();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    if (!tasks.length) return alert('Agrega tareas antes de exportar.');
    setExporting(true);
    try {
      await exportGanttToPDF('gantt-container', 'Mi Proyecto Gantt', setProgress);
    } catch (err) {
      alert('Error al exportar: ' + err.message);
    } finally {
      setExporting(false); setProgress(0);
    }
  };

  const done = tasks.filter(t => t.status === 'terminado').length;
  const total = tasks.length;

  return (
    <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-gray-700">Mi Proyecto Gantt</h1>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          {total} {total === 1 ? 'tarea' : 'tareas'}
        </span>
        {total > 0 && (
          <span className="text-xs text-emerald-600 font-medium">{done}/{total} terminadas</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => onViewChange(v.key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === v.key ? 'bg-blue-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
              {v.label}
            </button>
          ))}
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors">
          {exporting
            ? <><Loader2 size={13} className="animate-spin" /> {progress}%</>
            : <><Download size={13} /> Exportar PDF</>
          }
        </button>
      </div>
    </div>
  );
}
