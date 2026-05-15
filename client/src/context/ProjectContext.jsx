import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ProjectContext = createContext(null);
const PROJECTS_KEY = 'gantt-projects-v1';
const genId = () => Math.random().toString(36).slice(2, 10);

const PROJECT_COLORS = ['#378ADD','#1D9E75','#7F77DD','#EF9F27','#D4537E','#D85A30'];

const loadProjects = () => {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? '[]'); }
  catch { return []; }
};

export function ProjectProvider({ children }) {
  const [projects, setProjects]           = useState(loadProjects);
  const [activeProjectId, setActiveProjectId] = useState(null);

  useEffect(() => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }, [projects]);

  const createProject = useCallback((name, description = '', color = null) => {
    const project = {
      id:          genId(),
      name:        name.trim(),
      description,
      color:       color ?? PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
    };
    setProjects(prev => [...prev, project]);
    return project;
  }, [projects]);

  const updateProject = useCallback((id, changes) => {
    setProjects(prev => prev.map(p =>
      p.id === id ? { ...p, ...changes, updatedAt: new Date().toISOString() } : p
    ));
  }, []);

  const deleteProject = useCallback((id) => {
    // Also delete tasks for this project
    localStorage.removeItem(`gantt-tasks-${id}`);
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProjectId === id) setActiveProjectId(null);
  }, [activeProjectId]);

  const activeProject = projects.find(p => p.id === activeProjectId) ?? null;

  // Task count per project
  const getTaskCount = (projectId) => {
    try {
      const tasks = JSON.parse(localStorage.getItem(`gantt-tasks-${projectId}`) ?? '[]');
      return tasks.length;
    } catch { return 0; }
  };

  return (
    <ProjectContext.Provider value={{
      projects, activeProject, activeProjectId,
      setActiveProjectId, createProject, updateProject, deleteProject, getTaskCount,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export const useProjects = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjects debe usarse dentro de ProjectProvider');
  return ctx;
};
