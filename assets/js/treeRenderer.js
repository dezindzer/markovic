/**
 * TreeRenderer - Interaktivno hijerarhijsko drvo sa Pan/Zoom i SVG granama
 */

export class TreeRenderer {
  constructor(containerEl, onSelectNode) {
    this.container = containerEl;
    this.onSelectNode = onSelectNode;
    
    this.treeData = null;
    this.selectedNodeId = null;
    this.highlightedPath = new Set();
    
    // Canvas Pan & Zoom state
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    // Node Dimensions & Spacing
    this.cardWidth = 190;
    this.cardHeight = 85;
    this.gapX = 40;
    this.gapY = 120;

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="tree-viewport-group" id="tree-viewport">
        <svg class="tree-svg-layer" id="tree-svg-layer"></svg>
        <div id="tree-nodes-layer"></div>
      </div>
    `;

    this.viewportGroup = this.container.querySelector('#tree-viewport');
    this.svgLayer = this.container.querySelector('#tree-svg-layer');
    this.nodesLayer = this.container.querySelector('#tree-nodes-layer');
  }

  bindEvents() {
    // Pan Prevlačenje (Mouse & Touch)
    const startPan = (clientX, clientY) => {
      this.isDragging = true;
      this.startX = clientY - this.translateY;
      this.startX = clientX - this.translateX;
    };

    const doPan = (clientX, clientY) => {
      if (!this.isDragging) return;
      this.translateX = clientX - this.startX;
      this.translateY = clientY - this.startY;
      this.applyTransform();
    };

    const endPan = () => {
      this.isDragging = false;
    };

    this.container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.tree-node-card')) return;
      this.isDragging = true;
      this.startX = e.clientX - this.translateX;
      this.startY = e.clientY - this.translateY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.translateX = e.clientX - this.startX;
      this.translateY = e.clientY - this.startY;
      this.applyTransform();
    });

    window.addEventListener('mouseup', endPan);

    // Touch podrška za pan
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1 && !e.target.closest('.tree-node-card')) {
        this.isDragging = true;
        this.startX = e.touches[0].clientX - this.translateX;
        this.startY = e.touches[0].clientY - this.translateY;
      }
    }, { passive: true });

    this.container.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        this.translateX = e.touches[0].clientX - this.startX;
        this.translateY = e.touches[0].clientY - this.startY;
        this.applyTransform();
      }
    }, { passive: true });

    this.container.addEventListener('touchend', endPan);

    // Zoom sa točkićem miša
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoomAtPoint(zoomFactor, e.clientX, e.clientY);
    }, { passive: false });
  }

  zoomAtPoint(factor, clientX = null, clientY = null) {
    const rect = this.container.getBoundingClientRect();
    
    // Ako nisu prosleđene tačne koordinate miša, zumiramo u tačni centar kontejnera
    const mouseX = (clientX !== null) ? (clientX - rect.left) : (rect.width / 2);
    const mouseY = (clientY !== null) ? (clientY - rect.top) : (rect.height / 2);

    const newScale = Math.min(Math.max(this.scale * factor, 0.15), 4);
    if (newScale === this.scale) return;
    
    this.translateX = mouseX - (mouseX - this.translateX) * (newScale / this.scale);
    this.translateY = mouseY - (mouseY - this.translateY) * (newScale / this.scale);
    this.scale = newScale;

    this.applyTransform();
  }

  zoomIn() {
    this.zoomAtPoint(1.25);
  }

  zoomOut() {
    this.zoomAtPoint(0.8);
  }

  resetZoom() {
    this.scale = 1;
    this.centerTree();
  }

  applyTransform() {
    this.viewportGroup.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  render(rootNode, selectedId = null) {
    this.treeData = rootNode;
    this.selectedNodeId = selectedId;

    if (!rootNode) {
      this.nodesLayer.innerHTML = '';
      this.svgLayer.innerHTML = '';
      return;
    }

    // Izračunavanje hijerarhijskih koordinata
    const layoutNodes = this.computeLayout(rootNode);

    // Renderovanje SVG linija
    this.renderSVGConnections(layoutNodes);

    // Renderovanje DOM kartica
    this.renderNodeCards(layoutNodes);

    if (!this.hasCentered) {
      this.centerTree();
      this.hasCentered = true;
    }
  }

  computeLayout(root) {
    const layoutNodes = [];

    // Dodela X i Y pozicija
    const calculatePositions = (node, depth = 0) => {
      if (node.collapsed) {
        return { node, width: this.cardWidth, children: [] };
      }

      const visibleChildren = (node.children || []).map(child => calculatePositions(child, depth + 1));
      
      let totalWidth = 0;
      if (visibleChildren.length > 0) {
        totalWidth = visibleChildren.reduce((sum, child) => sum + child.width, 0) + (visibleChildren.length - 1) * this.gapX;
      } else {
        totalWidth = this.cardWidth;
      }

      return {
        node,
        width: Math.max(totalWidth, this.cardWidth),
        children: visibleChildren
      };
    };

    const treeLayout = calculatePositions(root);

    // Druga faza: postavljanje apsolutnih X, Y i eksplicitno praćenje roditeljskog ID-a
    const assignCoordinates = (item, xOffset, depth = 0, explicitParentId = null) => {
      const node = item.node;
      const y = depth * (this.cardHeight + this.gapY) + 60;
      const x = xOffset + item.width / 2 - this.cardWidth / 2;
      const effectiveParentId = explicitParentId || node.parentId;

      layoutNodes.push({
        id: node.id,
        node,
        parentId: effectiveParentId,
        x,
        y,
        width: this.cardWidth,
        height: this.cardHeight,
        hasChildren: node.children && node.children.length > 0,
        collapsed: node.collapsed
      });

      if (!node.collapsed && item.children.length > 0) {
        let currentX = xOffset;
        item.children.forEach(childItem => {
          assignCoordinates(childItem, currentX, depth + 1, node.id);
          currentX += childItem.width + this.gapX;
        });
      }
    };

    assignCoordinates(treeLayout, 100, 0);
    this.layoutNodesMap = new Map(layoutNodes.map(n => [n.id, n]));

    return layoutNodes;
  }

  renderSVGConnections(layoutNodes) {
    if (!layoutNodes || layoutNodes.length === 0) {
      this.svgLayer.innerHTML = '';
      return;
    }

    // Dinamičko izračunavanje pune pokrivenosti SVG canvasa bez clipping-a
    const minX = Math.min(...layoutNodes.map(n => n.x), 0);
    const minY = Math.min(...layoutNodes.map(n => n.y), 0);
    const maxX = Math.max(...layoutNodes.map(n => n.x + n.width), 10000);
    const maxY = Math.max(...layoutNodes.map(n => n.y + n.height), 10000);

    const width = maxX - minX + 2000;
    const height = maxY - minY + 2000;

    this.svgLayer.setAttribute('width', `${width}px`);
    this.svgLayer.setAttribute('height', `${height}px`);
    this.svgLayer.style.width = `${width}px`;
    this.svgLayer.style.height = `${height}px`;
    this.svgLayer.style.overflow = 'visible';

    let svgHTML = '';

    layoutNodes.forEach(item => {
      if (item.parentId && this.layoutNodesMap.has(item.parentId)) {
        const parentItem = this.layoutNodesMap.get(item.parentId);

        const parentX = parentItem.x + this.cardWidth / 2;
        const parentY = parentItem.y + this.cardHeight;
        const childX = item.x + this.cardWidth / 2;
        const childY = item.y;

        const midY = parentY + (childY - parentY) / 2;

        // Ortogonalna linija od oca do deteta (Dole -> Levo/Desno -> Dole)
        const d = `M ${parentX} ${parentY} L ${parentX} ${midY} L ${childX} ${midY} L ${childX} ${childY}`;
        const isHighlighted = this.highlightedPath.has(item.id) && this.highlightedPath.has(parentItem.id);

        svgHTML += `
          <path class="tree-connection-path ${isHighlighted ? 'highlighted' : ''}" d="${d}"></path>
        `;
      }
    });

    this.svgLayer.innerHTML = svgHTML;
  }

  renderNodeCards(layoutNodes) {
    let cardsHTML = '';

    layoutNodes.forEach(item => {
      const node = item.node;
      const isSelected = node.id === this.selectedNodeId;
      const isMale = node.gender === 'male';

      const spouseText = node.brak ? `<div class="node-spouse">❤️ ${this.escapeHTML(node.brak)}</div>` : '';
      const datesText = (node.od || node.do) ? `${node.od || '?'} - ${node.do || ''}` : '';

      // Avatar inicijal ili slika
      const avatarHTML = node.slika && node.slika !== 'assets/img/osoba.jpg'
        ? `<img class="node-avatar" src="${node.slika}" alt="${this.escapeHTML(node.name)}" onerror="this.outerHTML='<div class=\\'node-avatar\\'>${node.name.charAt(0)}</div>'">`
        : `<div class="node-avatar">${node.name.charAt(0)}</div>`;

      // Dugme za otvaranje/zatvaranje dece
      let collapseBtnHTML = '';
      if (item.hasChildren) {
        const childCount = node.children.length;
        const icon = node.collapsed ? `+${childCount}` : '−';
        collapseBtnHTML = `
          <button class="node-collapse-btn" data-collapse-id="${node.id}" title="${node.collapsed ? 'Prikaži granu' : 'Sakrij granu'}">
            ${icon}
          </button>
        `;
      }

      cardsHTML += `
        <div class="tree-node-card ${isMale ? 'male' : 'female'} ${isSelected ? 'selected' : ''}"
             id="card-${node.id}"
             style="left: ${item.x}px; top: ${item.y}px;"
             data-node-id="${node.id}">
          <div class="node-header-row">
            ${avatarHTML}
            <div class="node-details">
              <div class="node-name" title="${this.escapeHTML(node.surname ? `${node.name} ${node.surname}` : node.name)}">
                <span class="first-name">${this.escapeHTML(node.name)}</span>
                ${node.surname ? `<span class="node-surname">${this.escapeHTML(node.surname)}</span>` : ''}
              </div>
              ${datesText ? `<div class="node-dates">${datesText}</div>` : ''}
              ${spouseText}
            </div>
          </div>
          ${collapseBtnHTML}
        </div>
      `;
    });

    this.nodesLayer.innerHTML = cardsHTML;

    // Vezivanje događaja za kartice
    this.nodesLayer.querySelectorAll('.tree-node-card').forEach(cardEl => {
      cardEl.addEventListener('click', (e) => {
        const collapseBtn = e.target.closest('.node-collapse-btn');
        if (collapseBtn) {
          e.stopPropagation();
          const nodeId = collapseBtn.getAttribute('data-collapse-id');
          this.toggleCollapse(nodeId);
          return;
        }

        const nodeId = cardEl.getAttribute('data-node-id');
        this.selectNode(nodeId);
      });
    });
  }

  toggleCollapse(nodeId) {
    // Zapamti poziciju čvora na ekranu pre promene rasporeda
    let oldScreenX = null;
    let oldScreenY = null;

    if (this.layoutNodesMap && this.layoutNodesMap.has(nodeId)) {
      const oldItem = this.layoutNodesMap.get(nodeId);
      oldScreenX = oldItem.x * this.scale + this.translateX;
      oldScreenY = oldItem.y * this.scale + this.translateY;
    }

    const findAndToggle = (node) => {
      if (node.id === nodeId) {
        node.collapsed = !node.collapsed;
        return true;
      }
      if (node.children) {
        for (let child of node.children) {
          if (findAndToggle(child)) return true;
        }
      }
      return false;
    };

    findAndToggle(this.treeData);

    // Ponovno izračunavanje rasporeda i renderovanje
    this.render(this.treeData, this.selectedNodeId);

    // Prilagodi translaciju tako da selektovani čvor ostane na identičnom mestu na ekranu
    if (oldScreenX !== null && this.layoutNodesMap && this.layoutNodesMap.has(nodeId)) {
      const newItem = this.layoutNodesMap.get(nodeId);
      this.translateX = oldScreenX - newItem.x * this.scale;
      this.translateY = oldScreenY - newItem.y * this.scale;
      this.applyTransform();
    }
  }

  selectNode(nodeId) {
    this.selectedNodeId = nodeId;
    this.highlightedPath.clear();

    // Pronađi putanju do root-a
    if (nodeId && this.layoutNodesMap) {
      let curr = this.layoutNodesMap.get(nodeId);
      while (curr) {
        this.highlightedPath.add(curr.id);
        curr = curr.node.parentId ? this.layoutNodesMap.get(curr.node.parentId) : null;
      }
    }

    this.render(this.treeData, this.selectedNodeId);

    if (this.onSelectNode) {
      this.onSelectNode(nodeId);
    }
  }

  focusNode(nodeId) {
    if (!this.layoutNodesMap || !this.layoutNodesMap.has(nodeId)) return;

    const item = this.layoutNodesMap.get(nodeId);
    const rect = this.container.getBoundingClientRect();

    // Centriraj na selektovani node
    this.translateX = rect.width / 2 - (item.x + this.cardWidth / 2) * this.scale;
    this.translateY = rect.height / 2 - (item.y + this.cardHeight / 2) * this.scale;
    
    this.applyTransform();
    this.selectNode(nodeId);

    // Dodaj vizuelni efekat pretrage
    const cardEl = document.getElementById(`card-${nodeId}`);
    if (cardEl) {
      cardEl.classList.add('search-match');
      setTimeout(() => cardEl.classList.remove('search-match'), 3000);
    }
  }

  centerTree() {
    if (!this.layoutNodesMap || this.layoutNodesMap.size === 0) return;

    const nodes = Array.from(this.layoutNodesMap.values());
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x + n.width));
    const treeWidth = maxX - minX;

    const rect = this.container.getBoundingClientRect();
    this.translateX = (rect.width - treeWidth) / 2 - minX;
    this.translateY = 40;
    this.scale = 1;

    this.applyTransform();
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
