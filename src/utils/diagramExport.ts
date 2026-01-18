import type { UMLClass, UMLRelation, FlowchartNode, FlowchartConnection } from '../types/uml';

const UML_W = 180;
const FLOWCHART_NODE_W = 120;
const FLOWCHART_NODE_H = 60;

// Export UML Class Diagram to PNG/SVG
export async function exportUMLDiagram(
  umlClasses: UMLClass[],
  umlRelations: UMLRelation[],
  isDarkMode: boolean,
  format: 'png' | 'svg' = 'png'
): Promise<string> {
  // Calculate bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const c of umlClasses) {
    const height = 60 + c.attributes.length * 16 + c.methods.length * 16;
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x + UML_W);
    maxY = Math.max(maxY, c.y + height);
  }

  if (umlClasses.length === 0) {
    minX = 0; minY = 0; maxX = 800; maxY = 600;
  }

  const padding = 60;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;

  // Create SVG
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width.toString());
  svg.setAttribute("height", height.toString());
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.background = isDarkMode ? "#0f172a" : "#f8fafc";

  // Add marker definitions
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  
  // Arrow marker
  const arrowMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  arrowMarker.setAttribute("id", "arrow-export");
  arrowMarker.setAttribute("markerWidth", "10");
  arrowMarker.setAttribute("markerHeight", "10");
  arrowMarker.setAttribute("refX", "9");
  arrowMarker.setAttribute("refY", "3");
  arrowMarker.setAttribute("orient", "auto");
  const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arrowPath.setAttribute("d", "M0,0 L0,6 L9,3 z");
  arrowPath.setAttribute("fill", isDarkMode ? '#94a3b8' : '#64748b');
  arrowMarker.appendChild(arrowPath);
  defs.appendChild(arrowMarker);

  // Triangle marker (inheritance)
  const triangleMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  triangleMarker.setAttribute("id", "triangle-export");
  triangleMarker.setAttribute("markerWidth", "12");
  triangleMarker.setAttribute("markerHeight", "12");
  triangleMarker.setAttribute("refX", "12");
  triangleMarker.setAttribute("refY", "6");
  triangleMarker.setAttribute("orient", "auto");
  const trianglePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  trianglePath.setAttribute("d", "M0,0 L0,12 L12,6 z");
  trianglePath.setAttribute("fill", isDarkMode ? '#0f172a' : '#fff');
  trianglePath.setAttribute("stroke", isDarkMode ? '#94a3b8' : '#64748b');
  triangleMarker.appendChild(trianglePath);
  defs.appendChild(triangleMarker);

  // Diamond marker (composition/aggregation)
  const diamondMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  diamondMarker.setAttribute("id", "diamond-export");
  diamondMarker.setAttribute("markerWidth", "12");
  diamondMarker.setAttribute("markerHeight", "12");
  diamondMarker.setAttribute("refX", "12");
  diamondMarker.setAttribute("refY", "6");
  diamondMarker.setAttribute("orient", "auto");
  const diamondPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  diamondPath.setAttribute("d", "M0,6 L6,0 L12,6 L6,12 z");
  diamondPath.setAttribute("fill", isDarkMode ? '#94a3b8' : '#64748b');
  diamondMarker.appendChild(diamondPath);
  defs.appendChild(diamondMarker);

  svg.appendChild(defs);

  // Draw relations
  for (const rel of umlRelations) {
    const source = umlClasses.find(c => c.id === rel.sourceClassId);
    const target = umlClasses.find(c => c.id === rel.targetClassId);
    if (!source || !target) continue;

    const sx = source.x - minX + padding + UML_W / 2;
    const sy = source.y - minY + padding + 40;
    const tx = target.x - minX + padding + UML_W / 2;
    const ty = target.y - minY + padding + 40;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", sx.toString());
    line.setAttribute("y1", sy.toString());
    line.setAttribute("x2", tx.toString());
    line.setAttribute("y2", ty.toString());
    line.setAttribute("stroke", isDarkMode ? '#94a3b8' : '#64748b');
    line.setAttribute("stroke-width", "1.5");
    
    if (rel.type === 'dependency' || rel.type === 'realization') {
      line.setAttribute("stroke-dasharray", "5,5");
    }
    if (rel.type === 'inheritance' || rel.type === 'realization') {
      line.setAttribute("marker-end", "url(#triangle-export)");
    } else if (rel.type === 'composition' || rel.type === 'aggregation') {
      line.setAttribute("marker-end", "url(#diamond-export)");
    } else if (rel.type === 'directed' || rel.type === 'dependency') {
      line.setAttribute("marker-end", "url(#arrow-export)");
    }
    
    svg.appendChild(line);
  }

  // Draw classes
  for (const c of umlClasses) {
    const classHeight = 60 + c.attributes.length * 16 + c.methods.length * 16;
    const x = c.x - minX + padding;
    const y = c.y - minY + padding;
    
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
    // Background
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x.toString());
    rect.setAttribute("y", y.toString());
    rect.setAttribute("width", UML_W.toString());
    rect.setAttribute("height", classHeight.toString());
    rect.setAttribute("fill", isDarkMode ? '#1e293b' : '#fff');
    rect.setAttribute("stroke", c.color || (isDarkMode ? '#6366f1' : '#4f46e5'));
    rect.setAttribute("stroke-width", "2");
    rect.setAttribute("rx", "6");
    g.appendChild(rect);

    // Header
    const headerRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    headerRect.setAttribute("x", (x + 1).toString());
    headerRect.setAttribute("y", (y + 1).toString());
    headerRect.setAttribute("width", (UML_W - 2).toString());
    headerRect.setAttribute("height", "28");
    headerRect.setAttribute("fill", c.color || (isDarkMode ? '#6366f1' : '#4f46e5'));
    headerRect.setAttribute("rx", "5");
    g.appendChild(headerRect);

    // Class name
    const nameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    nameText.setAttribute("x", (x + UML_W / 2).toString());
    nameText.setAttribute("y", (y + 19).toString());
    nameText.setAttribute("text-anchor", "middle");
    nameText.setAttribute("fill", "white");
    nameText.setAttribute("font-size", "11");
    nameText.setAttribute("font-weight", "bold");
    nameText.textContent = c.stereotype ? `«${c.stereotype}» ${c.name}` : c.name;
    g.appendChild(nameText);

    // Attributes
    let attrY = y + 45;
    for (const attr of c.attributes) {
      const attrText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      attrText.setAttribute("x", (x + 8).toString());
      attrText.setAttribute("y", attrY.toString());
      attrText.setAttribute("fill", isDarkMode ? '#e2e8f0' : '#334155');
      attrText.setAttribute("font-size", "10");
      attrText.setAttribute("font-family", "monospace");
      attrText.textContent = `${attr.visibility} ${attr.name}: ${attr.type}`;
      g.appendChild(attrText);
      attrY += 16;
    }

    // Separator line
    const sepY = attrY - 8;
    const sep = document.createElementNS("http://www.w3.org/2000/svg", "line");
    sep.setAttribute("x1", x.toString());
    sep.setAttribute("y1", sepY.toString());
    sep.setAttribute("x2", (x + UML_W).toString());
    sep.setAttribute("y2", sepY.toString());
    sep.setAttribute("stroke", isDarkMode ? '#334155' : '#e2e8f0');
    g.appendChild(sep);

    // Methods
    let methodY = sepY + 16;
    for (const method of c.methods) {
      const methodText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      methodText.setAttribute("x", (x + 8).toString());
      methodText.setAttribute("y", methodY.toString());
      methodText.setAttribute("fill", isDarkMode ? '#e2e8f0' : '#334155');
      methodText.setAttribute("font-size", "10");
      methodText.setAttribute("font-family", "monospace");
      methodText.textContent = `${method.visibility} ${method.name}(${method.parameters}): ${method.returnType}`;
      g.appendChild(methodText);
      methodY += 16;
    }

    svg.appendChild(g);
  }

  const svgString = new XMLSerializer().serializeToString(svg);
  
  if (format === 'svg') {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    return URL.createObjectURL(blob);
  }

  // Convert to PNG
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }
    
    ctx.scale(2, 2);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = isDarkMode ? '#0f172a' : '#f8fafc';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
  });
}

// Export Flowchart to PNG/SVG
export async function exportFlowchartDiagram(
  nodes: FlowchartNode[],
  connections: FlowchartConnection[],
  isDarkMode: boolean,
  format: 'png' | 'svg' = 'png'
): Promise<string> {
  // Calculate bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + FLOWCHART_NODE_W);
    maxY = Math.max(maxY, n.y + FLOWCHART_NODE_H);
  }

  if (nodes.length === 0) {
    minX = 0; minY = 0; maxX = 800; maxY = 600;
  }

  const padding = 60;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width.toString());
  svg.setAttribute("height", height.toString());
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.background = isDarkMode ? "#0f172a" : "#f8fafc";

  // Arrow marker
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const arrowMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  arrowMarker.setAttribute("id", "flow-arrow");
  arrowMarker.setAttribute("markerWidth", "10");
  arrowMarker.setAttribute("markerHeight", "10");
  arrowMarker.setAttribute("refX", "9");
  arrowMarker.setAttribute("refY", "3");
  arrowMarker.setAttribute("orient", "auto");
  const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arrowPath.setAttribute("d", "M0,0 L0,6 L9,3 z");
  arrowPath.setAttribute("fill", isDarkMode ? '#94a3b8' : '#64748b');
  arrowMarker.appendChild(arrowPath);
  defs.appendChild(arrowMarker);
  svg.appendChild(defs);

  // Draw connections
  for (const conn of connections) {
    const source = nodes.find(n => n.id === conn.sourceNodeId);
    const target = nodes.find(n => n.id === conn.targetNodeId);
    if (!source || !target) continue;

    const sx = source.x - minX + padding + FLOWCHART_NODE_W / 2;
    const sy = source.y - minY + padding + FLOWCHART_NODE_H / 2;
    const tx = target.x - minX + padding + FLOWCHART_NODE_W / 2;
    const ty = target.y - minY + padding + FLOWCHART_NODE_H / 2;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", sx.toString());
    line.setAttribute("y1", sy.toString());
    line.setAttribute("x2", tx.toString());
    line.setAttribute("y2", ty.toString());
    line.setAttribute("stroke", isDarkMode ? '#6366f1' : '#4f46e5');
    line.setAttribute("stroke-width", "2");
    line.setAttribute("marker-end", "url(#flow-arrow)");
    svg.appendChild(line);

    if (conn.label) {
      const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      labelText.setAttribute("x", ((sx + tx) / 2).toString());
      labelText.setAttribute("y", ((sy + ty) / 2 - 5).toString());
      labelText.setAttribute("text-anchor", "middle");
      labelText.setAttribute("fill", isDarkMode ? '#94a3b8' : '#64748b');
      labelText.setAttribute("font-size", "10");
      labelText.textContent = conn.label;
      svg.appendChild(labelText);
    }
  }

  // Draw nodes
  for (const n of nodes) {
    const x = n.x - minX + padding;
    const y = n.y - minY + padding;
    const nodeColor = n.color || (isDarkMode ? '#6366f1' : '#4f46e5');
    
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    let shape: SVGElement;
    
    switch (n.type) {
      case 'start-end':
        shape = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        shape.setAttribute("cx", (x + FLOWCHART_NODE_W / 2).toString());
        shape.setAttribute("cy", (y + FLOWCHART_NODE_H / 2).toString());
        shape.setAttribute("rx", (FLOWCHART_NODE_W / 2).toString());
        shape.setAttribute("ry", (FLOWCHART_NODE_H / 2).toString());
        break;
      case 'decision':
        shape = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const cx = x + FLOWCHART_NODE_W / 2;
        const cy = y + FLOWCHART_NODE_H / 2;
        shape.setAttribute("points", `${cx},${y} ${x + FLOWCHART_NODE_W},${cy} ${cx},${y + FLOWCHART_NODE_H} ${x},${cy}`);
        break;
      default:
        shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        shape.setAttribute("x", x.toString());
        shape.setAttribute("y", y.toString());
        shape.setAttribute("width", FLOWCHART_NODE_W.toString());
        shape.setAttribute("height", FLOWCHART_NODE_H.toString());
        shape.setAttribute("rx", "6");
    }
    
    shape.setAttribute("fill", isDarkMode ? '#1e293b' : '#fff');
    shape.setAttribute("stroke", nodeColor);
    shape.setAttribute("stroke-width", "2");
    g.appendChild(shape);

    // Label
    const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    labelText.setAttribute("x", (x + FLOWCHART_NODE_W / 2).toString());
    labelText.setAttribute("y", (y + FLOWCHART_NODE_H / 2 + 4).toString());
    labelText.setAttribute("text-anchor", "middle");
    labelText.setAttribute("fill", isDarkMode ? '#e2e8f0' : '#334155');
    labelText.setAttribute("font-size", "11");
    labelText.setAttribute("font-weight", "500");
    labelText.textContent = n.label;
    g.appendChild(labelText);

    svg.appendChild(g);
  }

  const svgString = new XMLSerializer().serializeToString(svg);
  
  if (format === 'svg') {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    return URL.createObjectURL(blob);
  }

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }
    
    ctx.scale(2, 2);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = isDarkMode ? '#0f172a' : '#f8fafc';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
  });
}