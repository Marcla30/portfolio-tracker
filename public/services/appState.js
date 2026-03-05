const appState = {
  currency: 'EUR',
  language: 'fr',
  
  async init() {
    const settings = await api.settings.get();
    this.currency = settings.defaultCurrency;
    this.language = settings.language;
    this.applyTheme(settings.theme || 'blue');
  },
  
  applyTheme(theme) {
    const themes = {
      blue: { accent: '#4a9eff', gradient: 'linear-gradient(135deg, #4a9eff, #00d084)' },
      green: { accent: '#00d084', gradient: 'linear-gradient(135deg, #00d084, #00ff88)' },
      purple: { accent: '#a855f7', gradient: 'linear-gradient(135deg, #a855f7, #ec4899)' },
      orange: { accent: '#f97316', gradient: 'linear-gradient(135deg, #f97316, #fbbf24)' },
      red: { accent: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f97316)' }
    };
    const t = themes[theme] || themes.blue;
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--brand-gradient', t.gradient);
  },
  
  showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(400px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  
  showConfirm(title, message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-content">
          <h3>${title}</h3>
          <p>${message}</p>
          <div class="modal-buttons">
            <button class="btn-cancel" id="modalCancel">${this.t('confirm.cancel')}</button>
            <button class="btn-danger" id="modalConfirm">${this.t('confirm.confirm')}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      
      document.getElementById('modalConfirm').onclick = () => {
        overlay.remove();
        resolve(true);
      };
      
      document.getElementById('modalCancel').onclick = () => {
        overlay.remove();
        resolve(false);
      };
      
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(false);
        }
      };
    });
  },
  
  t(key) {
    const translations = {
      fr: {
        'nav.dashboard': 'Tableau de bord',
        'nav.positions': 'Positions',
        'nav.stats': 'Statistiques',
        'nav.add': 'Ajouter',
        'nav.settings': 'Paramètres',
        'dashboard.totalValue': 'Valeur totale',
        'dashboard.totalPL': 'Plus-value totale',
        'dashboard.totalCost': 'Coût total',
        'dashboard.evolution': 'Évolution du portefeuille',
        'dashboard.positions': 'Positions',
        'dashboard.asset': 'Actif',
        'dashboard.quantity': 'Quantité',
        'dashboard.avgPrice': 'Prix moyen',
        'dashboard.currentPrice': 'Prix actuel',
        'dashboard.value': 'Valeur',
        'dashboard.pl': 'Plus-value',
        'positions.title': 'Mes positions',
        'positions.currentPrice': 'Prix actuel',
        'positions.edit': 'Éditer',
        'positions.delete': 'Supprimer',
        'positions.sell': 'Vendre',
        'positions.sellTitle': 'Vendre une position',
        'positions.soldOut': 'Position vendue',
        'positions.cannotSellMore': 'Vous ne pouvez pas vendre plus que',
        'positions.realizedProfit': 'Plus-value réalisée',
        'positions.max': 'Max',
        'positions.filterAll': 'Tous les types',
        'positions.sortName': 'Nom',
        'positions.sortValue': 'Valeur',
        'positions.sortPL': 'Plus-value',
        'positions.sortPLPercent': 'Plus-value %',
        'positions.transactions': 'Transactions',
        'positions.date': 'Date',
        'positions.type': 'Type',
        'positions.buy': 'Achat',
        'positions.sell': 'Vente',
        'positions.fees': 'Frais',
        'positions.total': 'Total',
        'positions.actions': 'Actions',
        'settings.title': 'Paramètres généraux',
        'settings.currency': 'Devise par défaut',
        'settings.language': 'Langue',
        'settings.theme': 'Thème',
        'settings.themeBlue': 'Bleu',
        'settings.themeGreen': 'Vert',
        'settings.themePurple': 'Violet',
        'settings.themeOrange': 'Orange',
        'settings.themeRed': 'Rouge',
        'settings.portfolios': 'Portefeuilles',
        'settings.save': 'Enregistrer',
        'settings.saved': 'Paramètres enregistrés',
        'add.title': 'Ajouter un actif',
        'add.manual': 'Ajout manuel',
        'add.import': 'Import Bourse Direct',
        'add.wallet': 'Import wallet',
        'add.type': 'Type',
        'add.search': 'Rechercher un actif',
        'add.portfolio': 'Portefeuille',
        'add.quantity': 'Quantité',
        'add.date': 'Date d\'achat',
        'add.price': 'Prix unitaire (optionnel)',
        'add.fees': 'Frais (optionnel)',
        'add.submit': 'Ajouter',
        'add.selectType': '-- Sélectionner un type --',
        'add.searchPlaceholder': 'LVMH, Apple, Bitcoin, Or...',
        'add.pricePlaceholder': 'Récupéré automatiquement',
        'add.feesPlaceholder': '0',
        'add.walletAddress': 'Adresse du wallet',
        'add.walletAddressPlaceholder': '0x... ou bc1...',
        'add.blockchain': 'Blockchain',
        'add.importTransactions': 'Importer les transactions',
        'add.excelFile': 'Fichier Excel Bourse Direct',
        'add.importButton': 'Importer',
        'add.importHistoryTitle': 'Historique des imports',
        'add.watchedWallets': 'Wallets surveillés',
        'add.noWallets': 'Aucun wallet',
        'add.address': 'Adresse',
        'add.actions': 'Actions',
        'add.deleteButton': 'Supprimer',
        'add.deleteConfirm': 'Supprimer ?',
        'add.noImports': 'Aucun import',
        'add.selectFirst': 'Sélectionnez d\'abord un type',
        'add.searching': 'Recherche...',
        'add.noResults': 'Aucun résultat',
        'add.error': 'Erreur',
        'add.selectAsset': 'Veuillez sélectionner un actif',
        'add.historyTotal': 'Total',
        'add.historyLines': 'lignes',
        'add.historyImported': 'importés',
        'add.historyIgnored': 'ignorés',
        'add.historyErrors': 'erreurs',
        'add.historyShowIgnored': 'Voir les actifs ignorés',
        'confirm.deleteWallet': 'Supprimer le wallet',
        'confirm.deleteWalletMsg': 'Êtes-vous sûr de vouloir supprimer ce wallet ?',
        'confirm.deleteTransaction': 'Supprimer la transaction',
        'confirm.deleteTransactionMsg': 'Êtes-vous sûr de vouloir supprimer cette transaction ?',
        'confirm.deletePosition': 'Supprimer la position',
        'confirm.deletePositionMsg': 'Êtes-vous sûr de vouloir supprimer',
        'confirm.cancel': 'Annuler',
        'confirm.confirm': 'Confirmer',
        'edit.position': 'Éditer la position',
        'edit.transaction': 'Éditer la transaction',
        'edit.quantity': 'Quantité',
        'edit.avgPrice': 'Prix moyen',
        'edit.type': 'Type',
        'edit.pricePerUnit': 'Prix unitaire',
        'edit.save': 'Enregistrer',
        'add.typeCrypto': 'Crypto',
        'add.typeStock': 'Action',
        'add.typeEtf': 'ETF',
        'add.typeMetal': 'Métal',
        'add.typeCash': 'Cash',
        'add.typeOther': 'Autre',
        'settings.maxAssetConcentration': 'Concentration maximale par actif (%)',
        'settings.maxCategoryConcentration': 'Concentration maximale par catégorie (%)',
        'settings.portfolioName': 'Nom du portefeuille',
        'settings.portfolioType': 'Type (optionnel)',
        'settings.portfolioTypeCrypto': 'Crypto',
        'settings.portfolioTypeStocks': 'Actions',
        'settings.portfolioTypeEtf': 'ETF',
        'settings.portfolioTypeMetal': 'Métaux',
        'settings.portfolioTypeMixed': 'Mixte',
        'settings.create': 'Créer',
        'settings.editPortfolio': 'Éditer le portefeuille',
        'settings.name': 'Nom',
        'settings.type': 'Type',
        'settings.cancel': 'Annuler',
        'settings.noPortfolios': 'Aucun portefeuille',
        'settings.positions': 'Positions',
        'settings.edit': 'Éditer',
        'settings.deletePortfolio': 'Supprimer',
        'settings.deleteConfirm': 'Supprimer ce portefeuille et toutes ses positions ?',
        'settings.maintenance': 'Maintenance',
        'settings.resync': 'Resynchroniser les holdings',
        'settings.resyncDesc': 'Recalcule tous les holdings à partir des transactions. Utilisez cette option si vous constatez des erreurs de calcul.',
        'settings.resyncConfirm': 'Resynchroniser',
        'settings.resyncConfirmMsg': 'Cette opération va recalculer tous les holdings. Continuer ?',
        'settings.resyncing': 'Resynchronisation...',
        'settings.resyncSuccess': 'Holdings resynchronisés',
        'stats.title': 'Statistiques du portefeuille',
        'stats.allocation': 'Répartition des actifs',
        'stats.performance': 'Performance',
        'stats.best': 'Meilleur performer',
        'stats.worst': 'Pire performer',
        'stats.recommendations': 'Recommandations',
        'stats.noRecommendations': 'Aucune recommandation pour le moment.'
      },
      en: {
        'nav.dashboard': 'Dashboard',
        'nav.positions': 'Positions',
        'nav.stats': 'Statistics',
        'nav.add': 'Add',
        'nav.settings': 'Settings',
        'dashboard.totalValue': 'Total Value',
        'dashboard.totalPL': 'Total P/L',
        'dashboard.totalCost': 'Total Cost',
        'dashboard.evolution': 'Portfolio Evolution',
        'dashboard.positions': 'Positions',
        'dashboard.asset': 'Asset',
        'dashboard.quantity': 'Quantity',
        'dashboard.avgPrice': 'Avg Price',
        'dashboard.currentPrice': 'Current Price',
        'dashboard.value': 'Value',
        'dashboard.pl': 'P/L',
        'positions.title': 'My Positions',
        'positions.currentPrice': 'Current Price',
        'positions.edit': 'Edit',
        'positions.delete': 'Delete',
        'positions.sell': 'Sell',
        'positions.sellTitle': 'Sell Position',
        'positions.soldOut': 'Position sold',
        'positions.cannotSellMore': 'You cannot sell more than',
        'positions.realizedProfit': 'Realized Profit',
        'positions.max': 'Max',
        'positions.filterAll': 'All types',
        'positions.sortName': 'Name',
        'positions.sortValue': 'Value',
        'positions.sortPL': 'P/L',
        'positions.sortPLPercent': 'P/L %',
        'positions.transactions': 'Transactions',
        'positions.date': 'Date',
        'positions.type': 'Type',
        'positions.buy': 'Buy',
        'positions.sell': 'Sell',
        'positions.fees': 'Fees',
        'positions.total': 'Total',
        'positions.actions': 'Actions',
        'settings.title': 'General Settings',
        'settings.currency': 'Default Currency',
        'settings.language': 'Language',
        'settings.theme': 'Theme',
        'settings.themeBlue': 'Blue',
        'settings.themeGreen': 'Green',
        'settings.themePurple': 'Purple',
        'settings.themeOrange': 'Orange',
        'settings.themeRed': 'Red',
        'settings.portfolios': 'Portfolios',
        'settings.save': 'Save',
        'settings.saved': 'Settings saved',
        'add.title': 'Add Asset',
        'add.manual': 'Manual Add',
        'add.import': 'Import Bourse Direct',
        'add.wallet': 'Import Wallet',
        'add.type': 'Type',
        'add.search': 'Search asset',
        'add.portfolio': 'Portfolio',
        'add.quantity': 'Quantity',
        'add.date': 'Purchase date',
        'add.price': 'Unit price (optional)',
        'add.fees': 'Fees (optional)',
        'add.submit': 'Add',
        'add.selectType': '-- Select a type --',
        'add.searchPlaceholder': 'LVMH, Apple, Bitcoin, Gold...',
        'add.pricePlaceholder': 'Fetched automatically',
        'add.feesPlaceholder': '0',
        'add.walletAddress': 'Wallet address',
        'add.walletAddressPlaceholder': '0x... or bc1...',
        'add.blockchain': 'Blockchain',
        'add.importTransactions': 'Import transactions',
        'add.excelFile': 'Bourse Direct Excel file',
        'add.importButton': 'Import',
        'add.importHistoryTitle': 'Import history',
        'add.watchedWallets': 'Watched wallets',
        'add.noWallets': 'No wallets',
        'add.address': 'Address',
        'add.actions': 'Actions',
        'add.deleteButton': 'Delete',
        'add.deleteConfirm': 'Delete?',
        'add.noImports': 'No imports',
        'add.selectFirst': 'Select a type first',
        'add.searching': 'Searching...',
        'add.noResults': 'No results',
        'add.error': 'Error',
        'add.selectAsset': 'Please select an asset',
        'add.historyTotal': 'Total',
        'add.historyLines': 'lines',
        'add.historyImported': 'imported',
        'add.historyIgnored': 'ignored',
        'add.historyErrors': 'errors',
        'add.historyShowIgnored': 'Show ignored assets',
        'confirm.deleteWallet': 'Delete wallet',
        'confirm.deleteWalletMsg': 'Are you sure you want to delete this wallet?',
        'confirm.deleteTransaction': 'Delete transaction',
        'confirm.deleteTransactionMsg': 'Are you sure you want to delete this transaction?',
        'confirm.deletePosition': 'Delete position',
        'confirm.deletePositionMsg': 'Are you sure you want to delete',
        'confirm.cancel': 'Cancel',
        'confirm.confirm': 'Confirm',
        'edit.position': 'Edit position',
        'edit.transaction': 'Edit transaction',
        'edit.quantity': 'Quantity',
        'edit.avgPrice': 'Average price',
        'edit.type': 'Type',
        'edit.pricePerUnit': 'Unit price',
        'edit.save': 'Save',
        'add.typeCrypto': 'Crypto',
        'add.typeStock': 'Stock',
        'add.typeEtf': 'ETF',
        'add.typeMetal': 'Metal',
        'add.typeCash': 'Cash',
        'add.typeOther': 'Other',
        'settings.maxAssetConcentration': 'Maximum concentration per asset (%)',
        'settings.maxCategoryConcentration': 'Maximum concentration per category (%)',
        'settings.portfolioName': 'Portfolio name',
        'settings.portfolioType': 'Type (optional)',
        'settings.portfolioTypeCrypto': 'Crypto',
        'settings.portfolioTypeStocks': 'Stocks',
        'settings.portfolioTypeEtf': 'ETF',
        'settings.portfolioTypeMetal': 'Metals',
        'settings.portfolioTypeMixed': 'Mixed',
        'settings.create': 'Create',
        'settings.editPortfolio': 'Edit portfolio',
        'settings.name': 'Name',
        'settings.type': 'Type',
        'settings.cancel': 'Cancel',
        'settings.noPortfolios': 'No portfolios',
        'settings.positions': 'Positions',
        'settings.edit': 'Edit',
        'settings.deletePortfolio': 'Delete',
        'settings.deleteConfirm': 'Delete this portfolio and all its positions?',
        'settings.maintenance': 'Maintenance',
        'settings.resync': 'Resynchronize holdings',
        'settings.resyncDesc': 'Recalculates all holdings from transactions. Use this if you notice calculation errors.',
        'settings.resyncConfirm': 'Resynchronize',
        'settings.resyncConfirmMsg': 'This will recalculate all holdings. Continue?',
        'settings.resyncing': 'Resyncing...',
        'settings.resyncSuccess': 'Holdings resynchronized',
        'stats.title': 'Portfolio Statistics',
        'stats.allocation': 'Asset Allocation',
        'stats.performance': 'Performance',
        'stats.best': 'Best Performer',
        'stats.worst': 'Worst Performer',
        'stats.recommendations': 'Recommendations',
        'stats.noRecommendations': 'No recommendations at the moment.'
      }
    };
    return translations[this.language]?.[key] || key;
  },
  
  formatCurrency(value, decimals = 2) {
    const symbols = { 
      EUR: '€', 
      USD: '$', 
      GBP: '£', 
      CHF: 'CHF', 
      JPY: '¥', 
      CAD: 'CA$', 
      AUD: 'A$', 
      CNY: '¥' 
    };
    const symbol = symbols[this.currency] || this.currency;
    return `${symbol}${value.toFixed(decimals)}`;
  }
};
