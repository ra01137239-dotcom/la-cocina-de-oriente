export const QUOTA:number;export const MAX_FILE:number;export const RETENTION_DAYS:number;
export function requireAdmin(roles:{role:string}[]):void;
export function nextDate(anchor:string,today:string):string;
export function rotation<T extends {id:string;created_at:string;bytes:number}>(rows:T[],protectedIds?:string[],now?:number,quota?:number):T[];
export function validateSnapshot(data:unknown):{format:string;tables:Record<string,unknown[]>;schema:Record<string,unknown>;fingerprint:string};

export const DB_LIMIT:number;export const STORAGE_LIMIT:number;
export const CAPACITY_TRIGGER:number;export const CAPACITY_TARGET:number;export const CAPACITY_CEILING:number;
export function storageBudget(totalBytes:number,backupBytes:number,incomingBytes?:number,limit?:number):{quota:number;ceiling:number;otherBytes:number};
