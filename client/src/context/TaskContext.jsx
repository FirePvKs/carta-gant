import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TaskContext = createContext(null);
const STORAGE_KEY = 'gantt-tasks-v2';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Genera un id corto único */
const genId = () => Math.random().toString(36).slice(2, 10);

/** Carga tareas desde localStorage */
const loadTasks = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
  catch { return []; }
};

/** Verifica si `potentialChild` es descendiente de `ancestorId` */
const isDescendant = (potentialChildId, ancestorId, tasks) => {
  let cur = tasks.find(t => t.id === potentialChildId);
  while (cur?.parentId) {
    if (cur.parentId === ancestorId) return true;
    cur = tasks.find(t => t.id === cur.parentId);
  }
  return false;
};

/** Calcula el progreso de una tarea (promedio de hijos si los tiene) */
export const calcProgress = (taskId, allTasks) => {
  const children = allTasks.filter(t => t.parentId === taskId);
  if (!children.length) return allTasks.find(t => t.id === taskId)?.progress ?? 0;
  const avg = children.reduce((s, c) => s + calcProgress(c.id, allTasks), 0) / children.length;
  return Math.round(avg);
};

/** Ordena tareas para gantt-task-react: padres antes que hijos */
const sortForGantt = (tasks) => {
  const result = [];
  const add = (task) => {
    result.push(task);
    tasks.filter(t => t.parentId === task.id).forEach(add);
  };
  tasks.filter(t => !t.parentId).forEach(add);
  return result;
};

// ── Provider ──────────────────────────────────────────────────────────────────

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState(loadTasks);
  const [hiddenParents, setHiddenParents] = useState(new Set());

  // Persiste en localStorage en cada cambio
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  /** Agrega tarea nueva */
  const addTask = useCallback((data) => {
    const task = {
      id: genId(),
      name: data.name ?? 'Nueva tarea',
      assignee: data.assignee ?? '',
      status: data.status ?? 'abierto',
      start: data.start ?? new Date().toISOString().split('T')[0],
      end: data.end ?? (() => { const d = new Date(); d.setDate(d.getDate()+7); return d.toISOString().split('T')[0]; })(),
      progress: data.progress ?? 0,
      color: data.color ?? '#378ADD',
      parentId: data.parentId ?? null,
      description: data.description ?? '',
      estimation: data.estimation ?? '',
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [...prev, task]);
    return task;
  }, []);

  /** Actualiza campos de una tarea */
  const updateTask = useCallback((id, changes) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
  }, []);

  /** Elimina tarea y sus descendientes */
  const deleteTask = useCallback((id) => {
    setTasks(prev => {
      const idsToDelete = new Set([id]);
      let changed = true;
      while (changed) {
        changed = false;
        prev.forEach(t => {
          if (t.parentId && idsToDelete.has(t.parentId) && !idsToDelete.has(t.id)) {
            idsToDelete.add(t.id); changed = true;
          }
        });
      }
      return prev.filter(t => !idsToDelete.has(t.id));
    });
  }, []);

  /** Convierte una tarea en hija de otra (drag-to-nest) */
  const nestTask = useCallback((taskId, newParentId) => {
    if (taskId === newParentId) return;
    setTasks(prev => {
      if (isDescendant(newParentId, taskId, prev)) return prev;
      return prev.map(t => t.id === taskId ? { ...t, parentId: newParentId } : t);
    });
  }, []);

  /** Saca una tarea de su padre (la vuelve raíz) */
  const unnestTask = useCallback((taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, parentId: null } : t));
  }, []);

  /** Alterna visibilidad de hijos en el Gantt */
  const toggleParent = useCallback((id) => {
    setHiddenParents(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  /** Tareas enriquecidas con progreso calculado */
  const enrichedTasks = tasks.map(t => ({
    ...t,
    computedProgress: calcProgress(t.id, tasks),
    isParent: tasks.some(c => c.parentId === t.id),
  }));

  /** Array listo para gantt-task-react */
  const ganttTasks = sortForGantt(enrichedTasks)
    .filter(t => {
      // Oculta hijos de padres colapsados
      if (!t.parentId) return true;
      let cur = enrichedTasks.find(x => x.id === t.parentId);
      while (cur) {
        if (hiddenParents.has(cur.id)) return false;
        cur = cur.parentId ? enrichedTasks.find(x => x.id === cur.parentId) : null;
      }
      return true;
    })
    .map(t => ({
      id: t.id,
      name: t.name,
      type: t.isParent ? 'project' : 'task',
      start: new Date(t.start + 'T00:00:00'),
      end: new Date(t.end + 'T23:59:59'),
      progress: t.computedProgress,
      project: t.parentId ?? undefined,
      hideChildren: hiddenParents.has(t.id),
      styles: {
        progressColor: t.color,
        progressSelectedColor: t.color,
        backgroundColor: t.color + '33',
        backgroundSelectedColor: t.color + '55',
      },
    }));

  return (
    <TaskContext.Provider value={{
      tasks: enrichedTasks,
      ganttTasks,
      hiddenParents,
      addTask, updateTask, deleteTask,
      nestTask, unnestTask, toggleParent,
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
