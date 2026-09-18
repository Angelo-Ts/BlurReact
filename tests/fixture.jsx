import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
function App() {
  const [epoch, setEpoch] = useState(0);
  const [visible, setVisible] = useState(true);
  const [route, setRoute] = useState(location.pathname);
  const [count, setCount] = useState(0);
  const [shadowEpoch, setShadowEpoch] = useState(0);
  useEffect(() => {
    const host = document.querySelector('private-card');
    const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    root.innerHTML = '<p id="shadow-secret">Shadow private data</p>';
    const canvas = document.querySelector('canvas'); const c = canvas.getContext('2d');
    c.fillStyle = '#ff1744'; c.fillRect(0, 0, 90, 80); c.fillStyle = '#2196f3'; c.fillRect(90, 0, 90, 80);
  }, [shadowEpoch]);
  useEffect(() => { window.addEventListener('popstate', () => setRoute(location.pathname)); }, []);
  function navigate(path) { history.pushState({}, '', path); setRoute(path); }
  return <main>
    <h1>React · privacy lab</h1>
    <nav><button id="remount" onClick={() => setEpoch(x => x + 1)}>Recreate React nodes</button><button id="toggle" onClick={() => setVisible(x => !x)}>Toggle node</button><button id="profile" onClick={() => navigate('/profile')}>Profile</button><button id="settings" onClick={() => navigate('/settings')}>Settings</button><button id="shadow-remount" onClick={() => setShadowEpoch(x => x + 1)}>Recreate shadow host</button></nav>
    <p id="route">{route}</p>
    <article key={'account-' + epoch} data-testid="card"><h2>Account</h2>{visible && <p data-testid="balance" className={'secret css-' + epoch}>Balance <strong>{100 + epoch} EUR</strong></p>}<p data-testid="email">user{epoch}@example.test</p><button id="interactive" onClick={() => setCount(c => c + 1)}>Counter {count}</button></article>
    <div id="fixed">Fixed private</div>
    <private-card key={'shadow-' + shadowEpoch}></private-card>
    <div id="contents" style={{display:'contents'}}><span>Contents one</span><span>Contents two</span></div>
    <canvas id="canvas" width="180" height="80"></canvas>
    <svg id="vector" viewBox="0 0 180 80"><rect width="180" height="80" fill="#e91e63"/><text x="10" y="40">SVG secret</text></svg>
    <img id="image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='80'%3E%3Crect width='180' height='80' fill='orange'/%3E%3C/svg%3E"/>
    <video id="video" controls poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='80'%3E%3Crect width='180' height='80' fill='green'/%3E%3C/svg%3E"></video>
    <iframe id="same-frame" src="/frame"></iframe><iframe id="cross-frame" src="http://127.0.0.1:4174/frame"></iframe>
    <div className="spacer"/><p id="bottom">Bottom private</p>
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
