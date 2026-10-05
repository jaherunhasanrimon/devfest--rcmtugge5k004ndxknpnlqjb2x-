import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9222;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Testing West Wing dataset in browser...');
  const westWingContent = readFileSync('public/sample/west-wing.json', 'utf-8');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--window-size=1280,800',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank',
  ]);

  try {
    await sleep(1500);

    const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const listData = await listRes.json();
    const pageTarget = listData.find(t => t.type === 'page') || listData[0];
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    let id = 1;
    const pending = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    };

    await new Promise(resolve => ws.onopen = resolve);

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        pending.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:4173/' });
    await sleep(1500);

    // Load West Wing JSON directly into the app state
    console.log('Injecting and validating West Wing dataset into UI...');
    const loadRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const raw = ${JSON.stringify(westWingContent)};
          // Trigger file input or use custom event
          const file = new File([raw], 'west-wing.json', { type: 'application/json' });
          const dt = new DataTransfer();
          dt.items.add(file);
          const input = document.getElementById('topbar-file-input');
          if (input) {
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return { ok: true };
          }
          return { error: 'topbar-file-input not found' };
        })()
      `,
      returnByValue: true,
    });
    console.log('File load status:', loadRes.result.result.value);
    await sleep(500);

    // Verify building name
    const buildingInfo = await send('Runtime.evaluate', {
      expression: `
        (() => ({
          buildingName: document.querySelector('.building-name')?.textContent?.trim(),
          nodeCount: document.querySelectorAll('.node-item').length,
          edgeCount: document.querySelectorAll('.edge-group').length,
        }))()
      `,
      returnByValue: true,
    });
    console.log('Building in UI:', buildingInfo.result.result.value);

    // Select R3
    console.log('Selecting R3...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const select = document.getElementById('start-node-select');
          select.value = 'R3';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        })()
      `,
    });
    await sleep(400);

    const r3Route = await send('Runtime.evaluate', {
      expression: `
        (() => ({
          status: document.querySelector('[data-testid="status"]')?.textContent?.trim(),
          cost: document.querySelector('[data-testid="route-cost"]')?.textContent?.trim(),
          exit: document.querySelector('[data-testid="route-exit"]')?.textContent?.trim(),
          sequence: document.querySelector('[data-testid="route-sequence"]')?.textContent?.trim(),
        }))()
      `,
      returnByValue: true,
    });
    console.log('Route from R3:', r3Route.result.result.value);

    // Capture screenshot of West Wing R3 route
    const ss = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('screenshots/west-wing-r3-route.png', Buffer.from(ss.result.data, 'base64'));
    console.log('Saved screenshots/west-wing-r3-route.png');

    // Select R1 (should show "No route available" because J2 is blocked and E2 is closed)
    console.log('Selecting R1 under initial hazards...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const select = document.getElementById('start-node-select');
          select.value = 'R1';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        })()
      `,
    });
    await sleep(400);

    const r1Route = await send('Runtime.evaluate', {
      expression: `
        (() => ({
          status: document.querySelector('[data-testid="status"]')?.textContent?.trim(),
        }))()
      `,
      returnByValue: true,
    });
    console.log('Route from R1 (initial hazards):', r1Route.result.result.value);

    // Reopen E2 (Emergency Exit North)
    console.log('Reopening E2 (Emergency Exit North)...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const exitTab = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.includes('Exits'));
          if (exitTab) exitTab.click();
        })()
      `,
    });
    await sleep(200);

    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const e2Row = Array.from(document.querySelectorAll('.hazard-row')).find(row => row.textContent.includes('E2'));
          e2Row?.querySelector('button')?.click();
        })()
      `,
    });
    await sleep(400);

    const r1ReopenedRoute = await send('Runtime.evaluate', {
      expression: `
        (() => ({
          status: document.querySelector('[data-testid="status"]')?.textContent?.trim(),
          cost: document.querySelector('[data-testid="route-cost"]')?.textContent?.trim(),
          exit: document.querySelector('[data-testid="route-exit"]')?.textContent?.trim(),
          sequence: document.querySelector('[data-testid="route-sequence"]')?.textContent?.trim(),
        }))()
      `,
      returnByValue: true,
    });
    console.log('Route from R1 after reopening E2:', r1ReopenedRoute.result.result.value);

    // Capture screenshot of West Wing R1 after reopening E2
    const ss2 = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('screenshots/west-wing-r1-e2-reopened.png', Buffer.from(ss2.result.data, 'base64'));
    console.log('Saved screenshots/west-wing-r1-e2-reopened.png');

    ws.close();
    console.log('WEST WING TEST COMPLETED SUCCESSFULLY!');
  } finally {
    chrome.kill();
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
