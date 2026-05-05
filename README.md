# 🗓️ Gantt App — React + Node.js

Aplicación fullstack para crear y gestionar Cartas Gantt interactivas.

## Tecnologías

| Capa       | Stack                                              |
|------------|----------------------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, gantt-task-react      |
| Backend    | Node.js, Express 4, ESModules                       |
| Exportación| jsPDF + html2canvas                                 |
| Iconos     | lucide-react                                        |

---

## 🚀 Cómo correr el proyecto

### Requisitos previos

- Node.js **v18 o superior** — verificar con `node -v`
- npm v9+ — verificar con `npm -v`

---

### 1. Instalar y correr el **Backend** (Express)

```bash
cd server
npm install
npm run dev
```

El servidor quedará corriendo en: **http://localhost:3001**

Para verificar que funciona, abre en el navegador:  
`http://localhost:3001/api/health` → debe responder `{ "status": "ok" }`

---

### 2. Instalar y correr el **Frontend** (React + Vite)

Abre **otra terminal** (sin cerrar la del servidor):

```bash
cd client
npm install
npm run dev
```

La aplicación quedará en: **http://localhost:5173**

> El proxy de Vite conecta automáticamente `/api/*` al servidor Express.  
> No necesitas configurar CORS ni URLs manualmente.

---

## 📁 Estructura del proyecto

```
gantt-app/
├── client/                     # Frontend React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── GanttChart.jsx  # Gráfico principal (gantt-task-react)
│   │   │   ├── TaskForm.jsx    # Formulario lateral de tareas
│   │   │   └── Toolbar.jsx     # Barra superior + botón PDF
│   │   ├── context/
│   │   │   └── TaskContext.jsx # Estado global + llamadas a la API
│   │   ├── utils/
│   │   │   └── exportPDF.js    # Exportación con jsPDF + html2canvas
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js          # Proxy /api → localhost:3001
│   └── package.json
│
└── server/                     # Backend Express
    ├── src/
    │   ├── app.js              # Entry point
    │   ├── routes/tasks.js     # Rutas GET/POST/PUT/DELETE
    │   ├── controllers/        # Lógica de negocio
    │   └── data/tasks.json     # Base de datos JSON (simple)
    └── package.json
```

---

## 🧩 Funcionalidades

- ✅ Agregar tareas con nombre, fechas, progreso y color
- ✅ Visualización Gantt interactiva (arrastrar barras para cambiar fechas)
- ✅ Cambiar vista: Día / Semana / Mes / Año
- ✅ Eliminar tareas con botón ×
- ✅ Persistencia en archivo JSON via API REST
- ✅ Exportar la carta Gantt a PDF

---

## 📡 Endpoints de la API

| Método   | Ruta             | Descripción            |
|----------|------------------|------------------------|
| `GET`    | `/api/tasks`     | Lista todas las tareas |
| `POST`   | `/api/tasks`     | Crea una nueva tarea   |
| `PUT`    | `/api/tasks/:id` | Actualiza una tarea    |
| `DELETE` | `/api/tasks/:id` | Elimina una tarea      |
| `GET`    | `/api/health`    | Health check           |

---

## 🔧 Escalar a una base de datos real

Reemplaza `src/data/tasks.json` en el controlador por una conexión a MongoDB:

```js
import mongoose from 'mongoose';
// const tasks = await Task.find();  →  reemplaza readDB()
// await new Task(data).save();      →  reemplaza writeDB()
```

---
