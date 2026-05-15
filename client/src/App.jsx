import { useState } from 'react';
import { TaskProvider } from './context/TaskContext';
import { ProjectProvider, useProjects } from './context/ProjectContext';
import TaskPanel from './components/TaskPanel';
import GanttChart from './components/GanttChart';
import Toolbar from './components/Toolbar';
import FilterBar from './components/FilterBar';
import EditTaskModal from './components/EditTaskModal';
import ProjectsPage from './pages/ProjectsPage';

const EMPTY_FILTERS = { status: [], priority: [], assignee: [], search: '' };

export function taskMatchesFilters(task, filters) {
  if (filters.search && !task.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
  if (filters.status.length   && !filters.status.includes(task.status))    return false;
  if (filters.priority.length && !filters.priority.includes(task.priority)) return false;
  if (filters.assignee.length && !filters.assignee.includes(task.assignee)) return false;
  return true;
}

function GanttApp() {
  const { activeProject, setActiveProjectId } = useProjects();
  const [editingTask, setEditingTask] = useState(null);
  const [filters, setFilters]         = useState(EMPTY_FILTERS);
  const hasFilters = !!(filters.status.length || filters.priority.length || filters.assignee.length || filters.search);

  if (!activeProject) return <ProjectsPage />;

  return (
    <TaskProvider projectId={activeProject.id}>
      <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
        <TaskPanel onEdit={setEditingTask} filters={filters} hasFilters={hasFilters} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Toolbar project={activeProject} onBack={() => setActiveProjectId(null)} />
          <FilterBar filters={filters} setFilters={setFilters} />
          <GanttChart onEditTask={setEditingTask} filters={filters} />
        </main>
      </div>
      {editingTask !== null && (
        <EditTaskModal task={editingTask?.id ? editingTask : null} onClose={() => setEditingTask(null)} />
      )}
    </TaskProvider>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <GanttApp />
    </ProjectProvider>
  );
}
