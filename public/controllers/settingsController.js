const settingsController = {
  async render() {
    const app = document.getElementById('app');
    const settings = await api.settings.get();
    const portfolios = await api.portfolios.getAll();

    app.innerHTML = `
      <div class="card">
        <h2>${appState.t('settings.title')}</h2>
        <form id="settingsForm">
          <div class="form-group">
            <label>${appState.t('settings.currency')}</label>
            <select name="defaultCurrency">
              <option value="EUR" ${settings.defaultCurrency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
              <option value="USD" ${settings.defaultCurrency === 'USD' ? 'selected' : ''}>USD ($)</option>
              <option value="GBP" ${settings.defaultCurrency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
              <option value="CHF" ${settings.defaultCurrency === 'CHF' ? 'selected' : ''}>CHF</option>
              <option value="JPY" ${settings.defaultCurrency === 'JPY' ? 'selected' : ''}>JPY (¥)</option>
              <option value="CAD" ${settings.defaultCurrency === 'CAD' ? 'selected' : ''}>CAD (CA$)</option>
              <option value="AUD" ${settings.defaultCurrency === 'AUD' ? 'selected' : ''}>AUD (A$)</option>
              <option value="CNY" ${settings.defaultCurrency === 'CNY' ? 'selected' : ''}>CNY (¥)</option>
            </select>
          </div>
          <div class="form-group">
            <label>${appState.t('settings.language')}</label>
            <select name="language">
              <option value="fr" ${settings.language === 'fr' ? 'selected' : ''}>Français</option>
              <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option>
            </select>
          </div>
          <div class="form-group">
            <label>${appState.t('settings.theme')}</label>
            <select name="theme" id="themeSelect">
              <option value="blue" ${settings.theme === 'blue' || !settings.theme ? 'selected' : ''}>${appState.t('settings.themeBlue')}</option>
              <option value="green" ${settings.theme === 'green' ? 'selected' : ''}>${appState.t('settings.themeGreen')}</option>
              <option value="purple" ${settings.theme === 'purple' ? 'selected' : ''}>${appState.t('settings.themePurple')}</option>
              <option value="orange" ${settings.theme === 'orange' ? 'selected' : ''}>${appState.t('settings.themeOrange')}</option>
              <option value="red" ${settings.theme === 'red' ? 'selected' : ''}>${appState.t('settings.themeRed')}</option>
            </select>
          </div>
          <div class="form-group">
            <label>${appState.t('settings.maxAssetConcentration')}</label>
            <input type="number" name="maxAssetConcentration" value="${settings.maxAssetConcentration}">
          </div>
          <div class="form-group">
            <label>${appState.t('settings.maxCategoryConcentration')}</label>
            <input type="number" name="maxCategoryConcentration" value="${settings.maxCategoryConcentration}">
          </div>
          <button type="submit">${appState.t('settings.save')}</button>
        </form>
      </div>

      <div class="card">
        <h2>${appState.t('settings.portfolios')}</h2>
        <form id="addPortfolioForm" style="margin-bottom: 1.5rem;">
          <div style="display: flex; gap: 1rem;">
            <div class="form-group" style="flex: 1; margin-bottom: 0;">
              <input type="text" name="name" placeholder="${appState.t('settings.portfolioName')}" required>
            </div>
            <div class="form-group" style="flex: 1; margin-bottom: 0;">
              <select name="type">
                <option value="">${appState.t('settings.portfolioType')}</option>
                <option value="crypto">${appState.t('settings.portfolioTypeCrypto')}</option>
                <option value="stocks">${appState.t('settings.portfolioTypeStocks')}</option>
                <option value="etf">${appState.t('settings.portfolioTypeEtf')}</option>
                <option value="metal">${appState.t('settings.portfolioTypeMetal')}</option>
                <option value="mixed">${appState.t('settings.portfolioTypeMixed')}</option>
              </select>
            </div>
            <button type="submit">${appState.t('settings.create')}</button>
          </div>
        </form>
        <div id="portfoliosList"></div>
      </div>

      <div id="editPortfolioModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; padding: 1rem; overflow-y: auto;">
        <div style="position: relative; max-width: 500px; margin: 2rem auto; background: var(--bg-secondary); padding: 2rem; border-radius: 12px; border: 1px solid var(--border);">
          <h3 style="margin-bottom: 1.5rem;">${appState.t('settings.editPortfolio')}</h3>
          <form id="editPortfolioForm">
            <div class="form-group">
              <label>${appState.t('settings.name')}</label>
              <input type="text" name="name" id="editPortfolioName" required>
            </div>
            <div class="form-group">
              <label>${appState.t('settings.type')}</label>
              <select name="type" id="editPortfolioType">
                <option value="">${appState.t('settings.portfolioType')}</option>
                <option value="crypto">${appState.t('settings.portfolioTypeCrypto')}</option>
                <option value="stocks">${appState.t('settings.portfolioTypeStocks')}</option>
                <option value="etf">${appState.t('settings.portfolioTypeEtf')}</option>
                <option value="metal">${appState.t('settings.portfolioTypeMetal')}</option>
                <option value="mixed">${appState.t('settings.portfolioTypeMixed')}</option>
              </select>
            </div>
            <input type="hidden" name="portfolioId" id="editPortfolioId">
            <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
              <button type="submit" style="flex: 1;">${appState.t('settings.save')}</button>
              <button type="button" onclick="settingsController.closeModal()" style="flex: 1; background: var(--bg-tertiary);">${appState.t('settings.cancel')}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.loadPortfolios();
  },

  setupEventListeners() {
    const form = document.getElementById('settingsForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {
        defaultCurrency: formData.get('defaultCurrency'),
        language: formData.get('language'),
        theme: formData.get('theme'),
        maxAssetConcentration: parseInt(formData.get('maxAssetConcentration')),
        maxCategoryConcentration: parseInt(formData.get('maxCategoryConcentration'))
      };
      
      console.log('Sending settings:', data);
      const result = await api.settings.update(data);
      console.log('Result:', result);
      appState.currency = data.defaultCurrency;
      appState.language = data.language;
      appState.applyTheme(data.theme);
      appState.showToast(appState.t('settings.saved'));
      
      setTimeout(() => {
        window.location.reload();
      }, 500);
    });

    document.getElementById('addPortfolioForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      await api.portfolios.create(Object.fromEntries(formData));
      e.target.reset();
      this.loadPortfolios();
    });

    document.getElementById('editPortfolioForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      
      try {
        await api.put(`/portfolios/${data.portfolioId}`, {
          name: data.name,
          type: data.type || null
        });
        this.closeModal();
        this.loadPortfolios();
      } catch (error) {
        alert('Erreur: ' + error.message);
      }
    });
  },

  async loadPortfolios() {
    const portfolios = await api.portfolios.getAll();
    const div = document.getElementById('portfoliosList');

    if (portfolios.length === 0) {
      div.innerHTML = `<p style="color: var(--text-secondary);">${appState.t('settings.noPortfolios')}</p>`;
      return;
    }

    div.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>${appState.t('settings.name')}</th>
            <th>${appState.t('settings.type')}</th>
            <th>${appState.t('settings.positions')}</th>
            <th>${appState.t('add.actions')}</th>
          </tr>
        </thead>
        <tbody>
          ${portfolios.map(p => `
            <tr>
              <td><strong>${p.name}</strong></td>
              <td>${p.type || '-'}</td>
              <td>${p._count?.holdings || 0}</td>
              <td>
                <button onclick="settingsController.editPortfolio('${p.id}', '${p.name}', '${p.type || ''}')" style="margin-right: 0.5rem;">${appState.t('settings.edit')}</button>
                <button onclick="settingsController.deletePortfolio('${p.id}')" style="background: var(--danger);">${appState.t('settings.deletePortfolio')}</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  editPortfolio(id, name, type) {
    document.getElementById('editPortfolioId').value = id;
    document.getElementById('editPortfolioName').value = name;
    document.getElementById('editPortfolioType').value = type;
    document.getElementById('editPortfolioModal').style.display = 'block';
  },

  closeModal() {
    document.getElementById('editPortfolioModal').style.display = 'none';
  },

  async deletePortfolio(id) {
    if (await appState.showConfirm('Supprimer le portefeuille', appState.t('settings.deleteConfirm'))) {
      await api.portfolios.delete(id);
      this.loadPortfolios();
    }
  }
};
