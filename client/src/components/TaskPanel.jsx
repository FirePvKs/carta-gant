import { useState } from 'react';
import { Plus, ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { useTasks, calcProgress } from '../context/TaskContext';

const STATUSES = {
  abierto:     { label: 'Abierto',      dot: '#9ca3af' },
  en_progreso: { label: 'En progreso',  dot: '#3b82f6' },
  terminado:   { label: 'Terminado',    dot: '#10b981' },
  cerrado:     { label: 'Cerrado',      dot: '#374151' },
};

/** Construye árbol de tareas desde lista plana */
const buildTree = (tasks, parentId = null) =>
  tasks.filter(t => t.parentId === parentId)
       .map(t => ({ ...t, children: buildTree(tasks, t.id) }));

/** Fila individual de tarea en el panel */
function TaskRow({ task, depth = 0, onEdit, dragState, setDragState }) {
  const { nestTask, unnestTask, tasks } = useTasks();
  const [collapsed, setCollapsed] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const hasChildren = task.children?.length > 0;
  const progress = calcProgress(task.id, tasks);
  const status = STATUSES[task.status] ?? STATUSES.abierto;

  const handleDragStart = (e) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    setDragState(task.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragState && dragState !== task.id) setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== task.id) nestTask(draggedId, task.id);
    setIsDragOver(false);
    setDragState(null);
  };

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={() => setDragState(null)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="group flex items-center gap-1 px-2 py-2 cursor-pointer transition-colors rounded-lg mx-1"
        style={{
          paddingLeft: `${8 + depth * 18}px`,
          background: isDragOver ? '#eff6ff' : 'transparent',
          border: isDragOver ? '1px dashed #93c5fd' : '1px solid transparent',
          opacity: dragState === task.id ? 0.4 : 1,
        }}
        onClick={() => onEdit(task)}
      >
        {/* Drag handle */}
        <GripVertical size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 flex-shrink-0 cursor-grab" />

        {/* Expand/collapse */}
        <button
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
          onClick={e => { e.stopPropagation(); setCollapsed(p => !p); }}
        >
          {hasChildren
            ? collapsed
              ? <ChevronRight size={12} className="text-gray-400" />
              : <ChevronDown size={12} className="text-gray-400" />
            : <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: task.color }} />
          }
        </button>

        {/* Nombre */}
        <span className="flex-1 text-sm text-gray-700 truncate min-w-0"
          style={{ fontWeight: hasChildren ? 500 : 400 }}>
          {task.name}
        </span>

        {/* Asignado */}
        {task.assignee && (
          <span className="text-xs text-gray-400 truncate max-w-[60px] hidden group-hover:block">
            {task.assignee}
          </span>
        )}

        {/* Estado dot */}
        <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ background: status.dot }} title={status.label} />

        {/* Progreso % */}
        <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">{progress}%</span>
      </div>

      {/* Hijos */}
      {!collapsed && task.children?.map(child => (
        <TaskRow
          key={child.id}
          task={child}
          depth={depth + 1}
          onEdit={onEdit}
          dragState={dragState}
          setDragState={setDragState}
        />
      ))}
    </>
  );
}

/** Panel lateral izquierdo principal */
export default function TaskPanel({ onEdit }) {
  const { tasks, unnestTask } = useTasks();
  const [dragState, setDragState] = useState(null);
  const [isDragOverRoot, setIsDragOverRoot] = useState(false);

  const tree = buildTree(tasks);

  // Drop en zona vacía = sacar del padre
  const handleRootDrop = (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) unnestTask(id);
    setIsDragOverRoot(false);
    setDragState(null);
  };

  return (
    <aside className="w-72 min-w-[288px] bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0">Tarea</span>
          <span className="text-xs text-gray-300">|</span>
          <span className="text-xs text-gray-400 truncate">Asignado</span>
          <span className="text-xs text-gray-300">|</span>
          <span className="text-xs text-gray-400 flex-shrink-0">Estado</span>
        </div>
        <button
          onClick={() => onEdit({})}
          className="ml-2 flex-shrink-0 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
        >
          <Plus size={13} />
          Añadir
        </button>
      </div>

      {/* Lista de tareas */}
      <div
        className="flex-1 overflow-y-auto py-1"
        onDragOver={e => { e.preventDefault(); setIsDragOverRoot(true); }}
        onDragLeave={() => setIsDragOverRoot(false)}
        onDrop={handleRootDrop}
        style={{ background: isDragOverRoot && dragState ? '#fafafa' : 'transparent' }}
      >
        {tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xl">+</div>
            <p className="text-sm text-gray-400 font-medium">Sin tareas</p>
            <p className="text-xs text-gray-300">Haz clic en "Añadir" para crear tu primera tarea</p>
          </div>
        ) : (
          tree.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onEdit={onEdit}
              dragState={dragState}
              setDragState={setDragState}
            />
          ))
        )}
      </div>

      {/* Footer: estadísticas */}
      {tasks.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-gray-400">{tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}</span>
          <div className="flex gap-2">
            {Object.entries(STATUSES).map(([key, s]) => {
              const count = tasks.filter(t => t.status === key).length;
              if (!count) return null;
              return (
                <span key={key} className="flex items-center gap-1 text-xs text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                  {count}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
