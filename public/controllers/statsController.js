const statsController = {
  async render() {
    const app = document.getElementById('app');
    const stats = await api.stats.get();
    const recommendations = await api.stats.getRecommendations();
    const holdings = await api.holdings.getAll();

    // Calculate stats
    let totalValue = 0;
    let totalCost = 0;
    const byType = {};
    
    holdings.forEach(h => {
      totalValue += h.currentValue;
      totalCost += parseFloat(h.quantity) * parseFloat(h.avgPrice);
      byType[h.asset.type] = (byType[h.asset.type] || 0) + h.currentValue;
    });

    const totalPL = totalValue - totalCost;
    const totalPLPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100) : 0;

    // Find best and worst performers
    const performers = holdings.map(h => {
      const avgPrice = parseFloat(h.avgPrice);
      const pl = h.currentValue - (parseFloat(h.quantity) * avgPrice);
      return {
        name: h.asset.name,
        pl: pl,
        plPercent: avgPrice > 0 ? ((h.currentPrice - avgPrice) / avgPrice * 100) : 0
      };
    });

    const bestPercent = [...performers].sort((a, b) => b.plPercent - a.plPercent)[0];
    const worstPercent = [...performers].sort((a, b) => a.plPercent - b.plPercent)[0];
    const bestGain = [...performers].sort((a, b) => b.pl - a.pl)[0];
    const worstLoss = [...performers].sort((a, b) => a.pl - b.pl)[0];

    app.innerHTML = `
      <div class="card">
        <h2>${appState.t('stats.title')}</h2>
        <div class="header-stats">
          <div class="stat-card">
            <div class="stat-label">${appState.t('dashboard.totalValue')}</div>
            <div class="stat-value">${appState.formatCurrency(totalValue)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">${appState.t('dashboard.totalPL')}</div>
            <div class="stat-value ${totalPL >= 0 ? 'positive' : 'negative'}">
              ${appState.formatCurrency(totalPL)}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">${appState.t('dashboard.totalPL')} %</div>
            <div class="stat-value ${totalPLPercent >= 0 ? 'positive' : 'negative'}">
              ${totalPLPercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="overflow: visible;">
        <h3>${appState.t('stats.allocation')}</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center; overflow: visible;">
          <div style="margin: 0 auto; padding: 1rem; max-width: 100%;">
            <canvas id="allocationChart" style="max-width: 300px;"></canvas>
          </div>
          <div>
            ${Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, value]) => {
              const percent = (value / totalValue * 100).toFixed(1);
              return `
                <div style="margin-bottom: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 8px; overflow: hidden;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span style="font-weight: 600; text-transform: capitalize;">${type}</span>
                    <span style="font-size: 1.1rem; font-weight: bold;">${percent}%</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; color: var(--text-secondary); font-size: 0.9rem;">
                    <span style="word-break: break-all;">${appState.formatCurrency(value)}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <h3>${appState.t('stats.performance')}</h3>
        ${holdings.length > 1 ? `
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 8px; border-left: 4px solid var(--success);">
              <div style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem;">${appState.t('stats.best')} %</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: var(--success); margin-bottom: 0.25rem;">+${bestPercent.plPercent.toFixed(2)}%</div>
              <div style="color: var(--text-secondary); font-size: 0.9rem;">${bestPercent.name}</div>
            </div>
            <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 8px; border-left: 4px solid var(--danger);">
              <div style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem;">${appState.t('stats.worst')} %</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: var(--danger); margin-bottom: 0.25rem;">${worstPercent.plPercent.toFixed(2)}%</div>
              <div style="color: var(--text-secondary); font-size: 0.9rem;">${worstPercent.name}</div>
            </div>
            <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 8px; border-left: 4px solid var(--success);">
              <div style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem;">${appState.t('stats.best')} ${appState.currency}</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: var(--success); margin-bottom: 0.25rem;">${appState.formatCurrency(bestGain.pl)}</div>
              <div style="color: var(--text-secondary); font-size: 0.9rem;">${bestGain.name}</div>
            </div>
            <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 8px; border-left: 4px solid var(--danger);">
              <div style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem;">${appState.t('stats.worst')} ${appState.currency}</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: var(--danger); margin-bottom: 0.25rem;">${appState.formatCurrency(worstLoss.pl)}</div>
              <div style="color: var(--text-secondary); font-size: 0.9rem;">${worstLoss.name}</div>
            </div>
          </div>
        ` : `
          <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 8px; border-left: 4px solid ${bestPercent.plPercent >= 0 ? 'var(--success)' : 'var(--danger)'};">
            <div style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem;">${appState.t('stats.performance')}</div>
            <div style="font-size: 1.5rem; font-weight: bold; color: ${bestPercent.plPercent >= 0 ? 'var(--success)' : 'var(--danger)'}; margin-bottom: 0.25rem;">${bestPercent.plPercent >= 0 ? '+' : ''}${bestPercent.plPercent.toFixed(2)}%</div>
            <div style="color: var(--text-secondary); font-size: 0.9rem;">${bestPercent.name}</div>
          </div>
        `}
      </div>

      <div class="card">
        <h3>${appState.t('stats.recommendations')}</h3>
        ${recommendations.length > 0 ? recommendations.map(r => `
          <div class="recommendation ${r.severity}">
            ${r.message}
          </div>
        `).join('') : `<p style="color: var(--text-secondary)">${appState.t('stats.noRecommendations')}</p>`}
      </div>
    `;

    // Create pie chart
    const ctx = document.getElementById('allocationChart');
    if (ctx) {
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(byType).map(t => t.charAt(0).toUpperCase() + t.slice(1)),
          datasets: [{
            data: Object.values(byType),
            backgroundColor: [
              '#6366f1',
              '#10b981',
              '#f59e0b',
              '#ef4444',
              '#8b5cf6',
              '#ec4899',
              '#14b8a6',
              '#f97316'
            ],
            borderWidth: 0,
            hoverOffset: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: '65%',
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              cornerRadius: 8,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 },
              callbacks: {
                label: function(context) {
                  const value = context.parsed;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percent = ((value / total) * 100).toFixed(1);
                  return ` ${appState.formatCurrency(value)} (${percent}%)`;
                }
              }
            }
          },
          elements: {
            arc: {
              backgroundColor: function(context) {
                const colors = [
                  '#6366f1',
                  '#10b981',
                  '#f59e0b',
                  '#ef4444',
                  '#8b5cf6',
                  '#ec4899',
                  '#14b8a6',
                  '#f97316'
                ];
                return colors[context.dataIndex];
              },
              hoverBackgroundColor: function(context) {
                const colors = [
                  '#8b8dff',
                  '#4ade80',
                  '#fbbf24',
                  '#f87171',
                  '#a78bfa',
                  '#f472b6',
                  '#2dd4bf',
                  '#fb923c'
                ];
                return colors[context.dataIndex];
              }
            }
          }
        }
      });
    }
  }
};
