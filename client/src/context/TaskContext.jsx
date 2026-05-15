import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const TaskContext = createContext(null);
const getStorageKey = (projectId) => `gantt-tasks-${projectId}`;

const genId = () => Math.random().toString(36).slice(2, 10);

const loadTasks = (projectId) => {
  try { return JSON.parse(localStorage.getItem(getStorageKey(projectId)) ?? '[]'); }
  catch { return []; }
};

const isDescendant = (potentialChildId, ancestorId, tasks) => {
  let cur = tasks.find(t => t.id === potentialChildId);
  while (cur?.parentId) {
    if (cur.parentId === ancestorId) return true;
    cur = tasks.find(t => t.id === cur.parentId);
  }
  return false;
};

export const calcProgress = (taskId, allTasks) => {
  const children = allTasks.filter(t => t.parentId === taskId);
  if (!children.length) return allTasks.find(t => t.id === taskId)?.progress ?? 0;
  const avg = children.reduce((s, c) => s + calcProgress(c.id, allTasks), 0) / children.length;
  return Math.round(avg);
};

const recalcParent = (parentId, tasks) => {
  const parent   = tasks.find(t => t.id === parentId);
  const children = tasks.filter(t => t.parentId === parentId);
  if (!parent || !children.length) return tasks;
  const childMinStart = children.reduce((m, c) => c.start < m ? c.start : m, children[0].start);
  const childMaxEnd   = children.reduce((m, c) => c.end   > m ? c.end   : m, children[0].end);
  const newStart = childMinStart < parent.start ? childMinStart : parent.start;
  const newEnd   = childMaxEnd   > parent.end   ? childMaxEnd   : parent.end;
  if (newStart === parent.start && newEnd === parent.end) return tasks;
  return tasks.map(t => t.id === parentId ? { ...t, start: newStart, end: newEnd } : t);
};

const HISTORY_LIMIT = 50;

export function TaskProvider({ children, projectId }) {
  const [tasks, setTasks] = useState(() => loadTasks(projectId));
  const [hiddenParents, setHiddenParents] = useState(new Set());

  // Undo/redo stacks — stored as ref so they don't cause re-renders
  const past   = useRef([]);  // array of snapshots (arrays of tasks)
  const future = useRef([]);  // array of snapshots

  // Persist to localStorage on every change
  // Reload tasks when switching projects
  useEffect(() => {
    setTasks(loadTasks(projectId));
    // Reset undo/redo on project switch
    past.current   = [];
    future.current = [];
  }, [projectId]);

  // Persist on task changes
  useEffect(() => {
    localStorage.setItem(getStorageKey(projectId), JSON.stringify(tasks));
  }, [tasks, projectId]);

  // Keyboard Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const onKey = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /** Guarda el estado actual en el historial antes de una mutación */
  const snapshot = useCallback((currentTasks) => {
    past.current = [...past.current.slice(-(HISTORY_LIMIT - 1)), currentTasks];
    future.current = []; // nueva acción limpia el futuro
  }, []);

  const undo = useCallback(() => {
    if (!past.current.length) return;
    const prev = past.current[past.current.length - 1];
    past.current = past.current.slice(0, -1);
    setTasks(current => {
      future.current = [current, ...future.current.slice(0, HISTORY_LIMIT - 1)];
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    if (!future.current.length) return;
    const next = future.current[0];
    future.current = future.current.slice(1);
    setTasks(current => {
      past.current = [...past.current.slice(-(HISTORY_LIMIT - 1)), current];
      return next;
    });
  }, []);

  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;

  // ── Mutaciones (todas guardan snapshot antes de cambiar) ────────────────────

  const addTask = useCallback((data) => {
    const today    = new Date().toISOString().split('T')[0];
    const nextWeek = () => { const d = new Date(); d.setDate(d.getDate()+7); return d.toISOString().split('T')[0]; };
    const maxOrder = prev => prev.filter(t => !t.parentId).reduce((m,t) => Math.max(m, t.order ?? 0), 0);
    const task = {
      id:          genId(),
      taskType:    data.taskType    ?? 'task',
      name:        data.name        ?? 'Nueva tarea',
      assignee:    data.assignee    ?? '',
      status:      data.status      ?? 'abierto',
      start:       data.start       ?? today,
      end:         data.end         ?? nextWeek(),
      progress:    data.progress    ?? 0,
      color:       data.color       ?? '#378ADD',
      parentId:    data.parentId    ?? null,
      description: data.description ?? '',
      estimation:  data.estimation  ?? '',
      duration:    data.duration    ?? '',
      priority:    data.priority    ?? 'media',
      deadlineEnabled: data.deadlineEnabled ?? false,
      deadline:    data.deadline    ?? '',
      deps:        data.deps        ?? [],
      order:       data.order       ?? 0,
      createdAt:   new Date().toISOString(),
    };
    setTasks(prev => {
      snapshot(prev);
      task.order = maxOrder(prev) + 1;
      const next = [...prev, task];
      return task.parentId ? recalcParent(task.parentId, next) : next;
    });
    return task;
  }, [snapshot]);

  const updateTask = useCallback((id, changes) => {
    setTasks(prev => {
      snapshot(prev);
      let next = prev.map(t => t.id === id ? { ...t, ...changes } : t);
      const task = next.find(t => t.id === id);
      if (task?.parentId) next = recalcParent(task.parentId, next);
      return next;
    });
  }, [snapshot]);

  const deleteTask = useCallback((id) => {
    setTasks(prev => {
      snapshot(prev);
      const ids = new Set([id]);
      let changed = true;
      while (changed) {
        changed = false;
        prev.forEach(t => { if (t.parentId && ids.has(t.parentId) && !ids.has(t.id)) { ids.add(t.id); changed = true; } });
      }
      return prev.filter(t => !ids.has(t.id));
    });
  }, [snapshot]);

  const nestTask = useCallback((taskId, newParentId) => {
    if (taskId === newParentId) return;
    setTasks(prev => {
      if (isDescendant(newParentId, taskId, prev)) return prev;
      snapshot(prev);
      let next = prev.map(t => t.id === taskId ? { ...t, parentId: newParentId } : t);
      return recalcParent(newParentId, next);
    });
  }, [snapshot]);

  const unnestTask = useCallback((taskId) => {
    setTasks(prev => {
      snapshot(prev);
      return prev.map(t => t.id === taskId ? { ...t, parentId: null } : t);
    });
  }, [snapshot]);

  const toggleParent = useCallback((id) => {
    setHiddenParents(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const reorderTask = useCallback((taskId, beforeId) => {
    setTasks(prev => {
      snapshot(prev);
      const task = prev.find(t => t.id === taskId);
      if (!task) return prev;
      const siblings = prev
        .filter(t => t.parentId === task.parentId && t.id !== taskId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const insertIdx = beforeId ? siblings.findIndex(t => t.id === beforeId) : siblings.length;
      const finalIdx  = insertIdx < 0 ? siblings.length : insertIdx;
      siblings.splice(finalIdx, 0, task);
      return prev.map(t => {
        const newOrder = siblings.findIndex(s => s.id === t.id);
        return newOrder >= 0 ? { ...t, order: newOrder } : t;
      });
    });
  }, [snapshot]);

  const addDependency = useCallback((taskId, depId, toSide = 'start', fromSide = 'end') => {
    if (taskId === depId) return;
    setTasks(prev => {
      snapshot(prev);
      return prev.map(t =>
        t.id === taskId && !t.deps.find(d => d.id === depId)
          ? { ...t, deps: [...t.deps, { id: depId, fromSide, toSide }] }
          : t
      );
    });
  }, [snapshot]);

  const removeDependency = useCallback((taskId, depId) => {
    setTasks(prev => {
      snapshot(prev);
      return prev.map(t =>
        t.id === taskId ? { ...t, deps: t.deps.filter(d => (d.id ?? d) !== depId) } : t
      );
    });
  }, [snapshot]);

  const enrichedTasks = tasks.map(t => ({
    ...t,
    computedProgress: calcProgress(t.id, tasks),
    isParent: tasks.some(c => c.parentId === t.id),
  }));

  return (
    <TaskContext.Provider value={{
      tasks: enrichedTasks,
      hiddenParents,
      canUndo, canRedo, undo, redo,
      addTask, updateTask, deleteTask,
      nestTask, unnestTask, toggleParent,
      reorderTask,
      addDependency, removeDependency,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export const useTasks = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTasks debe usarse dentro de TaskProvider');
  return ctx;
};
