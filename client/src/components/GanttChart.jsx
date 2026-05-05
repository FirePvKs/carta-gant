import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { ClipboardList } from 'lucide-react';
import { useTasks } from '../context/TaskContext';

const VIEW_MAP = {
  Day: ViewMode.Day,
  Week: ViewMode.Week,
  Month: ViewMode.Month,
  Year: ViewMode.Year,
};

/* Lista personalizada: solo nombre + punto de color (sin columnas From/To) */
const TaskListHeader = ({ headerHeight, rowWidth, fontFamily, fontSize }) => (
  <div style={{ display:'flex', alignItems:'center', height:headerHeight, width:rowWidth, fontFamily, fontSize, fontWeight:600, color:'#6b7280', background:'#f9fafb', borderBottom:'1px solid #e5e7eb', borderRight:'1px solid #e5e7eb', paddingLeft:16, userSelect:'none' }}>
    Tarea
  </div>
);

const TaskListTable = ({ tasks: ganttList, rowHeight, rowWidth, fontFamily, fontSize, onExpanderClick }) => {
  const { tasks: rawTasks } = useTasks();
  return (
    <div style={{ fontFamily, fontSize, background:'#ffffff', borderRight:'1px solid #e5e7eb' }}>
      {ganttList.map((task, i) => {
        const raw = rawTasks.find(t => t.id === task.id);
        const isProject = task.type === 'project';
        return (
          <div key={task.id} style={{ display:'flex', alignItems:'center', height:rowHeight, width:rowWidth, paddingLeft:12, paddingRight:8, borderBottom:'1px solid #f3f4f6', background: i%2===0 ? '#ffffff' : '#f9fafb', gap:6 }}>
            {isProject ? (
              <button
                onClick={() => onExpanderClick(task)}
                style={{ background:'none', border:'none', cursor:'pointer', padding:2, color:'#9ca3af', display:'flex', alignItems:'center' }}
              >
                {task.hideChildren ? '▶' : '▼'}
              </button>
            ) : (
              <span style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background: raw?.color ?? '#378ADD' }} />
            )}
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, color:'#374151', fontSize:13, fontWeight: isProject ? 600 : 400 }}>
              {task.name}
            </span>
            <span style={{ color:'#9ca3af', fontSize:11, flexShrink:0 }}>{Math.round(task.progress)}%</span>
          </div>
        );
      })}
    </div>
  );
};

export default function GanttChart({ viewMode, onEditTask }) {
  const { ganttTasks, tasks, toggleParent } = useTasks();

  if (!ganttTasks.length) return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3 text-gray-300">
        <ClipboardList size={44} strokeWidth={1.2} />
        <p className="text-sm font-medium text-gray-500">Sin tareas</p>
        <p className="text-xs text-gray-400">Agrega tu primera tarea en el panel izquierdo</p>
      </div>
    </div>
  );

  /** Doble clic en barra → abre modal de edición */
  const handleDoubleClick = (ganttTask) => {
    const raw = tasks.find(t => t.id === ganttTask.id);
    if (raw) onEditTask(raw);
  };

  /** Clic en expander de proyecto → colapsa/expande */
  const handleExpanderClick = (ganttTask) => {
    toggleParent(ganttTask.id);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div id="gantt-container" className="flex-1 overflow-auto" style={{ background:'#ffffff' }}>
        <Gantt
          tasks={ganttTasks}
          viewMode={VIEW_MAP[viewMode] ?? ViewMode.Week}
          onDoubleClick={handleDoubleClick}
          onExpanderClick={handleExpanderClick}
          onSelect={() => {}}
          TaskListHeader={TaskListHeader}
          TaskListTable={TaskListTable}
          listCellWidth="190px"
          columnWidth={viewMode==='Day' ? 40 : viewMode==='Month' ? 220 : 120}
          ganttHeight={Math.max(ganttTasks.length * 50 + 60, 300)}
          rowHeight={48}
          barCornerRadius={4}
          handleWidth={6}
          fontSize="13px"
          todayColor="rgba(59,130,246,0.08)"
        />
      </div>
    </div>
  );
}
