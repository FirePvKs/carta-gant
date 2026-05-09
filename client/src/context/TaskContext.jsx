import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const TaskContext = createContext(null);
const STORAGE_KEY = 'gantt-tasks-v3';

const genId = () => Math.random().toString(36).slice(2, 10);

const loadTasks = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
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

/** Solo expande el padre si un hijo se sale de sus límites. Nunca lo encoge. */
const recalcParent = (parentId, tasks) => {
  const parent   = tasks.find(t => t.id === parentId);
  const children = tasks.filter(t => t.parentId === parentId);
  if (!parent || !children.length) return tasks;

  const childMinStart = children.reduce((m, c) => c.start < m ? c.start : m, children[0].start);
  const childMaxEnd   = children.reduce((m, c) => c.end   > m ? c.end   : m, children[0].end);

  // Solo actualiza si un hijo sobrepasa el límite actual del padre
  const newStart = childMinStart < parent.start ? childMinStart : parent.start;
  const newEnd   = childMaxEnd   > parent.end   ? childMaxEnd   : parent.end;

  if (newStart === parent.start && newEnd === parent.end) return tasks;
  return tasks.map(t => t.id === parentId ? { ...t, start: newStart, end: newEnd } : t);
};

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState(loadTasks);
  const [hiddenParents, setHiddenParents] = useState(new Set());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const addTask = useCallback((data) => {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = () => { const d = new Date(); d.setDate(d.getDate()+7); return d.toISOString().split('T')[0]; };
    const maxOrder = prev => prev.filter(t => !t.parentId).reduce((m,t) => Math.max(m, t.order ?? 0), 0);
    const task = {
      id: genId(),
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
      deps:        data.deps        ?? [], // IDs de tareas que deben terminar antes
      order:       data.order       ?? 0,
      createdAt:   new Date().toISOString(),
    };
    setTasks(prev => {
      task.order = maxOrder(prev) + 1;
      const next = [...prev, task];
      return task.parentId ? recalcParent(task.parentId, next) : next;
    });
    return task;
  }, []);

  const updateTask = useCallback((id, changes) => {
    setTasks(prev => {
      let next = prev.map(t => t.id === id ? { ...t, ...changes } : t);
      const task = next.find(t => t.id === id);
      // Auto-ajusta el padre si este task tiene parentId
      if (task?.parentId) next = recalcParent(task.parentId, next);
      return next;
    });
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks(prev => {
      const ids = new Set([id]);
      let changed = true;
      while (changed) {
        changed = false;
        prev.forEach(t => { if (t.parentId && ids.has(t.parentId) && !ids.has(t.id)) { ids.add(t.id); changed = true; } });
      }
      return prev.filter(t => !ids.has(t.id));
    });
  }, []);

  const nestTask = useCallback((taskId, newParentId) => {
    if (taskId === newParentId) return;
    setTasks(prev => {
      if (isDescendant(newParentId, taskId, prev)) return prev;
      let next = prev.map(t => t.id === taskId ? { ...t, parentId: newParentId } : t);
      next = recalcParent(newParentId, next);
      return next;
    });
  }, []);

  const unnestTask = useCallback((taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, parentId: null } : t));
  }, []);

  /** Reordena: mueve taskId para que quede ANTES de beforeId (o al final si beforeId es null) */
  const reorderTask = useCallback((taskId, beforeId) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (!task) return prev;
      // Solo reordena tareas del mismo nivel (mismo parentId)
      const siblings = prev
        .filter(t => t.parentId === task.parentId && t.id !== taskId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const insertIdx = beforeId
        ? siblings.findIndex(t => t.id === beforeId)
        : siblings.length;
      const finalIdx = insertIdx < 0 ? siblings.length : insertIdx;
      siblings.splice(finalIdx, 0, task);
      // Reasigna orders consecutivos
      const updated = prev.map(t => {
        const newOrder = siblings.findIndex(s => s.id === t.id);
        return newOrder >= 0 ? { ...t, order: newOrder } : t;
      });
      return updated;
    });
  }, []);

  const toggleParent = useCallback((id) => {
    setHiddenParents(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  /** Agrega dependencia: taskId depende de depId (depId debe terminar antes) */
  const addDependency = useCallback((taskId, depId) => {
    if (taskId === depId) return;
    setTasks(prev => prev.map(t =>
      t.id === taskId && !t.deps.includes(depId)
        ? { ...t, deps: [...t.deps, depId] }
        : t
    ));
  }, []);

  /** Elimina dependencia */
  const removeDependency = useCallback((taskId, depId) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, deps: t.deps.filter(d => d !== depId) } : t
    ));
  }, []);

  const enrichedTasks = tasks.map(t => ({
    ...t,
    computedProgress: calcProgress(t.id, tasks),
    isParent: tasks.some(c => c.parentId === t.id),
  }));

  return (
    <TaskContext.Provider value={{
      tasks: enrichedTasks,
      hiddenParents,
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
