import { useState, useRef } from 'react';
import { Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { useTasks, calcProgress } from '../context/TaskContext';

const STATUSES = {
  abierto:     { dot: '#9ca3af' },
  en_progreso: { dot: '#3b82f6' },
  terminado:   { dot: '#10b981' },
  cerrado:     { dot: '#374151' },
};

/** Construye árbol con número de fila (1, 1.1, 1.2, 2, …) */
const buildTree = (tasks, parentId = null, prefix = '') =>
  tasks
    .filter(t => t.parentId === parentId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((t, i) => {
      const num = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
      return { ...t, _num: num, children: buildTree(tasks, t.id, num) };
    });

/** Línea indicadora de posición entre filas */
function DropLine({ visible }) {
  return (
    <div style={{
      height: 2, margin: '0 8px', borderRadius: 2,
      background: visible ? '#3b82f6' : 'transparent',
      transition: 'background 0.08s', flexShrink: 0,
    }} />
  );
}

// ─── Fila individual ─────────────────────────────────────────────────────────
function TaskRow({ task, depth, onEdit, draggingId, setDraggingId, dropTarget, setDropTarget }) {
  const { nestTask, tasks } = useTasks();
  const [collapsed, setCollapsed] = useState(false);
  const numRef  = useRef(null);  // zona número  → reordenar
  const nameRef = useRef(null);  // zona nombre  → anidar
  const rowRef  = useRef(null);

  const hasChildren = task.children?.length > 0;
  const progress    = calcProgress(task.id, tasks);
  const status      = STATUSES[task.status] ?? STATUSES.abierto;
  const isDragging  = draggingId === task.id;

  // ── drag source ─────────────────────────────────────────────────────────────
  const onDragStart = (e) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    setDraggingId(task.id);
  };
  const onDragEnd = () => { setDraggingId(null); setDropTarget(null); };

  // ── drag over NUMBER zone → reordenar ───────────────────────────────────────
  const onNumDragOver = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!draggingId || draggingId === task.id) return;
    const rect  = numRef.current.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    setDropTarget({ id: task.id, pos: ratio < 0.5 ? 'before' : 'after', zone: 'num' });
  };

  // ── drag over NAME zone → anidar ────────────────────────────────────────────
  const onNameDragOver = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!draggingId || draggingId === task.id) return;
    setDropTarget({ id: task.id, pos: 'on', zone: 'name' });
  };

  const onDragLeave = (e) => {
    // Solo limpia si realmente sale del row entero
    if (!rowRef.current?.contains(e.relatedTarget)) {
      setDropTarget(null);
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === task.id || !dropTarget) {
      setDropTarget(null); setDraggingId(null); return;
    }
    if (dropTarget.zone === 'name' || dropTarget.pos === 'on') {
      // Anidar
      nestTask(draggedId, task.id);
    } else {
      // Reordenar
      window.dispatchEvent(new CustomEvent('panel-reorder', {
        detail: { draggedId, targetId: task.id, pos: dropTarget.pos }
      }));
    }
    setDropTarget(null); setDraggingId(null);
  };

  const isBefore = dropTarget?.id === task.id && dropTarget?.pos === 'before';
  const isAfter  = dropTarget?.id === task.id && dropTarget?.pos === 'after';
  const isOn     = dropTarget?.id === task.id && dropTarget?.pos === 'on';

  return (
    <>
      <DropLine visible={isBefore} />

      <div
        ref={rowRef}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          display: 'flex', alignItems: 'center',
          paddingRight: 8, paddingTop: 4, paddingBottom: 4,
          paddingLeft: 4 + depth * 16,
          opacity: isDragging ? 0.35 : 1,
          borderRadius: 6, margin: '0 4px',
          border: isOn ? '1px dashed #93c5fd' : '1px solid transparent',
          background: isOn ? '#eff6ff' : 'transparent',
          userSelect: 'none',
        }}
        className="group"
      >
        {/* ── Número de fila (zona reordenar) ── */}
        <div
          ref={numRef}
          onDragOver={onNumDragOver}
          title="Arrastra aquí para reordenar"
          style={{
            minWidth: 36, textAlign: 'right', paddingRight: 8,
            fontSize: 11, color: '#9ca3af', fontVariantNumeric: 'tabular-nums',
            cursor: 'grab', flexShrink: 0,
            background: dropTarget?.id === task.id && dropTarget?.zone === 'num'
              ? '#f0f9ff' : 'transparent',
            borderRadius: 4, padding: '2px 6px 2px 2px',
            fontWeight: 500,
          }}
        >
          {task._num}
        </div>

        {/* ── Expand / dot ── */}
        <button
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
          onClick={e => { e.stopPropagation(); setCollapsed(p => !p); }}
        >
          {hasChildren
            ? collapsed
              ? <ChevronRight size={12} className="text-gray-400" />
              : <ChevronDown  size={12} className="text-gray-400" />
            : <span className="w-1.5 h-1.5 rounded-full" style={{ background: task.color }} />
          }
        </button>

        {/* ── Nombre (zona anidar) ── */}
        <div
          ref={nameRef}
          onDragOver={onNameDragOver}
          onClick={() => onEdit(task)}
          title="Arrastra una tarea aquí para asignarla"
          style={{
            flex: 1, minWidth: 0, cursor: 'pointer',
            padding: '2px 4px', borderRadius: 4,
            background: isOn ? 'transparent' : 'transparent',
          }}
        >
          <span
            style={{
              display: 'block', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', fontSize: 13, color: '#374151',
              fontWeight: hasChildren ? 600 : 400,
            }}
          >
            {task.name}
          </span>
        </div>

        {/* Asignado */}
        {task.assignee && (
          <span className="text-xs text-gray-400 truncate max-w-[52px] hidden group-hover:block flex-shrink-0 ml-1">
            {task.assignee}
          </span>
        )}

        {/* Status dot */}
        <span className="w-2 h-2 rounded-full flex-shrink-0 ml-1"
          style={{ background: status.dot }} title={task.status} />

        {/* Progress */}
        <span className="text-xs text-gray-400 w-7 text-right flex-shrink-0 ml-1">
          {progress}%
        </span>
      </div>

      <DropLine visible={isAfter} />

      {/* Children */}
      {!collapsed && task.children?.map(child => (
        <TaskRow
          key={child.id}
          task={child}
          depth={depth + 1}
          onEdit={onEdit}
          draggingId={draggingId}
          setDraggingId={setDraggingId}
          dropTarget={dropTarget}
          setDropTarget={setDropTarget}
        />
      ))}
    </>
  );
}

// ─── Panel principal ─────────────────────────────────────────────────────────
export default function TaskPanel({ onEdit }) {
  const { tasks, unnestTask, addTask, reorderTask } = useTasks();
  const [draggingId, setDraggingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [adding, setAdding]         = useState(null); // null | 'task' | 'milestone'
  const [newName, setNewName]       = useState('');

  // Escucha eventos de reordenamiento desde TaskRow
  useState(() => {
    const handler = (e) => {
      const { draggedId, targetId, pos } = e.detail;
      if (pos === 'before') {
        reorderTask(draggedId, targetId);
      } else {
        // after: insertar después del target
        const dragged  = tasks.find(t => t.id === draggedId);
        const siblings = tasks
          .filter(t => t.parentId === (dragged?.parentId ?? null) && t.id !== draggedId)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const idx    = siblings.findIndex(t => t.id === targetId);
        const nextId = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1].id : null;
        reorderTask(draggedId, nextId);
      }
    };
    window.addEventListener('panel-reorder', handler);
    return () => window.removeEventListener('panel-reorder', handler);
  });

  const onRootDrop = (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) unnestTask(id);
    setDraggingId(null); setDropTarget(null);
  };

  const confirmAdd = () => {
    const name = newName.trim();
    if (name) {
      const today = new Date().toISOString().split('T')[0];
      const end   = new Date(); end.setDate(end.getDate() + 7);
      addTask({ name, start: today, end: adding === 'milestone' ? today : end.toISOString().split('T')[0], taskType: adding ?? 'task' });
    }
    setAdding(null); setNewName('');
  };
  const cancelAdd = () => { setAdding(null); setNewName(''); };

  const tree = buildTree(tasks);

  return (
    <aside className="w-72 min-w-[288px] bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400 flex-1 min-w-0">
          <span className="font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0">#</span>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0">Tarea</span>
          <span className="text-gray-300 ml-auto">Estado</span>
        </div>
        <button onClick={() => { setAdding('milestone'); setNewName(''); }}
          className="ml-3 flex-shrink-0 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors">
          + Hito
        </button>
        <button onClick={() => { setAdding('task'); setNewName(''); }}
          className="ml-2 flex-shrink-0 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors">
          + Tarea
        </button>
      </div>

      {/* Hint */}
      <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
        <p className="text-xs text-gray-400">
          Arrastra al <span className="font-medium text-gray-500">#</span> para reordenar ·
          al <span className="font-medium text-gray-500">nombre</span> para asignar
        </p>
      </div>

      {/* Lista */}
      <div
        className="flex-1 overflow-y-auto py-1"
        onDragOver={e => e.preventDefault()}
        onDrop={onRootDrop}
      >
        {tree.length === 0 && !adding ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xl">+</div>
            <p className="text-sm text-gray-400 font-medium">Sin tareas</p>
            <p className="text-xs text-gray-300">Haz clic en "Añadir" para comenzar</p>
          </div>
        ) : (
          <>
            {tree.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                depth={0}
                onEdit={onEdit}
                draggingId={draggingId}
                setDraggingId={setDraggingId}
                dropTarget={dropTarget}
                setDropTarget={setDropTarget}
              />
            ))}

            {adding && (
              <div className="flex items-center gap-1.5 px-3 py-2 mx-1 rounded-lg mt-1"
                style={{ border: adding === 'milestone' ? '1px solid #8b5cf6' : '1px solid #93c5fd', background: adding === 'milestone' ? '#f5f3ff' : '#eff6ff' }}>
                <span style={{ fontSize:10, color: adding === 'milestone' ? '#7c3aed' : '#3b82f6', fontWeight:700, flexShrink:0, letterSpacing:'0.05em', textTransform:'uppercase' }}>
                  {adding === 'milestone' ? 'Hito' : 'Tarea'}
                </span>
                <input autoFocus type="text" value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter') confirmAdd(); if(e.key==='Escape') cancelAdd(); }}
                  placeholder={adding === "milestone" ? "Nombre del hito..." : "Nombre de la tarea..."}
                  className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400 min-w-0"
                />
                <button onClick={confirmAdd}
                  className="w-6 h-6 rounded flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white flex-shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button onClick={cancelAdd}
                  className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {tasks.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between">
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
