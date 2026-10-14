import { useState } from 'react';
import { BookOpen, ChevronRight, ExternalLink, Play, GraduationCap, Compass } from 'lucide-react';
import { SKILLS, resourcesFor, type LearningResource } from '@/data/catalog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const groups = [
  { id: 'youtube', title: 'YouTube', icon: Play },
  { id: 'free', title: 'Free platforms', icon: BookOpen },
  { id: 'paid', title: 'Paid platforms', icon: GraduationCap },
  { id: 'other', title: 'Other resources', icon: Compass },
] as const;

export function LearningOptions({ skillId }: { skillId: string }) {
  const name = SKILLS[skillId]?.name ?? skillId;
  const resources = resourcesFor(skillId);
  const [active, setActive] = useState<LearningResource['category']>('youtube');
  const list = resources.filter(r => r.category === active);
  return <Dialog><DialogTrigger asChild><Button variant="ghost" size="sm" className="learn-button" aria-label={`Learn ${name}`}>Learn <ChevronRight size={13}/></Button></DialogTrigger>
    <DialogContent className="learning-dialog"><DialogHeader><span className="eyebrow">YOUR NEXT SKILL</span><DialogTitle className="mt-2">Learn {name}</DialogTitle><DialogDescription>Choose how you want to learn. Availability and pricing vary by provider.</DialogDescription></DialogHeader>
      <div className="learning-tabs" role="tablist">{groups.map(g => <Button key={g.id} role="tab" aria-selected={active === g.id} variant={active === g.id ? 'default' : 'outline'} size="sm" onClick={() => setActive(g.id)}><g.icon size={15}/>{g.title}</Button>)}</div>
      <div className="learning-groups" role="tabpanel">{list.map(resource => <Button asChild variant="ghost" className="learning-link" key={resource.url}><a href={resource.url} target="_blank" rel="noopener noreferrer"><span><b>{resource.label}</b><small>{resource.note}</small></span><ExternalLink size={15}/></a></Button>)}</div>
    </DialogContent></Dialog>;
}
