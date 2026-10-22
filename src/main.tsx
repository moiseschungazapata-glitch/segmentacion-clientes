import { createRoot } from 'react-dom/client';
import App from './app/App';
import './app/styles.css';
import './app/layout.css';
import './components/ui/modal.css';
import './app/theme.css';

createRoot(document.getElementById('root')!).render(<App />);
