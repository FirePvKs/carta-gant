import { useState } from 'react';
import TaskForm from './components/TaskForm';
import GanttChart from './components/GanttChart';
import Toolbar from './components/Toolbar';
import { TaskProvider } from './context/TaskContext';

const PROJECT_NAME = 'carta gantt version 0.1';

export default function App() {
  const [viewMode, setViewMode] = useState('Week');

  return (
    <TaskProvider>
      <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">

        {/* Panel lateral izquierdo */}
        <aside className="w-72 min-w-[288px] bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
          <header className="px-5 py-4 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Nueva tarea</p>
          </header>
          <TaskForm />
        </aside>

        {/* Área principal */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <Toolbar
            viewMode={viewMode}
            onViewChange={setViewMode}
            projectName={PROJECT_NAME}
          />
          <GanttChart viewMode={viewMode} />
        </main>

      </div>
    </TaskProvider>
  );
}
