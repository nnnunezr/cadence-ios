import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { getTheme, setTheme, getAccent, applyAccent } from './data';
import './index.css';

setTheme(getTheme()); // apply persisted theme before first paint
const storedAccent = getAccent();
if (storedAccent) applyAccent(storedAccent); // apply chosen highlight colour

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
