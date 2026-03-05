const translations = {
  en: {
    dashboard: 'Dashboard',
    stats: 'Statistics',
    addAsset: 'Add Asset',
    settings: 'Settings',
    totalValue: 'Total Value',
    change24h: '24h Change',
    asset: 'Asset',
    quantity: 'Quantity',
    price: 'Price',
    value: 'Value',
    unrealizedPL: 'Unrealized P/L'
  },
  fr: {
    dashboard: 'Tableau de bord',
    stats: 'Statistiques',
    addAsset: 'Ajouter un actif',
    settings: 'Paramètres',
    totalValue: 'Valeur totale',
    change24h: 'Variation 24h',
    asset: 'Actif',
    quantity: 'Quantité',
    price: 'Prix',
    value: 'Valeur',
    unrealizedPL: 'Plus-value latente'
  }
};

let currentLang = localStorage.getItem('lang') || 'fr';

function t(key) {
  return translations[currentLang][key] || key;
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
}
