"use client";

import { useEffect, useRef, useState } from "react";
import { Marker, useMap } from "react-leaflet";
import L from "leaflet";
import * as LucideIcons from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

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

// Get Lucide icon component by name
function getLucideIcon(iconName: string | null): React.ComponentType<{ className?: string; color?: string }> {
  if (!iconName) return LucideIcons.Circle;
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; color?: string }>>;
  const Icon = icons[iconName];
  return Icon || LucideIcons.Circle;
}

// Create a custom divIcon with Lucide icon
function createNodeIcon(
  node: MapNode,
  isSelected: boolean,
  isConnecting: boolean
): L.DivIcon {
  const color = node.nodeType.color || "#6B7280";
  const Icon = getLucideIcon(node.nodeType.icon);
  
  // Render icon to SVG string
  const iconSvg = renderToStaticMarkup(
    <Icon className="w-5 h-5" color="white" />
  );
  
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
