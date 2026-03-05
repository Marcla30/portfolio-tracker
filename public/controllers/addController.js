const addController = {
  async render() {
    const app = document.getElementById('app');
    const portfolios = await api.portfolios.getAll();

    app.innerHTML = `
      <div class="card">
        <h2>${appState.t('add.title')}</h2>
        
        <div class="tab-selector" id="tabSelector">
          <span id="currentTab">${appState.t('add.manual')}</span>
          <span>▼</span>
        </div>
        <div class="tab-dropdown" id="tabDropdown">
          <button id="manualDropdownBtn" class="active">${appState.t('add.manual')}</button>
          <button id="importDropdownBtn">${appState.t('add.import')}</button>
          <button id="walletDropdownBtn">${appState.t('add.wallet')}</button>
        </div>
        
        <div style="margin-bottom: 2rem;">
          <button id="manualBtn" class="tab-btn active">${appState.t('add.manual')}</button>
          <button id="importBtn" class="tab-btn">${appState.t('add.import')}</button>
          <button id="walletBtn" class="tab-btn">${appState.t('add.wallet')}</button>
        </div>

        <div id="manualForm">
          <form id="addAssetForm">
            <div class="form-group">
              <label>${appState.t('add.type')}</label>
              <select name="type" id="typeFilter" required>
                <option value="">${appState.t('add.selectType')}</option>
                <option value="crypto">${appState.t('add.typeCrypto')}</option>
                <option value="stock">${appState.t('add.typeStock')}</option>
                <option value="etf">${appState.t('add.typeEtf')}</option>
                <option value="metal">${appState.t('add.typeMetal')}</option>
                <option value="cash">${appState.t('add.typeCash')}</option>
                <option value="other">${appState.t('add.typeOther')}</option>
              </select>
            </div>
            <div class="form-group">
              <label>${appState.t('add.search')}</label>
              <input type="text" id="assetSearch" placeholder="${appState.t('add.searchPlaceholder')}" autocomplete="off">
              <div id="searchResults" class="search-results"></div>
            </div>
            <div class="form-group">
              <label>${appState.t('add.portfolio')}</label>
              <select name="portfolioId" required>
                ${portfolios.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>${appState.t('add.quantity')}</label>
              <input type="number" step="0.00000001" name="quantity" required>
            </div>
            <div class="form-group">
              <label>${appState.t('add.date')}</label>
              <input type="datetime-local" name="date" required>
            </div>
            <div class="form-group">
              <label>${appState.t('add.price')}</label>
              <input type="number" step="0.01" name="pricePerUnit" placeholder="${appState.t('add.pricePlaceholder')}">
            </div>
            <div class="form-group">
              <label>${appState.t('add.fees')}</label>
              <input type="number" step="0.01" name="fees" placeholder="${appState.t('add.feesPlaceholder')}">
            </div>
            <input type="hidden" name="symbol" required>
            <input type="hidden" name="name" required>
            <button type="submit">${appState.t('add.submit')}</button>
          </form>
        </div>

        <div id="walletForm" style="display: none;">
          <form id="addWalletForm">
            <div class="form-group">
              <label>${appState.t('add.walletAddress')}</label>
              <input type="text" name="address" placeholder="${appState.t('add.walletAddressPlaceholder')}" required>
            </div>
            <div class="form-group">
              <label>${appState.t('add.blockchain')}</label>
              <select name="blockchain" required>
                <option value="bitcoin">Bitcoin (BTC)</option>
                <option value="ethereum">Ethereum (ETH)</option>
                <option value="bsc">Binance Smart Chain (BNB)</option>
                <option value="tron">Tron (TRX)</option>
                <option value="cosmos">Cosmos (ATOM)</option>
              </select>
            </div>
            <div class="form-group">
              <label>${appState.t('add.portfolio')}</label>
              <select name="portfolioId" required>
                ${portfolios.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
              </select>
            </div>
            <button type="submit">${appState.t('add.importTransactions')}</button>
          </form>
          <div id="walletStatus" style="margin-top: 1rem; color: var(--text-secondary);"></div>
        </div>

        <div id="importForm" style="display: none;">
          <form id="importExcelForm">
            <div class="form-group">
              <label>${appState.t('add.excelFile')}</label>
              <input type="file" name="file" accept=".xlsx,.xls" required>
            </div>
            <div class="form-group">
              <label>${appState.t('add.portfolio')}</label>
              <select name="portfolioId" required>
                ${portfolios.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
              </select>
            </div>
            <button type="submit">${appState.t('add.importButton')}</button>
          </form>
          <div id="importStatus" style="margin-top: 1rem; color: var(--text-secondary);"></div>
          
          <div style="margin-top: 2rem;">
            <h3>${appState.t('add.importHistoryTitle')}</h3>
            <div id="importHistory"></div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>${appState.t('add.watchedWallets')}</h3>
        <div id="walletsList"></div>
      </div>
    `;

    this.setupEventListeners();
    this.loadWallets();
  },

  setupEventListeners() {
    // Desktop buttons
    document.getElementById('manualBtn').addEventListener('click', () => {
      this.switchTab('manual');
    });

    document.getElementById('importBtn').addEventListener('click', () => {
      this.switchTab('import');
      this.loadImportHistory();
    });

    document.getElementById('walletBtn').addEventListener('click', () => {
      this.switchTab('wallet');
    });
    
    // Mobile dropdown
    const tabSelector = document.getElementById('tabSelector');
    const tabDropdown = document.getElementById('tabDropdown');
    const currentTab = document.getElementById('currentTab');
    
    if (tabSelector && tabDropdown) {
      tabSelector.addEventListener('click', () => {
        tabDropdown.classList.toggle('active');
      });
      
      document.getElementById('manualDropdownBtn').addEventListener('click', () => {
        this.switchTab('manual');
        currentTab.textContent = appState.t('add.manual');
        tabDropdown.classList.remove('active');
      });
      
      document.getElementById('importDropdownBtn').addEventListener('click', () => {
        this.switchTab('import');
        currentTab.textContent = appState.t('add.import');
        tabDropdown.classList.remove('active');
        this.loadImportHistory();
      });
      
      document.getElementById('walletDropdownBtn').addEventListener('click', () => {
        this.switchTab('wallet');
        currentTab.textContent = appState.t('add.wallet');
        tabDropdown.classList.remove('active');
      });
      
      document.addEventListener('click', (e) => {
        if (!tabSelector.contains(e.target) && !tabDropdown.contains(e.target)) {
          tabDropdown.classList.remove('active');
        }
      });
    }

    const searchInput = document.getElementById('assetSearch');
    const typeFilter = document.getElementById('typeFilter');
    let searchTimeout;
    
    typeFilter.addEventListener('change', () => {
      document.getElementById('searchResults').innerHTML = '';
      document.getElementById('assetSearch').value = '';
    });
    
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      if (query.length < 2) {
        document.getElementById('searchResults').innerHTML = '';
        return;
      }
      searchTimeout = setTimeout(() => this.searchAssets(query), 300);
    });

    document.getElementById('addAssetForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      
      if (!data.symbol || !data.name) {
        alert(appState.t('add.selectAsset'));
        return;
      }

      try {
        // Check if asset already exists
        const assets = await api.assets.getAll();
        let asset = assets.find(a => a.symbol === data.symbol);
        
        // Create asset only if it doesn't exist
        if (!asset) {
          asset = await api.assets.create({
            symbol: data.symbol,
            name: data.name,
            type: data.type
          });
        }

        await api.transactions.create({
          portfolioId: data.portfolioId,
          assetId: asset.id,
          type: 'buy',
          quantity: data.quantity,
          date: data.date,
          pricePerUnit: data.pricePerUnit || undefined,
          fees: data.fees || 0
        });

        navigate('/');
      } catch (error) {
        alert('Erreur: ' + error.message);
      }
    });

    document.getElementById('addWalletForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      const status = document.getElementById('walletStatus');

      status.innerHTML = 'Récupération...';

      try {
        await api.wallets.create(data);
        status.innerHTML = 'Wallet ajouté !';
        await api.wallets.sync();
        this.loadWallets();
        e.target.reset();
      } catch (error) {
        status.innerHTML = 'Erreur: ' + error.message;
      }
    });

    document.getElementById('importExcelForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const status = document.getElementById('importStatus');

      status.innerHTML = '<div style="background: var(--bg-tertiary); border-radius: 4px; height: 20px; overflow: hidden;"><div id="progressBar" style="background: var(--success); height: 100%; width: 0%; transition: width 0.3s;"></div></div><div id="progressText" style="margin-top: 0.5rem;">Import en cours...</div>';

      try {
        const xhr = new XMLHttpRequest();
        
        xhr.addEventListener('readystatechange', () => {
          if (xhr.readyState === 3 || xhr.readyState === 4) {
            const lines = xhr.responseText.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6));
                  
                  if (data.progress) {
                    document.getElementById('progressBar').style.width = data.progress + '%';
                    document.getElementById('progressText').textContent = `Traitement: ${data.current}/${data.total} actifs (${data.progress}%)`;
                  }
                  
                  if (data.done) {
                    const result = data.results;
                    let msg = `Import terminé: ${result.success} actifs importés`;
                    if (result.ignored && result.ignored.length > 0) {
                      msg += `<br/><br/><strong>Lignes ignorées (${result.ignored.length}):</strong><br/>${result.ignored.join('<br/>')}`;
                    }
                    if (result.errors.length > 0) {
                      msg += `<br/><br/><strong>Erreurs (${result.errors.length}):</strong><br/>${result.errors.join('<br/>')}`;
                    }
                    status.innerHTML = msg;
                    if (result.success > 0) {
                      setTimeout(() => navigate('/'), 3000);
                    }
                    this.loadImportHistory();
                  }
                  
                  if (data.error) {
                    status.innerHTML = 'Erreur: ' + data.error;
                  }
                } catch (e) {}
              }
            }
          }
        });

        xhr.addEventListener('error', () => {
          status.innerHTML = 'Erreur de connexion';
        });

        xhr.open('POST', '/api/import-excel');
        xhr.send(formData);
      } catch (error) {
        status.innerHTML = 'Erreur: ' + error.message;
      }
    });
  },

  async searchAssets(query) {
    const resultsDiv = document.getElementById('searchResults');
    const typeFilter = document.getElementById('typeFilter').value;
    
    if (!typeFilter) {
      resultsDiv.innerHTML = `<div style="padding: 0.5rem; color: var(--text-secondary);">${appState.t('add.selectFirst')}</div>`;
      return;
    }
    
    resultsDiv.innerHTML = `<div style="padding: 0.5rem;">${appState.t('add.searching')}</div>`;

    try {
      const results = [];
      const lowerQuery = query.toLowerCase();

      if (typeFilter === 'stock') {
        const stocks = [
          // Actions françaises (PEA)
          { symbol: 'MC.PA', name: 'LVMH', type: 'stock', typeLabel: 'Action' },
          { symbol: 'TTE.PA', name: 'TotalEnergies', type: 'stock', typeLabel: 'Action' },
          { symbol: 'OR.PA', name: 'L\'Oréal', type: 'stock', typeLabel: 'Action' },
          { symbol: 'SAN.PA', name: 'Sanofi', type: 'stock', typeLabel: 'Action' },
          { symbol: 'AI.PA', name: 'Air Liquide', type: 'stock', typeLabel: 'Action' },
          { symbol: 'CS.PA', name: 'AXA', type: 'stock', typeLabel: 'Action' },
          { symbol: 'SU.PA', name: 'Schneider Electric', type: 'stock', typeLabel: 'Action' },
          { symbol: 'BNP.PA', name: 'BNP Paribas', type: 'stock', typeLabel: 'Action' },
          { symbol: 'SAF.PA', name: 'Safran', type: 'stock', typeLabel: 'Action' },
          { symbol: 'AIR.PA', name: 'Airbus', type: 'stock', typeLabel: 'Action' },
          { symbol: 'DG.PA', name: 'Vinci', type: 'stock', typeLabel: 'Action' },
          { symbol: 'BN.PA', name: 'Danone', type: 'stock', typeLabel: 'Action' },
          { symbol: 'CAP.PA', name: 'Capgemini', type: 'stock', typeLabel: 'Action' },
          { symbol: 'RMS.PA', name: 'Hermès', type: 'stock', typeLabel: 'Action' },
          { symbol: 'KER.PA', name: 'Kering', type: 'stock', typeLabel: 'Action' },
          { symbol: 'EN.PA', name: 'Bouygues', type: 'stock', typeLabel: 'Action' },
          { symbol: 'SGO.PA', name: 'Saint-Gobain', type: 'stock', typeLabel: 'Action' },
          { symbol: 'EL.PA', name: 'EssilorLuxottica', type: 'stock', typeLabel: 'Action' },
          { symbol: 'STMPA.PA', name: 'STMicroelectronics', type: 'stock', typeLabel: 'Action' },
          { symbol: 'PUB.PA', name: 'Publicis', type: 'stock', typeLabel: 'Action' },
          { symbol: 'RI.PA', name: 'Pernod Ricard', type: 'stock', typeLabel: 'Action' },
          { symbol: 'URW.AS', name: 'Unibail-Rodamco-Westfield', type: 'stock', typeLabel: 'Action' },
          { symbol: 'GLE.PA', name: 'Société Générale', type: 'stock', typeLabel: 'Action' },
          { symbol: 'ACA.PA', name: 'Crédit Agricole', type: 'stock', typeLabel: 'Action' },
          { symbol: 'ML.PA', name: 'Michelin', type: 'stock', typeLabel: 'Action' },
          { symbol: 'RNO.PA', name: 'Renault', type: 'stock', typeLabel: 'Action' },
          { symbol: 'ORA.PA', name: 'Orange', type: 'stock', typeLabel: 'Action' },
          { symbol: 'VIE.PA', name: 'Veolia', type: 'stock', typeLabel: 'Action' },
          { symbol: 'DSY.PA', name: 'Dassault Systèmes', type: 'stock', typeLabel: 'Action' },
          { symbol: 'TEP.PA', name: 'Téléperformance', type: 'stock', typeLabel: 'Action' },
          { symbol: 'DEC.PA', name: 'JCDecaux', type: 'stock', typeLabel: 'Action' },
          { symbol: 'FDJ.PA', name: 'La Française des Jeux', type: 'stock', typeLabel: 'Action' },
          { symbol: 'NXI.PA', name: 'Nexity', type: 'stock', typeLabel: 'Action' },
          { symbol: 'OVH.PA', name: 'OVH Groupe', type: 'stock', typeLabel: 'Action' },
          { symbol: 'RUI.PA', name: 'Rubis', type: 'stock', typeLabel: 'Action' },
          { symbol: 'STF.PA', name: 'Stef', type: 'stock', typeLabel: 'Action' },
          { symbol: 'UBI.PA', name: 'Ubisoft Entertainment', type: 'stock', typeLabel: 'Action' },
          { symbol: 'ETL.PA', name: 'Eutelsat Communications', type: 'stock', typeLabel: 'Action' },
          { symbol: 'GTT.PA', name: 'Gaztransport & Technigaz', type: 'stock', typeLabel: 'Action' },
          { symbol: 'CRI.PA', name: 'Compagnie Chargeurs', type: 'stock', typeLabel: 'Action' },
          { symbol: 'ALHIT.PA', name: 'Hitechpros', type: 'stock', typeLabel: 'Action' },
          { symbol: 'MLCHI.PA', name: 'Imprimerie Chirat', type: 'stock', typeLabel: 'Action' },
          // Actions US
          { symbol: 'AAPL', name: 'Apple', type: 'stock', typeLabel: 'Action' },
          { symbol: 'MSFT', name: 'Microsoft', type: 'stock', typeLabel: 'Action' },
          { symbol: 'GOOGL', name: 'Google', type: 'stock', typeLabel: 'Action' },
          { symbol: 'AMZN', name: 'Amazon', type: 'stock', typeLabel: 'Action' },
          { symbol: 'TSLA', name: 'Tesla', type: 'stock', typeLabel: 'Action' },
          { symbol: 'NVDA', name: 'Nvidia', type: 'stock', typeLabel: 'Action' },
          { symbol: 'META', name: 'Meta', type: 'stock', typeLabel: 'Action' },
          { symbol: 'NFLX', name: 'Netflix', type: 'stock', typeLabel: 'Action' }
        ];
        stocks.forEach(s => {
          if (s.name.toLowerCase().includes(lowerQuery) || s.symbol.toLowerCase().includes(lowerQuery)) {
            results.push(s);
          }
        });
      } else if (typeFilter === 'etf') {
        const etfs = [
          { symbol: 'CW8.PA', name: 'Amundi MSCI World', type: 'etf', typeLabel: 'ETF' },
          { symbol: 'PE500.PA', name: 'Amundi PEA S&P 500', type: 'etf', typeLabel: 'ETF' },
          { symbol: 'LYPS.PA', name: 'Lyxor PEA S&P 500', type: 'etf', typeLabel: 'ETF' },
          { symbol: 'SPY', name: 'S&P 500 ETF', type: 'etf', typeLabel: 'ETF' },
          { symbol: 'QQQ', name: 'Nasdaq 100 ETF', type: 'etf', typeLabel: 'ETF' },
          { symbol: 'VTI', name: 'Vanguard Total Stock Market', type: 'etf', typeLabel: 'ETF' }
        ];
        etfs.forEach(e => {
          if (e.name.toLowerCase().includes(lowerQuery) || e.symbol.toLowerCase().includes(lowerQuery)) {
            results.push(e);
          }
        });
      } else if (typeFilter === 'metal') {
        const metals = [
          { symbol: 'XAU', name: 'Or (once)', type: 'metal', typeLabel: 'Métal', aliases: ['gold', 'or'] },
          { symbol: 'XAG', name: 'Argent (once)', type: 'metal', typeLabel: 'Métal', aliases: ['silver', 'argent'] }
        ];
        metals.forEach(m => {
          const matchName = m.name.toLowerCase().includes(lowerQuery);
          const matchSymbol = m.symbol.toLowerCase().includes(lowerQuery);
          const matchAlias = m.aliases.some(alias => alias.includes(lowerQuery));
          if (matchName || matchSymbol || matchAlias) {
            results.push(m);
          }
        });
      } else if (typeFilter === 'cash') {
        const currencies = [
          { symbol: 'EUR', name: 'Euro', type: 'cash', typeLabel: 'Devise' },
          { symbol: 'USD', name: 'Dollar américain', type: 'cash', typeLabel: 'Devise' },
          { symbol: 'GBP', name: 'Livre sterling', type: 'cash', typeLabel: 'Devise' },
          { symbol: 'CHF', name: 'Franc suisse', type: 'cash', typeLabel: 'Devise' },
          { symbol: 'JPY', name: 'Yen japonais', type: 'cash', typeLabel: 'Devise' },
          { symbol: 'CAD', name: 'Dollar canadien', type: 'cash', typeLabel: 'Devise' },
          { symbol: 'AUD', name: 'Dollar australien', type: 'cash', typeLabel: 'Devise' },
          { symbol: 'CNY', name: 'Yuan chinois', type: 'cash', typeLabel: 'Devise' }
        ];
        currencies.forEach(c => {
          if (c.name.toLowerCase().includes(lowerQuery) || c.symbol.toLowerCase().includes(lowerQuery)) {
            results.push(c);
          }
        });
      } else if (typeFilter === 'crypto') {
        try {
          const r = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
          const d = await r.json();
          d.coins.slice(0, 8).forEach(c => {
            results.push({ symbol: c.symbol.toUpperCase(), name: c.name, type: 'crypto', typeLabel: 'Crypto' });
          });
        } catch (e) {}
      }

      if (results.length === 0) {
        resultsDiv.innerHTML = `<div style="padding: 0.5rem;">${appState.t('add.noResults')}</div>`;
        return;
      }

      resultsDiv.innerHTML = results.slice(0, 8).map(r => `
        <div class="search-result-item" data-symbol="${r.symbol}" data-name="${r.name}" data-type="${r.type}">
          <div style="display: flex; justify-content: space-between;">
            <div><strong>${r.name}</strong> <span style="color: var(--text-secondary);">(${r.symbol})</span></div>
            <span style="background: var(--bg-primary); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">${r.typeLabel}</span>
          </div>
        </div>
      `).join('');

      document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          document.querySelector('[name="symbol"]').value = item.dataset.symbol;
          document.querySelector('[name="name"]').value = item.dataset.name;
          document.getElementById('assetSearch').value = `${item.dataset.name} (${item.dataset.symbol})`;
          resultsDiv.innerHTML = '';
        });
      });
    } catch (error) {
      resultsDiv.innerHTML = `<div style="padding: 0.5rem;">${appState.t('add.error')}</div>`;
    }
  },

  async loadWallets() {
    const wallets = await api.wallets.getAll();
    const walletsDiv = document.getElementById('walletsList');

    if (wallets.length === 0) {
      walletsDiv.innerHTML = `<p>${appState.t('add.noWallets')}</p>`;
      return;
    }

    walletsDiv.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>${appState.t('add.address')}</th>
            <th>${appState.t('add.blockchain')}</th>
            <th>${appState.t('add.actions')}</th>
          </tr>
        </thead>
        <tbody>
          ${wallets.map(w => `
            <tr>
              <td>${w.address.slice(0, 10)}...${w.address.slice(-8)}</td>
              <td>${w.blockchain}</td>
              <td>
                <button onclick="addController.deleteWallet('${w.id}')">${appState.t('add.deleteButton')}</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  async deleteWallet(id) {
    if (await appState.showConfirm(appState.t('confirm.deleteWallet'), appState.t('confirm.deleteWalletMsg'))) {
      await api.wallets.delete(id);
      this.loadWallets();
    }
  },

  async loadImportHistory() {
    try {
      const res = await fetch('/api/import-history');
      const history = await res.json();
      const historyDiv = document.getElementById('importHistory');

      if (history.length === 0) {
        historyDiv.innerHTML = `<p style="color: var(--text-secondary);">${appState.t('add.noImports')}</p>`;
        return;
      }

      historyDiv.innerHTML = history.map(h => `
        <div style="border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <strong>${h.fileName}</strong>
            <span style="color: var(--text-secondary);">${new Date(h.createdAt).toLocaleString(appState.language === 'fr' ? 'fr-FR' : 'en-US')}</span>
          </div>
          <div style="color: var(--text-secondary); font-size: 0.9rem;">
            ${appState.t('add.historyTotal')}: ${h.totalRows} ${appState.t('add.historyLines')} | 
            <span style="color: var(--success);">✓ ${h.successCount} ${appState.t('add.historyImported')}</span> | 
            <span style="color: var(--warning);">⚠ ${h.ignoredCount} ${appState.t('add.historyIgnored')}</span> | 
            <span style="color: var(--danger);">✗ ${h.errorCount} ${appState.t('add.historyErrors')}</span>
          </div>
          ${h.ignoredCount > 0 ? `
            <details style="margin-top: 0.5rem;">
              <summary style="cursor: pointer; color: var(--warning);">${appState.t('add.historyShowIgnored')} (${h.ignoredCount})</summary>
              <ul style="margin: 0.5rem 0 0 1.5rem; font-size: 0.85rem;">
                ${h.ignoredAssets.map(a => `<li>${a}</li>`).join('')}
              </ul>
            </details>
          ` : ''}
        </div>
      `).join('');
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  },
  
  switchTab(tab) {
    document.getElementById('manualForm').style.display = tab === 'manual' ? 'block' : 'none';
    document.getElementById('importForm').style.display = tab === 'import' ? 'block' : 'none';
    document.getElementById('walletForm').style.display = tab === 'wallet' ? 'block' : 'none';
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tab}Btn`).classList.add('active');
    
    document.querySelectorAll('.tab-dropdown button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tab}DropdownBtn`).classList.add('active');
  }
};
