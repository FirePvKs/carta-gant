import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TaskContext = createContext(null);

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /** Carga las tareas desde la API al montar el árbol */
  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(data => { setTasks(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  /** Transforma las tareas al formato que espera gantt-task-react */
  const ganttTasks = tasks.map(t => ({
    id: t.id,
    name: t.name,
    start: new Date(t.start + 'T00:00:00'),
    end: new Date(t.end + 'T23:59:59'),
    progress: t.progress,
    styles: {
      progressColor: t.color,
      progressSelectedColor: t.color,
      backgroundColor: t.color + '33',
      backgroundSelectedColor: t.color + '55',
    },
    type: 'task',
  }));

  /** Agrega una tarea nueva via POST */
  const addTask = useCallback(async (taskData) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    if (!res.ok) throw new Error('Error al crear tarea');
    const saved = await res.json();
    setTasks(prev => [...prev, saved]);
    return saved;
  }, []);

  /** Elimina una tarea por ID via DELETE */
  const removeTask = useCallback(async (id) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  /** Actualiza el progreso de una tarea desde el Gantt */
  const updateProgress = useCallback(async (updatedTask) => {
    const original = tasks.find(t => t.id === updatedTask.id);
    if (!original) return;
    const payload = { ...original, progress: Math.round(updatedTask.progress) };
    await fetch(`/api/tasks/${updatedTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? payload : t));
  }, [tasks]);

  return (
    <TaskContext.Provider value={{ tasks, ganttTasks, loading, error, addTask, removeTask, updateProgress }}>
      {children}
    </TaskContext.Provider>
  );
}

export const useTasks = () => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTasks debe usarse dentro de <TaskProvider>');
  return ctx;
};
