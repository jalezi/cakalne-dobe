// PROTOTYPE (throwaway). Entry for the single-page artifact build.
import { createRoot } from 'react-dom/client';
import { PrototypeHome } from './variants';

// Follow the viewer's theme: explicit data-theme wins, else the OS setting.
const root = document.documentElement;
const mq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const t = root.getAttribute('data-theme');
  root.classList.toggle('dark', t ? t === 'dark' : mq.matches);
}
applyTheme();
mq.addEventListener('change', applyTheme);
new MutationObserver(applyTheme).observe(root, {
  attributes: true,
  attributeFilter: ['data-theme'],
});

const el = document.getElementById('root');
if (el) createRoot(el).render(<PrototypeHome />);
