import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #080a0f; --s1: #0e1118; --s2: #141720; --s3: #1a1e2a;
      --b1: #1e2335; --b2: #2a3050;
      --acc: #ff5c2e; --acc2: #ff8c5a;
      --blue: #4c8eff; --green: #2eff9a; --yellow: #ffd12e;
      --t1: #f0f4ff; --t2: #8892aa; --t3: #3d4563;
      --font: 'Outfit', sans-serif; --mono: 'JetBrains Mono', monospace;
    }
    html, body, #root { height: 100%; background: var(--bg); color: var(--t1); font-family: var(--font); }
    * { scrollbar-width: thin; scrollbar-color: var(--b2) transparent; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: var(--b2); border-radius: 2px; }
    input, select, textarea {
      background: var(--s2); color: var(--t1); border: 1.5px solid var(--b1);
      border-radius: 10px; padding: 12px 14px; font-family: var(--font);
      font-size: 16px; width: 100%; outline: none; transition: border-color .18s;
      -webkit-appearance: none; appearance: none;
    }
    input:focus, select:focus, textarea:focus { border-color: var(--acc); }
    select option { background: var(--s2); }
    button { cursor: pointer; font-family: var(--font); -webkit-tap-highlight-color: transparent; }
    @keyframes up { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    .au { animation: up .2s ease forwards; }
    @keyframes sl { from { opacity:0; transform:translateX(-100%); } to { opacity:1; transform:translateX(0); } }
  `}</style>
);

// helpers
const fmt = (n, d=0) => Number(n).toLocaleString("cs-CZ", {minimumFractionDigits:d, maximumFractionDigits:d});
const fmtD = d => d ? new Date(d).toLocaleDateString("cs-CZ") : "";
const uid = () => Math.random().toString(36).slice(2,9);

// sample data
const DEF_V = [
  {id:"v1",brand:"Škoda",model:"Octavia",year:2019,vin:"TMBZZZ1Z9K1234567",spz:"1AB 2345",fuel:"Benzín",color:"#4c8eff"},
  {id:"v2",brand:"Toyota",model:"Yaris",year:2021,vin:"SB1KS3JE20E456789",spz:"2CD 6789",fuel:"Hybrid",color:"#2eff9a"},
];
const DEF_F = [
  {id:"f1",vid:"v1",date:"2024-01-08",location:"Shell Brno",fuelType:"Benzín Natural 95",liters:45.2,pricePerLiter:37.90,total:1713.08,km:87450},
  {id:"f2",vid:"v1",date:"2024-01-29",location:"OMV Ostrava",fuelType:"Benzín Natural 95",liters:42.8,pricePerLiter:38.20,total:1635.16,km:87920},
  {id:"f3",vid:"v1",date:"2024-02-15",location:"Benzina Praha",fuelType:"Benzín Natural 95",liters:48.1,pricePerLiter:37.50,total:1803.75,km:88430},
  {id:"f4",vid:"v1",date:"2024-03-02",location:"Shell Brno",fuelType:"Benzín Natural 95",liters:44.5,pricePerLiter:38.80,total:1726.60,km:88980},
  {id:"f5",vid:"v1",date:"2024-03-20",location:"OMV Ostrava",fuelType:"Benzín Natural 95",liters:46.3,pricePerLiter:39.10,total:1810.33,km:89510},
  {id:"f6",vid:"v1",date:"2024-04-05",location:"Benzina",fuelType:"Benzín Natural 95",liters:43.7,pricePerLiter:38.50,total:1682.45,km:90080},
];
const DEF_R = [
  {id:"r1",vid:"v1",date:"2024-02-10",km:88100,material:"Brzdové destičky přední",note:"ATE 13.0460-2785.2",qty:1,unit:"sada",matPrice:890,laborPrice:600,who:"Autoservis Novák",comment:"Zadní ještě OK"},
  {id:"r2",vid:"v1",date:"2024-03-15",km:89200,material:"Motorový olej 5W-40",note:"Castrol Edge 5W-40",qty:5,unit:"l",matPrice:750,laborPrice:350,who:"Svépomocí",comment:""},
];
const DEF_A = [
  {id:"a1",vid:"v1",date:"2024-01-15",km:87600,name:"Přední kamera",note:"Viofo A119 Mini 2",qty:1,unit:"ks",price:2890,comment:"4K GPS WDR"},
];

// ── UI primitives ─────────────────────────────────────────────────────────────
const Pill = ({c="var(--acc)",children}) => (
  <span style={{background:c+"18",color:c,border:`1px solid ${c}30`,borderRadius:5,padding:"2px 8px",fontSize:11,fontWeight:600,letterSpacing:".05em",whiteSpace:"nowrap"}}>{children}</span>
);

const StatBox = ({label,val,unit,c="var(--acc)"}) => (
  <div style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12,padding:"14px 16px",position:"relative",overflow:"hidden",flex:1,minWidth:0}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${c},transparent)`}}/>
    <div style={{fontSize:10,fontWeight:600,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",marginBottom:6}}>{label}</div>
    <div style={{fontSize:22,fontWeight:800,color:c,lineHeight:1}}>{val}<span style={{fontSize:12,fontWeight:400,color:"var(--t2)",marginLeft:3}}>{unit}</span></div>
  </div>
);

const Btn = ({onClick,children,ghost,danger,full,sm}) => (
  <button onClick={onClick} style={{
    background: danger?"rgba(239,68,68,.15)":ghost?"transparent":`linear-gradient(135deg,var(--acc),var(--acc2))`,
    border: `1.5px solid ${danger?"rgba(239,68,68,.5)":ghost?"var(--b2)":"transparent"}`,
    color: danger?"#ef4444":ghost?"var(--t2)":"#fff",
    borderRadius:10, padding:sm?"10px 16px":"13px 22px",
    fontSize:sm?13:15, fontWeight:700, letterSpacing:".02em",
    width:full?"100%":"auto", transition:"all .15s",
    boxShadow:ghost||danger?"none":"0 2px 16px rgba(255,92,46,.3)",
    touchAction:"manipulation",
  }}>{children}</button>
);

const IBtn = ({onClick,title,children,danger}) => (
  <button onClick={onClick} title={title} style={{
    background:"var(--s3)",border:"1.5px solid var(--b1)",borderRadius:8,
    padding:"8px 12px",color:danger?"#ef4444":"var(--t2)",fontSize:14,
    touchAction:"manipulation",minWidth:40,minHeight:40,
  }}>{children}</button>
);

// ── MODAL ─────────────────────────────────────────────────────────────────────
const Modal = ({title,onClose,children}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:0}} onClick={onClose}>
    <div style={{background:"var(--s1)",border:"1.5px solid var(--b2)",borderRadius:"18px 18px 0 0",width:"100%",maxWidth:600,maxHeight:"92vh",overflowY:"auto",padding:24,paddingBottom:40}} onClick={e=>e.stopPropagation()}>
      <div style={{width:40,height:4,background:"var(--b2)",borderRadius:2,margin:"0 auto 20px"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontSize:20,fontWeight:800}}>{title}</h2>
        <button onClick={onClose} style={{background:"var(--s3)",border:"1.5px solid var(--b1)",borderRadius:8,color:"var(--t2)",fontSize:18,width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center",touchAction:"manipulation"}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const FR = ({label,children,half}) => (
  <div style={{display:"flex",flexDirection:"column",gap:6,gridColumn:half?"span 1":"1/-1"}}>
    <label style={{fontSize:11,fontWeight:600,letterSpacing:".1em",color:"var(--t3)",textTransform:"uppercase"}}>{label}</label>
    {children}
  </div>
);

const DF = ({from,to,onFrom,onTo}) => (
  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
    <span style={{fontSize:11,fontWeight:600,color:"var(--t3)"}}>OD</span>
    <input type="date" value={from} onChange={e=>onFrom(e.target.value)} style={{width:150,fontSize:14,padding:"8px 10px"}}/>
    <span style={{fontSize:11,fontWeight:600,color:"var(--t3)"}}>DO</span>
    <input type="date" value={to} onChange={e=>onTo(e.target.value)} style={{width:150,fontSize:14,padding:"8px 10px"}}/>
  </div>
);

// ── FUELING ───────────────────────────────────────────────────────────────────
const FuelMod = ({vid,fueling,setFueling}) => {
  const [showF,setShowF] = useState(false);
  const [editId,setEditId] = useState(null);
  const [fFrom,setFFrom] = useState("");
  const [fTo,setFTo] = useState("");
  const ef = {date:new Date().toISOString().slice(0,10),location:"",fuelType:"Benzín Natural 95",liters:"",pricePerLiter:"",total:"",km:""};
  const [form,setForm] = useState(ef);

  const vd = fueling.filter(f=>f.vid===vid).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const enriched = vd.map((f,i)=>{
    const prev = vd[i-1];
    const driven = prev?f.km-prev.km:null;
    const cons = driven&&driven>0?(f.liters/driven*100):null;
    return {...f,driven,cons};
  });
  const filtered = enriched.filter(f=>{
    if(fFrom&&f.date<fFrom)return false;
    if(fTo&&f.date>fTo)return false;
    return true;
  });
  const avgCons = useMemo(()=>{const v=filtered.filter(f=>f.cons);return v.length?v.reduce((s,f)=>s+f.cons,0)/v.length:null;},[filtered]);
  const totalCost = useMemo(()=>filtered.reduce((s,f)=>s+f.total,0),[filtered]);
  const chartP = filtered.map(f=>({d:fmtD(f.date),v:f.pricePerLiter}));
  const chartC = filtered.filter(f=>f.cons).map(f=>({d:fmtD(f.date),v:+f.cons.toFixed(2)}));

  const sf = (k,v)=>{
    const u={...form,[k]:v};
    if(k==="liters"||k==="pricePerLiter"){
      const l=parseFloat(k==="liters"?v:u.liters)||0;
      const p=parseFloat(k==="pricePerLiter"?v:u.pricePerLiter)||0;
      u.total=(l*p).toFixed(2);
    }
    setForm(u);
  };
  const openNew=()=>{setForm(ef);setEditId(null);setShowF(true);};
  const openEdit=f=>{setForm({...f,liters:String(f.liters),pricePerLiter:String(f.pricePerLiter),km:String(f.km)});setEditId(f.id);setShowF(true);};
  const save=()=>{
    const total=parseFloat(form.liters)*parseFloat(form.pricePerLiter);
    const rec={...form,vid,id:editId||uid(),liters:parseFloat(form.liters),pricePerLiter:parseFloat(form.pricePerLiter),total:isNaN(total)?parseFloat(form.total)||0:total,km:parseInt(form.km)};
    setFueling(p=>editId?p.map(f=>f.id===editId?rec:f):[...p,rec]);
    setShowF(false);
  };
  const del=id=>{if(window.confirm("Smazat záznam?"))setFueling(p=>p.filter(f=>f.id!==id));};

  return (
    <div className="au">
      {/* Stats */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <StatBox label="Průměrná spotřeba" val={avgCons?fmt(avgCons,1):"—"} unit="l/100km" c="var(--acc)"/>
        <StatBox label="Celková útrata" val={fmt(totalCost)} unit="Kč" c="var(--yellow)"/>
      </div>
      <StatBox label="Počet tankování" val={filtered.length} unit="záznamů" c="var(--blue)"/>

      {/* Filter + Add */}
      <div style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12,padding:"12px 14px",margin:"14px 0",display:"flex",flexDirection:"column",gap:12}}>
        <DF from={fFrom} to={fTo} onFrom={setFFrom} onTo={setFTo}/>
        <Btn onClick={openNew} full>+ Přidat tankování</Btn>
      </div>

      {/* Charts */}
      {filtered.length>1&&(
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:14}}>
          {[{label:"Cena PHM (Kč/l)",data:chartP,color:"var(--yellow)"},{label:"Spotřeba (l/100km)",data:chartC,color:"var(--acc)"}].map(({label,data,color})=>(
            <div key={label} style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12,padding:"14px 14px 8px"}}>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",marginBottom:10}}>{label}</div>
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={data}>
                  <defs><linearGradient id={`g${label}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={.25}/><stop offset="95%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--b1)"/>
                  <XAxis dataKey="d" tick={{fill:"var(--t3)",fontSize:9}} tickLine={false}/>
                  <YAxis tick={{fill:"var(--t3)",fontSize:9}} tickLine={false} axisLine={false} domain={["auto","auto"]}/>
                  <Tooltip contentStyle={{background:"var(--s2)",border:"1.5px solid var(--b2)",borderRadius:8,color:"var(--t1)",fontSize:12}}/>
                  <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#g${label})`} dot={{fill:color,r:3,strokeWidth:0}}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      {/* Records as cards on mobile */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[...filtered].reverse().map(f=>(
          <div key={f.id} style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12,padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>{fmtD(f.date)}</div>
                <div style={{color:"var(--t2)",fontSize:13,marginTop:2}}>{f.location}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:18,fontWeight:800,color:"var(--acc)",fontFamily:"var(--mono)"}}>{fmt(f.total)} Kč</div>
                <div style={{fontSize:11,color:"var(--t3)",marginTop:1}}>{fmt(f.pricePerLiter,2)} Kč/l</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
              <Pill c="var(--blue)">{f.fuelType}</Pill>
              <Pill c="var(--t2)">{fmt(f.liters,1)} l</Pill>
              <Pill c="var(--t2)">{fmt(f.km)} km</Pill>
              {f.driven&&<Pill c="var(--green)">+{fmt(f.driven)} km</Pill>}
              {f.cons&&<Pill c="var(--acc)">{fmt(f.cons,1)} l/100</Pill>}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <IBtn onClick={()=>openEdit(f)}>✏️</IBtn>
              <IBtn onClick={()=>del(f.id)} danger>🗑</IBtn>
            </div>
          </div>
        ))}
        {filtered.length===0&&(
          <div style={{padding:40,textAlign:"center",color:"var(--t3)",background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12}}>
            <div style={{fontSize:36,marginBottom:8}}>⛽</div>
            <div>Přidej první tankování!</div>
          </div>
        )}
      </div>

      {showF&&(
        <Modal title={editId?"Upravit tankování":"Nové tankování"} onClose={()=>setShowF(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <FR label="Datum" half><input type="date" value={form.date} onChange={e=>sf("date",e.target.value)}/></FR>
            <FR label="Stav km" half><input type="number" inputMode="numeric" value={form.km} onChange={e=>sf("km",e.target.value)} placeholder="89500"/></FR>
            <FR label="Místo tankování"><input value={form.location} onChange={e=>sf("location",e.target.value)} placeholder="Shell, OMV..."/></FR>
            <FR label="Typ paliva"><select value={form.fuelType} onChange={e=>sf("fuelType",e.target.value)}>{["Benzín Natural 95","Benzín Natural 98","Nafta","LPG","CNG","Hybrid","Elektřina"].map(o=><option key={o}>{o}</option>)}</select></FR>
            <FR label="Litry" half><input type="number" inputMode="decimal" step=".01" value={form.liters} onChange={e=>sf("liters",e.target.value)} placeholder="45.5"/></FR>
            <FR label="Kč / litr" half><input type="number" inputMode="decimal" step=".01" value={form.pricePerLiter} onChange={e=>sf("pricePerLiter",e.target.value)} placeholder="38.90"/></FR>
            <FR label="Celkem Kč"><input type="number" inputMode="decimal" step=".01" value={form.total||""} onChange={e=>sf("total",e.target.value)} placeholder="Vypočítá se automaticky" style={{color:"var(--acc)",fontWeight:700}}/></FR>
          </div>
          <div style={{display:"flex",gap:10,marginTop:22}}>
            <Btn ghost onClick={()=>setShowF(false)} full>Zrušit</Btn>
            <Btn onClick={save} full>Uložit</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── REPAIRS ───────────────────────────────────────────────────────────────────
const RepMod = ({vid,repairs,setRepairs}) => {
  const [showF,setShowF] = useState(false);
  const [editId,setEditId] = useState(null);
  const [fFrom,setFFrom] = useState("");
  const [fTo,setFTo] = useState("");
  const ef = {date:new Date().toISOString().slice(0,10),km:"",material:"",note:"",qty:"",unit:"ks",matPrice:"",laborPrice:"",who:"",comment:""};
  const [form,setForm] = useState(ef);
  const s = (k,v)=>setForm(p=>({...p,[k]:v}));

  const vd = repairs.filter(r=>r.vid===vid);
  const filtered = vd.filter(r=>{
    if(fFrom&&r.date<fFrom)return false;
    if(fTo&&r.date>fTo)return false;
    return true;
  }).sort((a,b)=>new Date(b.date)-new Date(a.date));

  const tMat = filtered.reduce((s,r)=>s+parseFloat(r.matPrice||0),0);
  const tLab = filtered.reduce((s,r)=>s+parseFloat(r.laborPrice||0),0);

  const openNew=()=>{setForm(ef);setEditId(null);setShowF(true);};
  const openEdit=r=>{setForm({...r,matPrice:String(r.matPrice),laborPrice:String(r.laborPrice),km:String(r.km)});setEditId(r.id);setShowF(true);};
  const save=()=>{
    const rec={...form,vid,id:editId||uid(),matPrice:parseFloat(form.matPrice)||0,laborPrice:parseFloat(form.laborPrice)||0,km:parseInt(form.km)||0};
    setRepairs(p=>editId?p.map(r=>r.id===editId?rec:r):[...p,rec]);
    setShowF(false);
  };
  const del=id=>{if(window.confirm("Smazat?"))setRepairs(p=>p.filter(r=>r.id!==id));};

  return (
    <div className="au">
      <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
        <StatBox label="Materiál" val={fmt(tMat)} unit="Kč" c="var(--blue)"/>
        <StatBox label="Práce" val={fmt(tLab)} unit="Kč" c="var(--yellow)"/>
      </div>
      <StatBox label="Celkem za opravy" val={fmt(tMat+tLab)} unit="Kč" c="var(--acc)"/>
      <div style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12,padding:"12px 14px",margin:"14px 0",display:"flex",flexDirection:"column",gap:12}}>
        <DF from={fFrom} to={fTo} onFrom={setFFrom} onTo={setFTo}/>
        <Btn onClick={openNew} full>+ Přidat opravu</Btn>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(r=>{
          const total=parseFloat(r.matPrice||0)+parseFloat(r.laborPrice||0);
          return(
            <div key={r.id} style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12,padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{flex:1,minWidth:0,marginRight:12}}>
                  <div style={{fontWeight:700,fontSize:15}}>{r.material}</div>
                  {r.note&&<div style={{fontSize:11,color:"var(--t3)",fontFamily:"var(--mono)",marginTop:2}}>#{r.note}</div>}
                </div>
                <div style={{fontSize:18,fontWeight:800,color:"var(--acc)",fontFamily:"var(--mono)",whiteSpace:"nowrap"}}>{fmt(total)} Kč</div>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
                <Pill c="var(--t2)">{fmtD(r.date)}</Pill>
                <Pill c="var(--t2)">{fmt(r.km)} km</Pill>
                <Pill c="var(--blue)">{r.qty} {r.unit}</Pill>
                {r.who&&<Pill c="var(--t2)">🔧 {r.who}</Pill>}
              </div>
              <div style={{fontSize:11,color:"var(--t3)",marginBottom:8}}>mat: {fmt(r.matPrice)} Kč · práce: {fmt(r.laborPrice)} Kč</div>
              {r.comment&&<div style={{fontSize:12,color:"var(--t3)",fontStyle:"italic",padding:"8px 10px",background:"var(--s3)",borderRadius:8,borderLeft:"3px solid var(--b2)",marginBottom:8}}>{r.comment}</div>}
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <IBtn onClick={()=>openEdit(r)}>✏️</IBtn>
                <IBtn onClick={()=>del(r.id)} danger>🗑</IBtn>
              </div>
            </div>
          );
        })}
        {filtered.length===0&&<div style={{padding:40,textAlign:"center",color:"var(--t3)",background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12}}><div style={{fontSize:36,marginBottom:8}}>🔧</div><div>Přidej první opravu!</div></div>}
      </div>
      {showF&&(
        <Modal title={editId?"Upravit opravu":"Nová oprava"} onClose={()=>setShowF(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <FR label="Datum" half><input type="date" value={form.date} onChange={e=>s("date",e.target.value)}/></FR>
            <FR label="Stav km" half><input type="number" inputMode="numeric" value={form.km} onChange={e=>s("km",e.target.value)} placeholder="89500"/></FR>
            <FR label="Materiál / díl"><input value={form.material} onChange={e=>s("material",e.target.value)} placeholder="Brzdové destičky..."/></FR>
            <FR label="Kat. číslo / poznámka"><input value={form.note} onChange={e=>s("note",e.target.value)} placeholder="ATE 13.0460-2785.2"/></FR>
            <FR label="Množství" half><input type="number" inputMode="decimal" value={form.qty} onChange={e=>s("qty",e.target.value)} placeholder="1"/></FR>
            <FR label="Jednotka" half><select value={form.unit} onChange={e=>s("unit",e.target.value)}>{["ks","sada","l","ml","g","kg","m"].map(o=><option key={o}>{o}</option>)}</select></FR>
            <FR label="Cena materiálu (Kč)" half><input type="number" inputMode="numeric" value={form.matPrice} onChange={e=>s("matPrice",e.target.value)} placeholder="890"/></FR>
            <FR label="Cena práce (Kč)" half><input type="number" inputMode="numeric" value={form.laborPrice} onChange={e=>s("laborPrice",e.target.value)} placeholder="600"/></FR>
            <FR label="Kdo provedl"><input value={form.who} onChange={e=>s("who",e.target.value)} placeholder="Autoservis / Svépomocí"/></FR>
            <FR label="Poznámka"><textarea value={form.comment} onChange={e=>s("comment",e.target.value)} rows={2} placeholder="Volná poznámka..."/></FR>
          </div>
          <div style={{display:"flex",gap:10,marginTop:22}}>
            <Btn ghost onClick={()=>setShowF(false)} full>Zrušit</Btn>
            <Btn onClick={save} full>Uložit</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── ADDONS ────────────────────────────────────────────────────────────────────
const AddMod = ({vid,addons,setAddons}) => {
  const [showF,setShowF] = useState(false);
  const [editId,setEditId] = useState(null);
  const ef = {date:new Date().toISOString().slice(0,10),km:"",name:"",note:"",qty:"1",unit:"ks",price:"",comment:""};
  const [form,setForm] = useState(ef);
  const s = (k,v)=>setForm(p=>({...p,[k]:v}));

  const vd = addons.filter(a=>a.vid===vid).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const total = vd.reduce((s,a)=>s+parseFloat(a.price||0),0);

  const openNew=()=>{setForm(ef);setEditId(null);setShowF(true);};
  const openEdit=a=>{setForm({...a,price:String(a.price),km:String(a.km)});setEditId(a.id);setShowF(true);};
  const save=()=>{
    const rec={...form,vid,id:editId||uid(),price:parseFloat(form.price)||0,km:parseInt(form.km)||0};
    setAddons(p=>editId?p.map(a=>a.id===editId?rec:a):[...p,rec]);
    setShowF(false);
  };
  const del=id=>{if(window.confirm("Smazat?"))setAddons(p=>p.filter(a=>a.id!==id));};

  return (
    <div className="au">
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <StatBox label="Celkem doplňky" val={fmt(total)} unit="Kč" c="var(--green)"/>
        <StatBox label="Počet položek" val={vd.length} unit="zázn." c="var(--blue)"/>
      </div>
      <Btn onClick={openNew} full>+ Přidat doplněk</Btn>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:14}}>
        {vd.map(a=>(
          <div key={a.id} style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12,padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{flex:1,minWidth:0,marginRight:12}}>
                <div style={{fontWeight:700,fontSize:15}}>{a.name}</div>
                {a.note&&<div style={{fontSize:11,color:"var(--t3)",fontFamily:"var(--mono)",marginTop:2}}>#{a.note}</div>}
              </div>
              <div style={{fontSize:18,fontWeight:800,color:"var(--green)",whiteSpace:"nowrap"}}>{fmt(a.price)} Kč</div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
              <Pill c="var(--t2)">{fmtD(a.date)}</Pill>
              <Pill c="var(--t2)">{fmt(a.km)} km</Pill>
              <Pill c="var(--green)">{a.qty} {a.unit}</Pill>
            </div>
            {a.comment&&<div style={{fontSize:12,color:"var(--t3)",fontStyle:"italic",padding:"8px 10px",background:"var(--s3)",borderRadius:8,borderLeft:"3px solid var(--b2)",marginBottom:8}}>{a.comment}</div>}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <IBtn onClick={()=>openEdit(a)}>✏️</IBtn>
              <IBtn onClick={()=>del(a.id)} danger>🗑</IBtn>
            </div>
          </div>
        ))}
        {vd.length===0&&<div style={{padding:40,textAlign:"center",color:"var(--t3)",background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12}}><div style={{fontSize:36,marginBottom:8}}>📦</div><div>Přidej první doplněk!</div></div>}
      </div>
      {showF&&(
        <Modal title={editId?"Upravit doplněk":"Nový doplněk"} onClose={()=>setShowF(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <FR label="Datum" half><input type="date" value={form.date} onChange={e=>s("date",e.target.value)}/></FR>
            <FR label="Stav km" half><input type="number" inputMode="numeric" value={form.km} onChange={e=>s("km",e.target.value)} placeholder="89500"/></FR>
            <FR label="Název doplňku"><input value={form.name} onChange={e=>s("name",e.target.value)} placeholder="Přední kamera..."/></FR>
            <FR label="Typ / označení"><input value={form.note} onChange={e=>s("note",e.target.value)} placeholder="Viofo A119 Mini 2"/></FR>
            <FR label="Počet" half><input type="number" inputMode="numeric" value={form.qty} onChange={e=>s("qty",e.target.value)}/></FR>
            <FR label="Jednotka" half><select value={form.unit} onChange={e=>s("unit",e.target.value)}>{["ks","sada","pár","l","g","m"].map(o=><option key={o}>{o}</option>)}</select></FR>
            <FR label="Cena pořízení (Kč)"><input type="number" inputMode="numeric" value={form.price} onChange={e=>s("price",e.target.value)} placeholder="2890"/></FR>
            <FR label="Poznámka"><textarea value={form.comment} onChange={e=>s("comment",e.target.value)} rows={2} placeholder="Volná poznámka..."/></FR>
          </div>
          <div style={{display:"flex",gap:10,marginTop:22}}>
            <Btn ghost onClick={()=>setShowF(false)} full>Zrušit</Btn>
            <Btn onClick={save} full>Uložit</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── VEHICLE DRAWER ─────────────────────────────────────────────────────────────
const VehicleDrawer = ({vehicles,activeVid,setActiveVid,onAdd,onClose}) => (
  <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.8)"}} onClick={onClose}/>
    <div style={{position:"relative",background:"var(--s1)",borderRadius:"18px 18px 0 0",padding:"20px 16px 40px",maxHeight:"80vh",overflowY:"auto"}}>
      <div style={{width:40,height:4,background:"var(--b2)",borderRadius:2,margin:"0 auto 20px"}}/>
      <div style={{fontSize:12,fontWeight:600,letterSpacing:".1em",color:"var(--t3)",textTransform:"uppercase",marginBottom:14}}>Vozidla</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {vehicles.map(v=>(
          <div key={v.id} onClick={()=>{setActiveVid(v.id);onClose();}} style={{
            background:activeVid===v.id?`linear-gradient(135deg,${v.color}18,${v.color}08)`:"var(--s2)",
            border:`1.5px solid ${activeVid===v.id?v.color:"var(--b1)"}`,
            borderRadius:12,padding:"14px 16px",cursor:"pointer",
            display:"flex",alignItems:"center",gap:14,
          }}>
            <div style={{width:46,height:46,borderRadius:10,background:v.color+"20",border:`1.5px solid ${v.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🚗</div>
            <div>
              <div style={{fontWeight:700,fontSize:16}}>{v.brand} {v.model}</div>
              <div style={{fontSize:12,color:"var(--t2)",marginTop:2}}>{v.year} · {v.spz}</div>
              <div style={{marginTop:4}}><Pill c={v.color}>{v.fuel}</Pill></div>
            </div>
          </div>
        ))}
        <button onClick={()=>{onAdd();onClose();}} style={{background:"none",border:"1.5px dashed var(--b2)",borderRadius:12,padding:14,color:"var(--t2)",fontSize:14,fontWeight:500,touchAction:"manipulation"}}>+ Přidat vozidlo</button>
      </div>
    </div>
  </div>
);

// ── VEHICLE FORM ──────────────────────────────────────────────────────────────
const VForm = ({existing,onSave,onClose}) => {
  const colors = ["#4c8eff","#ff5c2e","#2eff9a","#ffd12e","#a855f7","#ec4899","#06b6d4"];
  const [form,setForm] = useState(existing||{brand:"",model:"",year:new Date().getFullYear(),vin:"",spz:"",fuel:"Benzín",color:colors[0]});
  const s=(k,v)=>setForm(p=>({...p,[k]:v}));
  return (
    <Modal title={existing?"Upravit vozidlo":"Nové vozidlo"} onClose={onClose}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <FR label="Značka" half><input value={form.brand} onChange={e=>s("brand",e.target.value)} placeholder="Škoda"/></FR>
        <FR label="Model" half><input value={form.model} onChange={e=>s("model",e.target.value)} placeholder="Octavia"/></FR>
        <FR label="Rok výroby" half><input type="number" inputMode="numeric" value={form.year} onChange={e=>s("year",e.target.value)}/></FR>
        <FR label="SPZ" half><input value={form.spz} onChange={e=>s("spz",e.target.value)} placeholder="1AB 2345"/></FR>
        <FR label="VIN"><input value={form.vin} onChange={e=>s("vin",e.target.value)} placeholder="TMBZZZ1Z9K1234567"/></FR>
        <FR label="Palivo"><select value={form.fuel} onChange={e=>s("fuel",e.target.value)}>{["Benzín","Nafta","LPG","CNG","Hybrid","Elektro"].map(o=><option key={o}>{o}</option>)}</select></FR>
        <FR label="Barva">
          <div style={{display:"flex",gap:8,flexWrap:"wrap",paddingTop:4}}>
            {colors.map(c=><div key={c} onClick={()=>s("color",c)} style={{width:32,height:32,borderRadius:"50%",background:c,cursor:"pointer",border:form.color===c?"3px solid #fff":"3px solid transparent",boxShadow:form.color===c?`0 0 0 2px ${c}`:"none",transition:"all .15s",touchAction:"manipulation"}}/>)}
          </div>
        </FR>
      </div>
      <div style={{display:"flex",gap:10,marginTop:22}}>
        <Btn ghost onClick={onClose} full>Zrušit</Btn>
        <Btn onClick={()=>{onSave({...form,id:existing?.id||uid()});onClose();}} full>Uložit vozidlo</Btn>
      </div>
    </Modal>
  );
};

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [vehicles,setVehicles] = useState(()=>JSON.parse(localStorage.getItem("ad_v")||"null")||DEF_V);
  const [fueling,setFueling] = useState(()=>JSON.parse(localStorage.getItem("ad_f")||"null")||DEF_F);
  const [repairs,setRepairs] = useState(()=>JSON.parse(localStorage.getItem("ad_r")||"null")||DEF_R);
  const [addons,setAddons] = useState(()=>JSON.parse(localStorage.getItem("ad_a")||"null")||DEF_A);
  const [activeVid,setActiveVid] = useState(DEF_V[0].id);
  const [tab,setTab] = useState("fueling");
  const [showVDrawer,setShowVDrawer] = useState(false);
  const [showVForm,setShowVForm] = useState(false);
  const [editV,setEditV] = useState(null);

  useEffect(()=>{localStorage.setItem("ad_v",JSON.stringify(vehicles));},[vehicles]);
  useEffect(()=>{localStorage.setItem("ad_f",JSON.stringify(fueling));},[fueling]);
  useEffect(()=>{localStorage.setItem("ad_r",JSON.stringify(repairs));},[repairs]);
  useEffect(()=>{localStorage.setItem("ad_a",JSON.stringify(addons));},[addons]);

  const av = vehicles.find(v=>v.id===activeVid);
  const TABS = [{id:"fueling",icon:"⛽",label:"Tankování"},{id:"repairs",icon:"🔧",label:"Opravy"},{id:"addons",icon:"📦",label:"Doplňky"}];

  const delV = id=>{
    if(!window.confirm("Smazat vozidlo a všechny záznamy?"))return;
    setVehicles(p=>p.filter(v=>v.id!==id));
    setFueling(p=>p.filter(f=>f.vid!==id));
    setRepairs(p=>p.filter(r=>r.vid!==id));
    setAddons(p=>p.filter(a=>a.vid!==id));
    if(activeVid===id)setActiveVid(vehicles.find(v=>v.id!==id)?.id);
  };

  return (
    <>
      <CSS/>
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",maxWidth:680,margin:"0 auto"}}>

        {/* TOP BAR */}
        <div style={{position:"sticky",top:0,zIndex:100,background:"var(--s1)",borderBottom:"1.5px solid var(--b1)",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:20,fontWeight:900,letterSpacing:".02em"}}>AUTO<span style={{color:"var(--acc)"}}>DENÍK</span></div>
          <button onClick={()=>setShowVDrawer(true)} style={{
            background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:10,
            padding:"8px 14px",color:"var(--t1)",fontSize:14,fontWeight:600,
            display:"flex",alignItems:"center",gap:8,touchAction:"manipulation",
          }}>
            {av?<><span style={{color:av.color}}>●</span> {av.brand} {av.model}</>:"Vybrat vozidlo"} <span style={{color:"var(--t3)"}}>▼</span>
          </button>
        </div>

        {/* CONTENT */}
        <div style={{flex:1,padding:"16px 16px 100px",overflowX:"hidden"}}>
          {av?(
            <>
              {/* Vehicle info card */}
              <div style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:14,padding:"16px",marginBottom:16,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${av.color},transparent)`}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
                  <div style={{display:"flex",gap:12,alignItems:"center"}}>
                    <div style={{width:48,height:48,borderRadius:12,background:av.color+"20",border:`1.5px solid ${av.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🚗</div>
                    <div>
                      <div style={{fontSize:20,fontWeight:900}}>{av.brand} {av.model}</div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
                        <Pill c={av.color}>{av.fuel}</Pill>
                        <Pill c="var(--t3)">{av.year}</Pill>
                        <Pill c="var(--t3)">{av.spz}</Pill>
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <IBtn onClick={()=>{setEditV(av);setShowVForm(true);}}>✏️</IBtn>
                    <IBtn onClick={()=>delV(av.id)} danger>🗑</IBtn>
                  </div>
                </div>
                {av.vin&&<div style={{fontSize:11,color:"var(--t3)",marginTop:10,fontFamily:"var(--mono)"}}>VIN: {av.vin}</div>}
              </div>

              {/* Tabs */}
              <div style={{display:"flex",gap:4,marginBottom:16,background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12,padding:4}}>
                {TABS.map(t=>(
                  <button key={t.id} onClick={()=>setTab(t.id)} style={{
                    flex:1,background:tab===t.id?`linear-gradient(135deg,var(--acc),var(--acc2))`:"none",
                    border:"none",borderRadius:9,padding:"10px 4px",
                    color:tab===t.id?"#fff":"var(--t2)",fontWeight:700,fontSize:13,
                    letterSpacing:".01em",transition:"all .2s",touchAction:"manipulation",
                    boxShadow:tab===t.id?"0 2px 12px rgba(255,92,46,.3)":"none",
                  }}>{t.icon} {t.label}</button>
                ))}
              </div>

              {tab==="fueling"&&<FuelMod vid={activeVid} fueling={fueling} setFueling={setFueling}/>}
              {tab==="repairs"&&<RepMod vid={activeVid} repairs={repairs} setRepairs={setRepairs}/>}
              {tab==="addons"&&<AddMod vid={activeVid} addons={addons} setAddons={setAddons}/>}
            </>
          ):(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:16,color:"var(--t3)"}}>
              <div style={{fontSize:56}}>🚗</div>
              <div style={{fontSize:18,fontWeight:600}}>Zatím žádné vozidlo</div>
              <Btn onClick={()=>setShowVForm(true)}>+ Přidat vozidlo</Btn>
            </div>
          )}
        </div>

        {/* BOTTOM SAFE AREA */}
        <div style={{height:"env(safe-area-inset-bottom,0px)"}}/>
      </div>

      {showVDrawer&&<VehicleDrawer vehicles={vehicles} activeVid={activeVid} setActiveVid={setActiveVid} onAdd={()=>setShowVForm(true)} onClose={()=>setShowVDrawer(false)}/>}
      {showVForm&&<VForm existing={editV} onSave={v=>setVehicles(p=>editV?p.map(x=>x.id===v.id?v:x):[...p,v])} onClose={()=>{setShowVForm(false);setEditV(null);}}/>}
    </>
  );
}
