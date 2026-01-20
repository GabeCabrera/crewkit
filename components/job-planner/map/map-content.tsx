"use client";

import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  GeoJSON,
  ImageOverlay,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { MapLayer } from "./route-map-view";
import { MeasurementTools, type MeasurementResult } from "./measurement-tools";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with webpack
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface MapContentProps {
  center: { lat: number; lng: number };
  zoom: number;
  layers: MapLayer[];
  onMapMove: (center: { lat: number; lng: number }, zoom: number) => void;
  onLayerUpdate: (layerId: string, updates: Partial<MapLayer>) => void;
  canEdit: boolean;
  measurementMode?: boolean;
  onMeasurementComplete?: (result: MeasurementResult) => void;
}

// Component to handle map events
function MapEventHandler({
  onMapMove,
}: {
  onMapMove: (center: { lat: number; lng: number }, zoom: number) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      onMapMove({ lat: center.lat, lng: center.lng }, zoom);
    },
  });

  return null;
}

// Component to fit bounds when layers are added
function FitBoundsOnLayer({ layers }: { layers: MapLayer[] }) {
  const map = useMap();
  const hasInitialFit = useRef(false);

  useEffect(() => {
    if (layers.length > 0 && !hasInitialFit.current) {
      // Try to fit to the first layer with GeoJSON data
      const layerWithData = layers.find((l) => l.geoJson && l.visible);
      if (layerWithData?.geoJson) {
        try {
          const geoJsonLayer = L.geoJSON(layerWithData.geoJson as GeoJSON.GeoJsonObject);
          const bounds = geoJsonLayer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
            hasInitialFit.current = true;
          }
        } catch (e) {
          console.error("Error fitting bounds:", e);
        }
      }
    }
  }, [layers, map]);

  return null;
}

// Style function for GeoJSON features
function getFeatureStyle(feature: GeoJSON.Feature | undefined) {
  const type = feature?.geometry?.type;
  
  if (type === "Point" || type === "MultiPoint") {
    return {};
  }
  
  return {
    color: "#f97316", // Orange
    weight: 3,
    opacity: 0.8,
    fillColor: "#fed7aa",
    fillOpacity: 0.3,
  };
}

// Point to layer function for markers
function pointToLayer(
  feature: GeoJSON.Feature,
  latlng: L.LatLng
): L.Layer {
  return L.circleMarker(latlng, {
    radius: 8,
    fillColor: "#f97316",
    color: "#fff",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.8,
  });
}

// Popup content for features
function onEachFeature(feature: GeoJSON.Feature, layer: L.Layer) {
  if (feature.properties) {
    const props = feature.properties;
    let popupContent = "<div class='text-sm'>";
    
    if (props.name) {
      popupContent += `<strong>${props.name}</strong><br/>`;
    }
    if (props.description) {
      popupContent += `<p class='mt-1 text-slate-600'>${props.description}</p>`;
    }
    
    // Show other properties
    const excludeKeys = ["name", "description", "styleUrl", "styleHash"];
    const otherProps = Object.entries(props).filter(
      ([key]) => !excludeKeys.includes(key) && props[key]
    );
    
    if (otherProps.length > 0) {
      popupContent += "<div class='mt-2 text-xs text-slate-500'>";
      otherProps.slice(0, 5).forEach(([key, value]) => {
        popupContent += `<div><span class='font-medium'>${key}:</span> ${value}</div>`;
      });
      popupContent += "</div>";
    }
    
    popupContent += "</div>";
    layer.bindPopup(popupContent);
  }
}

export default function MapContent({
  center,
  zoom,
  layers,
  onMapMove,
  onLayerUpdate,
  canEdit,
  measurementMode = false,
  onMeasurementComplete,
}: MapContentProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      className="w-full h-full"
      style={{ background: "#f1f5f9" }}
    >
      <MapEventHandler onMapMove={onMapMove} />
      <FitBoundsOnLayer layers={layers} />
      
      {/* Measurement Tools */}
      <MeasurementTools
        enabled={measurementMode}
        onMeasurementComplete={onMeasurementComplete}
      />

      <LayersControl position="topleft">
        {/* Street Map (Default) */}
        <LayersControl.BaseLayer checked name="Street">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>

        {/* Satellite View */}
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>

        {/* Hybrid (Satellite + Labels) */}
        <LayersControl.BaseLayer name="Hybrid">
          <TileLayer
            attribution='Tiles &copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>

        {/* Topographic */}
        <LayersControl.BaseLayer name="Topographic">
          <TileLayer
            attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {/* Render uploaded layers */}
      {layers
        .filter((layer) => layer.visible)
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((layer) => {
          if (layer.type === "image_overlay" && layer.fileUrl && layer.bounds) {
            return (
              <ImageOverlay
                key={layer.id}
                url={layer.fileUrl}
                bounds={layer.bounds}
                opacity={layer.opacity}
              />
            );
          }

          if (layer.geoJson) {
            return (
              <GeoJSON
                key={layer.id}
                data={layer.geoJson as GeoJSON.GeoJsonObject}
                style={getFeatureStyle}
                pointToLayer={pointToLayer}
                onEachFeature={onEachFeature}
              />
            );
          }

          return null;
        })}
    </MapContainer>
  );
}
