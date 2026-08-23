/**
 * App - Glavni kontroler aplikacije Porodično Stablo
 */

import { DataManager } from './dataManager.js';
import { TreeRenderer } from './treeRenderer.js';
import { SunburstRenderer } from './sunburstRenderer.js';
import { TableRenderer } from './tableRenderer.js';

class App {
  constructor() {
    this.dataManager = new DataManager();
    
    // Application State
    this.activeView = 'tree'; // 'tree' | 'sunburst' | 'table'
    this.hideFemales = false;
    this.selectedPersonId = null;

    this.initDOMReferences();
    this.initRenderers();
    this.bindEvents();
  }

  async init() {
    await this.dataManager.loadData();
    this.updateStats();
    this.renderCurrentView();
  }

  initDOMReferences() {
    // Top Bar & Controls
    this.searchInput = document.getElementById('search-input');
    this.searchClearBtn = document.getElementById('search-clear-btn');
    this.searchResults = document.getElementById('search-results');
    
    this.femaleFilterCheckbox = document.getElementById('female-filter-checkbox');
    this.viewTabBtns = document.querySelectorAll('.view-tab-btn');

    // View Containers
    this.treeContainer = document.getElementById('tree-view-container');
    this.sunburstContainer = document.getElementById('sunburst-view-container');
    this.tableContainer = document.getElementById('table-view-container');

    // Zoom & Toolbar
    this.zoomInBtn = document.getElementById('zoom-in-btn');
    this.zoomOutBtn = document.getElementById('zoom-out-btn');
    this.zoomResetBtn = document.getElementById('zoom-reset-btn');

    // Action Buttons
    this.exportJsonBtn = document.getElementById('export-json-btn');
    this.resetDataBtn = document.getElementById('reset-data-btn');

    // Stats
    this.statTotal = document.getElementById('stat-total');
    this.statMales = document.getElementById('stat-males');
    this.statFemales = document.getElementById('stat-females');
    this.statGens = document.getElementById('stat-gens');

    // Drawer Elements
    this.detailDrawer = document.getElementById('detail-drawer');
    this.drawerCloseBtn = document.getElementById('drawer-close-btn');
    this.drawerName = document.getElementById('drawer-name');
    this.drawerBadge = document.getElementById('drawer-badge');
    this.drawerPhoto = document.getElementById('drawer-photo');
    this.drawerOd = document.getElementById('drawer-od');
    this.drawerMr = document.getElementById('drawer-mr');
    this.drawerDo = document.getElementById('drawer-do');
    this.drawerMs = document.getElementById('drawer-ms');
    this.drawerBrak = document.getElementById('drawer-brak');
    this.drawerMob = document.getElementById('drawer-mob');
    this.drawerEmail = document.getElementById('drawer-email');
    this.drawerBio = document.getElementById('drawer-bio');
    this.drawerAddChildBtn = document.getElementById('drawer-add-child-btn');
    this.drawerEditBtn = document.getElementById('drawer-edit-btn');
    this.drawerDeleteBtn = document.getElementById('drawer-delete-btn');

    // Modal Overlay & Windows
    this.modalOverlay = document.getElementById('modal-overlay');
    this.modalTitle = document.getElementById('modal-title');
    this.modalBody = document.getElementById('modal-body');
    this.modalCloseBtn = document.getElementById('modal-close-btn');
  }

  initRenderers() {
    this.treeRenderer = new TreeRenderer(this.treeContainer, (nodeId) => {
      this.openPersonDrawer(nodeId);
    });

    this.sunburstRenderer = new SunburstRenderer(this.sunburstContainer, (nodeId) => {
      this.openPersonDrawer(nodeId);
    });

    this.tableRenderer = new TableRenderer(this.tableContainer, (nodeId) => {
      this.openPersonDrawer(nodeId);
      this.switchView('tree');
      this.treeRenderer.focusNode(nodeId);
    });
  }

  bindEvents() {
    // Filter za ženske članove
    if (this.femaleFilterCheckbox) {
      this.femaleFilterCheckbox.addEventListener('change', (e) => {
        this.hideFemales = e.target.checked;
        this.updateStats();
        this.renderCurrentView();
      });
    }

    // Preklopnik prikaza (Tree / Sunburst / Table)
    this.viewTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        this.switchView(view);
      });
    });

    // Zoom kontrole
    if (this.zoomInBtn) {
      this.zoomInBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.activeView === 'tree') this.treeRenderer.zoomIn();
        else if (this.activeView === 'sunburst') this.sunburstRenderer.zoomIn();
      });
    }

    if (this.zoomOutBtn) {
      this.zoomOutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.activeView === 'tree') this.treeRenderer.zoomOut();
        else if (this.activeView === 'sunburst') this.sunburstRenderer.zoomOut();
      });
    }

    if (this.zoomResetBtn) {
      this.zoomResetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.activeView === 'tree') this.treeRenderer.resetZoom();
        else if (this.activeView === 'sunburst') this.sunburstRenderer.resetZoom();
      });
    }

    // Pretraga
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this.handleSearch());
      this.searchInput.addEventListener('focus', () => this.handleSearch());
    }

    if (this.searchClearBtn) {
      this.searchClearBtn.addEventListener('click', () => {
        this.searchInput.value = '';
        this.searchResults.classList.remove('active');
      });
    }

    // Zatvaranje pretrage na klik van nje
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        this.searchResults.classList.remove('active');
      }
    });

    // Drawer Zatvaranje
    if (this.drawerCloseBtn) {
      this.drawerCloseBtn.addEventListener('click', () => this.closeDrawer());
    }

    // Akcije iz Drawera
    if (this.drawerAddChildBtn) {
      this.drawerAddChildBtn.addEventListener('click', () => {
        if (this.selectedPersonId) this.openAddPersonModal(this.selectedPersonId);
      });
    }

    if (this.drawerEditBtn) {
      this.drawerEditBtn.addEventListener('click', () => {
        if (this.selectedPersonId) this.openEditPersonModal(this.selectedPersonId);
      });
    }

    if (this.drawerDeleteBtn) {
      this.drawerDeleteBtn.addEventListener('click', () => {
        if (this.selectedPersonId) this.confirmDeletePerson(this.selectedPersonId);
      });
    }

    // Export & Reset JSON
    if (this.exportJsonBtn) {
      this.exportJsonBtn.addEventListener('click', () => this.openExportModal());
    }

    if (this.resetDataBtn) {
      this.resetDataBtn.addEventListener('click', () => {
        if (confirm('Da li ste sigurni da želite da resetujete sve izmene na originalni drvo.json?')) {
          this.dataManager.resetToOriginal().then(() => {
            this.updateStats();
            this.renderCurrentView();
            this.closeDrawer();
          });
        }
      });
    }

    // Modal zatvaranje
    if (this.modalCloseBtn) {
      this.modalCloseBtn.addEventListener('click', () => this.closeModal());
    }
  }

  switchView(viewName) {
    this.activeView = viewName;

    this.viewTabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });

    this.treeContainer.style.display = viewName === 'tree' ? 'block' : 'none';
    this.sunburstContainer.classList.toggle('active', viewName === 'sunburst');
    this.tableContainer.classList.toggle('active', viewName === 'table');

    this.renderCurrentView();
  }

  renderCurrentView() {
    const filteredTree = this.dataManager.getFilteredTree(this.hideFemales);

    if (this.activeView === 'tree') {
      this.treeRenderer.render(filteredTree, this.selectedPersonId);
    } else if (this.activeView === 'sunburst') {
      this.sunburstRenderer.render(filteredTree);
    } else if (this.activeView === 'table') {
      const nodes = this.dataManager.getAllNodes()
        .filter(n => !this.hideFemales || n.gender === 'male');
      this.tableRenderer.render(nodes);
    }
  }

  updateStats() {
    const stats = this.dataManager.getStatistics();
    if (this.statTotal) this.statTotal.textContent = stats.total;
    if (this.statMales) this.statMales.textContent = stats.males;
    if (this.statFemales) this.statFemales.textContent = stats.females;
    if (this.statGens) this.statGens.textContent = stats.generations;
  }

  handleSearch() {
    const query = this.searchInput.value.trim().toLowerCase();
    if (!query) {
      this.searchResults.classList.remove('active');
      return;
    }

    const allNodes = this.dataManager.getAllNodes();
    const matches = allNodes.filter(node => {
      const fullName = node.surname ? `${node.name} ${node.surname}` : node.name;
      const matchName = fullName.toLowerCase().includes(query);
      const matchOd = node.od.includes(query);
      const matchMr = node.mr.toLowerCase().includes(query);
      const matchBrak = node.brak.toLowerCase().includes(query);
      return matchName || matchOd || matchMr || matchBrak;
    }).slice(0, 8);

    if (matches.length === 0) {
      this.searchResults.innerHTML = '<div style="padding: 12px; color: var(--text-muted); font-size: 0.85rem;">Nema rezultata za pretragu.</div>';
    } else {
      this.searchResults.innerHTML = matches.map(node => `
        <div class="search-result-item" data-node-id="${node.id}">
          <div class="result-info">
            <span class="result-name">${this.escapeHTML(node.surname ? `${node.name} ${node.surname}` : node.name)}</span>
            <span class="result-meta">${node.od ? `Rođen/a: ${node.od}` : ''} ${node.brak ? `| Partner: ${node.brak}` : ''}</span>
          </div>
          <span class="profile-badge ${node.gender}">${node.gender === 'male' ? 'Muško' : 'Žensko'}</span>
        </div>
      `).join('');

      this.searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const nodeId = item.getAttribute('data-node-id');
          this.searchResults.classList.remove('active');
          this.switchView('tree');
          this.treeRenderer.focusNode(nodeId);
          this.openPersonDrawer(nodeId);
        });
      });
    }

    this.searchResults.classList.add('active');
  }

  openPersonDrawer(nodeId) {
    this.selectedPersonId = nodeId;
    const person = this.dataManager.getNodeById(nodeId);
    if (!person) return;

    this.drawerName.textContent = person.surname ? `${person.name} ${person.surname}` : person.name;
    
    // Pol badge
    this.drawerBadge.className = `profile-badge ${person.gender}`;
    this.drawerBadge.textContent = person.gender === 'male' ? 'Muški član' : 'Ženski član';

    // Slika
    if (person.slika && person.slika !== 'assets/img/osoba.jpg') {
      this.drawerPhoto.src = person.slika;
    } else {
      this.drawerPhoto.src = 'assets/img/osoba.jpg';
    }
    this.drawerPhoto.className = `profile-photo ${person.gender}`;

    // Info Polja
    this.drawerOd.textContent = person.od || '-';
    this.drawerMr.textContent = person.mr || '-';
    this.drawerDo.textContent = person.do || '-';
    this.drawerMs.textContent = person.ms || '-';
    this.drawerBrak.textContent = person.brak || '-';
    this.drawerMob.textContent = person.mob || person.tel || '-';
    this.drawerEmail.textContent = person.email || '-';
    this.drawerBio.textContent = person.bio || 'Nema unete biografije.';

    this.detailDrawer.classList.add('open');
  }

  closeDrawer() {
    this.detailDrawer.classList.remove('open');
    this.selectedPersonId = null;
    if (this.activeView === 'tree') {
      this.treeRenderer.render(this.dataManager.getFilteredTree(this.hideFemales), null);
    }
  }

  // MODAL: Dodavanje potomka / člana
  openAddChildModal(parentId) {
    const parent = this.dataManager.getNodeById(parentId);
    if (!parent) return;

    this.modalTitle.textContent = `Dodaj potomka za: ${parent.surname ? `${parent.name} ${parent.surname}` : parent.name}`;
    this.modalBody.innerHTML = `
      <form id="add-person-form" class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>Ime *</label>
            <input type="text" id="add-name" class="form-input" required placeholder="Ime člana">
          </div>
          <div class="form-group">
            <label>Prezime</label>
            <input type="text" id="add-surname" class="form-input" value="${this.escapeHTML(parent.surname || '')}" placeholder="Prezime (npr. Marković)">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Pol *</label>
            <select id="add-gender" class="form-select">
              <option value="male">Muški</option>
              <option value="female">Ženski</option>
            </select>
          </div>
          <div class="form-group">
            <label>Bračni partner</label>
            <input type="text" id="add-brak" class="form-input" placeholder="Ime partnera">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Godina rođenja</label>
            <input type="text" id="add-od" class="form-input" placeholder="npr. 1985">
          </div>
          <div class="form-group">
            <label>Mesto rođenja</label>
            <input type="text" id="add-mr" class="form-input" placeholder="npr. Beograd">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Mobilni telefon</label>
            <input type="text" id="add-mob" class="form-input" placeholder="+381...">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="add-email" class="form-input" placeholder="email@example.com">
          </div>
        </div>
        <div class="form-group">
          <label>Biografija / Napomena</label>
          <textarea id="add-bio" class="form-textarea" rows="3" placeholder="Kratka biografija..."></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="action-btn" id="modal-cancel-btn">Otkaži</button>
          <button type="submit" class="action-btn primary">Sačuvaj člana</button>
        </div>
      </form>
    `;

    this.openModal();

    document.getElementById('modal-cancel-btn').addEventListener('click', () => this.closeModal());
    document.getElementById('add-person-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const newPersonData = {
        name: document.getElementById('add-name').value.trim(),
        surname: document.getElementById('add-surname').value.trim(),
        gender: document.getElementById('add-gender').value,
        brak: document.getElementById('add-brak').value.trim(),
        od: document.getElementById('add-od').value.trim(),
        mr: document.getElementById('add-mr').value.trim(),
        mob: document.getElementById('add-mob').value.trim(),
        email: document.getElementById('add-email').value.trim(),
        bio: document.getElementById('add-bio').value.trim()
      };

      const newPerson = this.dataManager.addChild(parentId, newPersonData);
      this.closeModal();
      this.updateStats();
      this.renderCurrentView();

      if (this.activeView === 'tree') {
        this.treeRenderer.focusNode(newPerson.id);
        this.openPersonDrawer(newPerson.id);
      }
    });
  }

  // MODAL: Uređivanje člana
  openEditPersonModal(personId) {
    const person = this.dataManager.getNodeById(personId);
    if (!person) return;

    this.modalTitle.textContent = `Izmeni podatke: ${person.surname ? `${person.name} ${person.surname}` : person.name}`;
    this.modalBody.innerHTML = `
      <form id="edit-person-form" class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>Ime *</label>
            <input type="text" id="edit-name" class="form-input" required value="${this.escapeHTML(person.name)}">
          </div>
          <div class="form-group">
            <label>Prezime</label>
            <input type="text" id="edit-surname" class="form-input" value="${this.escapeHTML(person.surname || '')}" placeholder="Prezime (npr. Marković)">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Pol</label>
            <select id="edit-gender" class="form-select">
              <option value="male" ${person.gender === 'male' ? 'selected' : ''}>Muški</option>
              <option value="female" ${person.gender === 'female' ? 'selected' : ''}>Ženski</option>
            </select>
          </div>
          <div class="form-group">
            <label>Bračni partner</label>
            <input type="text" id="edit-brak" class="form-input" value="${this.escapeHTML(person.brak)}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Godina rođenja</label>
            <input type="text" id="edit-od" class="form-input" value="${this.escapeHTML(person.od)}">
          </div>
          <div class="form-group">
            <label>Mesto rođenja</label>
            <input type="text" id="edit-mr" class="form-input" value="${this.escapeHTML(person.mr)}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Godina smrti</label>
            <input type="text" id="edit-do" class="form-input" value="${this.escapeHTML(person.do)}">
          </div>
          <div class="form-group">
            <label>Mesto smrti</label>
            <input type="text" id="edit-ms" class="form-input" value="${this.escapeHTML(person.ms)}">
          </div>
        </div>
        <div class="form-group">
          <label>Biografija</label>
          <textarea id="edit-bio" class="form-textarea" rows="3">${this.escapeHTML(person.bio)}</textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="action-btn" id="modal-cancel-btn">Otkaži</button>
          <button type="submit" class="action-btn primary">Ažuriraj podatke</button>
        </div>
      </form>
    `;

    this.openModal();

    document.getElementById('modal-cancel-btn').addEventListener('click', () => this.closeModal());
    document.getElementById('edit-person-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const updatedData = {
        name: document.getElementById('edit-name').value.trim(),
        surname: document.getElementById('edit-surname').value.trim(),
        gender: document.getElementById('edit-gender').value,
        brak: document.getElementById('edit-brak').value.trim(),
        od: document.getElementById('edit-od').value.trim(),
        mr: document.getElementById('edit-mr').value.trim(),
        do: document.getElementById('edit-do').value.trim(),
        ms: document.getElementById('edit-ms').value.trim(),
        bio: document.getElementById('edit-bio').value.trim()
      };

      this.dataManager.updatePerson(personId, updatedData);
      this.closeModal();
      this.renderCurrentView();
      this.openPersonDrawer(personId);
    });
  }

  confirmDeletePerson(personId) {
    const person = this.dataManager.getNodeById(personId);
    if (!person) return;

    if (confirm(`Da li ste sigurni da želite da obrišete osobu "${person.name}" i njenu granu potomaka?`)) {
      this.dataManager.deletePerson(personId);
      this.closeDrawer();
      this.updateStats();
      this.renderCurrentView();
    }
  }

  // MODAL: Export drvo.json
  openExportModal() {
    const jsonStr = JSON.stringify(this.dataManager.exportCleanJSON(), null, 4);

    this.modalTitle.textContent = 'Preuzimanje / Izvoz drvo.json fajla';
    this.modalBody.innerHTML = `
      <div class="form-group">
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">
          Sačuvajte ažurirane podatke klikom na dugme "Preuzmi drvo.json" i zamenite fajl <code>assets/json/drvo.json</code> u vašem spremištu na GitHub-u.
        </p>
        <textarea id="json-export-area" class="form-textarea" rows="12" readonly style="font-family: monospace; font-size: 0.75rem; color: #a7f3d0; background: #022c22;"></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="action-btn" id="copy-json-btn">Kopiraj u klipbord</button>
        <button type="button" class="action-btn primary" id="download-json-btn">Preuzmi drvo.json</button>
      </div>
    `;

    document.getElementById('json-export-area').value = jsonStr;
    this.openModal();

    document.getElementById('copy-json-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(jsonStr);
      alert('Sadržaj kopiran u klipbord!');
    });

    document.getElementById('download-json-btn').addEventListener('click', () => {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'drvo.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  openModal() {
    this.modalOverlay.classList.add('active');
  }

  closeModal() {
    this.modalOverlay.classList.remove('active');
  }

  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[match]));
  }
}

// Pokretanje aplikacije kada se DOM učita
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
