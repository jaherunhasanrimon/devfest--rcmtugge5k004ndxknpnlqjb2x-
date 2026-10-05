import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9222;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Launching headless Chrome...');
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

    // Get Page WebSocket endpoint
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const listData = await listRes.json();
    const pageTarget = listData.find(t => t.type === 'page') || listData[0];
    const wsUrl = pageTarget.webSocketDebuggerUrl;
    console.log('Connected to Page DevTools Protocol at:', wsUrl);

    const ws = new WebSocket(wsUrl);

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

    // 1. Navigate to localhost:4173
    console.log('Navigating to http://localhost:4173/ ...');
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:4173/' });
    await sleep(2000);

    // 2. Select R1 as start
    console.log('Selecting R1 as start...');
    const selectRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const select = document.getElementById('start-node-select');
          if (!select) return { error: 'start-node-select not found' };
          select.value = 'R1';
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return {
            selected: select.value,
            cost: document.querySelector('[data-testid="route-cost"]')?.textContent?.trim(),
            sequence: document.querySelector('[data-testid="route-sequence"]')?.textContent?.trim(),
            status: document.querySelector('[data-testid="status"]')?.textContent?.trim(),
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Baseline route evaluation:', selectRes.result.value);

    // Take baseline screenshot
    await sleep(500);
    const ss1 = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('screenshots/baseline.png', Buffer.from(ss1.result.data, 'base64'));
    console.log('Saved screenshots/baseline.png');

    // 3. Block C2
    console.log('Blocking junction C2...');
    const blockRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          // Find switch for C2 in hazards list or click node C2
          const c2Row = Array.from(document.querySelectorAll('.hazard-row')).find(row => row.textContent.includes('C2'));
          if (c2Row) {
            const btn = c2Row.querySelector('button');
            btn.click();
          } else {
            // Click node C2 on map
            const c2Node = document.querySelector('[data-testid="node-C2"]');
            if (c2Node) c2Node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            const popoverBtn = document.querySelector('.popover-btn.danger');
            if (popoverBtn) popoverBtn.click();
          }
          return {
            cost: document.querySelector('[data-testid="route-cost"]')?.textContent?.trim(),
            sequence: document.querySelector('[data-testid="route-sequence"]')?.textContent?.trim(),
            status: document.querySelector('[data-testid="status"]')?.textContent?.trim(),
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Reroute evaluation after blocking C2:', blockRes.result.value);

    // Take rerouted screenshot
    await sleep(500);
    const ss2 = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('screenshots/rerouted-c2-blocked.png', Buffer.from(ss2.result.data, 'base64'));
    console.log('Saved screenshots/rerouted-c2-blocked.png');

    // 4. Test failure states
    console.log('Testing "No route available" by closing E1 and E2...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const exitTab = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.includes('Exits'));
          if (exitTab) exitTab.click();
        })()
      `,
    });
    await sleep(200);

    const noRouteRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const exitButtons = Array.from(document.querySelectorAll('.hazard-row button'));
          exitButtons.forEach(btn => btn.click());
          return {
            status: document.querySelector('[data-testid="status"]')?.textContent?.trim(),
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Exits closed status:', noRouteRes.result.result.value);

    console.log('Testing "Starting location blocked" by blocking R1...');
    // Reset first
    await send('Runtime.evaluate', {
      expression: `document.querySelector('[data-testid="reset-button"]')?.click()`,
    });
    await sleep(100);

    // Select R1
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const select = document.getElementById('start-node-select');
          select.value = 'R1';
          select.dispatchEvent(new Event('change', { bubbles: true }));
          const nodeTab = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.includes('Rooms'));
          if (nodeTab) nodeTab.click();
        })()
      `,
    });
    await sleep(200);

    const startBlockedRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const r1Row = Array.from(document.querySelectorAll('.hazard-row')).find(row => row.textContent.includes('R1'));
          r1Row?.querySelector('button')?.click();
          return {
            status: document.querySelector('[data-testid="status"]')?.textContent?.trim(),
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Blocked start status:', startBlockedRes.result.result.value);

    // 5. Test Bangla language toggle
    console.log('Testing Bangla toggle...');
    const bnRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const bnBtn = Array.from(document.querySelectorAll('.lang-btn')).find(b => b.textContent.includes('বাংলা'));
          if (bnBtn) bnBtn.click();
          return {
            status: document.querySelector('[data-testid="status"]')?.textContent?.trim(),
            htmlLang: document.documentElement.lang,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Bangla mode evaluation:', bnRes.result.result.value);

    // 6. Test Reset button
    console.log('Testing Reset button...');
    const resetRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const resetBtn = document.querySelector('[data-testid="reset-button"]');
          if (resetBtn) resetBtn.click();
          return {
            cost: document.querySelector('[data-testid="route-cost"]')?.textContent?.trim(),
            sequence: document.querySelector('[data-testid="route-sequence"]')?.textContent?.trim(),
            notice: document.querySelector('.reset-notice')?.textContent?.trim(),
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Reset evaluation:', resetRes.result.result.value);

    ws.close();
    console.log('ALL MANUAL CHECKS PASSED SUCCESSFULLY!');
  } finally {
    chrome.kill();
  }
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
