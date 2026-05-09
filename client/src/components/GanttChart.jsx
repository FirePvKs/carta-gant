import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, ClipboardList } from 'lucide-react';
import { useTasks } from '../context/TaskContext';

// ─── Constants ─────────────────────────────────────────────────────────────
const TASK_W = 220;
const ROW_H  = 50;
const TOP_H  = 28;
const BOT_H  = 28;
const HDR_H  = TOP_H + BOT_H;
const MS_DAY = 86400000;
const CIRCLE_R = 7; // connection handle radius

const MES_S = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DIA_S = ['D','L','M','X','J','V','S'];

const ZOOMS = [
  { k:'horas',   l:'Horas',   ppd:960,  pad:1   },
  { k:'dias',    l:'Días',    ppd:50,   pad:5   },
  { k:'semanas', l:'Semanas', ppd:17,   pad:14  },
  { k:'meses',   l:'Meses',   ppd:3.5,  pad:30  },
  { k:'cuartos', l:'Cuartos', ppd:1.2,  pad:90  },
  { k:'anios',   l:'Años',    ppd:0.38, pad:180 },
];

// ─── Date helpers ───────────────────────────────────────────────────────────
const d0    = d => { const r=new Date(d); r.setHours(0,0,0,0); return r; };
const d0M   = d => new Date(d.getFullYear(), d.getMonth(), 1);
const d0Y   = d => new Date(d.getFullYear(), 0, 1);
const addD  = (d,n) => new Date(d.getTime()+n*MS_DAY);
const nextM = d => new Date(d.getFullYear(), d.getMonth()+1, 1);
const nextY = d => new Date(d.getFullYear()+1, 0, 1);
const monday = d => { const dw=d.getDay(); return addD(d0(d), dw===0?-6:1-dw); };
const isoWeek = d => { const j=new Date(d.getFullYear(),0,1); return Math.ceil(((d-j)/MS_DAY+j.getDay()+1)/7); };
const xOf = (date, rs, ppd) => (date-rs)/MS_DAY*ppd;
const fmt  = d => (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0];

// ─── Column generators ──────────────────────────────────────────────────────
function horasCols(rs, re, ppd) {
  const pph=ppd/24, cols=[], top=[];
  let d=d0(rs);
  while(d<re) {
    let gPx=0;
    const lbl=d.toLocaleDateString('es',{weekday:'short',day:'2-digit',month:'short'});
    for(let h=0;h<24;h++) {
      const hd=new Date(d.getTime()+h*3600000);
      if(hd>=re) break;
      if(hd+3600000>rs) { cols.push({label:String(h).padStart(2,'0'),px:pph,x:xOf(hd,rs,ppd)}); gPx+=pph; }
    }
    if(gPx>0) top.push({label:lbl,px:gPx});
    d=addD(d,1);
  }
  return {top,cols};
}
function diasCols(rs, re, ppd) {
  const cols=[], top=[];
  let d=d0(rs), curY=null, gPx=0;
  while(d<re) {
    const y=String(d.getFullYear());
    if(y!==curY){ if(curY) top.push({label:curY,px:gPx}); curY=y; gPx=0; }
    const wkd=d.getDay(), isWE=wkd===0||wkd===6;
    cols.push({label:String(d.getDate()),sub:DIA_S[wkd],px:ppd,x:xOf(d,rs,ppd),isWE});
    gPx+=ppd; d=addD(d,1);
  }
  if(curY) top.push({label:curY,px:gPx});
  return {top,cols};
}
function semanasCols(rs, re, ppd) {
  const ppw=ppd*7, cols=[], top=[];
  let w=monday(rs), curM=null, gPx=0;
  while(w<re) {
    const we=addD(w,6);
    const mk=`${MES_S[w.getMonth()]} ${w.getFullYear()}`;
    if(mk!==curM){ if(curM) top.push({label:curM,px:gPx}); curM=mk; gPx=0; }
    cols.push({label:`${w.getDate()}-${we.getDate()}`,sub:`(${isoWeek(w)}s)`,px:ppw,x:xOf(w,rs,ppd)});
    gPx+=ppw; w=addD(w,7);
  }
  if(curM) top.push({label:curM,px:gPx});
  return {top,cols};
}
function mesesCols(rs, re, ppd) {
  const cols=[], top=[];
  let m=d0M(rs), curY=null, gPx=0;
  while(m<re) {
    const y=String(m.getFullYear()), nm=nextM(m);
    const px=(nm-m)/MS_DAY*ppd;
    if(y!==curY){ if(curY) top.push({label:curY,px:gPx}); curY=y; gPx=0; }
    cols.push({label:MES_S[m.getMonth()],px,x:xOf(m,rs,ppd)});
    gPx+=px; m=nm;
  }
  if(curY) top.push({label:curY,px:gPx});
  return {top,cols};
}
function cuartosCols(rs, re, ppd) {
  const cols=[], top=[];
  let m=d0M(rs), months=[];
  while(m<re) {
    const nm=nextM(m), px=(nm-m)/MS_DAY*ppd;
    months.push({label:MES_S[m.getMonth()],px,x:xOf(m,rs,ppd),q:Math.floor(m.getMonth()/3)+1,y:m.getFullYear()});
    m=nm;
  }
  let lk=null, gPx=0;
  for(const mo of months) {
    const qk=`${mo.q}-${mo.y}`;
    if(qk!==lk){ if(lk){ const[q,y]=lk.split('-'); top.push({label:`Cuarto ${q}, ${y}`,px:gPx}); } lk=qk; gPx=0; }
    gPx+=mo.px; cols.push(mo);
  }
  if(lk){ const[q,y]=lk.split('-'); top.push({label:`Cuarto ${q}, ${y}`,px:gPx}); }
  return {top,cols};
}
function aniosCols(rs, re, ppd) {
  const cols=[], top=[];
  let y=d0Y(rs);
  while(y<re) {
    const ny=nextY(y), px=(ny-y)/MS_DAY*ppd;
    top.push({label:String(y.getFullYear()),px});
    cols.push({label:'',px,x:xOf(y,rs,ppd)});
    y=ny;
  }
  return {top,cols};
}
const getCols = (rs, re, zoom) => {
  switch(zoom){
    case 'horas':   return horasCols(rs,re,ZOOMS.find(z=>z.k===zoom).ppd);
    case 'dias':    return diasCols(rs,re,ZOOMS.find(z=>z.k===zoom).ppd);
    case 'semanas': return semanasCols(rs,re,ZOOMS.find(z=>z.k===zoom).ppd);
    case 'cuartos': return cuartosCols(rs,re,ZOOMS.find(z=>z.k===zoom).ppd);
    case 'anios':   return aniosCols(rs,re,ZOOMS.find(z=>z.k===zoom).ppd);
    default:        return mesesCols(rs,re,ZOOMS.find(z=>z.k==='meses').ppd);
  }
};

// ─── Top toolbar: Zoom slider + Move controls ───────────────────────────────
const ZoomMoveBar = ({ zoom, setZoom, selectedTask, moveStep, setMoveStep, stepLabel, onMove }) => {
  const idx = ZOOMS.findIndex(z=>z.k===zoom);
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',height:40,borderBottom:'1px solid #e5e7eb',background:'#fff',flexShrink:0,gap:12}}>

      {/* Move controls — solo visible cuando hay tarea seleccionada */}
      <div style={{display:'flex',alignItems:'center',gap:6,minWidth:220,opacity: selectedTask ? 1 : 0, pointerEvents: selectedTask ? 'all' : 'none', transition:'opacity 0.15s'}}>
        <span style={{fontSize:11,color:'#6b7280',fontWeight:500,whiteSpace:'nowrap',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis'}}>
          {selectedTask?.name ?? ''}
        </span>
        {/* Flecha izquierda */}
        <button onClick={()=>onMove(-1)}
          style={{width:26,height:26,borderRadius:6,border:'1px solid #e5e7eb',background:'#f9fafb',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#374151',flexShrink:0}}
          title="Mover izquierda (←)">
          ◀
        </button>
        {/* Contador de pasos */}
        <div style={{display:'flex',alignItems:'center',gap:3}}>
          <button onClick={()=>setMoveStep(s=>Math.max(1,s-1))}
            style={{width:18,height:18,borderRadius:4,border:'1px solid #e5e7eb',background:'#f9fafb',cursor:'pointer',fontSize:11,color:'#374151',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>−</button>
          <span style={{minWidth:28,textAlign:'center',fontSize:12,fontWeight:600,color:'#374151',background:'#f3f4f6',borderRadius:4,padding:'2px 4px'}}>
            {moveStep}{stepLabel}
          </span>
          <button onClick={()=>setMoveStep(s=>s+1)}
            style={{width:18,height:18,borderRadius:4,border:'1px solid #e5e7eb',background:'#f9fafb',cursor:'pointer',fontSize:11,color:'#374151',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>+</button>
        </div>
        {/* Flecha derecha */}
        <button onClick={()=>onMove(1)}
          style={{width:26,height:26,borderRadius:6,border:'1px solid #e5e7eb',background:'#f9fafb',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#374151',flexShrink:0}}
          title="Mover derecha (→)">
          ▶
        </button>
      </div>

      {/* Zoom slider */}
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{display:'flex',alignItems:'center',position:'relative'}}>
          <div style={{position:'absolute',left:8,right:8,top:'50%',height:2,background:'#d1d5db',transform:'translateY(-50%)'}}/>
          {ZOOMS.map((z,i)=>(
            <button key={z.k} onClick={()=>setZoom(z.k)} title={z.l}
              style={{width:i===idx?14:10,height:i===idx?14:10,borderRadius:'50%',border:`2px solid ${i===idx?'#374151':'#9ca3af'}`,background:i===idx?'#374151':'white',cursor:'pointer',position:'relative',zIndex:1,marginLeft:i>0?20:0,flexShrink:0,transition:'all 0.15s'}}
            />
          ))}
        </div>
        <span style={{fontSize:12,fontWeight:500,color:'#374151',minWidth:52}}>{ZOOMS[idx]?.l}</span>
      </div>
    </div>
  );
};

// ─── Main component ─────────────────────────────────────────────────────────
export default function GanttChart({ onEditTask }) {
  const { tasks, hiddenParents, toggleParent, updateTask, addDependency } = useTasks();
  const [zoom, setZoom] = useState('semanas');
  const [hoveredBar, setHoveredBar] = useState(null);   // taskId
  const [depDrag, setDepDrag]       = useState(null);   // { fromId, fromSide, x, y }
  const [hoveredCircle, setHoveredCircle] = useState(null); // { taskId, side }
  const scrollRef = useRef(null);
  const panRef    = useRef({ active:false, sx:0, sy:0, sl:0, st:0 });
  const dragRef   = useRef(null);
  const svgRef    = useRef(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [moveStep, setMoveStep]             = useState(1);

  // Días que equivale 1 paso según la escala actual
  const stepDays = useMemo(() => {
    switch(zoom) {
      case 'horas':   return 1/24;
      case 'dias':    return 1;
      case 'semanas': return 7;
      case 'meses':   return 30;
      case 'cuartos': return 91;
      case 'anios':   return 365;
      default:        return 1;
    }
  }, [zoom]);

  const stepLabel = useMemo(() => {
    switch(zoom) {
      case 'horas':   return 'h';
      case 'dias':    return 'd';
      case 'semanas': return 'sem';
      case 'meses':   return 'mes';
      case 'cuartos': return 'trim';
      case 'anios':   return 'año';
      default:        return 'd';
    }
  }, [zoom]);

  /** Recolecta todos los IDs descendientes de una tarea (hijos, nietos, etc.) */
  const getDescendantIds = useCallback((taskId) => {
    const result = [];
    const collect = (id) => {
      tasks.filter(t => t.parentId === id).forEach(c => {
        result.push(c.id);
        collect(c.id);
      });
    };
    collect(taskId);
    return result;
  }, [tasks]);

  /** Mueve la tarea seleccionada y todos sus descendientes n pasos */
  const moveSelectedTask = useCallback((direction) => {
    if(!selectedTaskId) return;
    const task = tasks.find(t => t.id === selectedTaskId);
    if(!task) return;
    const days = direction * moveStep * stepDays;
    // Mueve la tarea principal
    updateTask(selectedTaskId, {
      start: fmt(addD(new Date(task.start + 'T00:00:00'), days)),
      end:   fmt(addD(new Date(task.end   + 'T00:00:00'), days)),
    });
    // Mueve todos los descendientes la misma cantidad
    getDescendantIds(selectedTaskId).forEach(childId => {
      const child = tasks.find(t => t.id === childId);
      if(!child) return;
      updateTask(childId, {
        start: fmt(addD(new Date(child.start + 'T00:00:00'), days)),
        end:   fmt(addD(new Date(child.end   + 'T00:00:00'), days)),
      });
    });
  }, [selectedTaskId, tasks, moveStep, stepDays, updateTask, getDescendantIds]);

  // Flechas del teclado mueven la tarea seleccionada
  useEffect(() => {
    const onKey = (e) => {
      if(!selectedTaskId) return;
      if(e.key === 'ArrowLeft')  { e.preventDefault(); moveSelectedTask(-1); }
      if(e.key === 'ArrowRight') { e.preventDefault(); moveSelectedTask( 1); }
      if(e.key === 'Escape')     setSelectedTaskId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedTaskId, moveSelectedTask]);
  const visibleTasks = useMemo(() => {
    const result = [];
    const add = (id, depth) => {
      const t = tasks.find(x=>x.id===id); if(!t) return;
      result.push({...t, _depth:depth});
      if(!hiddenParents.has(id)) tasks.filter(x=>x.parentId===id).forEach(c=>add(c.id, depth+1));
    };
    tasks.filter(t=>!t.parentId).forEach(t=>add(t.id,0));
    return result;
  }, [tasks, hiddenParents]);

  // ── Date range ────────────────────────────────────────────────────────────
  const { rangeStart, rangeEnd, ppd } = useMemo(()=>{
    const z = ZOOMS.find(z=>z.k===zoom) || ZOOMS[3];
    const pad = z.pad * 3;
    if(!tasks.length) {
      const n=new Date(); return { rangeStart:addD(n,-pad), rangeEnd:addD(n,pad*4), ppd:z.ppd };
    }
    const starts = tasks.map(t=>new Date(t.start+'T00:00:00'));
    const ends   = tasks.map(t=>new Date(t.end+'T23:59:59'));
    return { rangeStart:addD(new Date(Math.min(...starts)),-pad), rangeEnd:addD(new Date(Math.max(...ends)),pad), ppd:z.ppd };
  }, [tasks, zoom]);

  const totalWidth = useMemo(()=>(rangeEnd-rangeStart)/MS_DAY*ppd, [rangeEnd,rangeStart,ppd]);
  const { top: topGroups, cols } = useMemo(()=>getCols(rangeStart,rangeEnd,zoom), [rangeStart,rangeEnd,zoom]);

  // ── Pan ───────────────────────────────────────────────────────────────────
  useEffect(()=>{
    const el = scrollRef.current; if(!el) return;
    const down = e => {
      if(e.button!==0) return;
      // Si el clic viene de dentro de una barra, no iniciar pan
      if(e.target.closest('[data-bar-id]')) return;
      if(e.target.dataset.handle || e.target.dataset.circle) return;
      panRef.current = { active:true, sx:e.clientX, sy:e.clientY, sl:el.scrollLeft, st:el.scrollTop };
      el.style.cursor = 'grabbing';
    };
    const move = e => {
      if(!panRef.current.active) return;
      el.scrollLeft = panRef.current.sl-(e.clientX-panRef.current.sx);
      el.scrollTop  = panRef.current.st-(e.clientY-panRef.current.sy);
    };
    const up = () => { panRef.current.active=false; el.style.cursor='grab'; };
    document.addEventListener('mousedown', down, { capture:true });
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    return ()=>{
      document.removeEventListener('mousedown', down, { capture:true });
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
  }, []);

  // ── refs siempre frescos para el drag handler ─────────────────────────────
  const ppdRef        = useRef(ppd);
  const rangeStartRef = useRef(rangeStart);
  useEffect(() => { ppdRef.current = ppd; },         [ppd]);
  useEffect(() => { rangeStartRef.current = rangeStart; }, [rangeStart]);

  /**
   * Convierte clientX del mouse a la fecha exacta en el timeline.
   * Usa coordenadas del contenido (no viewport) para ser scroll-safe.
   */
  const clientXToDate = useCallback((clientX) => {
    const el   = scrollRef.current;
    const rect = el.getBoundingClientRect();
    const rs   = rangeStartRef.current;
    const p    = ppdRef.current;
    // px dentro del contenido del timeline (sin el panel izquierdo)
    const contentPx = clientX - rect.left + el.scrollLeft - TASK_W;
    const dayOffset = contentPx / p;
    return addD(rs, dayOffset);
  }, []);

  // ── Bar drag (move + resize) ──────────────────────────────────────────────
  useEffect(() => {
    const move = e => {
      const dr = dragRef.current; if (!dr) return;
      const rs = rangeStartRef.current;
      const p  = ppdRef.current;

      // Fecha donde está el cursor ahora
      const cursorDate = clientXToDate(e.clientX);

      let newStart, newEnd;

      if (dr.type === 'move') {
        // Mueve manteniendo el offset interno: fecha_inicio = cursor - grabOffset
        const newStartDate = addD(cursorDate, -dr.grabOffsetDays);
        const snappedDay   = Math.round((newStartDate - rs) / MS_DAY);
        if (snappedDay === dr.lastSnap) return;
        dr.lastSnap = snappedDay;
        newStart = fmt(addD(rs, snappedDay));
        newEnd   = fmt(addD(new Date(newStart + 'T00:00:00'), dr.durationDays - 1));

      } else if (dr.type === 'resize-right') {
        const snappedDay = Math.round((cursorDate - new Date(dr.origStart + 'T00:00:00')) / MS_DAY);
        const clamped    = Math.max(0, snappedDay);
        if (clamped === dr.lastSnap) return;
        dr.lastSnap = clamped;
        newStart = dr.origStart;
        newEnd   = fmt(addD(new Date(dr.origStart + 'T00:00:00'), clamped));

      } else { // resize-left
        const snappedDay = Math.round((new Date(dr.origEnd + 'T00:00:00') - cursorDate) / MS_DAY);
        const clamped    = Math.max(0, snappedDay);
        if (clamped === dr.lastSnap) return;
        dr.lastSnap = clamped;
        newEnd   = dr.origEnd;
        newStart = fmt(addD(new Date(dr.origEnd + 'T00:00:00'), -clamped));
      }

      dr.preview = { start: newStart, end: newEnd };

      // Preview visual directo en DOM
      if (dr.el) {
        const bx = (new Date(newStart + 'T00:00:00').getTime() - rs.getTime()) / MS_DAY * p;
        const dur = (new Date(newEnd + 'T00:00:00').getTime() - new Date(newStart + 'T00:00:00').getTime()) / MS_DAY + 1;
        dr.el.style.left  = bx + 'px';
        dr.el.style.width = Math.max(p, dur * p) + 'px';
      }
    };

    const up = () => {
      const dr = dragRef.current; if (!dr) return;
      if (dr.preview) updateTask(dr.taskId, dr.preview);
      dragRef.current = null;
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup',   up);
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup',   up);
    };
  }, [updateTask, clientXToDate]);

  const startBarDrag = (e, task, type, barEl) => {
    e.preventDefault(); e.stopPropagation();
    // Fecha donde el usuario tomó la barra
    const grabDate     = clientXToDate(e.clientX);
    const taskStart    = new Date(task.start + 'T00:00:00');
    // grabOffsetDays: cuántos días desde el inicio de la tarea agarró el usuario
    const grabOffsetDays = (grabDate - taskStart) / MS_DAY;
    const durationDays   = Math.round(
      (new Date(task.end + 'T00:00:00') - taskStart) / MS_DAY
    ) + 1;
    dragRef.current = {
      taskId: task.id, type,
      grabOffsetDays,
      durationDays,
      origStart: task.start,
      origEnd:   task.end,
      lastSnap: null,
      el: barEl,
      preview: null,
    };
    document.body.style.cursor = type === 'move' ? 'grabbing' : 'ew-resize';
  };

  // ── Dependency drag ───────────────────────────────────────────────────────
  const startDepDrag = (e, taskId, side) => {
    e.preventDefault(); e.stopPropagation();
    const el = scrollRef.current;
    const rect = el.getBoundingClientRect();
    setDepDrag({ fromId:taskId, fromSide:side, x:e.clientX-rect.left+el.scrollLeft, y:e.clientY-rect.top+el.scrollTop });
  };

  useEffect(()=>{
    if(!depDrag) return;
    const el = scrollRef.current;
    const move = e => {
      const rect = el.getBoundingClientRect();
      setDepDrag(p => ({ ...p, x:e.clientX-rect.left+el.scrollLeft, y:e.clientY-rect.top+el.scrollTop }));
    };
    const up = e => {
      // Check if released on a circle
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const toTaskId = target?.dataset?.circle?.split('-')?.[0];
      const toSide   = target?.dataset?.circle?.split('-')?.[1];
      if(toTaskId && toTaskId !== depDrag.fromId) {
        // Guarda exactamente qué extremo conecta con qué extremo
        addDependency(toTaskId, depDrag.fromId, toSide, depDrag.fromSide);
      }
      setDepDrag(null);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    return ()=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); };
  }, [depDrag, addDependency]);

  // ── Bar position helper ───────────────────────────────────────────────────
  const barPos = task => {
    const startMs = new Date(task.start + 'T00:00:00').getTime();
    const endMs   = new Date(task.end   + 'T00:00:00').getTime();
    const durationDays = Math.max(1, Math.round((endMs - startMs) / MS_DAY) + 1);
    const bx = (startMs - rangeStart.getTime()) / MS_DAY * ppd;
    const bw = Math.max(ppd * 0.5, durationDays * ppd);
    return { bx, bw, durationDays };
  };

  const circlePos = (task, side, rowIdx) => {
    const { bx, bw } = barPos(task);
    const cy = rowIdx*ROW_H + ROW_H/2 + HDR_H;
    const cx = side==='start' ? bx : bx+bw;
    return { cx, cy };
  };

  if(!tasks.length) return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ZoomMoveBar zoom={zoom} setZoom={setZoom} selectedTask={tasks.find(t=>t.id===selectedTaskId)??null} moveStep={moveStep} setMoveStep={setMoveStep} stepLabel={stepLabel} onMove={moveSelectedTask}/>
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3 text-gray-300">
          <ClipboardList size={44} strokeWidth={1.2}/>
          <p className="text-sm font-medium text-gray-500">Sin tareas</p>
          <p className="text-xs text-gray-400">Agrega tu primera tarea en el panel izquierdo</p>
        </div>
      </div>
    </div>
  );

  const chartH = Math.max(visibleTasks.length*ROW_H, 300);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <ZoomMoveBar zoom={zoom} setZoom={setZoom} selectedTask={tasks.find(t=>t.id===selectedTaskId)??null} moveStep={moveStep} setMoveStep={setMoveStep} stepLabel={stepLabel} onMove={moveSelectedTask}/>

      <div ref={scrollRef} id="gantt-container" style={{flex:1,overflow:'auto',cursor:'grab',userSelect:'none',position:'relative'}}>
        <div style={{display:'flex',minWidth:'100%',minHeight:HDR_H+chartH}}>

          {/* ── Left sticky: task names ── */}
          <div style={{width:TASK_W,flexShrink:0,position:'sticky',left:0,zIndex:20,background:'#fff',borderRight:'1px solid #e5e7eb'}}>
            <div style={{height:HDR_H,position:'sticky',top:0,zIndex:30,background:'#f9fafb',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',paddingLeft:16}}>
              <span style={{fontSize:12,fontWeight:600,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.05em'}}>Tarea</span>
            </div>
            {visibleTasks.map(task=>{
              const isParent = task.isParent;
              const collapsed = hiddenParents.has(task.id);
              return (
                <div key={task.id} onClick={()=>onEditTask(task)}
                  style={{height:ROW_H,display:'flex',alignItems:'center',paddingLeft:8+task._depth*16,paddingRight:8,borderBottom:'1px solid #f3f4f6',cursor:'pointer',gap:4}}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {isParent
                    ? <button onClick={e=>{e.stopPropagation();toggleParent(task.id);}} style={{background:'none',border:'none',cursor:'pointer',padding:2,color:'#9ca3af',flexShrink:0,display:'flex',alignItems:'center'}}>
                        {collapsed?<ChevronRight size={12}/>:<ChevronDown size={12}/>}
                      </button>
                    : <span style={{width:8,height:8,borderRadius:'50%',flexShrink:0,background:task.color,marginLeft:4}}/>
                  }
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,fontSize:13,color:'#374151',fontWeight:isParent?600:400}}>{task.name}</span>
                  <span style={{fontSize:11,color:'#9ca3af',flexShrink:0}}>{task.computedProgress}%</span>
                </div>
              );
            })}
          </div>

          {/* ── Right: timeline ── */}
          <div style={{flex:1,minWidth:totalWidth,position:'relative'}}>

            {/* Sticky header */}
            <div style={{position:'sticky',top:0,zIndex:10,height:HDR_H,background:'#f9fafb',borderBottom:'1px solid #e5e7eb'}}>
              <div style={{height:TOP_H,display:'flex',borderBottom:'1px solid #e5e7eb'}}>
                {topGroups.map((g,i)=>(
                  <div key={i} style={{width:g.px,flexShrink:0,display:'flex',alignItems:'center',paddingLeft:8,borderRight:'1px solid #e5e7eb',fontSize:11,fontWeight:600,color:'#374151',overflow:'hidden',whiteSpace:'nowrap'}}>{g.label}</div>
                ))}
                <div style={{flex:1}}/>
              </div>
              <div style={{height:BOT_H,display:'flex'}}>
                {cols.map((c,i)=>(
                  <div key={i} style={{width:c.px,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',borderRight:'1px solid #e5e7eb',fontSize:10,color:c.isWE?'#3b82f6':'#6b7280',background:c.isWE?'rgba(219,234,254,0.4)':'transparent',overflow:'hidden'}}>
                    <span style={{fontWeight:500,lineHeight:1}}>{c.label}</span>
                    {c.sub && <span style={{fontSize:9,marginTop:1,opacity:0.8}}>{c.sub}</span>}
                  </div>
                ))}
                <div style={{flex:1}}/>
              </div>
            </div>

            {/* Chart body */}
            <div style={{position:'relative',height:chartH,width:'100%'}}>

              {/* Row stripes */}
              {visibleTasks.map((_,i)=>(
                <div key={i} style={{position:'absolute',left:0,top:i*ROW_H,width:'100%',height:ROW_H,background:i%2===0?'transparent':'rgba(249,250,251,0.6)',pointerEvents:'none'}}/>
              ))}
              {/* Weekend highlights */}
              {cols.filter(c=>c.isWE).map((c,i)=>(
                <div key={i} style={{position:'absolute',left:c.x,top:0,width:c.px,height:'100%',background:'rgba(219,234,254,0.2)',pointerEvents:'none'}}/>
              ))}
              {/* Grid lines */}
              {cols.map((c,i)=>(
                <div key={i} style={{position:'absolute',left:c.x,top:0,width:1,height:'100%',background:'#e5e7eb',pointerEvents:'none'}}/>
              ))}
              <div style={{position:'absolute',left:totalWidth,top:0,width:1,height:'100%',background:'#e5e7eb',pointerEvents:'none'}}/>
              {/* Row lines */}
              {visibleTasks.map((_,i)=>(
                <div key={i} style={{position:'absolute',left:0,top:(i+1)*ROW_H-1,width:'100%',height:1,background:'#f3f4f6',pointerEvents:'none'}}/>
              ))}
              {/* Today */}
              {(()=>{
                const tx=xOf(new Date(),rangeStart,ppd);
                if(tx<0||tx>totalWidth+500) return null;
                return (
                  <div style={{position:'absolute',left:tx,top:0,width:2,height:'100%',background:'rgba(59,130,246,0.45)',zIndex:5,pointerEvents:'none'}}>
                    <div style={{position:'absolute',top:0,left:-14,background:'#3b82f6',color:'white',fontSize:9,fontWeight:700,padding:'1px 4px',borderRadius:3}}>HOY</div>
                  </div>
                );
              })()}

              {/* ── SVG: dependency arrows + live dep drag line ── */}
              <svg ref={svgRef} style={{position:'absolute',inset:0,width:'100%',height:chartH,pointerEvents:'none',overflow:'visible',zIndex:6}}>
                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#64748b"/>
                  </marker>
                </defs>

                {/* Existing dependency arrows */}
                {visibleTasks.map(task=>{
                  if(!task.deps?.length) return null;
                  return task.deps.map(dep=>{
                    const depId    = dep.id ?? dep;
                    const fromSide = dep.fromSide ?? 'end';
                    const toSide   = dep.toSide   ?? 'start';
                    const fromIdx  = visibleTasks.findIndex(t=>t.id===depId);
                    const toIdx    = visibleTasks.findIndex(t=>t.id===task.id);
                    if(fromIdx<0||toIdx<0) return null;
                    const from = visibleTasks[fromIdx];
                    const to   = visibleTasks[toIdx];
                    const { bx: fbx, bw: fbw } = barPos(from);
                    const { bx: tbx, bw: tbw } = barPos(to);
                    // Origin point based on fromSide
                    const x1 = fromSide === 'start' ? fbx : fbx + fbw;
                    const y1 = fromIdx * ROW_H + ROW_H / 2;
                    // Target point based on toSide
                    const x2 = toSide === 'start' ? tbx : tbx + tbw;
                    const y2 = toIdx * ROW_H + ROW_H / 2;
                    const mx = (x1 + x2) / 2;
                    return (
                      <path key={`${depId}-${task.id}`}
                        d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                        fill="none" stroke="#64748b" strokeWidth="1.5"
                        markerEnd="url(#arrowhead)"
                      />
                    );
                  });
                })}

                {/* Live dep drag line */}
                {depDrag && (()=>{
                  const fromIdx = visibleTasks.findIndex(t=>t.id===depDrag.fromId);
                  if(fromIdx<0) return null;
                  const from = visibleTasks[fromIdx];
                  const { bx, bw } = barPos(from);
                  const fx = depDrag.fromSide==='start' ? bx : bx+bw;
                  const fy = fromIdx*ROW_H + ROW_H/2;
                  // depDrag.x/y are relative to scrollContainer (includes scrollLeft/Top)
                  const tx = depDrag.x;
                  const ty = depDrag.y - HDR_H;
                  return (
                    <line x1={fx} y1={fy} x2={tx} y2={ty}
                      stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5,4"
                      markerEnd="url(#arrowhead)"
                    />
                  );
                })()}
              </svg>

              {/* ── Task bars ── */}
              {visibleTasks.map((task, rowIdx)=>{
                const { bx, bw } = barPos(task);
                const isParent = task.isParent;

                // Parent bars: thinner, centered, different style
                const bh = isParent ? ROW_H * 0.28 : ROW_H * 0.58;
                const by = isParent
                  ? rowIdx*ROW_H + (ROW_H - bh) / 2   // vertically centered but thin
                  : rowIdx*ROW_H + ROW_H * 0.21;

                const isHovered  = hoveredBar === task.id;
                const isSelected = selectedTaskId === task.id;

                return (
                  <div key={task.id}
                    data-bar-id={task.id}
                    style={{
                      position:'absolute', left:bx, top:by, width:bw, height:bh,
                      background: isParent ? task.color+'18' : task.color+'28',
                      border: isParent
                        ? `2px solid ${task.color}90`
                        : `1.5px solid ${task.color}60`,
                      outline: isSelected ? `2px solid ${task.color}` : 'none',
                      outlineOffset: 2,
                      borderRadius: isParent ? 3 : 4,
                      overflow:'visible',
                      cursor: selectedTaskId===task.id ? 'default' : 'pointer',
                      zIndex:4,
                    }}
                    onMouseEnter={()=>setHoveredBar(task.id)}
                    onMouseLeave={()=>setHoveredBar(null)}
                    onClick={e=>{ e.stopPropagation(); setSelectedTaskId(id=>id===task.id?null:task.id); }}
                    onDoubleClick={e=>{ e.stopPropagation(); onEditTask(task); }}
                  >
                    {/* Progress fill */}
                    <div style={{height:'100%',width:`${task.computedProgress}%`,background:task.color,borderRadius:3,pointerEvents:'none'}}/>
                    {/* Label */}
                    {bw>36 && (
                      <span style={{position:'absolute',left:6,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'#fff',fontWeight:500,whiteSpace:'nowrap',pointerEvents:'none',textShadow:'0 1px 2px rgba(0,0,0,0.35)',zIndex:1}}>
                        {task.name}
                      </span>
                    )}
                    {/* Resize handles — más anchos para agarrar fácil */}
                    <div data-handle="left"
                      style={{position:'absolute',left:0,top:0,width:14,height:'100%',cursor:'ew-resize',zIndex:3,borderRadius:'4px 0 0 4px',display:'flex',alignItems:'center',justifyContent:'center'}}
                      onMouseDown={e=>startBarDrag(e,task,'resize-left',e.currentTarget.parentElement)}
                    >
                      {isHovered && <div style={{width:2,height:'60%',background:task.color+'99',borderRadius:1,pointerEvents:'none'}}/>}
                    </div>
                    <div data-handle="right"
                      style={{position:'absolute',right:0,top:0,width:14,height:'100%',cursor:'ew-resize',zIndex:3,borderRadius:'0 4px 4px 0',display:'flex',alignItems:'center',justifyContent:'center'}}
                      onMouseDown={e=>startBarDrag(e,task,'resize-right',e.currentTarget.parentElement)}
                    >
                      {isHovered && <div style={{width:2,height:'60%',background:task.color+'99',borderRadius:1,pointerEvents:'none'}}/>}
                    </div>

                    {/* ── Dependency connection circles (show on hover or while dragging) ── */}
                    {(isHovered || (depDrag && depDrag.fromId===task.id)) && (
                      <>
                        {/* Start circle */}
                        <div
                          data-circle={`${task.id}-start`}
                          onMouseDown={e=>startDepDrag(e,task.id,'start')}
                          onMouseEnter={()=>setHoveredCircle({taskId:task.id,side:'start'})}
                          onMouseLeave={()=>setHoveredCircle(null)}
                          style={{
                            position:'absolute',left:-CIRCLE_R,top:'50%',transform:'translateY(-50%)',
                            width:CIRCLE_R*2,height:CIRCLE_R*2,borderRadius:'50%',
                            background: hoveredCircle?.taskId===task.id && hoveredCircle?.side==='start' ? '#3b82f6' : 'white',
                            border:'2px solid #3b82f6',cursor:'crosshair',zIndex:10,
                            boxShadow:'0 1px 4px rgba(59,130,246,0.4)',
                          }}
                        />
                        {/* End circle */}
                        <div
                          data-circle={`${task.id}-end`}
                          onMouseDown={e=>startDepDrag(e,task.id,'end')}
                          onMouseEnter={()=>setHoveredCircle({taskId:task.id,side:'end'})}
                          onMouseLeave={()=>setHoveredCircle(null)}
                          style={{
                            position:'absolute',right:-CIRCLE_R,top:'50%',transform:'translateY(-50%)',
                            width:CIRCLE_R*2,height:CIRCLE_R*2,borderRadius:'50%',
                            background: hoveredCircle?.taskId===task.id && hoveredCircle?.side==='end' ? '#3b82f6' : 'white',
                            border:'2px solid #3b82f6',cursor:'crosshair',zIndex:10,
                            boxShadow:'0 1px 4px rgba(59,130,246,0.4)',
                          }}
                        />
                      </>
                    )}
                    {/* Show target circles on ALL bars when dragging a dep */}
                    {depDrag && depDrag.fromId!==task.id && (
                      <>
                        <div data-circle={`${task.id}-start`}
                          onMouseEnter={()=>setHoveredCircle({taskId:task.id,side:'start'})}
                          onMouseLeave={()=>setHoveredCircle(null)}
                          style={{position:'absolute',left:-CIRCLE_R,top:'50%',transform:'translateY(-50%)',width:CIRCLE_R*2,height:CIRCLE_R*2,borderRadius:'50%',background:hoveredCircle?.taskId===task.id?'#22c55e':'white',border:'2px solid #22c55e',zIndex:10,cursor:'crosshair',boxShadow:'0 1px 4px rgba(34,197,94,0.4)'}}
                        />
                        <div data-circle={`${task.id}-end`}
                          onMouseEnter={()=>setHoveredCircle({taskId:task.id,side:'end'})}
                          onMouseLeave={()=>setHoveredCircle(null)}
                          style={{position:'absolute',right:-CIRCLE_R,top:'50%',transform:'translateY(-50%)',width:CIRCLE_R*2,height:CIRCLE_R*2,borderRadius:'50%',background:hoveredCircle?.taskId===task.id?'#22c55e':'white',border:'2px solid #22c55e',zIndex:10,cursor:'crosshair',boxShadow:'0 1px 4px rgba(34,197,94,0.4)'}}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
