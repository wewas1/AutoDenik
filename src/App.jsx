import { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = "https://jcpvjfhfgmijxdrldnds.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcHZqZmhmZ21panhkcmxkbmRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODk5NzcsImV4cCI6MjA4NzM2NTk3N30.J4MGvoHE1_qQgbGk6NLg0R6kvyLy45eXn9GmGmAcnxU";
const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "ad_session",
  }
});

// ── EXPORT ───────────────────────────────────────────────────────────────────
const exportCSV = (rows, filename) => {
  if(!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(";"), ...rows.map(r => keys.map(k => {
    const v = r[k] ?? "";
    return typeof v === "string" && v.includes(";") ? `"${v}"` : v;
  }).join(";"))].join("
");
  const blob = new Blob(["﻿"+csv], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
};

const exportJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
};

// ── WEBAUTHN / BIOMETRICS ─────────────────────────────────────────────────────
const WA_RPID = window.location.hostname;
const WA_ORIGIN = window.location.origin;
const b64url = arr => btoa(String.fromCharCode(...new Uint8Array(arr))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
const b64urlDecode = str => Uint8Array.from(atob(str.replace(/-/g,"+").replace(/_/g,"/")), c=>c.charCodeAt(0));

const isBiometricAvailable = async () => {
  try {
    if(!window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
};

const registerBiometric = async (userId, userEmail) => {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "AutoDeník", id: WA_RPID },
      user: { id: new TextEncoder().encode(userId), name: userEmail, displayName: userEmail },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
      timeout: 60000,
    }
  });
  if(!credential) return false;
  // Store credential id linked to user
  const stored = { credId: b64url(credential.rawId), userId, userEmail };
  localStorage.setItem("ad_biometric", JSON.stringify(stored));
  return true;
};

const loginWithBiometric = async () => {
  const stored = JSON.parse(localStorage.getItem("ad_biometric") || "null");
  if(!stored) return null;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: WA_RPID,
        allowCredentials: [{ id: b64urlDecode(stored.credId), type: "public-key" }],
        userVerification: "required",
        timeout: 60000,
      }
    });
    if(assertion) return stored.userEmail;
    return null;
  } catch { return null; }
};

const hasBiometricStored = () => !!localStorage.getItem("ad_biometric");

const CSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:  #0a0a0a;
      --s1:  #111111;
      --s2:  #181818;
      --s3:  #202020;
      --b1:  #2a2a2a;
      --b2:  #333333;
      --acc: #c8a96e;
      --acc2:#e8c98e;
      --blue:#6b9fff;
      --green:#4ecb71;
      --red: #e05c5c;
      --t1:  #f5f5f0;
      --t2:  #888880;
      --t3:  #444440;
      --font:'DM Sans', sans-serif;
      --mono:'DM Mono', monospace;
    }
    html, body, #root { height:100%; background:var(--bg); color:var(--t1); font-family:var(--font); }
    * { scrollbar-width:thin; scrollbar-color:var(--b2) transparent; }
    ::-webkit-scrollbar { width:3px; }
    ::-webkit-scrollbar-thumb { background:var(--b2); border-radius:2px; }
    input, select, textarea {
      background:var(--s2); color:var(--t1); border:1px solid var(--b1);
      border-radius:10px; padding:13px 16px; font-family:var(--font);
      font-size:16px; width:100%; outline:none; transition:border-color .2s, box-shadow .2s;
      -webkit-appearance:none; appearance:none; letter-spacing:.01em;
    }
    input:focus, select:focus, textarea:focus {
      border-color:var(--acc);
      box-shadow:0 0 0 3px rgba(200,169,110,.1);
    }
    select option { background:var(--s2); }
    button { cursor:pointer; font-family:var(--font); -webkit-tap-highlight-color:transparent; }
    @keyframes up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    .au { animation:up .25s ease forwards; }
  `}</style>
);

// helpers
const fmt = (n, d=0) => Number(n).toLocaleString("cs-CZ", {minimumFractionDigits:d, maximumFractionDigits:d});
const fmtD = d => d ? new Date(d).toLocaleDateString("cs-CZ") : "";
const uid = () => Math.random().toString(36).slice(2,9);

// sample data
// Data se načítají ze Supabase

// ── UI primitives ─────────────────────────────────────────────────────────────
const Pill = ({c="var(--acc)",children}) => (
  <span style={{background:c+"14",color:c,border:`1px solid ${c}25`,borderRadius:4,padding:"2px 9px",fontSize:10,fontWeight:500,letterSpacing:".08em",whiteSpace:"nowrap",textTransform:"uppercase"}}>{children}</span>
);

const StatBox = ({label,val,unit,c="var(--acc)"}) => (
  <div style={{background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:14,padding:"16px 18px",flex:1,minWidth:0}}>
    <div style={{fontSize:10,fontWeight:500,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",marginBottom:10}}>{label}</div>
    <div style={{fontSize:24,fontWeight:300,color:"var(--t1)",lineHeight:1,letterSpacing:"-.02em"}}>{val}<span style={{fontSize:13,fontWeight:400,color:"var(--t3)",marginLeft:6}}>{unit}</span></div>
    <div style={{marginTop:8,height:1,background:`linear-gradient(90deg,${c}60,transparent)`}}/>
  </div>
);

const Btn = ({onClick,children,ghost,danger,full,sm}) => (
  <button onClick={onClick} style={{
    background: danger?"rgba(224,92,92,.1)":ghost?"transparent":"var(--acc)",
    border: `1px solid ${danger?"rgba(224,92,92,.4)":ghost?"var(--b2)":"var(--acc)"}`,
    color: danger?"var(--red)":ghost?"var(--t2)":"#0a0a0a",
    borderRadius:10, padding:sm?"10px 16px":"13px 22px",
    fontSize:sm?13:14, fontWeight:600, letterSpacing:".02em",
    width:full?"100%":"auto", transition:"opacity .15s",
    touchAction:"manipulation",
  }}>{children}</button>
);

const IBtn = ({onClick,title,children,danger}) => (
  <button onClick={onClick} title={title} style={{
    background:"none",border:"1px solid var(--b1)",borderRadius:8,
    padding:"8px 12px",color:danger?"var(--red)":"var(--t3)",fontSize:14,
    touchAction:"manipulation",minWidth:40,minHeight:40,transition:"border-color .15s",
  }}>{children}</button>
);

// ── MODAL ─────────────────────────────────────────────────────────────────────
const Modal = ({title,onClose,children}) => {
  useEffect(()=>{
    document.body.style.overflow="hidden";
    return ()=>{ document.body.style.overflow=""; };
  },[]);
  return ReactDOM.createPortal(
    <div style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",background:"rgba(0,0,0,.8)",zIndex:9999,display:"flex",flexDirection:"column",backdropFilter:"blur(10px)"}} onClick={onClose}>
      <div style={{flex:1,overflowY:"auto",padding:"16px 16px 40px",display:"flex",flexDirection:"column",alignItems:"center"}} onClick={e=>e.stopPropagation()}>
        <div style={{background:"var(--s1)",border:"1px solid var(--b2)",borderRadius:20,width:"100%",maxWidth:560,padding:"20px 20px 28px"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,paddingBottom:16,borderBottom:"1px solid var(--b1)"}}>
            <h2 style={{fontSize:18,fontWeight:500,letterSpacing:"-.01em"}}>{title}</h2>
            <button onClick={onClose} style={{background:"none",border:"1px solid var(--b1)",borderRadius:8,color:"var(--t3)",fontSize:16,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",touchAction:"manipulation"}}>✕</button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

const FR = ({label,children,half}) => (
  <div style={{display:"flex",flexDirection:"column",gap:6,gridColumn:half?"span 1":"1/-1"}}>
    <label style={{fontSize:11,fontWeight:600,letterSpacing:".1em",color:"var(--t3)",textTransform:"uppercase"}}>{label}</label>
    {children}
  </div>
);

const DF = ({from,to,onFrom,onTo}) => (
  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"nowrap",overflowX:"auto"}}>
    <span style={{fontSize:10,fontWeight:500,color:"var(--t3)",whiteSpace:"nowrap",letterSpacing:".08em"}}>OD</span>
    <input type="date" value={from} onChange={e=>onFrom(e.target.value)} style={{minWidth:0,flex:1,fontSize:13,padding:"8px 10px"}}/>
    <span style={{fontSize:10,fontWeight:500,color:"var(--t3)",whiteSpace:"nowrap",letterSpacing:".08em"}}>DO</span>
    <input type="date" value={to} onChange={e=>onTo(e.target.value)} style={{minWidth:0,flex:1,fontSize:13,padding:"8px 10px"}}/>
  </div>
);

// ── FUELING ───────────────────────────────────────────────────────────────────
const FuelMod = ({vid,fueling,saveFuel,delFuel}) => {
  const [showF,setShowF] = useState(false);
  const [editId,setEditId] = useState(null);
  const [fFrom,setFFrom] = useState("");
  const [fTo,setFTo] = useState("");
  const ef = {date:new Date().toISOString().slice(0,10),location:"",fuelType:"Natural 95",liters:"",pricePerLiter:"",total:"",km:""};
  const [form,setForm] = useState(ef);
  const isElectric = form.fuelType?.startsWith("Elektřina");

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
  const getDefaultFuel = ()=>{
    // try to match last used fuel for this vehicle
    const last = [...fueling].filter(f=>f.vid===vid).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
    return last?.fuelType || "Natural 95";
  };
  const openNew=()=>{setForm({...ef,fuelType:getDefaultFuel()});setEditId(null);setShowF(true);};
  const openEdit=f=>{setForm({...f,liters:String(f.liters),pricePerLiter:String(f.pricePerLiter),km:String(f.km)});setEditId(f.id);setShowF(true);};
  const save=async()=>{
    const total=parseFloat(form.liters)*parseFloat(form.pricePerLiter);
    const rec={...form,vid,id:editId||uid(),liters:parseFloat(form.liters),pricePerLiter:parseFloat(form.pricePerLiter),total:isNaN(total)?parseFloat(form.total)||0:total,km:parseInt(form.km)};
    await saveFuel(rec, editId||null);
    setShowF(false);
  };
  const del=id=>{if(window.confirm("Smazat záznam?"))delFuel(id);};

  return (
    <div className="au">
      {/* Stats */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <StatBox label="Průměrná spotřeba" val={avgCons?fmt(avgCons,1):"—"} unit={fueling.filter(f=>f.vid===vid&&f.fuelType?.startsWith("Elektřina")).length>fueling.filter(f=>f.vid===vid).length/2?"kWh/100km":"l/100km"} c="var(--acc)"/>
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
          <div key={f.id} style={{background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:14,padding:"16px 18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div>
                <div style={{fontSize:10,color:"var(--t3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>{fmtD(f.date)}</div>
                <div style={{fontWeight:500,fontSize:15,letterSpacing:"-.01em"}}>{f.location}</div>
                <div style={{fontSize:12,color:"var(--t3)",marginTop:3}}>{f.fuelType}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:20,fontWeight:300,color:"var(--t1)",fontFamily:"var(--mono)",letterSpacing:"-.02em"}}>{fmt(f.total)}<span style={{fontSize:12,color:"var(--t3)",marginLeft:4}}>Kč</span></div>
                <div style={{fontSize:11,color:"var(--t3)",marginTop:2,fontFamily:"var(--mono)"}}>{fmt(f.pricePerLiter,2)} {f.fuelType?.startsWith("Elektřina")?"Kč/kWh":"Kč/l"}</div>
              </div>
            </div>
            <div style={{height:"1px",background:"var(--b1)",marginBottom:12}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <Pill c="var(--t2)">{fmt(f.liters,1)} {f.fuelType?.startsWith("Elektřina")?"kWh":"l"}</Pill>
                <Pill c="var(--t2)">{fmt(f.km)} km</Pill>
                {f.driven&&<Pill c="var(--green)">↑ {fmt(f.driven)} km</Pill>}
                {f.cons&&<Pill c="var(--acc)">{fmt(f.cons,1)} {f.fuelType?.startsWith("Elektřina")?"kWh/100":"l/100"}</Pill>}
              </div>
              <div style={{display:"flex",gap:6}}>
                <IBtn onClick={()=>openEdit(f)}>✏️</IBtn>
                <IBtn onClick={()=>del(f.id)} danger>🗑</IBtn>
              </div>
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
            <FR label="Typ paliva"><select value={form.fuelType} onChange={e=>sf("fuelType",e.target.value)}>
  {[
    "── Benzín ──────────────",
    "Natural 95",
    "Natural 98",
    "── Prémiový benzín ─────",
    "Shell V-Power 95",
    "Shell V-Power Racing 98",
    "OMV MaxMotion 95",
    "OMV MaxMotion 100",
    "Benzina Verva 95",
    "Benzina Verva Racing 100",
    "EuroOil Excellium 95",
    "MOL Evo 95",
    "MOL Evo 100",
    "Orlen Effecta 95",
    "Orlen Blåkläder 100",
    "Globus 95",
    "── Diesel ──────────────",
    "Diesel B7",
    "── Prémiový Diesel ─────",
    "Shell V-Power Diesel",
    "OMV MaxMotion Diesel",
    "Benzina Verva Diesel",
    "EuroOil Excellium Diesel",
    "MOL Evo Diesel",
    "Orlen Effecta Diesel",
    "Globus Diesel",
    "── LPG / CNG ───────────",
    "LPG",
    "CNG",
    "── Elektřina ───────────",
    "Elektřina (AC)",
    "Elektřina (DC rychlé)",
    "── Ostatní ─────────────",
    "AdBlue",
    "Vodík",
  ].map(o => o.startsWith("──")
    ? <option key={o} disabled style={{color:"#555",fontSize:11}}>{o}</option>
    : <option key={o}>{o}</option>
  )}
</select></FR>
            <FR label={isElectric?"kWh":"Litry"} half><input type="number" inputMode="decimal" step=".01" value={form.liters} onChange={e=>sf("liters",e.target.value)} placeholder={isElectric?"55.0":"45.5"}/></FR>
            <FR label={isElectric?"Kč / kWh":"Kč / litr"} half><input type="number" inputMode="decimal" step=".01" value={form.pricePerLiter} onChange={e=>sf("pricePerLiter",e.target.value)} placeholder={isElectric?"5.50":"38.90"}/></FR>
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
const RepMod = ({vid,repairs,saveRepair,delRepair}) => {
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

  const getDefaultFuel = ()=>{
    // try to match last used fuel for this vehicle
    const last = [...fueling].filter(f=>f.vid===vid).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
    return last?.fuelType || "Natural 95";
  };
  const openNew=()=>{setForm({...ef,fuelType:getDefaultFuel()});setEditId(null);setShowF(true);};
  const openEdit=r=>{setForm({...r,matPrice:String(r.matPrice),laborPrice:String(r.laborPrice),km:String(r.km)});setEditId(r.id);setShowF(true);};
  const save=async()=>{
    const rec={...form,vid,id:editId||uid(),matPrice:parseFloat(form.matPrice)||0,laborPrice:parseFloat(form.laborPrice)||0,km:parseInt(form.km)||0};
    await saveRepair(rec, editId||null);
    setShowF(false);
  };
  const del=id=>{if(window.confirm("Smazat?"))delRepair(id);};

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
const AddMod = ({vid,addons,saveAddon,delAddon}) => {
  const [showF,setShowF] = useState(false);
  const [editId,setEditId] = useState(null);
  const ef = {date:new Date().toISOString().slice(0,10),km:"",name:"",note:"",qty:"1",unit:"ks",price:"",comment:""};
  const [form,setForm] = useState(ef);
  const s = (k,v)=>setForm(p=>({...p,[k]:v}));

  const vd = addons.filter(a=>a.vid===vid).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const total = vd.reduce((s,a)=>s+parseFloat(a.price||0),0);

  const getDefaultFuel = ()=>{
    // try to match last used fuel for this vehicle
    const last = [...fueling].filter(f=>f.vid===vid).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
    return last?.fuelType || "Natural 95";
  };
  const openNew=()=>{setForm({...ef,fuelType:getDefaultFuel()});setEditId(null);setShowF(true);};
  const openEdit=a=>{setForm({...a,price:String(a.price),km:String(a.km)});setEditId(a.id);setShowF(true);};
  const save=async()=>{
    const rec={...form,vid,id:editId||uid(),price:parseFloat(form.price)||0,km:parseInt(form.km)||0};
    await saveAddon(rec, editId||null);
    setShowF(false);
  };
  const del=id=>{if(window.confirm("Smazat?"))delAddon(id);};

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
    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(8px)"}} onClick={onClose}/>
    <div style={{position:"relative",background:"var(--s1)",borderTop:"1px solid var(--b2)",borderRadius:"20px 20px 0 0",padding:"0 18px 40px",maxHeight:"80vh",overflowY:"auto"}}>
      <div style={{width:36,height:3,background:"var(--b2)",borderRadius:2,margin:"14px auto 20px"}}/>
      <div style={{fontSize:10,fontWeight:500,letterSpacing:".14em",color:"var(--t3)",textTransform:"uppercase",marginBottom:16}}>Vaše vozidla</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {vehicles.map(v=>(
          <div key={v.id} onClick={()=>{setActiveVid(v.id);onClose();}} style={{
            background:activeVid===v.id?"var(--s2)":"none",
            border:`1px solid ${activeVid===v.id?v.color+"60":"var(--b1)"}`,
            borderRadius:14,padding:"16px",cursor:"pointer",
            display:"flex",alignItems:"center",gap:14,position:"relative",overflow:"hidden",
          }}>
            {activeVid===v.id&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:v.color,borderRadius:"3px 0 0 3px"}}/>}
            <div style={{width:44,height:44,borderRadius:10,background:v.color+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🚗</div>
            <div>
              <div style={{fontSize:10,color:"var(--t3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:3}}>{v.year} · {v.spz}</div>
              <div style={{fontWeight:500,fontSize:16,letterSpacing:"-.01em"}}>{v.brand} {v.model}</div>
              <div style={{marginTop:5}}><Pill c={v.color}>{v.fuel}</Pill></div>
            </div>
          </div>
        ))}
        <button onClick={()=>{onAdd();onClose();}} style={{background:"none",border:"1px dashed var(--b2)",borderRadius:12,padding:16,color:"var(--t3)",fontSize:13,fontWeight:400,touchAction:"manipulation",letterSpacing:".02em"}}>+ Přidat vozidlo</button>
      </div>
    </div>
  </div>
);

// ── VEHICLE FORM ──────────────────────────────────────────────────────────────
const VForm = ({existing,onSave,onClose}) => {
  const colors = ["#4c8eff","#ff5c2e","#2eff9a","#ffd12e","#a855f7","#ec4899","#06b6d4"];
  const [form,setForm] = useState(existing||{brand:"",model:"",year:new Date().getFullYear(),vin:"",spz:"",fuel:"Benzín",color:colors[0],stk:"",pov:""});
  const s=(k,v)=>setForm(p=>({...p,[k]:v}));
  return (
    <Modal title={existing?"Upravit vozidlo":"Nové vozidlo"} onClose={onClose}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <FR label="Značka" half><input value={form.brand} onChange={e=>s("brand",e.target.value)} placeholder="Škoda"/></FR>
        <FR label="Model" half><input value={form.model} onChange={e=>s("model",e.target.value)} placeholder="Octavia"/></FR>
        <FR label="Rok výroby" half><input type="number" inputMode="numeric" value={form.year} onChange={e=>s("year",e.target.value)}/></FR>
        <FR label="SPZ" half><input value={form.spz} onChange={e=>s("spz",e.target.value)} placeholder="1AB 2345"/></FR>
        <FR label="VIN"><input value={form.vin} onChange={e=>s("vin",e.target.value)} placeholder="TMBZZZ1Z9K1234567"/></FR>
        <FR label="Palivo"><select value={form.fuel} onChange={e=>s("fuel",e.target.value)}>{["Benzín","Diesel","LPG","CNG","Hybrid","Elektro"].map(o=><option key={o}>{o}</option>)}</select></FR>
        <FR label="Platnost STK" half><input type="date" value={form.stk||""} onChange={e=>s("stk",e.target.value)}/></FR>
        <FR label="Platnost POV" half><input type="date" value={form.pov||""} onChange={e=>s("pov",e.target.value)}/></FR>
        <FR label="Barva">
          <div style={{display:"flex",gap:8,flexWrap:"wrap",paddingTop:4}}>
            {colors.map(c=><div key={c} onClick={()=>s("color",c)} style={{width:32,height:32,borderRadius:"50%",background:c,cursor:"pointer",border:form.color===c?"3px solid #fff":"3px solid transparent",boxShadow:form.color===c?`0 0 0 2px ${c}`:"none",transition:"all .15s",touchAction:"manipulation"}}/>)}
          </div>
        </FR>
      </div>
      <div style={{display:"flex",gap:10,marginTop:22}}>
        <Btn ghost onClick={onClose} full>Zrušit</Btn>
        <Btn onClick={()=>onSave({...form,id:existing?.id||uid()})} full>Uložit vozidlo</Btn>
      </div>
    </Modal>
  );
};

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("login"); // login | register
  const [authError, setAuthError] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioStored, setBioStored] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [offerBio, setOfferBio] = useState(false);

  const [vehicles, setVehicles] = useState([]);
  const [fueling, setFueling] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(false);

  const [activeVid, setActiveVid] = useState(null);
  const [tab, setTab] = useState("fueling");
  const [showVDrawer, setShowVDrawer] = useState(false);
  const [showVForm, setShowVForm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [editV, setEditV] = useState(null);

  // Auth check on load
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((event,session)=>{
      setUser(session?.user ?? null);
      // When user just signed in, offer biometric if available and not yet set
      if(event==="SIGNED_IN" && session?.user){
        isBiometricAvailable().then(avail=>{
          if(avail && !hasBiometricStored()) setOfferBio(true);
        });
      }
    });
    isBiometricAvailable().then(setBioAvailable);
    setBioStored(hasBiometricStored());
    return ()=>subscription.unsubscribe();
  },[]);

  // Load data when user logs in + offer biometric
  useEffect(()=>{
    if(!user) return;
    loadAll();
    // Offer biometric setup if available and not yet configured
    isBiometricAvailable().then(avail=>{
      if(avail && !hasBiometricStored()){
        // Small delay so main app renders first
        setTimeout(()=>setOfferBio(true), 800);
      }
    });
  },[user?.id]);

  const loadAll = async ()=>{
    setLoading(true);
    const uid = user.id;
    const [v,f,r,a] = await Promise.all([
      supabase.from("vehicles").select("*").eq("user_id",uid).order("created_at"),
      supabase.from("fueling").select("*").eq("user_id",uid).order("date"),
      supabase.from("repairs").select("*").eq("user_id",uid).order("date",{ascending:false}),
      supabase.from("addons").select("*").eq("user_id",uid).order("date",{ascending:false}),
    ]);
    const vs = v.data||[];
    setVehicles(vs);
    setFueling((f.data||[]).map(x=>({...x,vid:x.vehicle_id,fuelType:x.fuel_type,pricePerLiter:x.price_per_liter})));
    setRepairs((r.data||[]).map(x=>({...x,vid:x.vehicle_id,matPrice:x.mat_price,laborPrice:x.labor_price})));
    setAddons((a.data||[]).map(x=>({...x,vid:x.vehicle_id})));
    if(vs.length>0 && !activeVid) setActiveVid(vs[0].id);
    setLoading(false);
  };

  // Auth handlers
  const login = async()=>{
    setAuthError("");
    const {data,error} = await supabase.auth.signInWithPassword({email,password});
    if(error){ setAuthError(error.message==="Invalid login credentials"?"Špatný email nebo heslo":error.message); return; }
    // offerBio is handled by onAuthStateChange
  };

  const loginBio = async()=>{
    setBioLoading(true); setAuthError("");
    const stored = JSON.parse(localStorage.getItem("ad_biometric")||"null");
    if(!stored){ setAuthError("Otisk prstu není nastaven. Přihlaš se nejdříve heslem."); setBioLoading(false); return; }
    const email = await loginWithBiometric();
    if(email){
      // Re-use stored session or prompt password silently - WebAuthn verifies identity locally
      // We store a refresh token approach: just verify biometric = allow if session exists
      const {data:{session}} = await supabase.auth.getSession();
      if(session){ setBioLoading(false); return; }
      // Session expired - need password, show message
      setAuthError("Platnost přihlášení vypršela. Přihlaš se heslem.");
    } else {
      setAuthError("Otisk prstu nebyl rozpoznán.");
    }
    setBioLoading(false);
  };
  const register = async()=>{
    setAuthError(""); setAuthMsg("");
    const {error} = await supabase.auth.signUp({email,password});
    if(error) setAuthError(error.message);
    else setAuthMsg("Registrace úspěšná! Zkontroluj email a potvrď účet.");
  };
  const logout = async()=>{ await supabase.auth.signOut(); setVehicles([]); setFueling([]); setRepairs([]); setAddons([]); setActiveVid(null); };

  // CRUD – Vehicles
  const saveVehicle = async(v)=>{
    const isEdit = v.id && vehicles.find(x=>x.id===v.id);
    if(isEdit) {
      const {data} = await supabase.from("vehicles")
        .update({brand:v.brand,model:v.model,year:v.year,vin:v.vin,spz:v.spz,fuel:v.fuel,color:v.color,stk:v.stk||null,pov:v.pov||null})
        .eq("id",v.id).select().single();
      setVehicles(p=>p.map(x=>x.id===v.id?{...x,...v,...(data||{})}:x));
      setActiveVid(v.id);
    } else {
      const {data,error} = await supabase.from("vehicles").insert({...v,id:undefined,user_id:user.id}).select().single();
      if(data){ setVehicles(p=>[...p,data]); setActiveVid(data.id); }
      else console.error(error);
    }
  };
  const delVehicle = async(id)=>{
    if(!window.confirm("Smazat vozidlo a všechny záznamy?"))return;
    await supabase.from("vehicles").delete().eq("id",id);
    setVehicles(p=>p.filter(v=>v.id!==id));
    setFueling(p=>p.filter(f=>f.vid!==id));
    setRepairs(p=>p.filter(r=>r.vid!==id));
    setAddons(p=>p.filter(a=>a.vid!==id));
    setActiveVid(vehicles.find(v=>v.id!==id)?.id||null);
  };

  // CRUD – Fueling
  const saveFuel = async(rec,editId)=>{
    const row = {user_id:user.id,vehicle_id:rec.vid,date:rec.date,location:rec.location,fuel_type:rec.fuelType,liters:rec.liters,price_per_liter:rec.pricePerLiter,total:rec.total,km:rec.km};
    if(editId){
      await supabase.from("fueling").update(row).eq("id",editId);
      setFueling(p=>p.map(x=>x.id===editId?{...x,...rec}:x));
    } else {
      const {data} = await supabase.from("fueling").insert(row).select().single();
      if(data) setFueling(p=>[...p,{...data,vid:data.vehicle_id,fuelType:data.fuel_type,pricePerLiter:data.price_per_liter}]);
    }
  };
  const delFuel = async(id)=>{ await supabase.from("fueling").delete().eq("id",id); setFueling(p=>p.filter(x=>x.id!==id)); };

  // CRUD – Repairs
  const saveRepair = async(rec,editId)=>{
    const row = {user_id:user.id,vehicle_id:rec.vid,date:rec.date,km:rec.km,material:rec.material,note:rec.note,qty:rec.qty,unit:rec.unit,mat_price:rec.matPrice,labor_price:rec.laborPrice,who:rec.who,comment:rec.comment};
    if(editId){
      await supabase.from("repairs").update(row).eq("id",editId);
      setRepairs(p=>p.map(x=>x.id===editId?{...x,...rec}:x));
    } else {
      const {data} = await supabase.from("repairs").insert(row).select().single();
      if(data) setRepairs(p=>[...p,{...data,vid:data.vehicle_id,matPrice:data.mat_price,laborPrice:data.labor_price}]);
    }
  };
  const delRepair = async(id)=>{ await supabase.from("repairs").delete().eq("id",id); setRepairs(p=>p.filter(x=>x.id!==id)); };

  // CRUD – Addons
  const saveAddon = async(rec,editId)=>{
    const row = {user_id:user.id,vehicle_id:rec.vid,date:rec.date,km:rec.km,name:rec.name,note:rec.note,qty:rec.qty,unit:rec.unit,price:rec.price,comment:rec.comment};
    if(editId){
      await supabase.from("addons").update(row).eq("id",editId);
      setAddons(p=>p.map(x=>x.id===editId?{...x,...rec}:x));
    } else {
      const {data} = await supabase.from("addons").insert(row).select().single();
      if(data) setAddons(p=>[...p,{...data,vid:data.vehicle_id}]);
    }
  };
  const delAddon = async(id)=>{ await supabase.from("addons").delete().eq("id",id); setAddons(p=>p.filter(x=>x.id!==id)); };

  const av = vehicles.find(v=>v.id===activeVid);
  const TABS = [{id:"fueling",icon:"⛽",label:"Tankování"},{id:"repairs",icon:"🔧",label:"Opravy"},{id:"addons",icon:"📦",label:"Doplňky"}];

  // ── AUTH SCREEN ───────────────────────────────────────────────────────────
  if(authLoading) return (
    <>
      <CSS/>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--t3)"}}>
        <div>Načítám...</div>
      </div>
    </>
  );

  if(!user) return (
    <>
      <CSS/>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24,background:"var(--bg)"}}>
        <div style={{width:"100%",maxWidth:380}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{fontSize:22,fontWeight:600,letterSpacing:".15em",color:"var(--t1)",textTransform:"uppercase",marginBottom:6}}>AutoDeník</div>
            <div style={{fontSize:12,color:"var(--t3)",letterSpacing:".08em"}}>EVIDENCE VOZIDEL</div>
          </div>
          <div style={{background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:20,padding:28}}>
            <div style={{display:"flex",gap:0,marginBottom:24,background:"var(--s2)",borderRadius:10,padding:4}}>
              {[["login","Přihlásit se"],["register","Registrovat"]].map(([m,l])=>(
                <button key={m} onClick={()=>{setAuthMode(m);setAuthError("");setAuthMsg("");}} style={{flex:1,background:authMode===m?"var(--s1)":"none",border:authMode===m?"1px solid var(--b2)":"1px solid transparent",borderRadius:8,padding:"9px",color:authMode===m?"var(--t1)":"var(--t3)",fontSize:13,fontWeight:500,transition:"all .2s",touchAction:"manipulation"}}>{l}</button>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={{fontSize:10,fontWeight:500,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",display:"block",marginBottom:6}}>Email</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="vas@email.cz" onKeyDown={e=>e.key==="Enter"&&(authMode==="login"?login():register())}/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:500,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",display:"block",marginBottom:6}}>Heslo</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&(authMode==="login"?login():register())}/>
              </div>
              {authError&&<div style={{fontSize:12,color:"var(--red)",padding:"10px 12px",background:"rgba(224,92,92,.1)",borderRadius:8,border:"1px solid rgba(224,92,92,.2)"}}>{authError}</div>}
              {authMsg&&<div style={{fontSize:12,color:"var(--green)",padding:"10px 12px",background:"rgba(78,203,113,.1)",borderRadius:8,border:"1px solid rgba(78,203,113,.2)"}}>{authMsg}</div>}
              <Btn onClick={authMode==="login"?login:register} full>{authMode==="login"?"Přihlásit se":"Zaregistrovat"}</Btn>
              {authMode==="login"&&<div style={{fontSize:11,color:"var(--t3)",textAlign:"center"}}>Přihlášení vydrží 60 dní bez nutnosti zadávat heslo znovu</div>}
              {authMode==="login"&&bioAvailable&&bioStored&&(
                <button onClick={loginBio} disabled={bioLoading} style={{
                  background:"none",border:"1px solid var(--b2)",borderRadius:10,
                  padding:"13px",color:"var(--t2)",fontSize:14,fontWeight:500,
                  display:"flex",alignItems:"center",justifyContent:"center",gap:10,
                  touchAction:"manipulation",transition:"border-color .2s",
                  opacity:bioLoading?0.6:1,
                }}>
                  <span style={{fontSize:22}}>👆</span>
                  {bioLoading?"Ověřuji...":"Přihlásit otiskem prstu"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Offer biometric registration after first login */}
      {offerBio&&ReactDOM.createPortal(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(10px)"}}>
          <div style={{background:"var(--s1)",border:"1px solid var(--b2)",borderRadius:20,padding:28,maxWidth:340,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:16}}>👆</div>
            <div style={{fontSize:18,fontWeight:500,marginBottom:8}}>Přihlášení otiskem prstu</div>
            <div style={{fontSize:13,color:"var(--t2)",marginBottom:24,lineHeight:1.6}}>Chceš příště používat otisk prstu místo hesla? Můžeš to kdykoliv zrušit.</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <Btn full onClick={async()=>{
                const ok = await registerBiometric(user?.id||"", email);
                if(ok){ setBioStored(true); setAuthMsg("Otisk prstu nastaven!"); }
                else setAuthError("Registrace otisku se nezdařila.");
                setOfferBio(false);
              }}>Nastavit otisk prstu</Btn>
              <Btn ghost full onClick={()=>setOfferBio(false)}>Teď ne</Btn>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );

  // ── MAIN APP ──────────────────────────────────────────────────────────────
  return (
    <>
      <CSS/>
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",maxWidth:680,margin:"0 auto"}}>

        {/* TOP BAR */}
        <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(10,10,10,.92)",borderBottom:"1px solid var(--b1)",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",backdropFilter:"blur(20px)"}}>
          <div style={{fontSize:17,fontWeight:600,letterSpacing:".15em",color:"var(--t1)",textTransform:"uppercase"}}>AutoDeník</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>setShowVDrawer(true)} style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:8,padding:"8px 14px",color:"var(--t1)",fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:8,touchAction:"manipulation",letterSpacing:".01em"}}>
              {av?<><span style={{width:6,height:6,borderRadius:"50%",background:av.color,display:"inline-block"}}></span> {av.brand} {av.model}</>:"Vozidlo"} <span style={{color:"var(--t3)",fontSize:10}}>▼</span>
            </button>
            <button onClick={()=>setShowExport(true)} style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:8,padding:"8px 12px",color:"var(--t2)",fontSize:15,touchAction:"manipulation",display:"flex",alignItems:"center",justifyContent:"center",minWidth:36,minHeight:36}} title="Export dat">⬇</button>
            {bioAvailable&&(
              <button onClick={()=>setOfferBio(true)} style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:8,padding:"8px 12px",color:bioStored?"var(--acc)":"var(--t3)",fontSize:16,touchAction:"manipulation",display:"flex",alignItems:"center",justifyContent:"center",minWidth:36,minHeight:36}} title={bioStored?"Otisk nastaven – klikni pro změnu":"Nastavit otisk prstu"}>👆</button>
            )}
            <button onClick={logout} style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:8,padding:"8px 12px",color:"var(--t2)",fontSize:13,touchAction:"manipulation",display:"flex",alignItems:"center",justifyContent:"center",minWidth:36,minHeight:36}} title="Odhlásit se"><span style={{fontSize:15}}>↩</span></button>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{flex:1,padding:"16px 16px 100px",overflowX:"hidden"}}>
          {loading?(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"40vh",color:"var(--t3)"}}>
              <div>Načítám data...</div>
            </div>
          ):av?(
            <>
              {/* Vehicle info card */}
              {(()=>{
                const now = new Date();
                const stkDate = av.stk ? new Date(av.stk) : null;
                const povDate = av.pov ? new Date(av.pov) : null;
                const daysLeft = d => d ? Math.ceil((d-now)/(1000*60*60*24)) : null;
                const stkDays = daysLeft(stkDate);
                const povDays = daysLeft(povDate);
                const expColor = d => d===null?"var(--t3)":d<0?"var(--red)":d<30?"var(--yellow)":"var(--green)";
                return (
                  <div style={{background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:16,padding:"20px",marginBottom:18,overflow:"hidden",position:"relative"}}>
                    <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at top left, ${av.color}08, transparent 60%)`}}/>
                    <div style={{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
                      <div>
                        <div style={{fontSize:11,fontWeight:500,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",marginBottom:6}}>{av.year} · {av.spz}</div>
                        <div style={{fontSize:24,fontWeight:300,letterSpacing:"-.02em",color:"var(--t1)"}}>{av.brand} <strong style={{fontWeight:600}}>{av.model}</strong></div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>
                          <Pill c={av.color}>{av.fuel}</Pill>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <IBtn onClick={()=>{setEditV(av);setShowVForm(true);}}>✏️</IBtn>
                        <IBtn onClick={()=>delVehicle(av.id)} danger>🗑</IBtn>
                      </div>
                    </div>
                    {av.vin&&<div style={{fontSize:10,color:"var(--t3)",marginTop:14,fontFamily:"var(--mono)",letterSpacing:".05em"}}>VIN · {av.vin}</div>}
                    <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--b1)",display:"flex",gap:10,flexWrap:"wrap"}}>
                      <div style={{flex:1,minWidth:120,background:"var(--s2)",borderRadius:10,padding:"10px 12px",border:`1px solid ${expColor(stkDays)}22`}}>
                        <div style={{fontSize:9,fontWeight:500,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",marginBottom:4}}>STK</div>
                        <div style={{fontSize:13,fontWeight:500,color:expColor(stkDays)}}>{av.stk?new Date(av.stk).toLocaleDateString("cs-CZ"):"—"}</div>
                        {stkDays!==null&&<div style={{fontSize:10,color:expColor(stkDays),marginTop:2}}>{stkDays<0?"⚠ Prošlá!":stkDays<30?"⚠ Za "+stkDays+" dní":"Za "+stkDays+" dní"}</div>}
                      </div>
                      <div style={{flex:1,minWidth:120,background:"var(--s2)",borderRadius:10,padding:"10px 12px",border:`1px solid ${expColor(povDays)}22`}}>
                        <div style={{fontSize:9,fontWeight:500,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",marginBottom:4}}>Pojištění (POV)</div>
                        <div style={{fontSize:13,fontWeight:500,color:expColor(povDays)}}>{av.pov?new Date(av.pov).toLocaleDateString("cs-CZ"):"—"}</div>
                        {povDays!==null&&<div style={{fontSize:10,color:expColor(povDays),marginTop:2}}>{povDays<0?"⚠ Prošlé!":povDays<30?"⚠ Za "+povDays+" dní":"Za "+povDays+" dní"}</div>}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Tabs */}
              <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"1px solid var(--b1)"}}>
                {TABS.map(t=>(
                  <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:"none",border:"none",borderBottom:tab===t.id?"2px solid var(--acc)":"2px solid transparent",padding:"12px 4px",marginBottom:"-1px",color:tab===t.id?"var(--acc)":"var(--t3)",fontWeight:tab===t.id?600:400,fontSize:13,letterSpacing:".02em",transition:"all .2s",touchAction:"manipulation"}}>{t.icon} {t.label}</button>
                ))}
              </div>

              {tab==="fueling"&&<FuelMod vid={activeVid} fueling={fueling} saveFuel={saveFuel} delFuel={delFuel}/>}
              {tab==="repairs"&&<RepMod vid={activeVid} repairs={repairs} saveRepair={saveRepair} delRepair={delRepair}/>}
              {tab==="addons"&&<AddMod vid={activeVid} addons={addons} saveAddon={saveAddon} delAddon={delAddon}/>}
            </>
          ):(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:16,color:"var(--t3)"}}>
              <div style={{fontSize:56}}>🚗</div>
              <div style={{fontSize:18,fontWeight:500}}>Zatím žádné vozidlo</div>
              <Btn onClick={()=>setShowVForm(true)}>+ Přidat vozidlo</Btn>
            </div>
          )}
        </div>
      </div>

      {showVDrawer&&<VehicleDrawer vehicles={vehicles} activeVid={activeVid} setActiveVid={setActiveVid} onAdd={()=>setShowVForm(true)} onClose={()=>setShowVDrawer(false)}/>}
      {showVForm&&<VForm existing={editV} onSave={async v=>{await saveVehicle(v);setShowVForm(false);setEditV(null);}} onClose={()=>{setShowVForm(false);setEditV(null);}}/>}

      {/* Export Modal */}
      {showExport&&ReactDOM.createPortal(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(10px)"}} onClick={()=>setShowExport(false)}>
          <div style={{background:"var(--s1)",border:"1px solid var(--b2)",borderRadius:20,padding:28,maxWidth:360,width:"100%"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,paddingBottom:16,borderBottom:"1px solid var(--b1)"}}>
              <h2 style={{fontSize:18,fontWeight:500}}>Export dat</h2>
              <button onClick={()=>setShowExport(false)} style={{background:"none",border:"1px solid var(--b1)",borderRadius:8,color:"var(--t3)",width:36,height:36,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{fontSize:12,color:"var(--t3)",marginBottom:20,lineHeight:1.6}}>
              Exportuj svá data do souboru pro zálohu nebo vlastní zpracování. Soubory se uloží do stažených souborů.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:10,fontWeight:500,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",marginBottom:4}}>CSV – otevřeš v Excelu</div>
              <button onClick={()=>exportCSV(fueling.map(f=>({datum:f.date,vozidlo:vehicles.find(v=>v.id===f.vid)?.brand+" "+vehicles.find(v=>v.id===f.vid)?.model,misto:f.location,palivo:f.fuelType,litry:f.liters,cena_za_litr:f.pricePerLiter,celkem_kc:f.total,km:f.km})),"tankování.csv")} style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:10,padding:"12px 16px",color:"var(--t1)",fontSize:14,textAlign:"left",touchAction:"manipulation",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>⛽</span> Tankování (.csv)
              </button>
              <button onClick={()=>exportCSV(repairs.map(r=>({datum:r.date,vozidlo:vehicles.find(v=>v.id===r.vid)?.brand+" "+vehicles.find(v=>v.id===r.vid)?.model,km:r.km,material:r.material,poznamka:r.note,mnozstvi:r.qty,jednotka:r.unit,material_kc:r.matPrice,prace_kc:r.laborPrice,kdo:r.who,komentar:r.comment})),"opravy.csv")} style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:10,padding:"12px 16px",color:"var(--t1)",fontSize:14,textAlign:"left",touchAction:"manipulation",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>🔧</span> Opravy (.csv)
              </button>
              <button onClick={()=>exportCSV(addons.map(a=>({datum:a.date,vozidlo:vehicles.find(v=>v.id===a.vid)?.brand+" "+vehicles.find(v=>v.id===a.vid)?.model,km:a.km,nazev:a.name,typ:a.note,mnozstvi:a.qty,jednotka:a.unit,cena_kc:a.price,komentar:a.comment})),"doplnky.csv")} style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:10,padding:"12px 16px",color:"var(--t1)",fontSize:14,textAlign:"left",touchAction:"manipulation",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>📦</span> Doplňky (.csv)
              </button>
              <div style={{fontSize:10,fontWeight:500,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",margin:"8px 0 4px"}}>JSON – kompletní záloha</div>
              <button onClick={()=>exportJSON({vehicles,fueling,repairs,addons,exportDate:new Date().toISOString()},"autodenik-zaloha.json")} style={{background:"var(--s2)",border:"1px solid var(--acc)",borderRadius:10,padding:"12px 16px",color:"var(--acc)",fontSize:14,fontWeight:500,textAlign:"left",touchAction:"manipulation",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>💾</span> Kompletní záloha (.json)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Offer biometric after login */}
      {offerBio&&ReactDOM.createPortal(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(10px)"}}>
          <div style={{background:"var(--s1)",border:"1px solid var(--b2)",borderRadius:20,padding:28,maxWidth:340,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:16}}>👆</div>
            <div style={{fontSize:18,fontWeight:500,marginBottom:8}}>Přihlášení otiskem prstu</div>
            <div style={{fontSize:13,color:"var(--t2)",marginBottom:24,lineHeight:1.6}}>Chceš příště používat otisk prstu místo hesla? Ušetříš čas při každém přihlášení.</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <Btn full onClick={async()=>{
                const ok = await registerBiometric(user.id, user.email);
                if(ok){ setBioStored(true); }
                setOfferBio(false);
              }}>Nastavit otisk prstu</Btn>
              <Btn ghost full onClick={()=>setOfferBio(false)}>Teď ne</Btn>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
