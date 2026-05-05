import { useState } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { Trash2 } from 'lucide-react';
import { useTasks } from '../context/TaskContext';

const VIEW_MAP = {
  Day: ViewMode.Day,
  Week: ViewMode.Week,
  Month: ViewMode.Month,
  Year: ViewMode.Year,
};

const TaskListHeader = ({ headerHeight, rowWidth, fontFamily, fontSize }) => (
  <div style={{ display:'flex', alignItems:'center', height:headerHeight, width:rowWidth, fontFamily, fontSize, fontWeight:600, color:'#6b7280', background:'#f9fafb', borderBottom:'1px solid #e5e7eb', borderRight:'1px solid #e5e7eb', paddingLeft:16, userSelect:'none' }}>
    Tarea
  </div>
);

const TaskListTable = ({ tasks, rowHeight, rowWidth, fontFamily, fontSize }) => (
  <div style={{ fontFamily, fontSize, background:'#ffffff', borderRight:'1px solid #e5e7eb' }}>
    {tasks.map((task, i) => (
      <div key={task.id} style={{ display:'flex', alignItems:'center', height:rowHeight, width:rowWidth, paddingLeft:16, paddingRight:8, borderBottom:'1px solid #f3f4f6', background: i%2===0 ? '#ffffff' : '#f9fafb', gap:8 }}>
        <span style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background: task.styles?.progressColor ?? '#378ADD' }} />
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, color:'#374151', fontSize:13 }}>{task.name}</span>
        <span style={{ color:'#9ca3af', fontSize:11, flexShrink:0 }}>{Math.round(task.progress)}%</span>
      </div>
    ))}
  </div>
);

export default function GanttChart({ viewMode }) {
  const { ganttTasks, tasks, loading, error, removeTask, updateProgress } = useTasks();
  const [selectedTask, setSelectedTask] = useState(null);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Cargando tareas…</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-sm">
        <p className="text-red-600 font-medium text-sm mb-1">Error de conexión</p>
        <p className="text-red-400 text-xs">{error}</p>
        <p className="text-xs text-gray-400 mt-3">Asegúrate de que el servidor Express esté corriendo en el puerto 3001.</p>
      </div>
    </div>
  );

  if (!ganttTasks.length) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-300">
        <p className="text-sm font-medium text-gray-500">Sin tareas todavía</p>
        <p className="text-xs text-gray-400">Agrega tu primera tarea en el panel izquierdo</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div id="gantt-container" className="flex-1 overflow-auto" style={{ background:'#ffffff' }}>
        <Gantt
          tasks={ganttTasks}
          viewMode={VIEW_MAP[viewMode] ?? ViewMode.Week}
          onDateChange={updateProgress}
          onProgressChange={updateProgress}
          onSelect={t => setSelectedTask(t)}
          onDoubleClick={() => {}}
          TaskListHeader={TaskListHeader}
          TaskListTable={TaskListTable}
          listCellWidth="180px"
          columnWidth={viewMode==='Day' ? 40 : viewMode==='Month' ? 220 : 120}
          ganttHeight={Math.max(tasks.length * 50 + 60, 300)}
          rowHeight={48}
          barCornerRadius={4}
          handleWidth={6}
          fontSize="13px"
          todayColor="rgba(59,130,246,0.08)"
        />
      </div>
      <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 flex gap-2 flex-wrap">
        {tasks.map(t => (
          <div key={t.id}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${selectedTask?.id===t.id ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
            style={{ background:t.color+'18', borderColor:t.color+'40', color:t.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:t.color }} />
            <span className="truncate max-w-[110px]">{t.name}</span>
            <span className="opacity-60">{t.progress}%</span>
            <button onClick={() => removeTask(t.id)} className="opacity-40 hover:opacity-100 ml-0.5 transition-opacity" title="Eliminar">
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
