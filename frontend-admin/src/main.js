import './style.css';
import { App } from './core/App.js';

// Entry point
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();
});
