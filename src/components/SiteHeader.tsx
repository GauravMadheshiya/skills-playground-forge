import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Compass, Map, LayoutDashboard, FileScan, MessagesSquare, BriefcaseBusiness, Menu, X, LogOut, Zap } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCareer } from './CareerProvider';
import { ThemeToggle } from './ThemeToggle';
const nav=[{to:'/explore',label:'Explore Roles',icon:Compass},{to:'/roadmap',label:'My Roadmap',icon:Map},{to:'/dashboard',label:'Dashboard',icon:LayoutDashboard},{to:'/resume',label:'Resume ATS',icon:FileScan},{to:'/interview',label:'Mock Interview',icon:MessagesSquare},{to:'/jobs',label:'Jobs',icon:BriefcaseBusiness}] as const;
export function SiteHeader(){const {user,status,signOut}=useCareer();const [open,setOpen]=useState(false);return <>
  <header className="site-header"><div className="header-inner"><Link to="/" className="brand"><span className="brand-symbol"><Zap size={21} fill="currentColor"/></span>skillbridge<span className="brand-ai">AI</span></Link>
  <nav className="desktop-nav">{nav.map(n=><Link key={n.to} to={n.to} activeProps={{className:'nav-active'}}><n.icon size={15}/>{n.label}</Link>)}</nav>
   <div className="account-actions"><ThemeToggle/>{user?<><span className="account-email">{user.email?.split('@')[0]}</span><Button variant="ghost" size="icon" title="Sign out" onClick={signOut}><LogOut/></Button></>:<Button variant="outline" asChild><Link to="/auth">Sign in <ArrowUpRight/></Link></Button>}<Button variant="ghost" size="icon" className="mobile-menu" aria-label={open?'Close navigation':'Open navigation'} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</Button></div></div>
  {open&&<nav className="mobile-nav">{nav.map(n=><Link key={n.to} to={n.to} onClick={()=>setOpen(false)}><n.icon size={17}/>{n.label}</Link>)}</nav>}</header>
  <div className="guest-strip"><div><span className="status-dot"/>{user?'Your workspace':'Guest workspace'}<span className="strip-divider">/</span><span className="muted">{status}</span></div>{!user&&<Link to="/auth">Save your journey <ArrowUpRight size={13}/></Link>}</div>
</>}
