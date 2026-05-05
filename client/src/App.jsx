import { useState } from 'react';
import { TaskProvider } from './context/TaskContext';
import TaskPanel from './components/TaskPanel';
import GanttChart from './components/GanttChart';
import Toolbar from './components/Toolbar';
import EditTaskModal from './components/EditTaskModal';

export default function App() {
  const [viewMode, setViewMode] = useState('Week');
  // null = modal cerrado | {} = crear nueva | {id,...} = editar existente
  const [editingTask, setEditingTask] = useState(null);

  return (
    <TaskProvider>
      <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">

        {/* Panel izquierdo de tareas */}
        <TaskPanel onEdit={setEditingTask} />

        {/* Área principal */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <Toolbar viewMode={viewMode} onViewChange={setViewMode} />
          <GanttChart viewMode={viewMode} onEditTask={setEditingTask} />
        </main>

      </div>

      {/* Modal de edición/creación (se monta solo cuando hay tarea activa) */}
      {editingTask !== null && (
        <EditTaskModal
          task={editingTask?.id ? editingTask : null}
          onClose={() => setEditingTask(null)}
        />
      )}
    </TaskProvider>
  );
}
