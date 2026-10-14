/**
 * Pod Network Studio Client Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadConfig();
  initListeners();
});

function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `tab-${tab.dataset.tab}`));
    });
  });
}

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();

    data.sampleOrders.forEach(ord => appendOrderRow(ord));
  } catch (e) {
    console.error(e);
  }
}

function initListeners() {
  // Submit Order
  document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pair = document.getElementById('select-pair').value;
    const side = document.getElementById('select-side').value;
    const amount = document.getElementById('input-amount').value;
    const resultBox = document.getElementById('order-result-box');

    try {
      const res = await fetch('/api/order/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair, side, amount }),
      });
      const data = await res.json();

      if (data.success) {
        appendOrderRow(data.order);
        resultBox.innerHTML = `
          <div class="card" style="border-color: #10b981; background: rgba(16, 185, 129, 0.08);">
            <strong style="color: #6ee7b7;">⚡ Order Executed MEV-Free on Pod L1!</strong>
            <div class="mono text-muted mt-1" style="font-size: 0.75rem;">TX Hash: ${data.order.txHash.slice(0, 18)}... • Protection: ${data.order.mevProtection}</div>
          </div>
        `;
      }
    } catch (err) {
      resultBox.innerHTML = `<div class="badge red">Order error: ${err.message}</div>`;
    }
  });

  // Verify VerifiableLog Proof
  document.getElementById('proof-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const txHash = document.getElementById('proof-tx-hash').value;
    const box = document.getElementById('proof-json-box');

    try {
      const res = await fetch('/api/proof/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash }),
      });
      const data = await res.json();
      box.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      box.textContent = `Error: ${err.message}`;
    }
  });
}

function appendOrderRow(ord) {
  const container = document.getElementById('orders-container');
  const empty = container.querySelector('.empty-state');
  if (empty) container.innerHTML = '';

  const row = document.createElement('div');
  row.className = 'ledger-row';
  row.innerHTML = `
    <div>
      <div style="font-weight: 700; color: #fff;">${ord.side} ${ord.pair} (${ord.size || ord.amount})</div>
      <div class="mono text-muted" style="font-size: 0.72rem;">ID: ${ord.orderId}</div>
    </div>
    <div style="text-align: right;">
      <div style="color: #10b981; font-weight: 700; font-family: var(--font-mono);">${ord.mevProtection || 'MEV-Free Fair Match'}</div>
      <div class="mono text-muted" style="font-size: 0.72rem;">Status: ${ord.status}</div>
    </div>
  `;
  container.insertBefore(row, container.firstChild);
}
