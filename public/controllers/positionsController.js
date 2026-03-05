const positionsController = {
  async render() {
    const app = document.getElementById('app');
    const holdings = await api.holdings.getAll('', appState.currency);
    const transactions = await api.transactions.getAll();

    app.innerHTML = `
      <div class="card">
        <h2>${appState.t('positions.title')}</h2>
        ${holdings.map(h => {
          const avgPrice = parseFloat(h.avgPrice);
          const pl = h.currentValue - (parseFloat(h.quantity) * avgPrice);
          const plPercent = avgPrice > 0 ? ((h.currentPrice - avgPrice) / avgPrice * 100) : 0;
          const assetTransactions = transactions.filter(t => t.assetId === h.assetId && t.portfolioId === h.portfolioId);
          
          return `
            <div style="margin-bottom: 2rem; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
              <div style="background: var(--bg-tertiary); padding: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                  <h3 style="margin: 0;">${h.asset.name} (${h.asset.symbol})</h3>
                  <div style="color: var(--text-secondary); margin-top: 0.5rem;">
                    ${parseFloat(h.quantity)} × ${appState.formatCurrency(avgPrice)} = ${appState.formatCurrency(h.currentValue)}
                  </div>
                </div>
                <div style="text-align: right;">
                  <div class="${pl >= 0 ? 'positive' : 'negative'}" style="font-size: 1.2rem; font-weight: bold;">
                    ${appState.formatCurrency(pl)} (${plPercent.toFixed(2)}%)
                  </div>
                  <div style="color: var(--text-secondary); margin-top: 0.25rem;">${appState.t('positions.currentPrice')}: ${appState.formatCurrency(h.currentPrice)}</div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                  <button onclick="positionsController.editPosition('${h.id}', '${h.asset.name}', ${h.quantity}, ${h.avgPrice})">${appState.t('positions.edit')}</button>
                  <button onclick="positionsController.deletePosition('${h.id}', '${h.asset.name}')" style="background: var(--danger);">${appState.t('positions.delete')}</button>
                </div>
              </div>
              
              ${assetTransactions.length > 0 ? `
                <div style="padding: 1rem;">
                  <h4 style="margin: 0 0 1rem 0; color: var(--text-secondary);">${appState.t('positions.transactions')} (${assetTransactions.length})</h4>
                  <table style="width: 100%;">
                    <thead>
                      <tr>
                        <th>${appState.t('positions.date')}</th>
                        <th>${appState.t('positions.type')}</th>
                        <th>${appState.t('dashboard.quantity')}</th>
                        <th>${appState.t('dashboard.avgPrice')}</th>
                        <th>${appState.t('positions.fees')}</th>
                        <th>${appState.t('positions.total')}</th>
                        <th>${appState.t('positions.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${assetTransactions.map(t => `
                        <tr>
                          <td>${new Date(t.date).toLocaleDateString('fr-FR')}</td>
                          <td><span style="color: ${t.type === 'buy' ? 'var(--success)' : 'var(--danger)'}">${t.type === 'buy' ? appState.t('positions.buy') : appState.t('positions.sell')}</span></td>
                          <td>${parseFloat(t.quantity)}</td>
                          <td>${appState.formatCurrency(parseFloat(t.pricePerUnit))}</td>
                          <td>${appState.formatCurrency(parseFloat(t.fees))}</td>
                          <td>${appState.formatCurrency(parseFloat(t.quantity) * parseFloat(t.pricePerUnit) + parseFloat(t.fees))}</td>
                          <td>
                            <button onclick='positionsController.editTransaction("${t.id}", "${t.type}", ${t.quantity}, ${t.pricePerUnit}, ${t.fees}, "${t.date}")' style="padding: 0.4rem 0.6rem; font-size: 0.85rem; background: transparent; border: 1px solid var(--border);" title="${appState.t('positions.edit')}">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button onclick='positionsController.deleteTransaction("${t.id}")' style="padding: 0.4rem 0.6rem; font-size: 0.85rem; background: transparent; border: 1px solid var(--danger); color: var(--danger);" title="${appState.t('positions.delete')}">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <div id="editModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; padding: 1rem; overflow-y: auto;">
        <div style="position: relative; max-width: 500px; margin: 2rem auto; background: var(--bg-secondary); padding: 2rem; border-radius: 12px; border: 1px solid var(--border);">
          <h3 style="margin-bottom: 1.5rem;">${appState.t('edit.position')}</h3>
          <form id="editForm">
            <div class="form-group">
              <label>${appState.t('edit.quantity')}</label>
              <input type="number" step="0.00000001" name="quantity" id="editQuantity" required>
            </div>
            <div class="form-group">
              <label>${appState.t('edit.avgPrice')}</label>
              <input type="number" step="0.01" name="avgPrice" id="editAvgPrice" required>
            </div>
            <input type="hidden" name="holdingId" id="editHoldingId">
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
              <button type="submit" style="flex: 1;">${appState.t('edit.save')}</button>
              <button type="button" onclick="positionsController.closeModal()" style="flex: 1; background: var(--bg-tertiary);">${appState.t('confirm.cancel')}</button>
            </div>
          </form>
        </div>
      </div>

      <div id="editTransactionModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; padding: 1rem; overflow-y: auto;">
        <div style="position: relative; max-width: 500px; margin: 2rem auto; background: var(--bg-secondary); padding: 2rem; border-radius: 12px; border: 1px solid var(--border);">
          <h3 style="margin-bottom: 1.5rem;">${appState.t('edit.transaction')}</h3>
          <form id="editTransactionForm">
            <div class="form-group">
              <label>${appState.t('edit.type')}</label>
              <select name="type" id="editTxType" required>
                <option value="buy">${appState.t('positions.buy')}</option>
                <option value="sell">${appState.t('positions.sell')}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${appState.t('edit.quantity')}</label>
              <input type="number" step="0.00000001" name="quantity" id="editTxQuantity" required>
            </div>
            <div class="form-group">
              <label>${appState.t('edit.pricePerUnit')}</label>
              <input type="number" step="0.01" name="pricePerUnit" id="editTxPrice" required>
            </div>
            <div class="form-group">
              <label>${appState.t('positions.fees')}</label>
              <input type="number" step="0.01" name="fees" id="editTxFees" required>
            </div>
            <div class="form-group">
              <label>${appState.t('positions.date')}</label>
              <input type="date" name="date" id="editTxDate" required>
            </div>
            <input type="hidden" name="transactionId" id="editTransactionId">
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
              <button type="submit" style="flex: 1;">${appState.t('edit.save')}</button>
              <button type="button" onclick="positionsController.closeTransactionModal()" style="flex: 1; background: var(--bg-tertiary);">${appState.t('confirm.cancel')}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.setupEventListeners();
  },

  setupEventListeners() {
    const form = document.getElementById('editForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        try {
          await api.put(`/holdings/${data.holdingId}`, {
            quantity: parseFloat(data.quantity),
            avgPrice: parseFloat(data.avgPrice)
          });
          this.closeModal();
          this.render();
        } catch (error) {
          alert('Erreur: ' + error.message);
        }
      });
    }

    const txForm = document.getElementById('editTransactionForm');
    if (txForm) {
      txForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        try {
          const scrollPos = window.scrollY;
          await api.put(`/transactions/${data.transactionId}`, {
            type: data.type,
            quantity: parseFloat(data.quantity),
            pricePerUnit: parseFloat(data.pricePerUnit),
            fees: parseFloat(data.fees),
            date: data.date
          });
          await api.post('/sync', {});
          this.closeTransactionModal();
          await this.render();
          window.scrollTo(0, scrollPos);
        } catch (error) {
          alert('Erreur: ' + error.message);
        }
      });
    }
  },

  editPosition(id, name, quantity, avgPrice) {
    document.getElementById('editHoldingId').value = id;
    document.getElementById('editQuantity').value = quantity;
    document.getElementById('editAvgPrice').value = avgPrice;
    document.getElementById('editModal').style.display = 'block';
  },

  closeModal() {
    document.getElementById('editModal').style.display = 'none';
  },

  closeTransactionModal() {
    document.getElementById('editTransactionModal').style.display = 'none';
  },

  editTransaction(id, type, quantity, pricePerUnit, fees, date) {
    document.getElementById('editTransactionId').value = id;
    document.getElementById('editTxType').value = type;
    document.getElementById('editTxQuantity').value = quantity;
    document.getElementById('editTxPrice').value = pricePerUnit;
    document.getElementById('editTxFees').value = fees;
    document.getElementById('editTxDate').value = date.split('T')[0];
    document.getElementById('editTransactionModal').style.display = 'block';
  },

  async deleteTransaction(id) {
    if (await appState.showConfirm(appState.t('confirm.deleteTransaction'), appState.t('confirm.deleteTransactionMsg'))) {
      try {
        const scrollPos = window.scrollY;
        await api.delete(`/transactions/${id}`);
        await api.post('/sync', {});
        await this.render();
        window.scrollTo(0, scrollPos);
      } catch (error) {
        alert('Erreur: ' + error.message);
      }
    }
  },

  async deletePosition(id, name) {
    if (await appState.showConfirm(appState.t('confirm.deletePosition'), `${appState.t('confirm.deletePositionMsg')} ${name} ?`)) {
      try {
        await api.delete(`/holdings/${id}`);
        this.render();
      } catch (error) {
        alert('Erreur: ' + error.message);
      }
    }
  }
};
