import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const G = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #080a0f;
      --s1: #0e1118;
      --s2: #141720;
      --s3: #1a1e2a;
      --s4: #222636;
      --b1: #1e2335;
      --b2: #2a3050;
      --acc: #ff5c2e;
      --acc2: #ff8c5a;
      --blue: #4c8eff;
      --green: #2eff9a;
      --yellow: #ffd12e;
      --purple: #a855f7;
      --t1: #f0f4ff;
      --t2: #8892aa;
      --t3: #3d4563;
      --font: 'Outfit', sans-serif;
      --mono: 'JetBrains Mono', monospace;
      --r: 14px;
    }
    html,body,#root{height:100%;background:var(--bg);color:var(--t1);font-family:var(--font);}
    *{scrollbar-width:thin;scrollbar-color:var(--b2) transparent;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-thumb{background:var(--b2);border-radius:2px;}
    input,select,textarea{
      background:var(--s2);color:var(--t1);
      border:1.5px solid var(--b1);border-radius:10px;
      padding:11px 14px;font-family:var(--font);font-size:14px;
      width:100%;outline:none;transition:border-color .18s,box-shadow .18s;
    }
    input:focus,select:focus,textarea:focus{
      border-color:var(--acc);
      box-shadow:0 0 0 3px rgba(255,92,46,.12);
    }
    select option{background:var(--s2);}
    button{cursor:pointer;font-family:var(--font);}
    @keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes glow{0%,100%{opacity:.6}50%{opacity:1}}
    .au{animation:up .22s ease forwards;}
    @media(max-width:780px){
      .sidebar{position:fixed!important;left:-290px!important;top:0;z-index:200;transition:left .25s ease;width:280px!important;height:100vh;overflow-y:auto;}
      .sidebar.open{left:0!important;box-shadow:4px 0 30px rgba(0,0,0,.8);}
      .mob-bar{display:flex!important;}
      .main{padding:12px 12px 80px!important;min-width:0!important;width:100%!important;max-width:100vw!important;overflow-x:hidden!important;}
      .overlay{display:block!important;}
      table{font-size:11px!important;}
      table td,table th{padding:7px 8px!important;white-space:nowrap;}
    }
  `}</style>
);

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n,d=0)=>Number(n).toLocaleString("cs-CZ",{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtD = d=>d?new Date(d).toLocaleDateString("cs-CZ"):"";
const uid = ()=>Math.random().toString(36).slice(2,9);

// ── sample data ───────────────────────────────────────────────────────────────
const DEF_VEHICLES = [
  {id:"v1",brand:"Škoda",model:"Octavia",year:2019,vin:"TMBZZZ1Z9K1234567",spz:"1AB 2345",fuel:"Benzín",color:"#4c8eff"},
  {id:"v2",brand:"Toyota",model:"Yaris",year:2021,vin:"SB1KS3JE20E456789",spz:"2CD 6789",fuel:"Hybrid",color:"#2eff9a"},
];
const DEF_FUEL = [
  {id:"f1",vid:"v1",date:"2024-01-08",location:"Shell Brno",fuelType:"Benzín Natural 95",liters:45.2,pricePerLiter:37.90,total:1713.08,km:87450},
  {id:"f2",vid:"v1",date:"2024-01-29",location:"OMV Ostrava",fuelType:"Benzín Natural 95",liters:42.8,pricePerLiter:38.20,total:1635.16,km:87920},
  {id:"f3",vid:"v1",date:"2024-02-15",location:"Benzina Praha",fuelType:"Benzín Natural 95",liters:48.1,pricePerLiter:37.50,total:1803.75,km:88430},
  {id:"f4",vid:"v1",date:"2024-03-02",location:"Shell Brno",fuelType:"Benzín Natural 95",liters:44.5,pricePerLiter:38.80,total:1726.60,km:88980},
  {id:"f5",vid:"v1",date:"2024-03-20",location:"OMV Ostrava",fuelType:"Benzín Natural 95",liters:46.3,pricePerLiter:39.10,total:1810.33,km:89510},
  {id:"f6",vid:"v1",date:"2024-04-05",location:"Benzina",fuelType:"Benzín Natural 95",liters:43.7,pricePerLiter:38.50,total:1682.45,km:90080},
];
const DEF_REP = [
  {id:"r1",vid:"v1",date:"2024-02-10",km:88100,material:"Brzdové destičky přední",note:"ATE 13.0460-2785.2",qty:1,unit:"sada",matPrice:890,laborPrice:600,who:"Autoservis Novák",comment:"Zadní ještě OK"},
  {id:"r2",vid:"v1",date:"2024-03-15",km:89200,material:"Motorový olej 5W-40",note:"Castrol Edge 5W-40",qty:5,unit:"l",matPrice:750,laborPrice:350,who:"Svépomocí",comment:"Výměna při 89200 km"},
];
const DEF_ADD = [
  {id:"a1",vid:"v1",date:"2024-01-15",km:87600,name:"Přední kamera",note:"Viofo A119 Mini 2",qty:1,unit:"ks",price:2890,comment:"4K GPS WDR"},
];

// ── micro components ──────────────────────────────────────────────────────────
const Pill = ({c="var(--acc)",children})=>(
  <span style={{background:c+"18",color:c,border:`1px solid ${c}30`,borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:600,letterSpacing:".06em",whiteSpace:"nowrap"}}>{children}</span>
);

const Num = ({label,val,unit,c="var(--acc)",big})=>(
  <div style={{background:"linear-gradient(135deg,var(--s2),var(--s3))",border:"1.5px solid var(--b1)",borderRadius:14,padding:"18px 20px",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${c},transparent)`}}/>
    <div style={{fontSize:11,fontWeight:600,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",marginBottom:8}}>{label}</div>
    <div style={{fontSize:big?32:26,fontWeight:800,color:c,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>
      {val}<span style={{fontSize:big?15:13,fontWeight:400,color:"var(--t2)",marginLeft:4}}>{unit}</span>
    </div>
  </div>
);

const Btn=({onClick,children,ghost,sm,danger,full})=>(
  <button onClick={onClick} style={{
    background:danger?"rgba(239,68,68,.15)":ghost?"transparent":`linear-gradient(135deg,var(--acc),var(--acc2))`,
    border:`1.5px solid ${danger?"rgba(239,68,68,.5)":ghost?"var(--b2)":"transparent"}`,
    color:danger?"#ef4444":ghost?"var(--t2)":"#fff",
    borderRadius:10,padding:sm?"7px 16px":"11px 24px",
    fontSize:sm?13:14,fontWeight:600,letterSpacing:".02em",
    width:full?"100%":"auto",transition:"all .18s",
    boxShadow:ghost||danger?"none":"0 2px 12px rgba(255,92,46,.3)",
  }}>{children}</button>
);

const IBtn=({onClick,title,children,danger})=>(
  <button onClick={onClick} title={title} style={{background:"var(--s3)",border:"1.5px solid var(--b1)",borderRadius:8,padding:"6px 10px",color:danger?"#ef4444":"var(--t2)",fontSize:13,transition:"all .15s"}}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=danger?"#ef4444":"var(--acc)";e.currentTarget.style.color=danger?"#ef4444":"var(--acc)";}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--b1)";e.currentTarget.style.color=danger?"#ef4444":"var(--t2)";}}
  >{children}</button>
);

const Modal=({title,onClose,children,wide})=>(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(4px)"}} onClick={onClose}>
    <div style={{background:"var(--s1)",border:"1.5px solid var(--b2)",borderRadius:18,width:"100%",maxWidth:wide?680:560,maxHeight:"92vh",overflowY:"auto",padding:28,boxShadow:"0 24px 60px rgba(0,0,0,.6)"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <h2 style={{fontSize:22,fontWeight:800}}>{title}</h2>
        <button onClick={onClose} style={{background:"var(--s3)",border:"1.5px solid var(--b1)",borderRadius:8,color:"var(--t2)",fontSize:18,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const FR=({label,children,full})=>(
  <div style={{display:"flex",flexDirection:"column",gap:6,gridColumn:full?"1/-1":"span 1"}}>
    <label style={{fontSize:11,fontWeight:600,letterSpacing:".1em",color:"var(--t3)",textTransform:"uppercase"}}>{label}</label>
    {children}
  </div>
);

const DF=({from,to,onFrom,onTo})=>(
  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
    <span style={{fontSize:11,fontWeight:600,letterSpacing:".1em",color:"var(--t3)"}}>OD</span>
    <input type="date" value={from} onChange={e=>onFrom(e.target.value)} style={{width:148}}/>
    <span style={{fontSize:11,fontWeight:600,letterSpacing:".1em",color:"var(--t3)"}}>DO</span>
    <input type="date" value={to} onChange={e=>onTo(e.target.value)} style={{width:148}}/>
  </div>
);

const TT=({contentStyle,...p})=>(
  <Tooltip contentStyle={{background:"var(--s2)",border:"1.5px solid var(--b2)",borderRadius:10,color:"var(--t1)",fontSize:12,...contentStyle}} {...p}/>
);

// ── FUELING ───────────────────────────────────────────────────────────────────
const FuelMod=({vid,fueling,setFueling})=>{
  const [showF,setShowF]=useState(false);
  const [editId,setEditId]=useState(null);
  const [fFrom,setFFrom]=useState("");
  const [fTo,setFTo]=useState("");
  const emptyForm={date:new Date().toISOString().slice(0,10),location:"",fuelType:"Benzín Natural 95",liters:"",pricePerLiter:"",total:"",km:""};
  const [form,setForm]=useState(emptyForm);

  const vd=fueling.filter(f=>f.vid===vid).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const enriched=vd.map((f,i)=>{
    const prev=vd[i-1];
    const driven=prev?f.km-prev.km:null;
    const cons=driven&&driven>0?(f.liters/driven*100):null;
    return{...f,driven,cons};
  });
  const filtered=enriched.filter(f=>{
    if(fFrom&&f.date<fFrom)return false;
    if(fTo&&f.date>fTo)return false;
    return true;
  });
  const avgCons=useMemo(()=>{const v=filtered.filter(f=>f.cons);return v.length?v.reduce((s,f)=>s+f.cons,0)/v.length:null;},[filtered]);
  const totalCost=useMemo(()=>filtered.reduce((s,f)=>s+f.total,0),[filtered]);

  const chartP=filtered.map(f=>({d:fmtD(f.date),v:f.pricePerLiter}));
  const chartC=filtered.filter(f=>f.cons).map(f=>({d:fmtD(f.date),v:+f.cons.toFixed(2)}));

  const sf=(k,v)=>{
    const u={...form,[k]:v};
    if(k==="liters"||k==="pricePerLiter"){const l=parseFloat(k==="liters"?v:u.liters)||0;const p=parseFloat(k==="pricePerLiter"?v:u.pricePerLiter)||0;u.total=(l*p).toFixed(2);}
    setForm(u);
  };

  const openNew=()=>{setForm(emptyForm);setEditId(null);setShowF(true);};
  const openEdit=f=>{setForm({...f,liters:String(f.liters),pricePerLiter:String(f.pricePerLiter),km:String(f.km)});setEditId(f.id);setShowF(true);};
  const save=()=>{
    const total=parseFloat(form.liters)*parseFloat(form.pricePerLiter);
    const rec={...form,vid,id:editId||uid(),liters:parseFloat(form.liters),pricePerLiter:parseFloat(form.pricePerLiter),total:isNaN(total)?parseFloat(form.total)||0:total,km:parseInt(form.km)};
    setFueling(p=>editId?p.map(f=>f.id===editId?rec:f):[...p,rec]);
    setShowF(false);
  };
  const del=id=>{if(window.confirm("Smazat záznam?"))setFueling(p=>p.filter(f=>f.id!==id));};

  return(
    <div className="au">
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:20}}>
        <Num label="Průměrná spotřeba" val={avgCons?fmt(avgCons,1):"—"} unit="l/100km" c="var(--acc)"/>
        <Num label="Celková útrata" val={fmt(totalCost)} unit="Kč" c="var(--yellow)"/>
        <Num label="Počet tankování" val={filtered.length} unit="zázn." c="var(--blue)"/>
      </div>

      {/* Filter bar */}
      <div style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
        <DF from={fFrom} to={fTo} onFrom={setFFrom} onTo={setFTo}/>
        <Btn onClick={openNew}>+ Přidat tankování</Btn>
      </div>

      {/* Charts */}
      {filtered.length>1&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12,marginBottom:16}}>
          {[{label:"Cena PHM (Kč/l)",data:chartP,color:"var(--yellow)"},{label:"Spotřeba (l/100km)",data:chartC,color:"var(--acc)"}].map(({label,data,color})=>(
            <div key={label} style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12,padding:"16px 16px 10px"}}>
              <div style={{fontSize:11,fontWeight:600,letterSpacing:".1em",color:"var(--t3)",textTransform:"uppercase",marginBottom:12}}>{label}</div>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={data}>
                  <defs><linearGradient id={`g${color}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={.25}/><stop offset="95%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--b1)"/>
                  <XAxis dataKey="d" tick={{fill:"var(--t3)",fontSize:9}} tickLine={false}/>
                  <YAxis tick={{fill:"var(--t3)",fontSize:9}} tickLine={false} axisLine={false} domain={["auto","auto"]}/>
                  <TT/>
                  <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#g${color})`} dot={{fill:color,r:3,strokeWidth:0}}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:"var(--s3)"}}>
                {["Datum","Místo","Palivo","Litry","Kč/l","Celkem","Km","Ujeto","Spotřeba",""].map(h=>(
                  <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:600,letterSpacing:".1em",color:"var(--t3)",textTransform:"uppercase",borderBottom:"1.5px solid var(--b1)",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...filtered].reverse().map((f,i)=>(
                <tr key={f.id} style={{borderBottom:"1px solid var(--b1)",transition:"background .12s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--s3)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"11px 14px",whiteSpace:"nowrap",fontWeight:500}}>{fmtD(f.date)}</td>
                  <td style={{padding:"11px 14px",color:"var(--t2)"}}>{f.location}</td>
                  <td style={{padding:"11px 14px"}}><Pill c="var(--blue)">{f.fuelType}</Pill></td>
                  <td style={{padding:"11px 14px",fontFamily:"var(--mono)",fontWeight:600}}>{fmt(f.liters,1)}</td>
                  <td style={{padding:"11px 14px",color:"var(--yellow)",fontFamily:"var(--mono)"}}>{fmt(f.pricePerLiter,2)}</td>
                  <td style={{padding:"11px 14px",fontFamily:"var(--mono)",fontWeight:700,color:"var(--acc)"}}>{fmt(f.total)} Kč</td>
                  <td style={{padding:"11px 14px",color:"var(--t2)",fontFamily:"var(--mono)"}}>{fmt(f.km)}</td>
                  <td style={{padding:"11px 14px",color:f.driven?"var(--green)":"var(--t3)",fontFamily:"var(--mono)"}}>{f.driven?fmt(f.driven)+" km":"—"}</td>
                  <td style={{padding:"11px 14px",color:f.cons?"var(--acc)":"var(--t3)",fontFamily:"var(--mono)",fontWeight:f.cons?700:400}}>{f.cons?fmt(f.cons,1)+" l":"—"}</td>
                  <td style={{padding:"11px 14px",whiteSpace:"nowrap"}}>
                    <div style={{display:"flex",gap:6}}>
                      <IBtn onClick={()=>openEdit(f)} title="Upravit">✏️</IBtn>
                      <IBtn onClick={()=>del(f.id)} title="Smazat" danger>🗑</IBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0&&(
                <tr><td colSpan={10} style={{padding:40,textAlign:"center",color:"var(--t3)"}}>
                  <div style={{fontSize:32,marginBottom:8}}>⛽</div>
                  <div>Žádné záznamy. Přidej první tankování!</div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showF&&(
        <Modal title={editId?"Upravit tankování":"Nové tankování"} onClose={()=>setShowF(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <FR label="Datum"><input type="date" value={form.date} onChange={e=>sf("date",e.target.value)}/></FR>
            <FR label="Stav km"><input type="number" value={form.km} onChange={e=>sf("km",e.target.value)} placeholder="89 500"/></FR>
            <FR label="Místo tankování" full><input value={form.location} onChange={e=>sf("location",e.target.value)} placeholder="Shell Brno, OMV..."/></FR>
            <FR label="Typ paliva" full>
              <select value={form.fuelType} onChange={e=>sf("fuelType",e.target.value)}>
                {["Benzín Natural 95","Benzín Natural 98","Nafta","LPG","CNG","Hybrid","Elektřina"].map(o=><option key={o}>{o}</option>)}
              </select>
            </FR>
            <FR label="Počet litrů"><input type="number" step=".01" value={form.liters} onChange={e=>sf("liters",e.target.value)} placeholder="45.5"/></FR>
            <FR label="Cena / litr (Kč)"><input type="number" step=".01" value={form.pricePerLiter} onChange={e=>sf("pricePerLiter",e.target.value)} placeholder="38.90"/></FR>
            <FR label="Celková částka (Kč)" full>
              <input type="number" step=".01" value={form.total||""} onChange={e=>sf("total",e.target.value)} placeholder="Vypočítá se automaticky" style={{color:"var(--acc)",fontWeight:700}}/>
            </FR>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:22}}>
            <Btn ghost onClick={()=>setShowF(false)}>Zrušit</Btn>
            <Btn onClick={save}>Uložit záznam</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── REPAIRS ───────────────────────────────────────────────────────────────────
const RepMod=({vid,repairs,setRepairs})=>{
  const [showF,setShowF]=useState(false);
  const [editId,setEditId]=useState(null);
  const [fFrom,setFFrom]=useState("");
  const [fTo,setFTo]=useState("");
  const ef={date:new Date().toISOString().slice(0,10),km:"",material:"",note:"",qty:"",unit:"ks",matPrice:"",laborPrice:"",who:"",comment:""};
  const [form,setForm]=useState(ef);
  const s=(k,v)=>setForm(p=>({...p,[k]:v}));

  const vd=repairs.filter(r=>r.vid===vid);
  const filtered=vd.filter(r=>{
    if(fFrom&&r.date<fFrom)return false;
    if(fTo&&r.date>fTo)return false;
    return true;
  }).sort((a,b)=>new Date(b.date)-new Date(a.date));

  const tMat=filtered.reduce((s,r)=>s+parseFloat(r.matPrice||0),0);
  const tLab=filtered.reduce((s,r)=>s+parseFloat(r.laborPrice||0),0);

  const openNew=()=>{setForm(ef);setEditId(null);setShowF(true);};
  const openEdit=r=>{setForm({...r,matPrice:String(r.matPrice),laborPrice:String(r.laborPrice),km:String(r.km)});setEditId(r.id);setShowF(true);};
  const save=()=>{
    const rec={...form,vid,id:editId||uid(),matPrice:parseFloat(form.matPrice)||0,laborPrice:parseFloat(form.laborPrice)||0,km:parseInt(form.km)||0};
    setRepairs(p=>editId?p.map(r=>r.id===editId?rec:r):[...p,rec]);
    setShowF(false);
  };
  const del=id=>{if(window.confirm("Smazat?"))setRepairs(p=>p.filter(r=>r.id!==id));};

  return(
    <div className="au">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:20}}>
        <Num label="Materiál celkem" val={fmt(tMat)} unit="Kč" c="var(--blue)"/>
        <Num label="Práce celkem" val={fmt(tLab)} unit="Kč" c="var(--yellow)"/>
        <Num label="Vše celkem" val={fmt(tMat+tLab)} unit="Kč" c="var(--acc)"/>
      </div>
      <div style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
        <DF from={fFrom} to={fTo} onFrom={setFFrom} onTo={setFTo}/>
        <Btn onClick={openNew}>+ Přidat opravu</Btn>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(r=>{
          const total=parseFloat(r.matPrice||0)+parseFloat(r.laborPrice||0);
          return(
            <div key={r.id} style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12,padding:"18px 20px",transition:"border-color .15s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="var(--b2)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="var(--b1)"}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:8}}>
                    <span style={{fontSize:16,fontWeight:700}}>{r.material}</span>
                    <Pill c="var(--blue)">{r.qty} {r.unit}</Pill>
                  </div>
                  {r.note&&<div style={{fontSize:12,color:"var(--t3)",fontFamily:"var(--mono)",marginBottom:6}}>#{r.note}</div>}
                  <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:13,color:"var(--t2)"}}>
                    <span>📅 {fmtD(r.date)}</span>
                    <span>📍 {fmt(r.km)} km</span>
                    {r.who&&<span>🔧 {r.who}</span>}
                  </div>
                  {r.comment&&<div style={{fontSize:12,color:"var(--t3)",fontStyle:"italic",marginTop:8,padding:"8px 12px",background:"var(--s3)",borderRadius:8,borderLeft:"3px solid var(--b2)"}}>{r.comment}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                  <div style={{fontSize:22,fontWeight:800,color:"var(--acc)",fontVariantNumeric:"tabular-nums"}}>{fmt(total)} Kč</div>
                  <div style={{fontSize:11,color:"var(--t3)"}}>mat {fmt(r.matPrice)} · práce {fmt(r.laborPrice)}</div>
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <IBtn onClick={()=>openEdit(r)}>✏️</IBtn>
                    <IBtn onClick={()=>del(r.id)} danger>🗑</IBtn>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length===0&&(
          <div style={{padding:40,textAlign:"center",color:"var(--t3)",background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12}}>
            <div style={{fontSize:32,marginBottom:8}}>🔧</div>
            <div>Žádné záznamy. Přidej první opravu!</div>
          </div>
        )}
      </div>
      {showF&&(
        <Modal title={editId?"Upravit opravu":"Nová oprava"} onClose={()=>setShowF(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <FR label="Datum"><input type="date" value={form.date} onChange={e=>s("date",e.target.value)}/></FR>
            <FR label="Stav km"><input type="number" value={form.km} onChange={e=>s("km",e.target.value)} placeholder="89 500"/></FR>
            <FR label="Materiál / díl" full><input value={form.material} onChange={e=>s("material",e.target.value)} placeholder="Brzdové destičky přední"/></FR>
            <FR label="Katalogové číslo / poznámka" full><input value={form.note} onChange={e=>s("note",e.target.value)} placeholder="ATE 13.0460-2785.2"/></FR>
            <FR label="Množství"><input type="number" step=".01" value={form.qty} onChange={e=>s("qty",e.target.value)} placeholder="1"/></FR>
            <FR label="Jednotka">
              <select value={form.unit} onChange={e=>s("unit",e.target.value)}>
                {["ks","sada","l","ml","g","kg","m"].map(o=><option key={o}>{o}</option>)}
              </select>
            </FR>
            <FR label="Cena materiálu (Kč)"><input type="number" value={form.matPrice} onChange={e=>s("matPrice",e.target.value)} placeholder="890"/></FR>
            <FR label="Cena práce (Kč)"><input type="number" value={form.laborPrice} onChange={e=>s("laborPrice",e.target.value)} placeholder="600"/></FR>
            <FR label="Kdo provedl" full><input value={form.who} onChange={e=>s("who",e.target.value)} placeholder="Autoservis Novák / Svépomocí"/></FR>
            <FR label="Poznámka" full><textarea value={form.comment} onChange={e=>s("comment",e.target.value)} rows={2} placeholder="Volná poznámka..."/></FR>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:22}}>
            <Btn ghost onClick={()=>setShowF(false)}>Zrušit</Btn>
            <Btn onClick={save}>Uložit opravu</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── ADDONS ────────────────────────────────────────────────────────────────────
const AddMod=({vid,addons,setAddons})=>{
  const [showF,setShowF]=useState(false);
  const [editId,setEditId]=useState(null);
  const ef={date:new Date().toISOString().slice(0,10),km:"",name:"",note:"",qty:"1",unit:"ks",price:"",comment:""};
  const [form,setForm]=useState(ef);
  const s=(k,v)=>setForm(p=>({...p,[k]:v}));

  const vd=addons.filter(a=>a.vid===vid).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const total=vd.reduce((s,a)=>s+parseFloat(a.price||0),0);

  const openNew=()=>{setForm(ef);setEditId(null);setShowF(true);};
  const openEdit=a=>{setForm({...a,price:String(a.price),km:String(a.km)});setEditId(a.id);setShowF(true);};
  const save=()=>{
    const rec={...form,vid,id:editId||uid(),price:parseFloat(form.price)||0,km:parseInt(form.km)||0};
    setAddons(p=>editId?p.map(a=>a.id===editId?rec:a):[...p,rec]);
    setShowF(false);
  };
  const del=id=>{if(window.confirm("Smazat?"))setAddons(p=>p.filter(a=>a.id!==id));};

  return(
    <div className="au">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:20}}>
        <Num label="Celkem za doplňky" val={fmt(total)} unit="Kč" c="var(--green)"/>
        <Num label="Počet položek" val={vd.length} unit="zázn." c="var(--blue)"/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <Btn onClick={openNew}>+ Přidat doplněk</Btn>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {vd.map(a=>(
          <div key={a.id} style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12,padding:"18px 20px",transition:"border-color .15s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor="var(--b2)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="var(--b1)"}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:8}}>
                  <span style={{fontSize:16,fontWeight:700}}>{a.name}</span>
                  <Pill c="var(--green)">{a.qty} {a.unit}</Pill>
                </div>
                {a.note&&<div style={{fontSize:12,color:"var(--t3)",fontFamily:"var(--mono)",marginBottom:6}}>#{a.note}</div>}
                <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:13,color:"var(--t2)"}}>
                  <span>📅 {fmtD(a.date)}</span>
                  <span>📍 {fmt(a.km)} km</span>
                </div>
                {a.comment&&<div style={{fontSize:12,color:"var(--t3)",fontStyle:"italic",marginTop:8,padding:"8px 12px",background:"var(--s3)",borderRadius:8,borderLeft:"3px solid var(--b2)"}}>{a.comment}</div>}
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0}}>
                <div style={{fontSize:22,fontWeight:800,color:"var(--green)",fontVariantNumeric:"tabular-nums"}}>{fmt(a.price)} Kč</div>
                <div style={{display:"flex",gap:6}}>
                  <IBtn onClick={()=>openEdit(a)}>✏️</IBtn>
                  <IBtn onClick={()=>del(a.id)} danger>🗑</IBtn>
                </div>
              </div>
            </div>
          </div>
        ))}
        {vd.length===0&&(
          <div style={{padding:40,textAlign:"center",color:"var(--t3)",background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12}}>
            <div style={{fontSize:32,marginBottom:8}}>📦</div>
            <div>Žádné záznamy. Přidej první doplněk!</div>
          </div>
        )}
      </div>
      {showF&&(
        <Modal title={editId?"Upravit doplněk":"Nový doplněk"} onClose={()=>setShowF(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <FR label="Datum"><input type="date" value={form.date} onChange={e=>s("date",e.target.value)}/></FR>
            <FR label="Stav km"><input type="number" value={form.km} onChange={e=>s("km",e.target.value)} placeholder="89 500"/></FR>
            <FR label="Název doplňku" full><input value={form.name} onChange={e=>s("name",e.target.value)} placeholder="Přední kamera, koberce..."/></FR>
            <FR label="Typ / označení" full><input value={form.note} onChange={e=>s("note",e.target.value)} placeholder="Viofo A119 Mini 2"/></FR>
            <FR label="Počet"><input type="number" value={form.qty} onChange={e=>s("qty",e.target.value)}/></FR>
            <FR label="Jednotka">
              <select value={form.unit} onChange={e=>s("unit",e.target.value)}>
                {["ks","sada","pár","l","g","m"].map(o=><option key={o}>{o}</option>)}
              </select>
            </FR>
            <FR label="Cena pořízení (Kč)" full><input type="number" value={form.price} onChange={e=>s("price",e.target.value)} placeholder="2 890"/></FR>
            <FR label="Poznámka" full><textarea value={form.comment} onChange={e=>s("comment",e.target.value)} rows={2} placeholder="Volná poznámka..."/></FR>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:22}}>
            <Btn ghost onClick={()=>setShowF(false)}>Zrušit</Btn>
            <Btn onClick={save}>Uložit doplněk</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── VEHICLE FORM ──────────────────────────────────────────────────────────────
const VForm=({existing,onSave,onClose})=>{
  const colors=["#4c8eff","#ff5c2e","#2eff9a","#ffd12e","#a855f7","#ec4899","#06b6d4"];
  const [form,setForm]=useState(existing||{brand:"",model:"",year:new Date().getFullYear(),vin:"",spz:"",fuel:"Benzín",color:colors[0]});
  const s=(k,v)=>setForm(p=>({...p,[k]:v}));
  return(
    <Modal title={existing?"Upravit vozidlo":"Přidat nové vozidlo"} onClose={onClose}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <FR label="Značka"><input value={form.brand} onChange={e=>s("brand",e.target.value)} placeholder="Škoda"/></FR>
        <FR label="Model"><input value={form.model} onChange={e=>s("model",e.target.value)} placeholder="Octavia"/></FR>
        <FR label="Rok výroby"><input type="number" value={form.year} onChange={e=>s("year",e.target.value)}/></FR>
        <FR label="SPZ"><input value={form.spz} onChange={e=>s("spz",e.target.value)} placeholder="1AB 2345"/></FR>
        <FR label="VIN" full><input value={form.vin} onChange={e=>s("vin",e.target.value)} placeholder="TMBZZZ1Z9K1234567"/></FR>
        <FR label="Palivo">
          <select value={form.fuel} onChange={e=>s("fuel",e.target.value)}>
            {["Benzín","Nafta","LPG","CNG","Hybrid","Elektro"].map(o=><option key={o}>{o}</option>)}
          </select>
        </FR>
        <FR label="Barva karty">
          <div style={{display:"flex",gap:8,flexWrap:"wrap",paddingTop:4}}>
            {colors.map(c=>(
              <div key={c} onClick={()=>s("color",c)} style={{width:30,height:30,borderRadius:"50%",background:c,cursor:"pointer",border:form.color===c?"3px solid #fff":"3px solid transparent",boxShadow:form.color===c?`0 0 0 2px ${c}`:"none",transition:"all .15s"}}/>
            ))}
          </div>
        </FR>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:22}}>
        <Btn ghost onClick={onClose}>Zrušit</Btn>
        <Btn onClick={()=>{onSave({...form,id:existing?.id||uid()});onClose();}}>Uložit vozidlo</Btn>
      </div>
    </Modal>
  );
};

// ── VEHICLE CARD ──────────────────────────────────────────────────────────────
const VCard=({v,active,onClick})=>(
  <div onClick={onClick} style={{
    background:active?`linear-gradient(135deg,${v.color}18,${v.color}08)`:"var(--s2)",
    border:`1.5px solid ${active?v.color:"var(--b1)"}`,
    borderRadius:12,padding:"13px 15px",cursor:"pointer",transition:"all .2s",
    boxShadow:active?`0 0 20px ${v.color}22`:"none",
  }}>
    <div style={{display:"flex",alignItems:"center",gap:12}}>
      <div style={{width:44,height:44,borderRadius:10,background:v.color+"20",border:`1.5px solid ${v.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🚗</div>
      <div style={{minWidth:0}}>
        <div style={{fontWeight:700,fontSize:15,letterSpacing:".01em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{v.brand} {v.model}</div>
        <div style={{fontSize:11,color:"var(--t2)",marginTop:2}}>{v.year} · {v.spz}</div>
        <div style={{marginTop:4}}><Pill c={v.color}>{v.fuel}</Pill></div>
      </div>
    </div>
  </div>
);

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App(){
  const [vehicles,setVehicles]=useState(()=>JSON.parse(localStorage.getItem("ad_v")||"null")||DEF_VEHICLES);
  const [fueling,setFueling]=useState(()=>JSON.parse(localStorage.getItem("ad_f")||"null")||DEF_FUEL);
  const [repairs,setRepairs]=useState(()=>JSON.parse(localStorage.getItem("ad_r")||"null")||DEF_REP);
  const [addons,setAddons]=useState(()=>JSON.parse(localStorage.getItem("ad_a")||"null")||DEF_ADD);
  const [activeVid,setActiveVid]=useState(DEF_VEHICLES[0].id);
  const [tab,setTab]=useState("fueling");
  const [showVF,setShowVF]=useState(false);
  const [editV,setEditV]=useState(null);
  const [sideOpen,setSideOpen]=useState(false);

  useEffect(()=>{localStorage.setItem("ad_v",JSON.stringify(vehicles));},[vehicles]);
  useEffect(()=>{localStorage.setItem("ad_f",JSON.stringify(fueling));},[fueling]);
  useEffect(()=>{localStorage.setItem("ad_r",JSON.stringify(repairs));},[repairs]);
  useEffect(()=>{localStorage.setItem("ad_a",JSON.stringify(addons));},[addons]);

  const av=vehicles.find(v=>v.id===activeVid);
  const delV=id=>{
    if(!window.confirm("Smazat vozidlo a všechny záznamy?"))return;
    setVehicles(p=>p.filter(v=>v.id!==id));
    setFueling(p=>p.filter(f=>f.vid!==id));
    setRepairs(p=>p.filter(r=>r.vid!==id));
    setAddons(p=>p.filter(a=>a.vid!==id));
    if(activeVid===id)setActiveVid(vehicles.find(v=>v.id!==id)?.id);
  };

  const TABS=[{id:"fueling",icon:"⛽",label:"Tankování"},{id:"repairs",icon:"🔧",label:"Opravy"},{id:"addons",icon:"📦",label:"Doplňky"}];

  return(
    <>
      <G/>
      <div className="app-wrap" style={{display:"flex",minHeight:"100vh",width:"100%",maxWidth:"100vw",overflowX:"hidden"}}>

        {/* Overlay mobile */}
        <div className="overlay" style={{display:"none",position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:199,backdropFilter:"blur(2px)"}} onClick={()=>setSideOpen(false)}/>

        {/* SIDEBAR */}
        <aside className="sidebar" style={{width:270,minHeight:"100vh",background:"var(--s1)",borderRight:"1.5px solid var(--b1)",display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",overflowY:"auto",flexShrink:0,zIndex:200}}>
          {/* Logo */}
          <div style={{padding:"24px 20px 18px",borderBottom:"1.5px solid var(--b1)"}}>
            <div style={{fontSize:24,fontWeight:900,letterSpacing:".02em"}}>
              AUTO<span style={{color:"var(--acc)"}}>DENÍK</span>
            </div>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:".16em",color:"var(--t3)",marginTop:2}}>EVIDENCE VOZIDEL</div>
          </div>

          {/* Vehicles list */}
          <div style={{padding:"16px 14px",flex:1}}>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:".14em",color:"var(--t3)",textTransform:"uppercase",marginBottom:10,paddingLeft:2}}>Vozidla</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {vehicles.map(v=>(
                <VCard key={v.id} v={v} active={activeVid===v.id} onClick={()=>{setActiveVid(v.id);setSideOpen(false);}}/>
              ))}
            </div>
            <button onClick={()=>{setEditV(null);setShowVF(true);}} style={{width:"100%",marginTop:10,background:"none",border:"1.5px dashed var(--b2)",borderRadius:12,padding:"11px",color:"var(--t3)",fontSize:13,fontWeight:500,letterSpacing:".04em",transition:"all .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--acc)";e.currentTarget.style.color="var(--acc)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--b2)";e.currentTarget.style.color="var(--t3)";}}>
              + Přidat vozidlo
            </button>
          </div>

          <div style={{padding:"12px 18px",borderTop:"1.5px solid var(--b1)",fontSize:11,color:"var(--t3)",fontWeight:500}}>AutoDeník · Prototyp v1.0</div>
        </aside>

        {/* MAIN */}
        <main className="main" style={{flex:1,padding:"24px 28px",minWidth:0}}>

          {/* Mobile top bar */}
          <div className="mob-bar" style={{display:"none",alignItems:"center",gap:12,marginBottom:16}}>
            <button onClick={()=>setSideOpen(p=>!p)} style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:9,padding:"8px 12px",color:"var(--t1)",fontSize:18}}>☰</button>
            <div style={{fontWeight:800,fontSize:18}}>AUTO<span style={{color:"var(--acc)"}}>DENÍK</span></div>
          </div>

          {av?(
            <>
              {/* Vehicle header */}
              <div style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:16,padding:"20px 24px",marginBottom:22,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${av.color},transparent)`}}/>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:16}}>
                    <div style={{width:58,height:58,borderRadius:14,background:av.color+"20",border:`2px solid ${av.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>🚗</div>
                    <div>
                      <h1 style={{fontSize:28,fontWeight:900,letterSpacing:".01em"}}>{av.brand} {av.model}</h1>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:5}}>
                        <Pill c={av.color}>{av.fuel}</Pill>
                        <Pill c="var(--t3)">{av.year}</Pill>
                        <Pill c="var(--t3)">{av.spz}</Pill>
                        {av.vin&&<span style={{fontSize:11,color:"var(--t3)",fontFamily:"var(--mono)",alignSelf:"center"}}>VIN: {av.vin}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <IBtn onClick={()=>{setEditV(av);setShowVF(true);}}>✏️ Upravit</IBtn>
                    <IBtn onClick={()=>delV(av.id)} danger>🗑 Smazat</IBtn>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{display:"flex",gap:3,marginBottom:20,background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12,padding:4,width:"fit-content"}}>
                {TABS.map(t=>(
                  <button key={t.id} onClick={()=>setTab(t.id)} style={{
                    background:tab===t.id?`linear-gradient(135deg,var(--acc),var(--acc2))`:"none",
                    border:"none",borderRadius:9,padding:"9px 20px",
                    color:tab===t.id?"#fff":"var(--t2)",
                    fontWeight:600,fontSize:14,letterSpacing:".02em",transition:"all .2s",whiteSpace:"nowrap",
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
              <div style={{fontSize:20,fontWeight:600}}>Zatím žádné vozidlo</div>
              <Btn onClick={()=>setShowVF(true)}>+ Přidat první vozidlo</Btn>
            </div>
          )}
        </main>

        {/* MOBILE BOTTOM NAV */}
        <nav style={{display:"none",position:"fixed",bottom:0,left:0,right:0,background:"var(--s1)",borderTop:"1.5px solid var(--b1)",zIndex:100,justifyContent:"space-around",padding:"8px 0 14px"}} className="mob-bar">
          {[{id:"menu",icon:"🚗",label:"Vozidla"},{id:"fueling",icon:"⛽",label:"Tankování"},{id:"repairs",icon:"🔧",label:"Opravy"},{id:"addons",icon:"📦",label:"Doplňky"}].map(item=>(
            <button key={item.id} onClick={()=>{if(item.id==="menu")setSideOpen(p=>!p);else setTab(item.id);}} style={{background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:tab===item.id?"var(--acc)":"var(--t3)",fontSize:9,fontWeight:600,letterSpacing:".08em",padding:"4px 12px"}}>
              <span style={{fontSize:22}}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {showVF&&<VForm existing={editV} onSave={v=>setVehicles(p=>editV?p.map(x=>x.id===v.id?v:x):[...p,v])} onClose={()=>{setShowVF(false);setEditV(null);}}/>}
    </>
  );
}
