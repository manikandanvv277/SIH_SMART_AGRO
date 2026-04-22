class Footer extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<div class="footer">© ${new Date().getFullYear()} SmartAgro · ESP32-S3 demo · Built for SIH2025</div>`;
  }
}
customElements.define('custom-footer', Footer);
