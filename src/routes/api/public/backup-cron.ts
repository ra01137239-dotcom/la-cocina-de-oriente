import { createFileRoute } from '@tanstack/react-router';
export const Route=createFileRoute('/api/public/backup-cron')({server:{handlers:{POST:async({request})=>{
 const expected=process.env['BACKUP_CRON_TOKEN'];const supplied=request.headers.get('X-Backup-Token');
 if(!expected || !supplied) return new Response('Unauthorized',{status:401});
 const digest=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const a=await digest(expected);const b=await digest(supplied);let diff=0;for(let i=0;i<a.length;i++)diff|=(a[i]??0)^(b[i]??0);
 if(diff!==0)return new Response('Unauthorized',{status:401});
 if(process.env['BACKUP_AUTOMATIC_ENABLED']!=='true')return Response.json({status:'desactivada'});
 try{const {runBackup}=await import('@/lib/backup.server');const result=await runBackup(true,null);return Response.json(result,{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'No se pudo generar la copia. Revise configuración y registros privados.'},{status:500});}
}}}});
