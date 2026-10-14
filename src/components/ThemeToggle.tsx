import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('skillbridge:theme'); } catch { /* Storage can be unavailable. */ }
    const next = saved === 'dark' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }, []);
  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    try { localStorage.setItem('skillbridge:theme', next); } catch { /* Theme still works without storage. */ }
  }
  const label = theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
  return <Button variant="ghost" size="icon" onClick={toggle} aria-label={label} title={label}>{theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>}</Button>;
}