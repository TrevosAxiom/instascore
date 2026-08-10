import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './app/App';
import { readBootstrapSettings } from './app/bootstrap';
import './styles.css';

const root = document.getElementById('instascore-root');

if (root) {
  type InstaScoreRootElement = HTMLElement & {
    __instascoreReactRoot?: ReactDOM.Root;
  };
  const mount = root as InstaScoreRootElement;
  const reactRoot = mount.__instascoreReactRoot ?? ReactDOM.createRoot(mount);
  mount.__instascoreReactRoot = reactRoot;
  reactRoot.render(
    <React.StrictMode>
      <App settings={readBootstrapSettings()} />
    </React.StrictMode>,
  );
}
