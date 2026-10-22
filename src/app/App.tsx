import { useEffect, useState } from 'react';
import Customers from '../modules/customers/Customers';
import Dashboard from '../modules/dashboard/Dashboard';
import Icon from '../components/ui/Icon';
import Segmentation from '../modules/segmentation/Segmentation';
import Audit from '../modules/audit/Audit';
import ThemeToggle from '../components/ui/ThemeToggle';
import Recommendations from '../modules/recommendations/Recommendations';

export default function App() {
  const [page, setPage] = useState('Panel');
  const [menuOpen, setMenuOpen] = useState(false);
  function navigate(nextPage: string) {
    setPage(nextPage);
    setMenuOpen(false);
  }
  useEffect(() => {
    document.title = `Comercial Nova · ${page}`;
  }, [page]);
  return (
    <div className={`app-shell workspace ${menuOpen ? 'menu-open' : ''}`}>
      <aside className="sidebar" id="main-sidebar" aria-label="Menú de la aplicación">
        <div className="brand"><span className="brand-mark">N<span /></span><div>Comercial Nova<small>Inteligencia comercial</small></div></div>
        <p className="nav-caption">ESPACIO DE TRABAJO</p>
        <nav aria-label="Navegación principal">
          <button aria-current={page === 'Panel' ? 'page' : undefined} onClick={() => navigate('Panel')}><Icon name="panel" /><span>Panel principal</span></button>
          <button aria-current={page === 'Clientes' ? 'page' : undefined} onClick={() => navigate('Clientes')}><Icon name="customers" /><span>Clientes</span></button>
          <button aria-current={page === 'Segmentación' ? 'page' : undefined} onClick={() => navigate('Segmentación')}><Icon name="segments" /><span>Segmentación</span></button>
          <button aria-current={page === 'Recomendaciones' ? 'page' : undefined} onClick={() => navigate('Recomendaciones')}><Icon name="ideas" /><span>Recomendaciones</span></button>
          <button aria-current={page === 'Auditoría' ? 'page' : undefined} onClick={() => navigate('Auditoría')}><Icon name="audit" /><span>Auditoría</span></button>
        </nav>
        <div className="sidebar-bottom"><span className="sidebar-note-icon"><Icon name="chart" /></span><strong>Conoce mejor a tus clientes</strong><p>Transforma sus hábitos de compra en información para tu negocio.</p><span className="sidebar-version">NOVA · ANÁLISIS DE CLIENTES</span></div>
      </aside>
      {menuOpen && <button className="menu-backdrop" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
      <div className="workspace-body">
      <header className="workspace-header">
        <div className="header-location"><button className="mobile-menu" aria-label={menuOpen ? 'Cerrar navegación' : 'Abrir navegación'} aria-expanded={menuOpen} aria-controls="main-sidebar" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button><span className="breadcrumb-root">Espacio de trabajo</span><span className="breadcrumb-divider">/</span><strong>{page === 'Panel' ? 'Panel principal' : page}</strong></div>
        <div className="header-actions"><span className="workspace-label"><span className="live-dot" /> Gestión comercial</span><ThemeToggle /></div>
      </header>
      <main>
        {page === 'Panel' ? <Dashboard onCustomers={() => navigate('Clientes')} /> : page === 'Clientes' ? <Customers /> : page === 'Auditoría' ? <Audit onSegmentation={() => navigate('Segmentación')} /> : page === 'Recomendaciones' ? <Recommendations onSegmentation={() => navigate('Segmentación')} /> : <Segmentation onCustomers={() => navigate('Clientes')} />}
      </main>
      <footer>Comercial Nova · Práctica de segmentación de clientes</footer>
      </div>
    </div>
  );
}
