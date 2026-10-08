import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import InventoryApp from './Inventory';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// The cooks' inventory tablet opens ?screen=inventory. It gets its own root
// instead of a view inside <App/> so it doesn't wait on the Clover menu fetch
// or run the order screens' payment-check loop.
const isInventory = new URLSearchParams(window.location.search).get("screen") === "inventory";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {isInventory ? <InventoryApp /> : <App />}
  </React.StrictMode>
);

serviceWorkerRegistration.unregister();
reportWebVitals();
