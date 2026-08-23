/**
 * SunburstRenderer - Prstenasti prikaz porodičnog stabla u stilu godova (D3.js v6)
 * Sa kompletnom podrškom za Pan & Zoom (prevlačenje, točkić i dugmići za zumiranje)
 */

export class SunburstRenderer {
  constructor(containerEl, onSelectNode) {
    this.container = containerEl;
    this.onSelectNode = onSelectNode;
    
    // Zoom & Pan state
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.svgNode = null;

    this.bindPanZoom();
  }

  bindPanZoom() {
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    this.container.addEventListener('mousedown', (e) => {
      if (e.target.closest('path') || e.target.closest('circle')) return; // omogući klik na segmente
      isDragging = true;
      startX = e.clientX - this.translateX;
      startY = e.clientY - this.translateY;
      this.container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      this.translateX = e.clientX - startX;
      this.translateY = e.clientY - startY;
      this.applyTransform();
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      if (this.container) this.container.style.cursor = 'default';
    });

    // Touch podrška
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1 && !e.target.closest('path')) {
        isDragging = true;
        startX = e.touches[0].clientX - this.translateX;
        startY = e.touches[0].clientY - this.translateY;
      }
    }, { passive: true });

    this.container.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        this.translateX = e.touches[0].clientX - startX;
        this.translateY = e.touches[0].clientY - startY;
        this.applyTransform();
      }
    }, { passive: true });

    this.container.addEventListener('touchend', () => {
      isDragging = false;
    });

    // Zoom sa točkićem miša
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      this.zoomAtPoint(zoomFactor, e.clientX, e.clientY);
    }, { passive: false });
  }

  zoomAtPoint(factor, clientX = null, clientY = null) {
    const rect = this.container.getBoundingClientRect();
    const mouseX = (clientX !== null) ? (clientX - rect.left) : (rect.width / 2);
    const mouseY = (clientY !== null) ? (clientY - rect.top) : (rect.height / 2);

    const newScale = Math.min(Math.max(this.scale * factor, 0.4), 6);
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
    this.translateX = 0;
    this.translateY = 0;
    this.applyTransform();
  }

  applyTransform() {
    if (this.svgNode) {
      this.svgNode.style.transformOrigin = 'center center';
      this.svgNode.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    }
  }

  render(rootData) {
    this.container.innerHTML = '';
    if (!rootData || typeof d3 === 'undefined') {
      this.container.innerHTML = '<div style="color: var(--text-muted); padding: 20px;">Prikaz godova zahteva D3 biblioteku.</div>';
      return;
    }

    const size = 1800;
    const radius = size / 2;

    const hierarchy = d3.hierarchy(rootData)
      .sum(d => (d.children && d.children.length > 0) ? 0 : 1);

    const partition = d3.partition()
      .size([2 * Math.PI, radius]);

    const root = partition(hierarchy);
    root.each(d => d.current = d);

    const innerCenterRadius = 140;
    const outerMaxRadius = radius * 0.98;

    const getRadius = (yVal) => {
      if (yVal === 0) return 0;
      const ratio = Math.min(yVal / radius, 1);
      return innerCenterRadius + ratio * (outerMaxRadius - innerCenterRadius);
    };

    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.003))
      .padRadius(radius / 2)
      .innerRadius(d => getRadius(d.y0))
      .outerRadius(d => Math.max(getRadius(d.y0), getRadius(d.y1) - 1.5));

    const svg = d3.create("svg")
      .attr("viewBox", [-radius, -radius, size, size])
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "calc(100vh - 70px)")
      .style("max-width", "100%")
      .style("max-height", "100%")
      .style("font", "bold 15px var(--font-primary, sans-serif)")
      .style("will-change", "transform")
      .style("transition", "transform 0.05s linear");

    const path = svg.append("g")
      .selectAll("path")
      .data(root.descendants().slice(1))
      .join("path")
      .attr("fill", d => d.data.gender === 'female' ? '#ec4899' : '#3b82f6')
      .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.88 : 0.7) : 0)
      .attr("stroke", "#0f172a")
      .attr("stroke-width", "1.5px")
      .attr("d", d => arc(d.current))
      .style("cursor", "pointer");

    path.filter(d => d.children)
      .style("cursor", "pointer")
      .on("click", (event, d) => clicked(event, d));

    path.on("click", (event, d) => {
      if (this.onSelectNode) {
        this.onSelectNode(d.data.id);
      }
    });

    path.append("title")
      .text(d => `${d.ancestors().map(d => d.data.name).reverse().join(" > ")}\nGodina: ${d.data.od || 'nepoznato'}`);

    const label = svg.append("g")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
      .selectAll("text")
      .data(root.descendants().slice(1))
      .join("text")
      .attr("fill-opacity", d => +labelVisible(d.current))
      .attr("transform", d => labelTransform(d.current))
      .attr("fill", "#ffffff")
      .attr("font-size", "14px")
      .attr("font-weight", "700")
      .text(d => d.data.name);

    // Centralni krug (Koren)
    const parent = svg.append("circle")
      .datum(root)
      .attr("r", innerCenterRadius)
      .attr("fill", "#10b981")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", "4px")
      .attr("pointer-events", "all")
      .style("cursor", "pointer")
      .on("click", (event, d) => clicked(event, d));

    // Tekst u korenskom centru
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#ffffff")
      .attr("font-weight", "800")
      .attr("font-size", "20px")
      .attr("pointer-events", "none")
      .text(root.data.name);

    function clicked(event, p) {
      parent.datum(p.parent || root);

      root.each(d => d.target = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.depth),
        y1: Math.max(0, d.y1 - p.depth)
      });

      const t = svg.transition().duration(750);

      path.transition(t)
        .tween("data", d => {
          const i = d3.interpolate(d.current, d.target);
          return t => d.current = i(t);
        })
        .filter(function(d) {
          return +this.getAttribute("fill-opacity") || arcVisible(d.target);
        })
        .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.88 : 0.7) : 0)
        .attrTween("d", d => () => arc(d.current));

      label.filter(function(d) {
        return +this.getAttribute("fill-opacity") || labelVisible(d.target);
      }).transition(t)
        .attr("fill-opacity", d => +labelVisible(d.target))
        .attrTween("transform", d => () => labelTransform(d.current));
    }

    function arcVisible(d) {
      return d.y1 <= radius && d.y0 >= 0 && d.x1 > d.x0;
    }

    function labelVisible(d) {
      return d.y1 <= radius && d.y0 >= 0 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.015;
    }

    function labelTransform(d) {
      const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
      const y = (getRadius(d.y0) + getRadius(d.y1)) / 2;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }

    this.svgNode = svg.node();
    this.container.appendChild(this.svgNode);
    this.applyTransform();
  }
}
