import { createFileRoute } from '@tanstack/react-router';
import { Explore } from './explore';
export const Route=createFileRoute('/')({head:()=>({meta:[{title:'SkillBridge AI — Your next career chapter'},{name:'description',content:'Explore technology careers and turn your skills into a personalized learning roadmap.'},{property:'og:title',content:'SkillBridge AI — Your next career chapter'},{property:'og:description',content:'A clearer path to your next role in technology.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Explore});
