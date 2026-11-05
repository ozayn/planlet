export function restoreJobSession<T>(raw:string|null, fallback:T):T {
  if(!raw)return fallback;
  try {
    const value=JSON.parse(raw);
    if(fallback!==null&&typeof fallback==="object"&&!Array.isArray(fallback)) {
      if(!value||typeof value!=="object"||Array.isArray(value))return fallback;
      return Object.fromEntries(Object.entries(fallback).map(([key,initial])=>[key,typeof value[key]===typeof initial?value[key]:initial])) as T;
    }
    if(fallback===null)return value===null||(typeof value==="object"&&typeof value.label==="string"&&Array.isArray(value.ids)&&value.ids.every((id:unknown)=>typeof id==="string")) ? value : fallback;
    return typeof value===typeof fallback ? value : fallback;
  } catch {return fallback;}
}
