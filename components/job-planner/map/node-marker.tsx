"use client";

import { useEffect, useRef, useState } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";

interface NodeType {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface MapNode {
  id: string;
  name: string | null;
  lat: number;
  lng: number;
  nodeType: NodeType;
}

interface NodeMarkerProps {
  node: MapNode;
  isSelected: boolean;
  isConnecting: boolean;
  onClick: (node: MapNode) => void;
  onDragEnd?: (node: MapNode, lat: number, lng: number) => void;
  draggable?: boolean;
}

// Map of Lucide icon names to their SVG path data
// This avoids using react-dom/server which is not allowed in Next.js App Router
const ICON_PATHS: Record<string, string> = {
  // Basic shapes
  Circle: '<circle cx="12" cy="12" r="10"/>',
  Square: '<rect width="18" height="18" x="3" y="3" rx="2"/>',
  
  // Infrastructure icons
  Zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  Cable: '<path d="M17 21v-2a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1"/><path d="M19 15V6.5a3.5 3.5 0 0 0-7 0v11a3.5 3.5 0 0 1-7 0V9"/><path d="M21 21v-2h-4"/><path d="M3 5h4V3"/><path d="M7 5a1 1 0 0 1 1 1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1"/>',
  
  // Utility pole (using Utility icon path)
  Utility: '<path d="M12 2v20"/><path d="M2 5h20"/><path d="m6 5 6 15 6-15"/>',
  
  // Box/Enclosure
  Box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  Package: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73Z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/><path d="m7.5 4.27 9 5.15"/>',
  
  // Building/Home
  Home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  Building: '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  
  // Communication
  Radio: '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>',
  Antenna: '<path d="M2 12 7 2"/><path d="m7 12 5-10"/><path d="m12 12 5-10"/><path d="m17 12 5-10"/><path d="M4.5 7h15"/><path d="M12 16v6"/>',
  Wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
  
  // Network equipment
  Server: '<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>',
  Database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  Router: '<rect width="20" height="8" x="2" y="8" rx="2" ry="2"/><path d="M6 8V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4"/><line x1="6" x2="6.01" y1="12" y2="12"/>',
  
  // Location markers
  MapPin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  Navigation: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  
  // Miscellaneous
  Star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  Flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  Target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  Crosshair: '<circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/>',
  
  // Splice/Junction
  GitBranch: '<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  GitMerge: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/>',
  Split: '<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/>',
  
  // Hand hole / Access point
  CircleDot: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/>',
  Disc: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/>',
  
  // Terminal/Drop
  PlugZap: '<path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/><path d="m2 22 3-3"/><path d="M7.5 13.5 10 11"/><path d="M10.5 16.5 13 14"/><path d="m18 3-4 4h6l-4 4"/>',
  Plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
};

// Generate SVG string for a given icon name
function getIconSvg(iconName: string | null): string {
  const path = ICON_PATHS[iconName || 'Circle'] || ICON_PATHS.Circle;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

// Create a custom divIcon with SVG icon
function createNodeIcon(
  node: MapNode,
  isSelected: boolean,
  isConnecting: boolean
): L.DivIcon {
  const color = node.nodeType.color || "#6B7280";
  const iconSvg = getIconSvg(node.nodeType.icon);
  
  // Build CSS classes for different states
  let containerClasses = "node-marker-container";
  if (isSelected) containerClasses += " node-marker-selected";
  if (isConnecting) containerClasses += " node-marker-connecting";
  
  const html = `
    <div class="${containerClasses}" style="--node-color: ${color};">
      <div class="node-marker-circle" style="background-color: ${color};">
        ${iconSvg}
      </div>
      ${node.name ? `<div class="node-marker-label">${node.name}</div>` : ""}
    </div>
  `;
  
  return L.divIcon({
    className: "node-marker",
    html,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

export function NodeMarker({
  node,
  isSelected,
  isConnecting,
  onClick,
  onDragEnd,
  draggable = false,
}: NodeMarkerProps) {
  const markerRef = useRef<L.Marker>(null);
  const [icon, setIcon] = useState<L.DivIcon | null>(null);
  
  // Create icon on client side only
  useEffect(() => {
    setIcon(createNodeIcon(node, isSelected, isConnecting));
  }, [node, isSelected, isConnecting]);
  
  const handleDragEnd = () => {
    if (markerRef.current && onDragEnd) {
      const marker = markerRef.current;
      const latLng = marker.getLatLng();
      onDragEnd(node, latLng.lat, latLng.lng);
    }
  };
  
  if (!icon) return null;
  
  return (
    <Marker
      ref={markerRef}
      position={[node.lat, node.lng]}
      icon={icon}
      draggable={draggable}
      eventHandlers={{
        click: () => onClick(node),
        dragend: handleDragEnd,
      }}
    />
  );
}

// CSS styles to be injected (add to global CSS or via styled-jsx)
export const nodeMarkerStyles = `
  .node-marker {
    background: transparent !important;
    border: none !important;
  }
  
  .node-marker-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: transform 0.15s ease;
  }
  
  .node-marker-container:hover {
    transform: scale(1.1);
  }
  
  .node-marker-container:hover .node-marker-circle {
    box-shadow: 0 0 0 4px rgba(var(--node-color-rgb, 0, 0, 0), 0.2),
                0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .node-marker-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: all 0.15s ease;
    border: 2px solid white;
  }
  
  .node-marker-circle svg {
    width: 20px;
    height: 20px;
    color: white;
  }
  
  .node-marker-selected .node-marker-circle {
    transform: scale(1.15);
    box-shadow: 0 0 0 3px #3B82F6,
                0 4px 12px rgba(59, 130, 246, 0.4);
  }
  
  .node-marker-connecting .node-marker-circle {
    animation: node-pulse 1.5s ease-in-out infinite;
  }
  
  @keyframes node-pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(var(--node-color-rgb, 59, 130, 246), 0.4);
    }
    50% {
      transform: scale(1.1);
      box-shadow: 0 0 0 8px rgba(var(--node-color-rgb, 59, 130, 246), 0);
    }
  }
  
  .node-marker-label {
    margin-top: 4px;
    font-size: 11px;
    font-weight: 500;
    color: #1F2937;
    background: white;
    padding: 2px 6px;
    border-radius: 4px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    white-space: nowrap;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  /* Touch-friendly sizing for mobile */
  @media (pointer: coarse) {
    .node-marker-circle {
      width: 48px;
      height: 48px;
    }
    
    .node-marker-circle svg {
      width: 24px;
      height: 24px;
    }
  }
`;

export default NodeMarker;
