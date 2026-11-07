export const QUOTA=800_000_000;
export const MAX_FILE=16*1024*1024;
export const RETENTION_DAYS=365;
export function requireAdmin(roles){if(!roles.some(r=>r.role==='admin'))throw new Error('Solo administradores');}
export function nextDate(anchor,today){let d=new Date(anchor+'T06:00:00Z');while(d.toISOString().slice(0,10)<=today)d=new Date(d.getTime()+4*86400000);return d.toISOString().slice(0,10);}
export function rotation(rows,protectedIds=[],now=Date.now(),quota=QUOTA){
 const sorted=[...rows].sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)||a.id.localeCompare(b.id));
 const keep=new Set(protectedIds);if(sorted.at(-1))keep.add(sorted.at(-1).id);
 let bytes=sorted.reduce((n,r)=>n+Number(r.bytes),0);const remove=[];
 for(const r of sorted){if(keep.has(r.id))continue;
  if(now-Date.parse(r.created_at)>RETENTION_DAYS*86400000||bytes>quota){remove.push(r);bytes-=Number(r.bytes);}
 }
 return remove;
}
export function validateSnapshot(data){
 const required=['categorias','productos','materia_prima','bebidas','producto_insumos','pedidos','auditoria'];const allowed=[...required,'bebida_insumos','pedido_items'];
 if(data?.format!=='cocina-data-v2'||!data.tables||!data.schema)throw new Error('Formato incompatible: requiere copia v2');
 if(required.some(t=>!Array.isArray(data.tables[t]))||Object.keys(data.tables).some(t=>!allowed.includes(t)||!Array.isArray(data.tables[t])))throw new Error('Tablas incompatibles');
 return data;
}

export const DB_LIMIT=500_000_000;
export const STORAGE_LIMIT=1_000_000_000;
export const CAPACITY_TRIGGER=0.75;
export const CAPACITY_TARGET=0.70;
export const CAPACITY_CEILING=0.80;
export function storageBudget(totalBytes,backupBytes,incomingBytes=0,limit=STORAGE_LIMIT){
 for(const n of [totalBytes,backupBytes,incomingBytes,limit])if(!Number.isFinite(n)||n<0)throw new Error('Medición de capacidad inválida');
 if(limit===0||backupBytes>totalBytes)throw new Error('Medición de capacidad incoherente');
 const otherBytes=totalBytes-backupBytes;
 return {quota:Math.max(0,Math.floor(limit*CAPACITY_TARGET)-otherBytes-incomingBytes),ceiling:Math.floor(limit*CAPACITY_CEILING),otherBytes};
}
