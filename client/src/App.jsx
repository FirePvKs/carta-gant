import { useState } from 'react';
import { TaskProvider } from './context/TaskContext';
import TaskPanel from './components/TaskPanel';
import GanttChart from './components/GanttChart';
import Toolbar from './components/Toolbar';
import EditTaskModal from './components/EditTaskModal';

export default function App() {
  const [editingTask, setEditingTask] = useState(null);
  return (
    <TaskProvider>
      <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
        <TaskPanel onEdit={setEditingTask} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Toolbar />
          <GanttChart onEditTask={setEditingTask} />
        </main>
      </div>
      {editingTask !== null && (
        <EditTaskModal task={editingTask?.id ? editingTask : null} onClose={() => setEditingTask(null)} />
      )}
    </TaskProvider>
  );
}
