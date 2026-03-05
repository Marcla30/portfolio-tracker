const dashboardController = {
  currentTimeframe: '30d',
  chartInstance: null,
  
  async render() {
    const app = document.getElementById('app');
    const holdings = await api.holdings.getAll('', appState.currency);
    
    let totalValue = 0;
    let totalCost = 0;
    holdings.forEach(h => {
      totalValue += h.currentValue;
      totalCost += parseFloat(h.quantity) * parseFloat(h.avgPrice);
    });

    const totalPL = totalValue - totalCost;
    const totalPLPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100) : 0;

    app.innerHTML = `
      <div class="header-stats">
        <div class="stat-card">
          <div class="stat-label">${appState.t('dashboard.totalValue')}</div>
          <div class="stat-value">${appState.formatCurrency(totalValue)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${appState.t('dashboard.totalPL')}</div>
          <div class="stat-value ${totalPL >= 0 ? 'positive' : 'negative'}">
            ${appState.formatCurrency(totalPL)} (${totalPLPercent.toFixed(2)}%)
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${appState.t('dashboard.totalCost')}</div>
          <div class="stat-value">${appState.formatCurrency(totalCost)}</div>
        </div>
      </div>

      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h2 style="margin: 0;">${appState.t('dashboard.evolution')}</h2>
          <div class="timeframe-buttons">
            <button class="timeframe-btn ${this.currentTimeframe === '24h' ? 'active' : ''}" data-timeframe="24h">24h</button>
            <button class="timeframe-btn ${this.currentTimeframe === '7d' ? 'active' : ''}" data-timeframe="7d">7j</button>
            <button class="timeframe-btn ${this.currentTimeframe === '30d' ? 'active' : ''}" data-timeframe="30d">30j</button>
            <button class="timeframe-btn ${this.currentTimeframe === '1y' ? 'active' : ''}" data-timeframe="1y">1an</button>
            <button class="timeframe-btn ${this.currentTimeframe === 'all' ? 'active' : ''}" data-timeframe="all">Tout</button>
          </div>
        </div>
        <canvas id="portfolioChart" style="max-height: 400px;"></canvas>
        <div class="timeframe-selector" id="timeframeSelector">
          <span id="currentTimeframe">30 jours</span>
          <span>▼</span>
        </div>
        <div class="timeframe-dropdown" id="timeframeDropdown">
          <button data-timeframe="24h" class="${this.currentTimeframe === '24h' ? 'active' : ''}">24 heures</button>
          <button data-timeframe="7d" class="${this.currentTimeframe === '7d' ? 'active' : ''}">7 jours</button>
          <button data-timeframe="30d" class="${this.currentTimeframe === '30d' ? 'active' : ''}">30 jours</button>
          <button data-timeframe="1y" class="${this.currentTimeframe === '1y' ? 'active' : ''}">1 an</button>
          <button data-timeframe="all" class="${this.currentTimeframe === 'all' ? 'active' : ''}">Tout</button>
        </div>
      </div>

      <div class="card">
        <h2>${appState.t('dashboard.positions')}</h2>
        <table>
          <thead>
            <tr>
              <th>${appState.t('dashboard.asset')}</th>
              <th>${appState.t('dashboard.quantity')}</th>
              <th>${appState.t('dashboard.avgPrice')}</th>
              <th>${appState.t('dashboard.currentPrice')}</th>
              <th>${appState.t('dashboard.value')}</th>
              <th>${appState.t('dashboard.pl')}</th>
            </tr>
          </thead>
          <tbody>
            ${holdings.map(h => {
              const pl = h.currentValue - (parseFloat(h.quantity) * parseFloat(h.avgPrice));
              const avgPrice = parseFloat(h.avgPrice);
              const plPercent = avgPrice > 0 ? ((h.currentPrice - avgPrice) / avgPrice * 100) : 0;
              return `
                <tr>
                  <td><strong>${h.asset.name}</strong> (${h.asset.symbol})</td>
                  <td>${parseFloat(h.quantity)}</td>
                  <td>${appState.formatCurrency(avgPrice)}</td>
                  <td>${appState.formatCurrency(h.currentPrice)}</td>
                  <td>${appState.formatCurrency(h.currentValue)}</td>
                  <td class="${pl >= 0 ? 'positive' : 'negative'}">
                    ${appState.formatCurrency(pl)} (${plPercent.toFixed(2)}%)
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    this.renderChart(holdings);
    this.setupTimeframeButtons();
  },

  setupTimeframeButtons() {
    // Desktop buttons
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentTimeframe = e.target.dataset.timeframe;
        this.render();
      });
    });
    
    // Mobile dropdown
    const selector = document.getElementById('timeframeSelector');
    const dropdown = document.getElementById('timeframeDropdown');
    const currentTimeframe = document.getElementById('currentTimeframe');
    
    if (selector && dropdown) {
      selector.addEventListener('click', () => {
        dropdown.classList.toggle('active');
      });
      
      document.querySelectorAll('.timeframe-dropdown button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.currentTimeframe = e.target.dataset.timeframe;
          currentTimeframe.textContent = e.target.textContent;
          dropdown.classList.remove('active');
          this.render();
        });
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!selector.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.remove('active');
        }
      });
    }
    
    // Hide tooltip when leaving chart area
    const chartCanvas = document.getElementById('portfolioChart');
    if (chartCanvas) {
      chartCanvas.addEventListener('mouseleave', () => {
        const tooltip = document.getElementById('customTooltip');
        if (tooltip) tooltip.style.display = 'none';
      });
    }
  },

  async renderChart(holdings) {
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    
    // Convert hex to rgba
    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    const days = this.getTimeframeDays();
    const dataPoints = this.getDataPoints();
    const labels = [];
    const data = [];

    // Generate historical data points
    for (let i = dataPoints; i >= 0; i--) {
      const date = new Date();
      
      if (this.currentTimeframe === '24h') {
        date.setHours(date.getHours() - i);
        labels.push(date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      } else {
        const daysAgo = Math.floor((days * i) / dataPoints);
        date.setDate(date.getDate() - daysAgo);
        
        if (this.currentTimeframe === '7d' || this.currentTimeframe === '30d') {
          labels.push(date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }));
        } else {
          labels.push(date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }));
        }
      }
      
      // Simulate historical value
      const value = holdings.reduce((sum, h) => sum + h.currentValue, 0);
      const variance = (Math.random() - 0.5) * 0.08;
      data.push(value * (1 + variance * (i / dataPoints)));
    }

    const ctx = document.getElementById('portfolioChart');
    if (ctx) {
      this.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Valeur du portefeuille',
            data,
            borderColor: accentColor,
            backgroundColor: (context) => {
              const ctx = context.chart.ctx;
              const gradient = ctx.createLinearGradient(0, 0, 0, 400);
              gradient.addColorStop(0, hexToRgba(accentColor, 0.3));
              gradient.addColorStop(1, hexToRgba(accentColor, 0));
              return gradient;
            },
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: accentColor,
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: false
            }
          },
          onHover: (event, activeElements, chart) => {
            const canvasPosition = Chart.helpers.getRelativePosition(event, chart);
            const dataX = chart.scales.x.getValueForPixel(canvasPosition.x);
            const dataY = chart.scales.y.getValueForPixel(canvasPosition.y);
            
            if (dataX >= 0 && dataX < data.length) {
              const index = Math.round(dataX);
              const nextIndex = Math.min(index + 1, data.length - 1);
              const fraction = dataX - index;
              const interpolatedValue = data[index] + (data[nextIndex] - data[index]) * fraction;
              
              // Draw vertical line
              const ctx = chart.ctx;
              chart.draw();
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(canvasPosition.x, chart.scales.y.top);
              ctx.lineTo(canvasPosition.x, chart.scales.y.bottom);
              ctx.strokeStyle = hexToRgba(accentColor, 0.3);
              ctx.lineWidth = 2;
              ctx.setLineDash([5, 5]);
              ctx.stroke();
              ctx.restore();
              
              // Display custom tooltip
              let tooltip = document.getElementById('customTooltip');
              if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'customTooltip';
                tooltip.style.position = 'absolute';
                tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
                tooltip.style.color = '#fff';
                tooltip.style.padding = '8px 12px';
                tooltip.style.borderRadius = '4px';
                tooltip.style.border = `1px solid ${accentColor}`;
                tooltip.style.pointerEvents = 'none';
                tooltip.style.zIndex = '1000';
                tooltip.style.fontSize = '14px';
                document.body.appendChild(tooltip);
              }
              
              const labelIndex = Math.round(dataX);
              tooltip.innerHTML = `${labels[labelIndex]}<br/><strong>${appState.formatCurrency(interpolatedValue)}</strong>`;
              tooltip.style.left = event.native.pageX + 10 + 'px';
              tooltip.style.top = event.native.pageY - 40 + 'px';
              tooltip.style.display = 'block';
            }
          },
          scales: {
            y: { 
              beginAtZero: false,
              ticks: { 
                color: '#a0a0a0',
                font: { size: 12 },
                callback: (value) => appState.formatCurrency(value, 0)
              },
              grid: { 
                color: 'rgba(255, 255, 255, 0.05)',
                drawBorder: false
              },
              border: { display: false }
            },
            x: {
              ticks: { 
                color: '#a0a0a0',
                font: { size: 11 },
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 8
              },
              grid: { 
                color: 'rgba(255, 255, 255, 0.05)',
                drawBorder: false
              },
              border: { display: false }
            }
          }
        }
      });
    }
  },

  getDataPoints() {
    switch (this.currentTimeframe) {
      case '24h': return 24;
      case '7d': return 14;
      case '30d': return 30;
      case '1y': return 52;
      case 'all': return 100;
      default: return 30;
    }
  },

  getTension() {
    switch (this.currentTimeframe) {
      case '24h': return 0.2;
      case '7d': return 0.35;
      case '30d': return 0.4;
      case '1y': return 0.45;
      case 'all': return 0.5;
      default: return 0.4;
    }
  },

  getTimeframeDays() {
    switch (this.currentTimeframe) {
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '1y': return 365;
      case 'all': return 730; // 2 years
      default: return 30;
    }
  }
};
