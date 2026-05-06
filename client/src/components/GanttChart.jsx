import { useRef, useEffect, useState, useMemo } from 'react';
import { ClipboardList, ChevronRight, ChevronDown } from 'lucide-react';
import { useTasks } from '../context/TaskContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const TASK_W  = 220;
const ROW_H   = 50;
const TOP_H   = 28;
const BOT_H   = 28;
const HDR_H   = TOP_H + BOT_H;
const MS_DAY  = 86400000;

const MES_S  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MES_L  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIA_S  = ['D','L','M','X','J','V','S'];

const ZOOMS = [
  { k:'horas',   l:'Horas',   ppd:960,  pad:1   },
  { k:'dias',    l:'Días',    ppd:50,   pad:5   },
  { k:'semanas', l:'Semanas', ppd:17,   pad:14  },
  { k:'meses',   l:'Meses',   ppd:3.5,  pad:30  },
  { k:'cuartos', l:'Cuartos', ppd:1.2,  pad:90  },
  { k:'anios',   l:'Años',    ppd:0.38, pad:180 },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────
const d0      = (d) => { const r=new Date(d); r.setHours(0,0,0,0); return r; };
const d0M     = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const d0Y     = (d) => new Date(d.getFullYear(), 0, 1);
const addD    = (d,n) => new Date(d.getTime()+n*MS_DAY);
const nextM   = (d) => new Date(d.getFullYear(), d.getMonth()+1, 1);
const nextY   = (d) => new Date(d.getFullYear()+1, 0, 1);
const monday  = (d) => { const dw=d.getDay(); return addD(d0(d), dw===0?-6:1-dw); };
const isoWeek = (d) => { const j=new Date(d.getFullYear(),0,1); return Math.ceil(((d-j)/MS_DAY+j.getDay()+1)/7); };
const xOf     = (date, rs, ppd) => (date-rs)/MS_DAY*ppd;

// ─── Column generators ────────────────────────────────────────────────────────
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
    const mk=`${MES_L[w.getMonth()]} ${w.getFullYear()}`;
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
  const z=ZOOMS.find(z=>z.k===zoom)||ZOOMS[3];
  switch(zoom){
    case 'horas':   return horasCols(rs,re,z.ppd);
    case 'dias':    return diasCols(rs,re,z.ppd);
    case 'semanas': return semanasCols(rs,re,z.ppd);
    case 'cuartos': return cuartosCols(rs,re,z.ppd);
    case 'anios':   return aniosCols(rs,re,z.ppd);
    default:        return mesesCols(rs,re,z.ppd);
  }
};

// ─── Zoom Slider ──────────────────────────────────────────────────────────────
const ZoomSlider = ({ zoom, setZoom }) => {
  const idx = ZOOMS.findIndex(z=>z.k===zoom);
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'0 16px',height:40,borderBottom:'1px solid #e5e7eb',background:'#fff',justifyContent:'flex-end',flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',position:'relative',gap:0}}>
        <div style={{position:'absolute',left:8,right:8,top:'50%',height:2,background:'#d1d5db',transform:'translateY(-50%)'}} />
        {ZOOMS.map((z,i) => (
          <button key={z.k} onClick={()=>setZoom(z.k)}
            title={z.l}
            style={{
              width: i===idx?14:10, height: i===idx?14:10,
              borderRadius:'50%', border:`2px solid ${i===idx?'#374151':'#9ca3af'}`,
              background: i===idx?'#374151':'white',
              cursor:'pointer', position:'relative', zIndex:1,
              marginLeft: i>0?20:0, flexShrink:0,
              transition:'all 0.15s',
            }}
          />
        ))}
      </div>
      <span style={{fontSize:12,fontWeight:500,color:'#374151',minWidth:56,textAlign:'left'}}>{ZOOMS[idx]?.l}</span>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function GanttChart({ onEditTask }) {
  const { tasks, hiddenParents, toggleParent, updateTask } = useTasks();
  const [zoom, setZoom] = useState('semanas');
  const scrollRef  = useRef(null);
  const panRef     = useRef({ active:false, sx:0, sy:0, sl:0, st:0 });
  const dragRef    = useRef(null); // bar drag state

  // ── Visible tasks (respects collapsed parents) ──────────────────────────────
  const visibleTasks = useMemo(() => {
    const result=[];
    const add=(id,depth)=>{
      const t=tasks.find(x=>x.id===id); if(!t) return;
      result.push({...t,_depth:depth});
      if(!hiddenParents.has(id)) tasks.filter(x=>x.parentId===id).forEach(c=>add(c.id,depth+1));
    };
    tasks.filter(t=>!t.parentId).forEach(t=>add(t.id,0));
    return result;
  },[tasks,hiddenParents]);

  // ── Date range ──────────────────────────────────────────────────────────────
  const { rangeStart, rangeEnd, ppd } = useMemo(()=>{
    const z=ZOOMS.find(z=>z.k===zoom)||ZOOMS[3];
    // Extra padding multiplier so the grid always extends well beyond the last task
    const padExtra = 3;
    if(!tasks.length) {
      const n=new Date(); return { rangeStart:addD(n,-z.pad*padExtra), rangeEnd:addD(n,z.pad*padExtra*4), ppd:z.ppd };
    }
    const starts=tasks.map(t=>new Date(t.start+'T00:00:00'));
    const ends=tasks.map(t=>new Date(t.end+'T23:59:59'));
    const mn=new Date(Math.min(...starts)), mx=new Date(Math.max(...ends));
    return { rangeStart:addD(mn,-z.pad*padExtra), rangeEnd:addD(mx,z.pad*padExtra), ppd:z.ppd };
  },[tasks,zoom]);

  const totalWidth = useMemo(()=> (rangeEnd-rangeStart)/MS_DAY*ppd, [rangeEnd,rangeStart,ppd]);
  const { top: topGroups, cols } = useMemo(()=> getCols(rangeStart,rangeEnd,zoom), [rangeStart,rangeEnd,zoom]);

  // ── Pan (empty area) ────────────────────────────────────────────────────────
  useEffect(()=>{
    const el=scrollRef.current; if(!el) return;
    const down=(e)=>{
      if(e.button!==0) return;
      if(e.target.dataset.barId||e.target.dataset.handle) return; // handled by bar
      panRef.current={active:true,sx:e.clientX,sy:e.clientY,sl:el.scrollLeft,st:el.scrollTop};
      el.style.cursor='grabbing';
    };
    const move=(e)=>{
      if(!panRef.current.active) return;
      el.scrollLeft=panRef.current.sl-(e.clientX-panRef.current.sx);
      el.scrollTop=panRef.current.st-(e.clientY-panRef.current.sy);
    };
    const up=()=>{ panRef.current.active=false; el.style.cursor='grab'; };
    document.addEventListener('mousedown',down,{capture:true});
    document.addEventListener('mousemove',move);
    document.addEventListener('mouseup',up);
    return ()=>{
      document.removeEventListener('mousedown',down,{capture:true});
      document.removeEventListener('mousemove',move);
      document.removeEventListener('mouseup',up);
    };
  },[]);

  // ── Bar drag (move + resize) ─────────────────────────────────────────────────
  useEffect(()=>{
    const move=(e)=>{
      const dr=dragRef.current; if(!dr) return;
      const dx=e.clientX-dr.startX;
      const ddDays=dx/ppd;
      if(dr.type==='move') {
        const ns=addD(new Date(dr.origStart),ddDays);
        const ne=addD(new Date(dr.origEnd),ddDays);
        dr.preview={start:ns.toISOString().split('T')[0],end:ne.toISOString().split('T')[0]};
      } else if(dr.type==='resize-right') {
        const ne=addD(new Date(dr.origEnd),ddDays);
        if(ne>new Date(dr.origStart)) dr.preview={start:dr.origStart,end:ne.toISOString().split('T')[0]};
      } else if(dr.type==='resize-left') {
        const ns=addD(new Date(dr.origStart),ddDays);
        if(ns<new Date(dr.origEnd)) dr.preview={start:ns.toISOString().split('T')[0],end:dr.origEnd};
      }
      // Visual update via CSS variable on the bar element
      if(dr.el && dr.preview) {
        const bx=xOf(new Date(dr.preview.start+'T00:00:00'),rangeStart,ppd);
        const bw=Math.max(8,xOf(new Date(dr.preview.end+'T23:59:59'),rangeStart,ppd)-bx);
        dr.el.style.left=bx+'px';
        dr.el.style.width=bw+'px';
      }
    };
    const up=()=>{
      const dr=dragRef.current; if(!dr) return;
      if(dr.preview) updateTask(dr.taskId,dr.preview);
      dragRef.current=null;
      document.body.style.cursor='';
    };
    document.addEventListener('mousemove',move);
    document.addEventListener('mouseup',up);
    return ()=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); };
  },[ppd,rangeStart,updateTask]);

  const startBarDrag=(e,task,type,barEl)=>{
    e.preventDefault(); e.stopPropagation();
    dragRef.current={
      taskId:task.id, type, startX:e.clientX,
      origStart:task.start, origEnd:task.end,
      el:barEl, preview:null,
    };
    document.body.style.cursor=type==='move'?'grabbing':'ew-resize';
  };

  if(!tasks.length) return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ZoomSlider zoom={zoom} setZoom={setZoom} />
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3 text-gray-300">
          <ClipboardList size={44} strokeWidth={1.2} />
          <p className="text-sm font-medium text-gray-500">Sin tareas</p>
          <p className="text-xs text-gray-400">Agrega tu primera tarea en el panel izquierdo</p>
        </div>
      </div>
    </div>
  );

  const chartH = Math.max(visibleTasks.length*ROW_H, 300);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <ZoomSlider zoom={zoom} setZoom={setZoom} />

      {/* Scrollable area */}
      <div ref={scrollRef} id="gantt-container" style={{flex:1,overflow:'auto',cursor:'grab',userSelect:'none'}}>
        <div style={{display:'flex',minWidth:'100%',minHeight:HDR_H+chartH}}>

          {/* ── Left: task name column (sticky) ── */}
          <div style={{width:TASK_W,flexShrink:0,position:'sticky',left:0,zIndex:20,background:'#fff',borderRight:'1px solid #e5e7eb'}}>
            {/* Header */}
            <div style={{height:HDR_H,position:'sticky',top:0,zIndex:30,background:'#f9fafb',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',paddingLeft:16}}>
              <span style={{fontSize:12,fontWeight:600,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.05em'}}>Tarea</span>
            </div>
            {/* Task rows */}
            {visibleTasks.map((task)=>{
              const isParent=task.isParent;
              const collapsed=hiddenParents.has(task.id);
              return (
                <div key={task.id} onClick={()=>onEditTask(task)}
                  style={{height:ROW_H,display:'flex',alignItems:'center',paddingLeft:8+task._depth*16,paddingRight:8,borderBottom:'1px solid #f3f4f6',cursor:'pointer',gap:4}}
                  className="hover:bg-gray-50 group transition-colors"
                >
                  {isParent
                    ? <button onClick={e=>{e.stopPropagation();toggleParent(task.id);}}
                        style={{background:'none',border:'none',cursor:'pointer',padding:2,color:'#9ca3af',flexShrink:0,display:'flex',alignItems:'center'}}>
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

          {/* ── Right: timeline + bars (fills remaining space) ── */}
          <div style={{flex:1,minWidth:totalWidth,position:'relative'}}>

            {/* Sticky header */}
            <div style={{position:'sticky',top:0,zIndex:10,height:HDR_H,background:'#f9fafb',borderBottom:'1px solid #e5e7eb'}}>
              {/* Top row: groups */}
              <div style={{height:TOP_H,display:'flex',borderBottom:'1px solid #e5e7eb',overflow:'visible'}}>
                {topGroups.map((g,i)=>(
                  <div key={i} style={{width:g.px,flexShrink:0,display:'flex',alignItems:'center',paddingLeft:8,borderRight:'1px solid #e5e7eb',fontSize:11,fontWeight:600,color:'#374151',overflow:'hidden',whiteSpace:'nowrap'}}>
                    {g.label}
                  </div>
                ))}
                {/* Empty fill to extend header to full width */}
                <div style={{flex:1,borderRight:'none'}}/>
              </div>
              {/* Bottom row: columns */}
              <div style={{height:BOT_H,display:'flex',overflow:'visible'}}>
                {cols.map((c,i)=>(
                  <div key={i} style={{
                    width:c.px,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                    borderRight:'1px solid #e5e7eb',fontSize:10,color: c.isWE?'#3b82f6':'#6b7280',
                    background: c.isWE?'rgba(219,234,254,0.4)':'transparent',
                    overflow:'hidden',
                  }}>
                    <span style={{fontWeight:500,lineHeight:1}}>{c.label}</span>
                    {c.sub && <span style={{fontSize:9,marginTop:1,opacity:0.8}}>{c.sub}</span>}
                  </div>
                ))}
                {/* Empty fill */}
                <div style={{flex:1}}/>
              </div>
            </div>

            {/* Chart body — also fills full width with subtle grid */}
            <div style={{position:'relative',height:chartH,width:'100%'}}>

              {/* Full-width horizontal row stripes */}
              {visibleTasks.map((_,i)=>(
                <div key={i} style={{position:'absolute',left:0,top:i*ROW_H,width:'100%',height:ROW_H,background: i%2===0?'transparent':'rgba(249,250,251,0.6)',pointerEvents:'none'}}/>
              ))}

              {/* Weekend column highlights */}
              {cols.filter(c=>c.isWE).map((c,i)=>(
                <div key={i} style={{position:'absolute',left:c.x,top:0,width:c.px,height:'100%',background:'rgba(219,234,254,0.25)',pointerEvents:'none'}}/>
              ))}

              {/* Vertical grid lines — extend across full chart */}
              {cols.map((c,i)=>(
                <div key={i} style={{position:'absolute',left:c.x,top:0,width:1,height:'100%',background:'#e5e7eb',pointerEvents:'none'}}/>
              ))}

              {/* Right-edge vertical line so grid doesn't look cut off */}
              <div style={{position:'absolute',left:totalWidth,top:0,width:1,height:'100%',background:'#e5e7eb',pointerEvents:'none'}}/>

              {/* Today line */}
              {(()=>{
                const todayX=xOf(new Date(),rangeStart,ppd);
                if(todayX<0||todayX>totalWidth+500) return null;
                return (
                  <div style={{position:'absolute',left:todayX,top:0,width:2,height:'100%',background:'rgba(59,130,246,0.5)',zIndex:5,pointerEvents:'none'}}>
                    <div style={{position:'absolute',top:0,left:-16,background:'#3b82f6',color:'white',fontSize:9,fontWeight:600,padding:'1px 4px',borderRadius:3,whiteSpace:'nowrap'}}>HOY</div>
                  </div>
                );
              })()}

              {/* Horizontal row separator lines */}
              {visibleTasks.map((_,i)=>(
                <div key={i} style={{position:'absolute',left:0,top:(i+1)*ROW_H-1,width:'100%',height:1,background:'#f3f4f6',pointerEvents:'none'}}/>
              ))}

              {/* Dependency arrows SVG */}
              <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',overflow:'visible'}}>
                {visibleTasks.map(task=>{
                  if(!task.parentId) return null;
                  const parentIdx=visibleTasks.findIndex(t=>t.id===task.parentId);
                  const childIdx=visibleTasks.findIndex(t=>t.id===task.id);
                  if(parentIdx<0||childIdx<0) return null;
                  const pEndX=xOf(new Date(visibleTasks[parentIdx].end+'T23:59:59'),rangeStart,ppd);
                  const pY=parentIdx*ROW_H+ROW_H/2;
                  const cStartX=xOf(new Date(task.start+'T00:00:00'),rangeStart,ppd);
                  const cY=childIdx*ROW_H+ROW_H/2;
                  const midX=(pEndX+cStartX)/2;
                  return (
                    <path key={task.id}
                      d={`M${pEndX},${pY} C${midX},${pY} ${midX},${cY} ${cStartX},${cY}`}
                      fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,3"
                    />
                  );
                })}
              </svg>

              {/* Task bars */}
              {visibleTasks.map((task,rowIdx)=>{
                const bx=xOf(new Date(task.start+'T00:00:00'),rangeStart,ppd);
                const bw=Math.max(8,xOf(new Date(task.end+'T23:59:59'),rangeStart,ppd)-bx);
                const by=rowIdx*ROW_H+ROW_H*0.22;
                const bh=ROW_H*0.56;
                return (
                  <div key={task.id} data-bar-id={task.id}
                    style={{
                      position:'absolute',left:bx,top:by,width:bw,height:bh,
                      background:task.color+'30', border:`1px solid ${task.color}55`,
                      borderRadius:4, overflow:'hidden', cursor:'grab',
                    }}
                    onMouseDown={e=>{ if(!e.target.dataset.handle) startBarDrag(e,task,'move',e.currentTarget); }}
                    onDoubleClick={e=>{ e.stopPropagation(); onEditTask(task); }}
                  >
                    {/* Progress fill */}
                    <div style={{height:'100%',width:`${task.computedProgress}%`,background:task.color,borderRadius:3}}/>
                    {/* Label */}
                    {bw>30 && (
                      <span style={{position:'absolute',left:6,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'#fff',fontWeight:500,whiteSpace:'nowrap',pointerEvents:'none',textShadow:'0 1px 2px rgba(0,0,0,0.3)'}}>
                        {task.name}
                      </span>
                    )}
                    {/* Resize handles */}
                    <div data-handle="left" style={{position:'absolute',left:0,top:0,width:8,height:'100%',cursor:'ew-resize',zIndex:2}}
                      onMouseDown={e=>startBarDrag(e,task,'resize-left',e.currentTarget.parentElement)}/>
                    <div data-handle="right" style={{position:'absolute',right:0,top:0,width:8,height:'100%',cursor:'ew-resize',zIndex:2}}
                      onMouseDown={e=>startBarDrag(e,task,'resize-right',e.currentTarget.parentElement)}/>
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
