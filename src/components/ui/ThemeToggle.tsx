import { useEffect, useState } from 'react';
import Icon from './Icon';

const THEME_KEY = 'segmentacion-clientes.theme';
type Theme = 'light' | 'dark';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b1220' : '#f1f5f9');
    try { localStorage.setItem(THEME_KEY, theme); }
    catch { /* El cambio visual sigue funcionando si el navegador bloquea el almacenamiento. */ }
  }, [theme]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) setTheme(event.newValue === 'dark' ? 'dark' : 'light');
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const dark = theme === 'dark';
  const label = dark ? 'Activar modo claro' : 'Activar modo oscuro';
  return <button type="button" className="theme-toggle" aria-label={label} aria-pressed={dark} title={label} onClick={() => setTheme(dark ? 'light' : 'dark')}><Icon name={dark ? 'sun' : 'moon'} /><span>{dark ? 'Modo claro' : 'Modo oscuro'}</span></button>;
}
