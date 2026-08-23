/**
 * TableRenderer - Tabelarni prikaz svih članova porodičnog stabla
 */

export class TableRenderer {
  constructor(containerEl, onSelectNode) {
    this.container = containerEl;
    this.onSelectNode = onSelectNode;
  }

  render(nodes) {
    this.container.innerHTML = '';
    if (!nodes || nodes.length === 0) {
      this.container.innerHTML = '<div style="color: var(--text-muted); padding: 20px;">Nema dostupnih članova.</div>';
      return;
    }

    let rowsHTML = nodes.map(node => {
      const isMale = node.gender === 'male';
      const genderBadge = isMale 
        ? '<span class="profile-badge male">Muško</span>' 
        : '<span class="profile-badge female">Žensko</span>';
      
      const dates = (node.od || node.do) ? `${node.od || '?'} - ${node.do || ''}` : '-';

      const fullName = node.surname ? `${node.name} ${node.surname}` : node.name;

      return `
        <tr data-node-id="${node.id}">
          <td><strong>${this.escapeHTML(fullName)}</strong></td>
          <td>${genderBadge}</td>
          <td>${dates}</td>
          <td>${this.escapeHTML(node.mr || '-')}</td>
          <td>${this.escapeHTML(node.brak || '-')}</td>
          <td>Generacija ${node.depth + 1}</td>
        </tr>
      `;
    }).join('');

    this.container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Ime i prezime</th>
            <th>Pol</th>
            <th>Životni vek</th>
            <th>Mesto rođenja</th>
            <th>Bračni partner</th>
            <th>Generacija</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
    `;

    this.container.querySelectorAll('tbody tr').forEach(row => {
      row.addEventListener('click', () => {
        const nodeId = row.getAttribute('data-node-id');
        if (this.onSelectNode) {
          this.onSelectNode(nodeId);
        }
      });
    });
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
