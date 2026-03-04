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
  const nl = String.fromCharCode(10);
  const csv = [keys.join(";"), ...rows.map(r => keys.map(k => {
    const v = r[k] ?? "";
    return typeof v === "string" && v.includes(";") ? ('"' + v + '"') : v;
  }).join(";"))].join(nl);
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
      --t3:  #666660;
      --font:'DM Sans', sans-serif;
      --mono:'DM Mono', monospace;
    }
    html, body, #root { height:100%; background:var(--bg); color:var(--t1); font-family:var(--font); transition: background .3s, color .3s; }
    * { scrollbar-width:thin; scrollbar-color:var(--b2) transparent; }
    ::-webkit-scrollbar { width:3px; }
    ::-webkit-scrollbar-thumb { background:var(--b2); border-radius:2px; }
    input, select, textarea {
      background:var(--s2); color:var(--t1); border:1px solid var(--b1);
      border-radius:10px; padding:13px 16px; font-family:var(--font);
      font-size:16px; width:100%; outline:none; transition:border-color .2s, box-shadow .2s, background .3s, color .3s;
      -webkit-appearance:none; appearance:none; letter-spacing:.01em;
      font-variant-numeric: normal;
    }
    input::placeholder, textarea::placeholder { color:var(--t3); opacity:.5; }
    select { background-color:var(--s2) !important; color:var(--t1) !important; }
    select option { background-color:var(--s2) !important; color:var(--t1) !important; }
    input.vin-input {
      font-family: Arial, Helvetica, sans-serif !important;
      font-variant-numeric: normal;
      font-feature-settings: "zero" off;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    input:focus, select:focus, textarea:focus {
      border-color:var(--acc);
      box-shadow:0 0 0 3px rgba(200,169,110,.1);
    }
    select option { background:var(--s2); color:var(--t1); }
    select option:disabled { color:var(--t3) !important; }
    input[list]::-webkit-calendar-picker-indicator { opacity: 0; }
    /* Date input styling */
    input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(0.5);
      cursor: pointer;
    }
    [data-theme="light"] input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(0.3);
    }
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
    document.body.style.paddingRight="0px";
    return ()=>{ document.body.style.overflow=""; document.body.style.paddingRight=""; };
  },[]);
  return ReactDOM.createPortal(
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.8)",zIndex:9999,backdropFilter:"blur(10px)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px"}} onClick={onClose}>
      <div style={{width:"100%",maxWidth:560,maxHeight:"calc(100dvh - 32px)",display:"flex",flexDirection:"column",borderRadius:20,background:"var(--s1)",border:"1px solid var(--b2)",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"20px 20px 16px",borderBottom:"1px solid var(--b1)",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{fontSize:18,fontWeight:500,letterSpacing:"-.01em"}}>{title}</h2>
          <button onClick={onClose} style={{background:"none",border:"1px solid var(--b1)",borderRadius:8,color:"var(--t3)",fontSize:16,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",touchAction:"manipulation",flexShrink:0}}>✕</button>
        </div>
        <div style={{overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"20px 20px 28px",flex:1}}>
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
const FuelMod = ({vid,fueling,saveFuel,delFuel,sharedReceipt,onSharedReceiptDone}) => {
  const [showF,setShowF] = useState(false);
  const [editId,setEditId] = useState(null);
  const [fFrom,setFFrom] = useState("");
  const [fTo,setFTo] = useState("");
  const [showLocSug,setShowLocSug] = useState(false);
  const [scanLoading,setScanLoading] = useState(false);
  const [scanError,setScanError] = useState("");

  // Zpracuj sdílený soubor z Orlen aplikace
  useEffect(()=>{
    if(!sharedReceipt || !vid) return;
    const processShared = async()=>{
      try {
        const { data, error } = await supabase.storage
          .from("temp-receipts")
          .download(sharedReceipt);
        if(error) throw error;
        const lfd = getLastFuelForForm();
        setForm({...ef, fuelType:lfd.fuelType, customFuel:lfd.customFuel});
        setEditId(null);
        setShowF(true);
        // Krátká pauza aby se modal renderoval
        await new Promise(r => setTimeout(r, 100));
        await scanReceipt(data);
        await supabase.storage.from("temp-receipts").remove([sharedReceipt]);
        onSharedReceiptDone?.();
      } catch(e) {
        console.error("Shared receipt error:", e);
        onSharedReceiptDone?.();
      }
    };
    processShared();
  }, [sharedReceipt, vid]);
  const STANDARD_FUELS = ['Natural 95', 'Natural 98', 'Shell V-Power 95', 'Shell V-Power Racing 98', 'OMV MaxMotion 95', 'OMV MaxMotion 100', 'Orlen Verva 95', 'Orlen Verva Racing 100', 'EuroOil Excellium 95', 'MOL Evo 95', 'MOL Evo 100', 'Orlen Effecta 95', 'Globus 95', 'Diesel B7', 'Shell V-Power Diesel', 'OMV MaxMotion Diesel', 'Orlen Verva Diesel', 'EuroOil Excellium Diesel', 'MOL Evo Diesel', 'Orlen Effecta Diesel', 'Globus Diesel', 'LPG', 'CNG', 'Elektřina (AC)', 'Elektřina (DC rychlé)', 'AdBlue', 'Vodík'];
const getLastFuel = () => {
  const last = localStorage.getItem("ad_last_fuel")||"Natural 95";
  // Pokud poslední palivo není ve standardním seznamu, vrátí se jako __custom__
  return last;
};
const getLastFuelForForm = () => {
  const last = localStorage.getItem("ad_last_fuel")||"Natural 95";
  if(last==="__custom__"||last==="") return {fuelType:"Natural 95", customFuel:""};
  if(!STANDARD_FUELS.includes(last)) return {fuelType:"__custom__", customFuel:last};
  return {fuelType:last, customFuel:""};
};
  const lastFuelData = getLastFuelForForm();
  const ef = {date:new Date().toISOString().slice(0,10),location:"",fuelType:lastFuelData.fuelType,customFuel:lastFuelData.customFuel==="__custom__"?"":lastFuelData.customFuel,liters:"",pricePerLiter:"",total:"",km:""};
  const [form,setForm] = useState(ef);
  const isElectric = form.fuelType?.startsWith("Elektřina");

  const vd = fueling.filter(f=>f.vid===vid).sort((a,b)=>new Date(a.date)-new Date(b.date)||a.km-b.km);
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
    if(k==="fuelType") localStorage.setItem("ad_last_fuel",v);
    setForm(u);
  };
  const openNew=()=>{const lfd=getLastFuelForForm();setForm({...ef,fuelType:lfd.fuelType,customFuel:lfd.customFuel});setEditId(null);setShowF(true);};
  const openEdit=f=>{setForm({...f,liters:String(f.liters),pricePerLiter:String(f.pricePerLiter),km:String(f.km)});setEditId(f.id);setShowF(true);};
  const scanReceipt = async(file) => {
    setScanLoading(true);
    setScanError("");
    try {
      // Zmenši obrázek na max 800px
      let uploadFile = file;
      const isPDF = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");
      if (!isPDF) {
        try {
          uploadFile = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const MAX = 800;
              const scale = Math.min(1, MAX / Math.max(img.width, img.height));
              const w = Math.round(img.width * scale);
              const h = Math.round(img.height * scale);
              const canvas = document.createElement("canvas");
              canvas.width = w; canvas.height = h;
              canvas.getContext("2d").drawImage(img, 0, 0, w, h);
              canvas.toBlob(b => resolve(b || file), "image/jpeg", 0.7);
            };
            img.onerror = () => resolve(file);
            img.src = URL.createObjectURL(file);
          });
        } catch(e) { uploadFile = file; }
      }
      const formData = new FormData();
      formData.append("file", uploadFile, "receipt.jpg");
      const response = await fetch(`${SUPA_URL}/functions/v1/scan-receipt`, {
        method: "POST",
        headers: {
          "apikey": SUPA_KEY,
          "Authorization": `Bearer ${SUPA_KEY}`,
        },
        body: formData
      });
      const result = await response.json();
      if(!result.ok) throw new Error(result.error || "Chyba serveru");
      const parsed = result.data;
      // Mapování paliva z Gemini výstupu na přesný název ze seznamu
      const mapFuel = (raw) => {
        if(!raw) return null;
        const r = raw.toLowerCase();
        if(r.includes("verva diesel")||r.includes("verva die")) return "Orlen Verva Diesel";
        if(r.includes("verva 95")||r.includes("verva 9")) return "Orlen Verva 95";
        if(r.includes("verva 100")||r.includes("verva rac")) return "Orlen Verva Racing 100";
        if(r.includes("effecta diesel")) return "Orlen Effecta Diesel";
        if(r.includes("effecta")) return "Orlen Effecta 95";
        if(r.includes("v-power diesel")||r.includes("vpower diesel")) return "Shell V-Power Diesel";
        if(r.includes("v-power racing")||r.includes("vpower racing")) return "Shell V-Power Racing 98";
        if(r.includes("v-power")||r.includes("vpower")) return "Shell V-Power 95";
        if(r.includes("maxmotion diesel")||r.includes("max motion diesel")) return "OMV MaxMotion Diesel";
        if(r.includes("maxmotion 100")||r.includes("max motion 100")) return "OMV MaxMotion 100";
        if(r.includes("maxmotion")||r.includes("max motion")) return "OMV MaxMotion 95";
        if(r.includes("excellium diesel")) return "EuroOil Excellium Diesel";
        if(r.includes("excellium")) return "EuroOil Excellium 95";
        if(r.includes("evo diesel")) return "MOL Evo Diesel";
        if(r.includes("evo 100")) return "MOL Evo 100";
        if(r.includes("evo")) return "MOL Evo 95";
        if(r.includes("q max diesel")||r.includes("qmax diesel")) return "Orlen Verva Diesel";
        if(r.includes("eurodiesel")) return "Diesel B7";
        if(r.includes("diesel")) return "Diesel B7";
        if(r.includes("natural 98")||r.includes("95 e10")||r.includes("98")) return "Natural 98";
        if(r.includes("natural")||r.includes("95")||r.includes("benzin")) return "Natural 95";
        if(r.includes("lpg")) return "LPG";
        if(r.includes("cng")) return "CNG";
        if(r.includes("elektř")||r.includes("elektri")||r.includes("ac)")) return "Elektřina (AC)";
        if(r.includes("dc")) return "Elektřina (DC rychlé)";
        return raw; // ponech originál pokud nenajde shodu
      };
      const mappedFuel = mapFuel(parsed.fuelType);
      // Cena za litr = total / litry (po slevách)
      const computedPPL = (parsed.total != null && parsed.liters != null && parsed.liters > 0)
        ? Math.round((parsed.total / parsed.liters) * 100) / 100
        : parsed.pricePerLiter;
      setForm(p=>({
        ...p,
        date: parsed.date||p.date,
        location: parsed.location||p.location,
        fuelType: mappedFuel||p.fuelType,
        liters: parsed.liters!=null?String(parsed.liters):p.liters,
        pricePerLiter: computedPPL!=null?String(computedPPL):p.pricePerLiter,
        total: parsed.total!=null?String(parsed.total):p.total,
        km: parsed.km!=null?String(parsed.km):p.km,
      }));
    } catch(e) {
      setScanError("Nepodařilo se přečíst účtenku. Zkus znovu nebo vyplň ručně.");
      console.error(e);
    }
    setScanLoading(false);
  };

  const save=async()=>{
    const total=parseFloat(form.liters)*parseFloat(form.pricePerLiter);
    const fuelType = form.fuelType==="__custom__" ? (form.customFuel||"Jiné") : form.fuelType;
    localStorage.setItem("ad_last_fuel", fuelType); // Ulož skutečný název, ne __custom__
    const rec={...form,fuelType,vid,id:editId||uid(),liters:parseFloat(form.liters),pricePerLiter:parseFloat(form.pricePerLiter),total:isNaN(total)?parseFloat(form.total)||0:total,km:parseInt(form.km)};
    await saveFuel(rec, editId||null);
    setShowF(false);
  };
  const del=id=>{if(window.confirm("Smazat záznam?"))delFuel(id);};

  return (
    <div className="au">
      {/* Stats */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <StatBox label="Průměrná spotřeba" val={avgCons?fmt(avgCons,1):"—"} unit={fueling.filter(f=>f.vid===vid&&f.fuelType?.startsWith("Elektřina")).length>fueling.filter(f=>f.vid===vid).length/2?"kWh/100km":"L/100km"} c="var(--acc)"/>
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
          {[{label:"Cena PHM (Kč/L)",data:chartP,color:"#e8c060",gid:"g1"},{label:"Spotřeba (L/100km)",data:chartC,color:"#c8a96e",gid:"g2"}].map(({label,data,color,gid})=>(
            <div key={label} style={{background:"var(--s2)",border:"1.5px solid var(--b1)",borderRadius:12,padding:"14px 14px 8px"}}>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",marginBottom:10}}>{label}</div>
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.4}/>
                      <stop offset="100%" stopColor={color} stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--b1)"/>
                  <XAxis dataKey="d" tick={{fill:"var(--t3)",fontSize:9}} tickLine={false}/>
                  <YAxis tick={{fill:"var(--t3)",fontSize:9}} tickLine={false} axisLine={false} domain={["auto","auto"]}/>
                  <Tooltip contentStyle={{background:"var(--s2)",border:"1.5px solid var(--b2)",borderRadius:8,color:"var(--t1)",fontSize:12}}/>
                  <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gid})`} dot={{fill:color,r:3,strokeWidth:0}}/>
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
                <div style={{fontSize:20,fontWeight:500,color:"var(--t1)",fontFamily:"Arial, Helvetica, sans-serif",letterSpacing:"-.01em"}}>{fmt(f.total)}<span style={{fontSize:12,color:"var(--t3)",marginLeft:4}}>Kč</span></div>
                <div style={{fontSize:11,color:"var(--t3)",marginTop:2,fontFamily:"Arial, Helvetica, sans-serif",fontWeight:400}}>{fmt(f.pricePerLiter,2)} {f.fuelType?.startsWith("Elektřina")?"Kč/kWh":"Kč/L"}</div>
              </div>
            </div>
            <div style={{height:"1px",background:"var(--b1)",marginBottom:12}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <Pill c="var(--t2)">{fmt(f.liters,1)} {f.fuelType?.startsWith("Elektřina")?"kWh":"L"}</Pill>
                <Pill c="var(--t2)">{fmt(f.km)} km</Pill>
                {f.driven&&<Pill c="var(--t3)">+{fmt(f.driven)} km</Pill>}
                {f.cons&&<Pill c="var(--acc)">{fmt(f.cons,1)} {f.fuelType?.startsWith("Elektřina")?"kWh/100km":"L/100km"}</Pill>}
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
          {/* Scan receipt button - only for new records */}
          {!editId&&(
            <div style={{marginBottom:16}}>
              {scanLoading ? (
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"var(--s2)",border:"2px dashed var(--b2)",borderRadius:12,padding:"14px 16px",color:"var(--t2)",fontSize:14}}>
                  <span style={{fontSize:20}}>⏳</span> Čtu účtenku...
                </div>
              ) : (
                <label style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"var(--s2)",border:"1.5px dashed var(--b2)",borderRadius:12,padding:"14px 16px",color:"var(--t2)",fontSize:14,fontWeight:500,touchAction:"manipulation",cursor:"pointer",userSelect:"none",width:"100%",boxSizing:"border-box"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="var(--acc)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="var(--b2)"}
                >
                  <input type="file" accept="image/*,application/pdf" style={{position:"absolute",opacity:0,width:0,height:0}}
                    onChange={e=>{ const f=e.target.files?.[0]; if(f) scanReceipt(f); e.target.value=""; }}
                  />
                  <span style={{fontSize:20}}>📷</span> Načíst z účtenky
                </label>
              )}
              {scanError&&<div style={{fontSize:12,color:"var(--red)",marginTop:8,padding:"8px 12px",background:"rgba(224,92,92,.1)",borderRadius:8,border:"1px solid rgba(224,92,92,.2)"}}>{scanError}</div>}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <FR label="Datum" half><input type="date" value={form.date} onChange={e=>sf("date",e.target.value)}/></FR>
            <FR label="Stav km" half><input type="number" inputMode="numeric" value={form.km} onChange={e=>sf("km",e.target.value)} placeholder="89500"/></FR>
            <FR label="Místo tankování">
              <div style={{position:"relative"}}>
                <input
                  value={form.location}
                  onChange={e=>sf("location",e.target.value)}
                  onFocus={()=>setShowLocSug(true)}
                  onBlur={()=>setTimeout(()=>setShowLocSug(false),150)}
                  placeholder="Shell, OMV..."
                  autoComplete="off"
                />
                {showLocSug&&form.location.length>=1&&(()=>{
                  const sugs = [...new Set(fueling.filter(f=>f.location&&f.location.toLowerCase().includes(form.location.toLowerCase())).map(f=>f.location))].slice(0,5);
                  return sugs.length>0?(
                    <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"var(--s1)",border:"1px solid var(--acc)",borderRadius:10,zIndex:999,overflow:"hidden",boxShadow:"0 4px 16px rgba(0,0,0,.3)"}}>
                      {sugs.map(s=>(
                        <div key={s} onMouseDown={()=>{sf("location",s);setShowLocSug(false);}} style={{padding:"11px 14px",fontSize:14,color:"var(--t1)",cursor:"pointer",borderBottom:"1px solid var(--b1)"}}
                          onMouseEnter={e=>e.currentTarget.style.background="var(--s2)"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                        >{s}</div>
                      ))}
                    </div>
                  ):null;
                })()}
                {showLocSug&&form.location.length===0&&(()=>{
                  const all = [...new Set(fueling.filter(f=>f.location).map(f=>f.location))].slice(0,5);
                  return all.length>0?(
                    <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"var(--s1)",border:"1px solid var(--b2)",borderRadius:10,zIndex:999,overflow:"hidden",boxShadow:"0 4px 16px rgba(0,0,0,.3)"}}>
                      {all.map(s=>(
                        <div key={s} onMouseDown={()=>{sf("location",s);setShowLocSug(false);}} style={{padding:"11px 14px",fontSize:14,color:"var(--t2)",cursor:"pointer",borderBottom:"1px solid var(--b1)"}}
                          onMouseEnter={e=>e.currentTarget.style.background="var(--s2)"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                        >{s}</div>
                      ))}
                    </div>
                  ):null;
                })()}
              </div>
            </FR>
            <FR label="Typ paliva">
              <select value={form.fuelType} onChange={e=>{
                const v=e.target.value;
                setForm(p=>({...p,fuelType:v,customFuel:v==="__custom__"?p.customFuel:""}));
              }}>
  {[
    "── Benzín ──────────────",
    "Natural 95",
    "Natural 98",
    "── Prémiový benzín ─────",
    "Shell V-Power 95",
    "Shell V-Power Racing 98",
    "OMV MaxMotion 95",
    "OMV MaxMotion 100",
    "Orlen Verva 95",
    "Orlen Verva Racing 100",
    "EuroOil Excellium 95",
    "MOL Evo 95",
    "MOL Evo 100",
    "Orlen Effecta 95",
    "Globus 95",
    "── Diesel ──────────────",
    "Diesel B7",
    "── Prémiový Diesel ─────",
    "Shell V-Power Diesel",
    "OMV MaxMotion Diesel",
    "Orlen Verva Diesel",
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
    "── Jiné ────────────────",
    "__custom__",
  ].map(o => o.startsWith("──")
    ? <option key={o} disabled style={{color:"#555",fontSize:11}}>{o}</option>
    : o==="__custom__"
      ? <option key={o} value="__custom__">✎ Zadat ručně...</option>
      : <option key={o}>{o}</option>
  )}
</select>
              {form.fuelType==="__custom__"&&<input value={form.customFuel||""} onChange={e=>sf("customFuel",e.target.value)} placeholder="Název paliva..." style={{marginTop:8}} autoFocus/>}
            </FR>
            <FR label={isElectric?"kWh":"Litry"} half><input type="number" inputMode="decimal" step=".01" value={form.liters} onChange={e=>sf("liters",e.target.value)} placeholder={isElectric?"55.00":"45.50"}/></FR>
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
  const [showLocSug,setShowLocSug] = useState(false);
  const ef = {date:new Date().toISOString().slice(0,10),km:"",material:"",note:"",qty:"",unit:"ks",matPrice:"",laborPrice:"",who:"",comment:""};
  const [form,setForm] = useState(ef);
  const s = (k,v)=>setForm(p=>({...p,[k]:v}));

  const vd = repairs.filter(r=>r.vid===vid);
  const filtered = vd.filter(r=>{
    if(fFrom&&r.date<fFrom)return false;
    if(fTo&&r.date>fTo)return false;
    return true;
  }).sort((a,b)=>new Date(b.date)-new Date(a.date)||b.km-a.km);

  const tMat = filtered.reduce((s,r)=>s+parseFloat(r.matPrice||0),0);
  const tLab = filtered.reduce((s,r)=>s+parseFloat(r.laborPrice||0),0);

  const openNew=()=>{setForm(ef);setEditId(null);setShowF(true);};
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
                  {r.note&&<div style={{fontSize:11,color:"var(--t3)",fontFamily:"Arial, Helvetica, sans-serif",marginTop:2}}>#{r.note}</div>}
                </div>
                <div style={{fontSize:18,fontWeight:500,color:"var(--t1)",fontFamily:"Arial, Helvetica, sans-serif",whiteSpace:"nowrap"}}>{fmt(total)}<span style={{fontSize:11,color:"var(--t3)",marginLeft:3}}>Kč</span></div>
              </div>
              <div style={{height:"1px",background:"var(--b1)",marginBottom:10}}/>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
                <Pill c="var(--t2)">{fmtD(r.date)}</Pill>
                <Pill c="var(--t2)">{fmt(r.km)} km</Pill>
                <Pill c="var(--t2)">{r.qty} {r.unit}</Pill>
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

  const openNew=()=>{setForm(ef);setEditId(null);setShowF(true);};
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
                {a.note&&<div style={{fontSize:11,color:"var(--t3)",fontFamily:"Arial, Helvetica, sans-serif",marginTop:2}}>#{a.note}</div>}
              </div>
              <div style={{fontSize:18,fontWeight:500,color:"var(--t1)",fontFamily:"Arial, Helvetica, sans-serif",whiteSpace:"nowrap"}}>{fmt(a.price)}<span style={{fontSize:11,color:"var(--t3)",marginLeft:3}}>Kč</span></div>
            </div>
            <div style={{height:"1px",background:"var(--b1)",marginBottom:10}}/>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
              <Pill c="var(--t2)">{fmtD(a.date)}</Pill>
              <Pill c="var(--t2)">{fmt(a.km)} km</Pill>
              <Pill c="var(--t2)">{a.qty} {a.unit}</Pill>
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
  <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(8px)",background:"rgba(0,0,0,.7)"}} onClick={onClose}>
    <div style={{position:"relative",background:"var(--s1)",border:"1px solid var(--b2)",borderRadius:20,padding:"20px 20px 28px",width:"100%",maxWidth:480,maxHeight:"80vh",overflowY:"auto",WebkitOverflowScrolling:"touch"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,paddingBottom:16,borderBottom:"1px solid var(--b1)"}}>
        <div style={{fontSize:10,fontWeight:500,letterSpacing:".14em",color:"var(--t3)",textTransform:"uppercase"}}>Vaše vozidla</div>
        <button onClick={onClose} style={{background:"none",border:"1px solid var(--b1)",borderRadius:8,color:"var(--t3)",fontSize:16,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>✕</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {vehicles.map(v=>(
          <div key={v.id} onClick={()=>{setActiveVid(v.id);onClose();}} style={{
            background:activeVid===v.id?"var(--s2)":"none",
            border:`1px solid ${activeVid===v.id?"var(--acc)":"var(--b1)"}`,
            borderRadius:14,padding:"16px",cursor:"pointer",
            display:"flex",alignItems:"center",gap:14,position:"relative",overflow:"hidden",
          }}>
            {activeVid===v.id&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:"var(--acc)",borderRadius:"3px 0 0 3px"}}/>}
            <div style={{width:44,height:44,borderRadius:10,background:"var(--s3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h11l4 4h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
            </div>
            <div>
              <div style={{fontSize:10,color:"var(--t3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:3}}>{v.year} · {v.spz}</div>
              <div style={{fontWeight:500,fontSize:16,letterSpacing:"-.01em"}}>{v.brand} {v.model}</div>
              <div style={{marginTop:5}}><Pill c="var(--t3)">{v.fuel}</Pill></div>
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
  const colors = ["#888880","#aaa9a0","#666660","#c8a96e","#6b9fff","#4ecb71","#e05c5c"];
  const [form,setForm] = useState(existing||{brand:"",model:"",year:new Date().getFullYear(),vin:"",spz:"",fuel:"Benzín",color:colors[0],stk:"",pov:""});
  const s=(k,v)=>setForm(p=>({...p,[k]:v}));
  return (
    <Modal title={existing?"Upravit vozidlo":"Nové vozidlo"} onClose={onClose}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <FR label="Značka" half><input value={form.brand} onChange={e=>s("brand",e.target.value)} placeholder="Škoda, Volkswagen, Toyota..."/></FR>
        <FR label="Model" half><input value={form.model} onChange={e=>s("model",e.target.value)} placeholder="Octavia, Passat, Yaris..."/></FR>
        <FR label="Rok výroby" half><input type="number" inputMode="numeric" value={form.year} onChange={e=>s("year",e.target.value)}/></FR>
        <FR label="SPZ" half><input value={form.spz} onChange={e=>s("spz",e.target.value)} placeholder="1AB 2345"/></FR>
        <FR label="VIN"><input className="vin-input" value={form.vin} onChange={e=>s("vin",e.target.value.toUpperCase())} placeholder="TMBZZZ1Z9K1234567"/></FR>
        <FR label="Palivo"><select value={form.fuel} onChange={e=>s("fuel",e.target.value)}>{["Benzín","Diesel","LPG","CNG","Hybrid","Elektro"].map(o=><option key={o}>{o}</option>)}</select></FR>
        <FR label="Platnost STK" half><input type="date" value={form.stk||""} onChange={e=>s("stk",e.target.value)}/></FR>
        <FR label="Platnost POV" half><input type="date" value={form.pov||""} onChange={e=>s("pov",e.target.value)}/></FR>
        <FR label="Barva">
          <div style={{display:"flex",gap:8,flexWrap:"wrap",paddingTop:4}}>
            {colors.map(c=><div key={c} onClick={()=>s("color",c)} style={{width:30,height:30,borderRadius:8,background:c,cursor:"pointer",border:form.color===c?"2px solid var(--acc)":"2px solid transparent",opacity:form.color===c?1:0.6,transition:"all .15s",touchAction:"manipulation"}}/>)}
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

// ── UPDATE TOAST ─────────────────────────────────────────────────────────────
const UpdateToast = ({onDone}) => {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  useEffect(()=>{
    const duration = 4000;
    const interval = 50;
    const step = (interval/duration)*100;
    const timer = setInterval(()=>{
      setProgress(p=>{
        if(p<=0){ clearInterval(timer); setVisible(false); setTimeout(onDone,300); return 0; }
        return p-step;
      });
    }, interval);
    return ()=>clearInterval(timer);
  },[]);
  return (
    <div style={{
      position:"fixed",bottom:20,left:"50%",transform:`translateX(-50%)`,
      width:"calc(100% - 32px)",maxWidth:480,zIndex:9998,
      background:"var(--s1)",border:"1px solid var(--b2)",
      borderRadius:14,overflow:"hidden",
      boxShadow:"0 4px 24px rgba(0,0,0,.25)",
      opacity:visible?1:0,transition:"opacity .3s ease",
    }}>
      <div style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:32,height:32,borderRadius:8,background:"var(--s2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>✓</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:500,color:"var(--t1)"}}>Aplikace aktualizována</div>
          <div style={{fontSize:11,color:"var(--t3)",marginTop:1}}>Běžíš na nejnovější verzi</div>
        </div>
        <button onClick={()=>{setVisible(false);setTimeout(onDone,300);}} style={{background:"none",border:"none",color:"var(--t3)",fontSize:16,padding:4,touchAction:"manipulation",flexShrink:0}}>✕</button>
      </div>
      <div style={{height:2,background:"var(--b1)"}}>
        <div style={{height:"100%",width:`${progress}%`,background:"var(--acc)",transition:"width .05s linear",borderRadius:2}}/>
      </div>
    </div>
  );
};

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState(()=>{
    // Check if URL contains password reset token
    if(window.location.hash.includes("type=recovery")) return "newpassword";
    return "login";
  }); // login | register | reset | newpassword
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [changePwdForm, setChangePwdForm] = useState({pwd:"",pwd2:""});
  const [changePwdErr, setChangePwdErr] = useState("");
  const [changePwdMsg, setChangePwdMsg] = useState("");
  const [showChangePwdVis, setShowChangePwdVis] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [pwaPrompt, setPwaPrompt] = useState(null);
  const [showPwaInstall, setShowPwaInstall] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [sharedReceipt, setSharedReceipt] = useState(null);

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
  const [theme, setTheme] = useState(()=>{
    const saved = localStorage.getItem("ad_theme");
    const t = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    // Apply immediately to avoid flash
    const darkV = {"--bg":"#0a0a0a","--s1":"#111111","--s2":"#181818","--s3":"#202020","--b1":"#2a2a2a","--b2":"#333333","--acc":"#c8a96e","--acc2":"#e8c98e","--blue":"#6b9fff","--green":"#4ecb71","--red":"#e05c5c","--t1":"#f5f5f0","--t2":"#888880","--t3":"#666660"};
    const lightV = {"--bg":"#f2f0eb","--s1":"#ffffff","--s2":"#f7f5f0","--s3":"#ede9e2","--b1":"#ddd9d0","--b2":"#ccc8c0","--acc":"#b8924a","--acc2":"#c8a96e","--blue":"#3a6fd8","--green":"#2a9a50","--red":"#cc3333","--t1":"#1a1a16","--t2":"#666660","--t3":"#999990"};
    const vars = t==="light" ? lightV : darkV;
    Object.entries(vars).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
    document.body.style.background = vars["--bg"];
    return t;
  });

  useEffect(()=>{
    const dark = {
      "--bg":"#0a0a0a","--s1":"#111111","--s2":"#181818","--s3":"#202020",
      "--b1":"#2a2a2a","--b2":"#333333","--acc":"#c8a96e","--acc2":"#e8c98e",
      "--blue":"#6b9fff","--green":"#4ecb71","--red":"#e05c5c",
      "--t1":"#f5f5f0","--t2":"#888880","--t3":"#666660"
    };
    const light = {
      "--bg":"#f2f0eb","--s1":"#ffffff","--s2":"#f7f5f0","--s3":"#ede9e2",
      "--b1":"#ddd9d0","--b2":"#ccc8c0","--acc":"#b8924a","--acc2":"#c8a96e",
      "--blue":"#3a6fd8","--green":"#2a9a50","--red":"#cc3333",
      "--t1":"#1a1a16","--t2":"#666660","--t3":"#999990"
    };
    const vars = theme==="light" ? light : dark;
    Object.entries(vars).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
    document.documentElement.style.setProperty("background",vars["--bg"]);
    document.body.style.background = vars["--bg"];
    localStorage.setItem("ad_theme", theme);
  },[theme]);
  const [editV, setEditV] = useState(null);

  // Auth check on load
  // Handle PWA Share Target - zpracuj sdílený soubor z URL parametru
  useEffect(()=>{
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const receiptFile = params.get("receipt");
    if(search) localStorage.setItem("ad_last_url", search + " @ " + new Date().toISOString());
    if(receiptFile){
      window.history.replaceState({}, "", "/");
      setSharedReceipt(receiptFile);
      setTab("fueling");
    }
  }, []);

  // Když jsou vozidla načtená a čeká sdílený soubor, přepni na správné vozidlo
  useEffect(()=>{
    if(!sharedReceipt || !vehicles.length) return;
    setTab("fueling");
    if(!activeVid) setActiveVid(vehicles[0].id);
  }, [sharedReceipt, vehicles, activeVid]);

  useEffect(()=>{
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery");
    
    // Recovery flag - zobrazí formulář nového hesla, ale NEodhlásí session
    // Session je potřeba pro updateUser()
    let recoveryMode = isRecovery;

    if(isRecovery){
      setAuthMode("newpassword");
      setAuthLoading(false);
      // Necháme Supabase zpracovat token a vytvořit session - potřebujeme ji pro updateUser
    } else {
      supabase.auth.getSession().then(({data:{session}})=>{
        if(recoveryMode) return; // Blokuj přihlášení v recovery módu
        setUser(session?.user ?? null);
        setAuthLoading(false);
      });
    }
    
    const {data:{subscription}} = supabase.auth.onAuthStateChange((event,session)=>{
      if(event==="PASSWORD_RECOVERY"){
        recoveryMode = true;
        // Nezalogovat - jen zobrazit formulář, ale session nechat žít
        setUser(null);
        setAuthMode("newpassword");
        setAuthLoading(false);
        return;
      }
      if(event==="SIGNED_IN" && recoveryMode){
        // Supabase vytvořil session pro recovery - NEodhlašovat, potřebujeme ji
        // Jen zajistit že uživatel neuvidí aplikaci
        setUser(null);
        return;
      }
      if(recoveryMode) return;
      setUser(session?.user ?? null);
      if(event==="SIGNED_OUT") setAuthLoading(false);
    });

    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      window._pwaPrompt = e;
      setPwaPrompt(e);
      setShowPwaInstall(true);
    });
    if(window.matchMedia('(display-mode: standalone)').matches){
      window._pwaInstalled = true;
    }

    // Version check - fetch version.json a porovnej s uloženou verzí
    fetch('/version.json?t='+Date.now())
      .then(r=>r.json())
      .then(({version})=>{
        const stored = localStorage.getItem('ad_version');
        if(stored && stored !== version){
          setShowUpdate(true);
        }
        localStorage.setItem('ad_version', version);
      })
      .catch(()=>{});

    // SW registration
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('/sw.js').catch(()=>{});
    }

    return ()=>subscription.unsubscribe();
  },[]);

  // Load data when user logs in + offer biometric
  useEffect(()=>{
    if(!user) return;
    loadAll();
    // Offer biometric setup if available and not yet configured
    // PWA prompt handled by beforeinstallprompt event
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
  const resetPassword = async()=>{
    if(!email.trim()){setAuthError("Zadej svůj email");return;}
    const {error} = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: "https://auto-denik.vercel.app"
    });
    if(error){
      if(error.message.includes("rate limit")) setAuthError("Příliš mnoho pokusů. Zkus to znovu za hodinu.");
      else if(error.message.includes("not found")||error.message.includes("invalid")) setAuthError("Email nebyl nalezen.");
      else setAuthError("Chyba: "+error.message);
    }
    else{setAuthMsg("Odkaz na reset hesla byl odeslán na tvůj email.");setAuthError("");}
  };

  const changePassword = async()=>{
    setChangePwdErr(""); setChangePwdMsg("");
    if(!changePwdForm.pwd||changePwdForm.pwd.length<6){setChangePwdErr("Heslo musí mít alespoň 6 znaků.");return;}
    if(changePwdForm.pwd!==changePwdForm.pwd2){setChangePwdErr("Hesla se neshodují.");return;}
    const {error} = await supabase.auth.updateUser({password:changePwdForm.pwd});
    if(error){
      if(error.message.includes("session")) setChangePwdErr("Přihlaš se znovu a zkus to znovu.");
      else setChangePwdErr("Chyba při změně hesla.");
    } else {
      setChangePwdMsg("Heslo bylo úspěšně změněno.");
      setChangePwdForm({pwd:"",pwd2:""});
      setTimeout(()=>{setShowChangePwd(false);setChangePwdMsg("");},2000);
    }
  };

  const handleNewPassword = async()=>{
    if(!newPassword||newPassword.length<6){setAuthError("Heslo musí mít alespoň 6 znaků");return;}
    if(newPassword!==confirmPassword){setAuthError("Hesla se neshodují");return;}
    const {error} = await supabase.auth.updateUser({password: newPassword});
    if(error){
      if(error.message.includes("session")) setAuthError("Platnost odkazu vypršela. Požádej o nový reset hesla.");
      else if(error.message.includes("weak")) setAuthError("Heslo je příliš slabé. Použij alespoň 6 znaků.");
      else setAuthError("Chyba při ukládání hesla. Zkus to znovu.");
    }
    else{
      setAuthMsg("Heslo bylo úspěšně změněno.");
      setAuthError("");
      setNewPassword("");
      setConfirmPassword("");
      // Odhlásit recovery session, reload bez hashe - pak lze normálně přihlásit
      await supabase.auth.signOut();
      setTimeout(()=>{ window.location.replace(window.location.pathname); }, 1500);
    }
  };



  const login = async()=>{
    setAuthError("");
    const {data,error} = await supabase.auth.signInWithPassword({email,password});
    if(error){
      const m=error.message;
      if(m.includes("Invalid login")||m.includes("invalid login")) setAuthError("Nesprávný email nebo heslo.");
      else if(m.includes("rate limit")) setAuthError("Příliš mnoho pokusů. Zkus to za hodinu.");
      else if(m.includes("not confirmed")) setAuthError("Email není potvrzený. Zkontroluj schránku.");
      else setAuthError("Chyba přihlášení. Zkus to znovu.");
      return;
    }
    // session handled by onAuthStateChange
  };

  const register = async()=>{
    setAuthError(""); setAuthMsg("");
    const {error} = await supabase.auth.signUp({email,password});
    if(error) setAuthError(error.message);
    else setAuthMsg("Registrace úspěšná! Zkontroluj email a potvrď účet.");
  };
  const logout = async()=>{ await supabase.auth.signOut(); setVehicles([]); setFueling([]); setRepairs([]); setAddons([]); setActiveVid(null); };

  const deleteAccount = async()=>{
    if(!window.confirm("Smazat účet a VŠECHNA data? Tato akce je nevratná!")) return;
    if(!window.confirm("Opravdu? Všechna vozidla, tankování, opravy a doplňky budou smazány navždy.")) return;
    const uid = user.id;
    // Delete all user data
    await supabase.from("addons").delete().eq("user_id",uid);
    await supabase.from("repairs").delete().eq("user_id",uid);
    await supabase.from("fueling").delete().eq("user_id",uid);
    await supabase.from("vehicles").delete().eq("user_id",uid);
    // Delete account via admin - sign out first
    await supabase.auth.signOut();
    setVehicles([]); setFueling([]); setRepairs([]); setAddons([]); setActiveVid(null);
    alert("Účet a data byly smazány. Pro úplné smazání účtu kontaktuj správce.");
  };

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
      const {brand,model,year,vin,spz,fuel,color,stk,pov} = v;
      const {data,error} = await supabase.from("vehicles").insert({brand,model,year,vin,spz,fuel,color,stk:stk||null,pov:pov||null,user_id:user.id}).select().single();
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
            {authMode==="newpassword" ? (
              <div style={{textAlign:"center",marginBottom:20}}>
                <div style={{fontSize:28,marginBottom:8}}>🔑</div>
                <h2 style={{fontSize:18,fontWeight:600,marginBottom:4}}>Nastavit nové heslo</h2>
                <div style={{fontSize:13,color:"var(--t3)"}}>AutoDeník</div>
              </div>
            ) : (
            <div style={{display:"flex",gap:0,marginBottom:24,background:"var(--s2)",borderRadius:10,padding:4}}>
              {[["login","Přihlásit se"],["register","Registrovat"]].map(([m,l])=>(
                <button key={m} onClick={()=>{setAuthMode(m);setAuthError("");setAuthMsg("");}} style={{flex:1,background:authMode===m?"var(--s1)":"none",border:authMode===m?"1px solid var(--b2)":"1px solid transparent",borderRadius:8,padding:"9px",color:authMode===m?"var(--t1)":"var(--t3)",fontSize:13,fontWeight:500,transition:"all .2s",touchAction:"manipulation"}}>{l}</button>
              ))}
            </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {authMode!=="reset"&&authMode!=="newpassword"&&<div>
                <label style={{fontSize:10,fontWeight:500,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",display:"block",marginBottom:6}}>Email</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="vas@email.cz" onKeyDown={e=>e.key==="Enter"&&(authMode==="login"?login():register())}/>
              </div>}
              {authMode!=="reset"&&authMode!=="newpassword"&&<div>
                <label style={{fontSize:10,fontWeight:500,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",display:"block",marginBottom:6}}>Heslo</label>
                <div style={{position:"relative"}}>
                  <input type={showLoginPwd?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&(authMode==="login"?login():register())} style={{paddingRight:40,width:"100%",boxSizing:"border-box"}}/>
                  <button type="button" onClick={()=>setShowLoginPwd(p=>!p)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--t3)",cursor:"pointer",fontSize:16,padding:4}}>{showLoginPwd?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}</button>
                </div>
              </div>}
              {authMode!=="reset"&&authMode!=="newpassword"&&authError&&<div style={{fontSize:12,color:"var(--red)",padding:"10px 12px",background:"rgba(224,92,92,.1)",borderRadius:8,border:"1px solid rgba(224,92,92,.2)"}}>{authError}</div>}
              {authMode!=="reset"&&authMode!=="newpassword"&&authMsg&&<div style={{fontSize:12,color:"var(--green)",padding:"10px 12px",background:"rgba(78,203,113,.1)",borderRadius:8,border:"1px solid rgba(78,203,113,.2)"}}>{authMsg}</div>}
              {authMode!=="reset"&&authMode!=="newpassword"&&<Btn onClick={authMode==="login"?login:register} full>{authMode==="login"?"Přihlásit se":"Zaregistrovat"}</Btn>}
              {authMode==="login"&&<div style={{fontSize:11,color:"var(--t3)",textAlign:"center"}}>Přihlášení vydrží 60 dní bez nutnosti zadávat heslo znovu</div>}
              {(authMode==="login")&&(
                <button onClick={()=>{setAuthMode("reset");setAuthError("");setAuthMsg("");}} style={{background:"none",border:"none",color:"var(--t3)",fontSize:12,touchAction:"manipulation",textDecoration:"underline",cursor:"pointer"}}>
                  Zapomenuté heslo?
                </button>
              )}
              {authMode==="reset"&&(
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{fontSize:13,color:"var(--t2)",textAlign:"center",lineHeight:1.5}}>Zadej svůj email a pošleme ti odkaz pro reset hesla.</div>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="vas@email.cz" onKeyDown={e=>e.key==="Enter"&&resetPassword()}/>
                  {authError&&<div style={{fontSize:12,color:"var(--red)",padding:"8px 12px",background:"rgba(224,92,92,.1)",borderRadius:8}}>{authError}</div>}
                  {authMsg&&<div style={{fontSize:12,color:"var(--green)",padding:"10px 12px",background:"rgba(78,203,113,.1)",borderRadius:8,border:"1px solid rgba(78,203,113,.2)"}}>{authMsg}</div>}
                  <button onClick={resetPassword} style={{background:"var(--acc)",border:"none",borderRadius:10,padding:"13px",color:"#0a0a0a",fontSize:15,fontWeight:600,touchAction:"manipulation",cursor:"pointer"}}>Odeslat odkaz</button>
                  <button onClick={()=>{setAuthMode("login");setAuthError("");setAuthMsg("");}} style={{background:"none",border:"none",color:"var(--t3)",fontSize:13,touchAction:"manipulation",cursor:"pointer"}}>← Zpět na přihlášení</button>
                </div>
              )}
              {authMode==="newpassword"&&(
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{fontSize:15,fontWeight:600,color:"var(--t1)",textAlign:"center"}}>Nastavit nové heslo</div>
                  <div style={{fontSize:13,color:"var(--t2)",textAlign:"center",lineHeight:1.5}}>Zadej své nové heslo.</div>
                  <div style={{position:"relative"}}>
                    <input type={showNewPwd?"text":"password"} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Nové heslo (min. 6 znaků)" onKeyDown={e=>e.key==="Enter"&&handleNewPassword()} style={{paddingRight:40,width:"100%",boxSizing:"border-box"}}/>
                    <button type="button" onClick={()=>setShowNewPwd(p=>!p)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--t3)",cursor:"pointer",fontSize:16,padding:4}}>{showNewPwd?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}</button>
                  </div>
                  <div style={{position:"relative"}}>
                    <input type={showConfirmPwd?"text":"password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Potvrdit heslo" onKeyDown={e=>e.key==="Enter"&&handleNewPassword()} style={{paddingRight:40,width:"100%",boxSizing:"border-box"}}/>
                    <button type="button" onClick={()=>setShowConfirmPwd(p=>!p)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--t3)",cursor:"pointer",fontSize:16,padding:4}}>{showConfirmPwd?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}</button>
                  </div>
                  {authError&&<div style={{fontSize:12,color:"var(--red)",padding:"8px 12px",background:"rgba(224,92,92,.1)",borderRadius:8}}>{authError}</div>}
                  {authMsg&&<div style={{fontSize:12,color:"var(--green)",padding:"10px 12px",background:"rgba(78,203,113,.1)",borderRadius:8,border:"1px solid rgba(78,203,113,.2)"}}>{authMsg}</div>}
                  <button onClick={handleNewPassword} style={{background:"var(--acc)",border:"none",borderRadius:10,padding:"13px",color:"#0a0a0a",fontSize:15,fontWeight:600,touchAction:"manipulation",cursor:"pointer"}}>Uložit nové heslo</button>
                </div>
              )}
            </div>
          </div>
          <div style={{textAlign:"center",marginTop:20,paddingTop:16,borderTop:"1px solid var(--b1)"}}>
            <a href="/privacy" style={{fontSize:11,color:"var(--t3)",textDecoration:"none",letterSpacing:".04em"}} target="_blank">🔒 Zásady ochrany osobních údajů</a>
          </div>
        </div>
      </div>

      {/* PWA install hint on auth screen */}
      {pwaPrompt&&ReactDOM.createPortal(
        <div style={{position:"fixed",bottom:20,left:16,right:16,zIndex:9997,background:"var(--s1)",border:"1px solid var(--b2)",borderRadius:16,padding:"14px 18px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 8px 32px rgba(0,0,0,.5)"}}>
          <span style={{fontSize:28}}>📲</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:500,marginBottom:2}}>Přidat AutoDeník na plochu</div>
            <div style={{fontSize:11,color:"var(--t3)"}}>Rychlý přístup jako normální aplikace</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setPwaPrompt(null)} style={{background:"none",border:"1px solid var(--b1)",borderRadius:8,padding:"7px 10px",color:"var(--t3)",fontSize:12,touchAction:"manipulation"}}>Ne</button>
            <button onClick={async()=>{if(pwaPrompt){await pwaPrompt.prompt();}setPwaPrompt(null);}} style={{background:"var(--acc)",border:"none",borderRadius:8,padding:"7px 14px",color:"#0a0a0a",fontSize:12,fontWeight:600,touchAction:"manipulation"}}>Přidat</button>
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
        <div style={{position:"sticky",top:0,zIndex:100,background:theme==="dark"?"rgba(10,10,10,.92)":"rgba(242,240,235,.95)",borderBottom:"1px solid var(--b1)",padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",backdropFilter:"blur(20px)",gap:8}}>
          <div style={{fontSize:15,fontWeight:600,letterSpacing:".15em",color:"var(--t1)",textTransform:"uppercase",flexShrink:0}}>AutoDeník</div>
          <button onClick={()=>setShowVDrawer(true)} style={{background:"var(--s2)",border:"1px solid var(--acc)",borderRadius:8,padding:"8px 12px",color:"var(--t1)",fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:6,touchAction:"manipulation",flex:1,minWidth:0,maxWidth:240,overflow:"hidden",boxShadow:"0 0 0 1px rgba(200,169,110,.15)"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:av?.color||"var(--t3)",display:"inline-block",flexShrink:0}}></span>
            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,textAlign:"left"}}>{av?`${av.brand} ${av.model}`:"Vozidlo"}</span>
            <span style={{color:"var(--t3)",fontSize:10,flexShrink:0}}>▼</span>
          </button>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <button onClick={()=>setShowExport(true)} style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:8,width:36,height:36,color:"var(--t2)",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",touchAction:"manipulation"}} title="Export">⬇</button>
            <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:8,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",touchAction:"manipulation"}} title={theme==="dark"?"Světlý režim":"Tmavý režim"}>
              {theme==="dark"
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888880" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666660" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>
            <button onClick={logout} style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:8,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",touchAction:"manipulation"}} title="Odhlásit">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 6.5 A8 8 0 1 0 17.5 6.5" stroke="var(--t2)" strokeWidth="2.2" fill="none"/>
                <line x1="12" y1="2" x2="12" y2="13" stroke="var(--acc)" strokeWidth="2.4"/>
              </svg>
            </button>
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
                        <div style={{fontSize:11,fontWeight:500,letterSpacing:".12em",color:"var(--t2)",textTransform:"uppercase",marginBottom:6}}>{av.year} · {av.spz}</div>
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
                    {av.vin&&<div onClick={()=>{
                      const copy = (text) => {
                        if(navigator.clipboard&&window.isSecureContext){
                          navigator.clipboard.writeText(text).catch(()=>{});
                        } else {
                          const ta=document.createElement("textarea");
                          ta.value=text; ta.style.position="fixed"; ta.style.opacity="0";
                          document.body.appendChild(ta); ta.focus(); ta.select();
                          document.execCommand("copy"); document.body.removeChild(ta);
                        }
                      };
                      copy(av.vin);
                      const el = document.getElementById("vin-toast-"+av.id);
                      if(el){el.style.opacity="1"; setTimeout(()=>el.style.opacity="0",1500);}
                    }} title="Kopírovat VIN" style={{fontSize:10,color:"var(--t2)",marginTop:14,fontFamily:"Arial, Helvetica, sans-serif",letterSpacing:".08em",fontVariantNumeric:"normal",cursor:"pointer",userSelect:"none",position:"relative",display:"inline-block"}} onMouseEnter={e=>{const s=e.currentTarget.querySelector(".vin-num");if(s)s.style.color="var(--acc)";}} onMouseLeave={e=>{const s=e.currentTarget.querySelector(".vin-num");if(s)s.style.color="";}}>VIN · <span className="vin-num">{av.vin}</span> <span style={{opacity:.5}}>📋</span>
                      <span id={"vin-toast-"+av.id} style={{position:"absolute",left:"50%",transform:"translateX(-50%)",bottom:"120%",background:"var(--s1)",border:"1px solid var(--b2)",borderRadius:6,padding:"3px 10px",fontSize:10,color:"var(--acc)",whiteSpace:"nowrap",opacity:0,transition:"opacity .2s",pointerEvents:"none"}}>Zkopírováno!</span>
                    </div>}
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

              {tab==="fueling"&&<FuelMod vid={activeVid} fueling={fueling} saveFuel={saveFuel} delFuel={delFuel} sharedReceipt={sharedReceipt} onSharedReceiptDone={()=>setSharedReceipt(null)}/>}
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
              <div style={{fontSize:10,fontWeight:500,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",margin:"16px 0 4px"}}>Debug</div>
              <div style={{fontSize:11,color:"var(--t3)",padding:"8px 12px",background:"var(--s2)",borderRadius:8,wordBreak:"break-all",userSelect:"all"}}>
                URL: {localStorage.getItem("ad_last_url")||"Žádná URL"}<br/>
                sharedReceipt: {sharedReceipt||"null"}<br/>
                activeVid: {activeVid||"null"}<br/>
                tab: {tab}<br/>
                vehicles: {vehicles.length}
              </div>
              <div style={{fontSize:10,fontWeight:500,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",margin:"16px 0 4px"}}>Informace</div>
              <a href="/privacy" target="_blank" style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:10,padding:"12px 16px",color:"var(--t2)",fontSize:14,textAlign:"left",touchAction:"manipulation",display:"flex",alignItems:"center",gap:10,textDecoration:"none"}}>
                <span style={{fontSize:18}}>🔒</span>
                Zásady ochrany osobních údajů
              </a>
              <div style={{fontSize:10,fontWeight:500,letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase",margin:"16px 0 4px"}}>Účet</div>
              <button onClick={()=>setShowChangePwd(true)} style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:10,padding:"12px 16px",color:"var(--t2)",fontSize:14,textAlign:"left",touchAction:"manipulation",display:"flex",alignItems:"center",gap:10,width:"100%"}}>
                <span style={{fontSize:18}}>🔑</span>
                Změnit heslo
              </button>
              <div style={{fontSize:10,fontWeight:500,letterSpacing:".12em",color:"var(--red)",textTransform:"uppercase",margin:"16px 0 4px"}}>Nebezpečná zóna</div>
              <button onClick={()=>{setShowExport(false);deleteAccount();}} style={{background:"rgba(224,92,92,.08)",border:"1px solid rgba(224,92,92,.25)",borderRadius:10,padding:"12px 16px",color:"var(--red)",fontSize:14,textAlign:"left",touchAction:"manipulation",display:"flex",alignItems:"center",gap:10}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                Smazat účet a všechna data
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showChangePwd&&(
        <Modal title="Změnit heslo" onClose={()=>{setShowChangePwd(false);setChangePwdErr("");setChangePwdMsg("");setChangePwdForm({pwd:"",pwd2:""});}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:13,color:"var(--t2)",lineHeight:1.6}}>Zadej nové heslo pro svůj účet <strong>{user?.email}</strong>.</div>
            <div style={{position:"relative"}}>
              <input type={showChangePwdVis?"text":"password"} value={changePwdForm.pwd} onChange={e=>setChangePwdForm(p=>({...p,pwd:e.target.value}))} placeholder="Nové heslo (min. 6 znaků)" style={{paddingRight:40,width:"100%",boxSizing:"border-box"}}/>
              <button type="button" onClick={()=>setShowChangePwdVis(p=>!p)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--t3)",cursor:"pointer",fontSize:16,padding:4}}>{showChangePwdVis?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}</button>
            </div>
            <input type={showChangePwdVis?"text":"password"} value={changePwdForm.pwd2} onChange={e=>setChangePwdForm(p=>({...p,pwd2:e.target.value}))} placeholder="Potvrdit heslo" onKeyDown={e=>e.key==="Enter"&&changePassword()}/>
            {changePwdErr&&<div style={{fontSize:12,color:"var(--red)",padding:"10px 12px",background:"rgba(224,92,92,.1)",borderRadius:8,border:"1px solid rgba(224,92,92,.2)"}}>{changePwdErr}</div>}
            {changePwdMsg&&<div style={{fontSize:12,color:"var(--green)",padding:"10px 12px",background:"rgba(78,203,113,.1)",borderRadius:8,border:"1px solid rgba(78,203,113,.2)"}}>{changePwdMsg}</div>}
            <Btn onClick={changePassword} full>Uložit nové heslo</Btn>
          </div>
        </Modal>
      )}

      {/* Update notification - informational toast, auto-dismiss */}
      {showUpdate&&ReactDOM.createPortal(
        <UpdateToast onDone={()=>setShowUpdate(false)}/>,
        document.body
      )}

      {/* PWA Install prompt */}
      {pwaPrompt&&ReactDOM.createPortal(
        <div style={{position:"fixed",bottom:80,left:16,right:16,zIndex:9997,background:"var(--s1)",border:"1px solid var(--b2)",borderRadius:16,padding:"18px 20px",display:"flex",alignItems:"center",gap:14,boxShadow:"0 8px 40px rgba(0,0,0,.6)"}}>
          <div style={{width:48,height:48,borderRadius:12,overflow:"hidden",flexShrink:0,background:"var(--s2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <img src="/logo.svg" alt="AutoDeník" style={{width:40,height:40}}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:2}}>Přidat na plochu</div>
            <div style={{fontSize:11,color:"var(--t3)"}}>Rychlý přístup bez prohlížeče</div>
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            <button onClick={()=>setPwaPrompt(null)} style={{background:"none",border:"1px solid var(--b1)",borderRadius:8,padding:"8px 10px",color:"var(--t3)",fontSize:12,touchAction:"manipulation"}}>Ne</button>
            <button onClick={async()=>{if(pwaPrompt){await pwaPrompt.prompt();setPwaPrompt(null);}setShowPwaInstall(false);}} style={{background:"var(--acc)",border:"none",borderRadius:8,padding:"8px 14px",color:"#0a0a0a",fontSize:12,fontWeight:600,touchAction:"manipulation"}}>Přidat</button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
