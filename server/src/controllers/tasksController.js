import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../data/tasks.json');

const readDB = () => JSON.parse(readFileSync(DB_PATH, 'utf-8'));
const writeDB = (data) => writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

export const getTasks = (req, res) => {
  try {
    res.json(readDB());
  } catch {
    res.status(500).json({ error: 'Error al leer tareas' });
  }
};

export const createTask = (req, res) => {
  const { name, start, end, progress, color } = req.body;
  if (!name || !start || !end) {
    return res.status(400).json({ error: 'name, start y end son requeridos' });
  }
  const newTask = {
    id: randomUUID(),
    name,
    start,
    end,
    progress: progress ?? 0,
    color: color ?? '#378ADD',
    createdAt: new Date().toISOString(),
  };
  const tasks = readDB();
  tasks.push(newTask);
  writeDB(tasks);
  res.status(201).json(newTask);
};

export const updateTask = (req, res) => {
  const tasks = readDB();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Tarea no encontrada' });
  tasks[idx] = { ...tasks[idx], ...req.body, id: req.params.id };
  writeDB(tasks);
  res.json(tasks[idx]);
};

export const deleteTask = (req, res) => {
  const tasks = readDB();
  const filtered = tasks.filter(t => t.id !== req.params.id);
  if (filtered.length === tasks.length) {
    return res.status(404).json({ error: 'Tarea no encontrada' });
  }
  writeDB(filtered);
  res.status(204).send();
};
