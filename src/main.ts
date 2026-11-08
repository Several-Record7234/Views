import ReactDOM from 'react-dom/client';
import React from 'react';
import './index.css';
import { Views } from './components/Views.tsx';
import OBR from '@owlbear-rodeo/sdk';

// Dev server only: lets a tester drive the SDK from this iframe's console (eg.
// forging a Cinematic message from a player to check the GM-only trust rule).
if (import.meta.env.DEV) Object.assign(window, { OBR });

const appElement = document.querySelector('#app');
if (!appElement) throw new Error('Root element #app not found in DOM');
const root = ReactDOM.createRoot(appElement);
root.render(React.createElement(Views));
