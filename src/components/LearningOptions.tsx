import { BookOpen, ChevronRight, ExternalLink, Play, GraduationCap } from 'lucide-react';
import { SKILLS, resourcesFor } from '@/data/catalog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const groups = [
  { id: 'free', title: 'Free courses', icon: BookOpen },
  { id: 'paid', title: 'Paid courses', icon: GraduationCap },
  { id: 'youtube', title: 'YouTube courses', icon: Play },
] as const;

export function LearningOptions({ skillId }: { skillId: string }) {
  const name = SKILLS[skillId]?.name ?? skillId;
  const resources = resourcesFor(skillId);
  return <Dialog><DialogTrigger asChild><Button variant="ghost" size="sm" className="learn-button" aria-label={`Learn ${name}`}>Learn <ChevronRight size={13}/></Button></DialogTrigger>
    <DialogContent className="learning-dialog"><DialogHeader><span className="eyebrow">YOUR NEXT SKILL</span><DialogTitle className="mt-2">Learn {name}</DialogTitle><DialogDescription>Course collections from free learning platforms, paid providers, and YouTube. Availability and pricing vary by provider.</DialogDescription></DialogHeader>
      <div className="learning-groups">{groups.map(group => <section className="learning-group" key={group.id}><h3><group.icon size={17}/>{group.title}</h3>{resources.filter(resource => resource.category === group.id).map(resource => <Button asChild variant="ghost" className="learning-link" key={resource.url}><a href={resource.url} target="_blank" rel="noopener noreferrer"><span><b>{resource.label}</b><small>{resource.note}</small></span><ExternalLink size={15}/></a></Button>)}</section>)}</div>
    </DialogContent></Dialog>;
}