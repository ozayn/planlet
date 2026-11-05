"use client";
import { restoreJobSession } from "./job-tracker-session-state";
import { useState, useSyncExternalStore } from "react";
function subscribe(callback:()=>void) {
  window.addEventListener("planlet-job-session",callback);
  window.addEventListener("storage",callback);
  return ()=>{window.removeEventListener("planlet-job-session",callback);window.removeEventListener("storage",callback);};
}
// Session-scoped and account-scoped: returning to Jobs restores the review,
// while server rendering and the first hydration pass use identical defaults.
export function useJobTrackerSession<T>(key:string,initial:T):[T,(value:T)=>void] {
  const snapshot=useSyncExternalStore(subscribe,()=>{try{return sessionStorage.getItem(key);}catch{return null;}},()=>null);
  const [override,setOverride]=useState<T|null>(null);
  const saved=restoreJobSession(snapshot,initial);
  const value=override??saved;
  function set(value:T){setOverride(value);queueMicrotask(()=>{try{sessionStorage.setItem(key,JSON.stringify(value));window.dispatchEvent(new Event("planlet-job-session"));}catch{}})}
  return [value,set];
}
