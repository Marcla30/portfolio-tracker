const routes = {
  '/': dashboardController,
  '/stats': statsController,
  '/positions': positionsController,
  '/add': addController,
  '/settings': settingsController
};

function navigate(path) {
  history.pushState(null, null, path);
  render();
  updateNavbar();
}

function render() {
  const path = location.pathname;
  const controller = routes[path] || routes['/'];
  controller.render();
}

window.addEventListener('popstate', render);
document.addEventListener('click', e => {
  if (e.target.matches('[data-route]')) {
    e.preventDefault();
    navigate(e.target.getAttribute('href'));
  }
});
