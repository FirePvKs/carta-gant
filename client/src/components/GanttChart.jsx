import { useRef, useEffect } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { ClipboardList } from 'lucide-react';
import { useTasks } from '../context/TaskContext';

const VIEW_MAP = {
  Day:   ViewMode.Day,
  Week:  ViewMode.Week,
  Month: ViewMode.Month,
  Year:  ViewMode.Year,
};

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
        const isParent = raw?.isParent ?? false;
        return (
          <div key={task.id} style={{ display:'flex', alignItems:'center', height:rowHeight, width:rowWidth, paddingLeft:12, paddingRight:8, borderBottom:'1px solid #f3f4f6', background:i%2===0?'#ffffff':'#f9fafb', gap:6 }}>
            {isParent
              ? <button onClick={() => onExpanderClick(task)} style={{ background:'none', border:'none', cursor:'pointer', padding:2, color:'#9ca3af', flexShrink:0 }}>{task.hideChildren?'▶':'▼'}</button>
              : <span style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:raw?.color??'#378ADD' }} />
            }
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, color:'#374151', fontSize:13, fontWeight:isParent?600:400 }}>{task.name}</span>
            <span style={{ color:'#9ca3af', fontSize:11, flexShrink:0 }}>{Math.round(task.progress)}%</span>
          </div>
        );
      })}
    </div>
  );
};

/** Detecta si el elemento es una barra del Gantt o su handle */
const isBarEl = (el) => {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase() ?? '';
  const cls = el.getAttribute?.('class') ?? '';
  return (tag === 'rect' || tag === 'text' || tag === 'path') && cls.match(/bar|handle|progress/i);
};

export default function GanttChart({ viewMode, onEditTask }) {
  const { ganttTasks, tasks, toggleParent, updateTask } = useTasks();
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let active = false;
    let sx = 0, sy = 0, sl = 0, st = 0;

    const down = (e) => {
      // Solo clic izquierdo dentro de nuestro contenedor
      if (e.button !== 0 || !el.contains(e.target)) return;
      // No interferir con las barras
      if (isBarEl(e.target)) return;

      active = true;
      sx = e.clientX;
      sy = e.clientY;
      sl = el.scrollLeft;
      st = el.scrollTop;
      document.body.style.cursor = 'grabbing';
    };

    const move = (e) => {
      if (!active) return;
      el.scrollLeft = sl - (e.clientX - sx);
      el.scrollTop  = st - (e.clientY - sy);
    };

    const up = () => {
      if (!active) return;
      active = false;
      document.body.style.cursor = '';
    };

    // Capture: true → intercepta ANTES que cualquier handler del SVG
    document.addEventListener('mousedown', down, { capture: true });
    document.addEventListener('mousemove', move, { capture: true });
    document.addEventListener('mouseup',   up,   { capture: true });

    return () => {
      document.removeEventListener('mousedown', down, { capture: true });
      document.removeEventListener('mousemove', move, { capture: true });
      document.removeEventListener('mouseup',   up,   { capture: true });
    };
  }, []);

  const handleDateChange = (updated, children) => {
    const fmt = d => (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0];
    updateTask(updated.id, { start: fmt(updated.start), end: fmt(updated.end) });
    children?.forEach(c => updateTask(c.id, { start: fmt(c.start), end: fmt(c.end) }));
  };

  const handleDoubleClick = (ganttTask) => {
    const raw = tasks.find(t => t.id === ganttTask.id);
    if (raw) onEditTask(raw);
  };

  if (!ganttTasks.length) return (
    <div className="flex-1 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3 text-gray-300">
        <ClipboardList size={44} strokeWidth={1.2} />
        <p className="text-sm font-medium text-gray-500">Sin tareas</p>
        <p className="text-xs text-gray-400">Agrega tu primera tarea en el panel izquierdo</p>
      </div>
    </div>
  );

  const colWidth = viewMode === 'Day' ? 40 : viewMode === 'Month' ? 200 : 120;

  return (
    <div
      ref={scrollRef}
      id="gantt-container"
      className="flex-1 bg-white"
      style={{ overflow:'auto', cursor:'grab', userSelect:'none' }}
    >
      <Gantt
        tasks={ganttTasks}
        viewMode={VIEW_MAP[viewMode] ?? ViewMode.Week}
        onDateChange={handleDateChange}
        onDoubleClick={handleDoubleClick}
        onExpanderClick={(t) => toggleParent(t.id)}
        onSelect={() => {}}
        TaskListHeader={TaskListHeader}
        TaskListTable={TaskListTable}
        listCellWidth="190px"
        columnWidth={colWidth}
        ganttHeight={Math.max(ganttTasks.length * 50 + 80, 400)}
        rowHeight={50}
        barCornerRadius={4}
        handleWidth={10}
        fontSize="13px"
        todayColor="rgba(59,130,246,0.07)"
        arrowColor="#94a3b8"
        arrowIndent={20}
      />
    </div>
  );
}
