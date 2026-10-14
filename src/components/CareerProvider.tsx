import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { emptyProgress, mergeProgress, type ProgressData } from '@/lib/career';
import type { Owned } from '@/lib/analysis';
const KEY = 'skillbridge:guest-progress';
function guestProgress(): ProgressData {
  try {
    const saved = localStorage.getItem(KEY); if (saved) return { ...emptyProgress, ...JSON.parse(saved) };
    const milestones: Record<string,string[]> = {};
    for (let i=0; i<localStorage.length; i++) { const k=localStorage.key(i); if(k?.startsWith('skillbridge:milestones:')) milestones[k.slice(23)] = JSON.parse(localStorage.getItem(k) ?? '[]'); }
    return { skills: JSON.parse(localStorage.getItem('skillbridge:skills') ?? '{}'), target: localStorage.getItem('skillbridge:role') ?? 'full-stack', milestones };
  } catch { return emptyProgress; }
}
type CareerContext = { progress: ProgressData; user: User|null; loading: boolean; status: string; setSkill: (id:string,level:number)=>void; setTarget: (id:string)=>void; toggleMilestone: (role:string,id:string)=>void; loadSample: (target:string,skills:Owned)=>void; signOut: ()=>Promise<void> };
// Keep one context instance across hot reloads so consumers never lose the provider.
const g = globalThis as typeof globalThis & { __careerContext?: React.Context<CareerContext|null> };
const Context = g.__careerContext ?? (g.__careerContext = createContext<CareerContext|null>(null));
export function CareerProvider({children}:{children:ReactNode}) {
  const [progress,setProgress]=useState<ProgressData>(emptyProgress), [user,setUser]=useState<User|null>(null), [loading,setLoading]=useState(true), [status,setStatus]=useState('Loading progress');
  const [identity,setIdentity]=useState<string|null>(null); const generation=useRef(0); const router=useRouter(); const qc=useQueryClient();
  useEffect(()=>{
    async function hydrate(nextUser:User|null) {
      const run=++generation.current; setLoading(true); setIdentity(null); setUser(nextUser);
      let next=guestProgress();
      try {
        if(nextUser) {
          const {data,error}=await supabase.from('career_progress').select('*').eq('user_id',nextUser.id).maybeSingle(); if(error) throw error;
          const account:ProgressData = data ? {skills: data.skills as Owned, milestones: data.milestones as Record<string,string[]>,target:data.target_role??'full-stack'} : emptyProgress;
          const hasGuest = Object.keys(next.skills).length>0 || Object.keys(next.milestones).length>0 || next.target !== 'full-stack';
          next=hasGuest?mergeProgress(account,next):account;
          const save=await supabase.from('career_progress').upsert({user_id:nextUser.id, skills:next.skills,milestones:next.milestones,target_role:next.target}); if(save.error) throw save.error;
          localStorage.removeItem(KEY); localStorage.removeItem('skillbridge:skills'); localStorage.removeItem('skillbridge:role');
          Object.keys(localStorage).filter(k=>k.startsWith('skillbridge:milestones:')).forEach(k=>localStorage.removeItem(k));
        }
        if(run===generation.current) {setProgress(next);setIdentity(nextUser?.id??'guest');setStatus(nextUser?'All changes saved':'Saved on this device');}
      } catch { if(run===generation.current) setStatus('Could not load account progress. Refresh to retry.'); }
      finally {if(run===generation.current)setLoading(false);}
    }
    supabase.auth.getSession().then(({data})=>hydrate(data.session?.user??null));
    const {data}=supabase.auth.onAuthStateChange((event,session)=>{
      if(!['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event))return;
      setTimeout(()=>{void hydrate(session?.user??null);router.invalidate();if(event!=='SIGNED_OUT')qc.invalidateQueries();},0);
    });
    return ()=>{generation.current++;data.subscription.unsubscribe();};
  },[qc,router]);
  useEffect(()=>{
    if(!identity)return;
    if(identity==='guest'){localStorage.setItem(KEY,JSON.stringify(progress));return;}
    setStatus('Saving…');
    const timer=setTimeout(async()=>{
      const {error}=await supabase.from('career_progress').upsert({user_id:identity,skills:progress.skills,milestones:progress.milestones,target_role:progress.target,updated_at:new Date().toISOString()});
      setStatus(error?'Save failed. Please try again.':'All changes saved');
    },350);return()=>clearTimeout(timer);
  },[progress,identity]);
  const value:CareerContext={progress,user,loading,status,
    setSkill:(id,level)=>setProgress(p=>{const skills={...p.skills};if(level)skills[id]=level;else delete skills[id];return {...p,skills};}),
    setTarget:target=>setProgress(p=>({...p,target})),
    toggleMilestone:(role,id)=>setProgress(p=>{const done=p.milestones[role]??[];return {...p,milestones:{...p.milestones,[role]:done.includes(id)?done.filter(x=>x!==id):[...done,id]}};}),
    loadSample:(target,skills)=>setProgress({target,skills,milestones:{}}),
    signOut:async()=>{if(user&&identity===user.id){const {error}=await supabase.from('career_progress').upsert({user_id:user.id,skills:progress.skills,milestones:progress.milestones,target_role:progress.target,updated_at:new Date().toISOString()});if(error){setStatus('Could not save progress. Please retry before signing out.');return;}}await qc.cancelQueries();qc.clear();setProgress(emptyProgress);setIdentity(null);await supabase.auth.signOut();await router.navigate({to:'/auth',replace:true});},
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCareer(){const ctx=useContext(Context);if(!ctx)throw new Error('CareerProvider is required');return ctx;}
