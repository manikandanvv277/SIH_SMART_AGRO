// simple navbar (no shadow DOM). Uses absolute paths so it works from any page.
class Navbar extends HTMLElement {
  connectedCallback() {
    const loggedIn = localStorage.getItem("isAuthenticated");
    this.innerHTML = `
      <div class="nav">
        <div class="brand">🌿 <span>SmartAgro</span></div>
        <div class="links">
          <a href="/index.html">Dashboard</a>
          <a href="/components/crops.html">Crops</a>
          <a href="/components/alerts.html">Alerts</a>
          <a href="/components/settings.html">Settings</a>
          <button id="loginBtn">${loggedIn ? 'Logout' : 'Login'}</button>
        </div>
      </div>
    `;

    const btn = this.querySelector('#loginBtn');
    btn.addEventListener('click', () => {
      if (localStorage.getItem('isAuthenticated')) {
        localStorage.removeItem('isAuthenticated');
      }
      location.href = '/login.html';
    });
  }
}
customElements.define('custom-navbar', Navbar);
