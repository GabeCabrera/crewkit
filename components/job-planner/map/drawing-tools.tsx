"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import type { MapLayer } from "./route-map-view";

interface DrawingToolsProps {
  enabled: boolean;
  onFeatureCreate: (geoJson: GeoJSON.Feature) => void;
  existingFeatures?: GeoJSON.FeatureCollection;
}

export function DrawingTools({
  enabled,
  onFeatureCreate,
  existingFeatures,
}: DrawingToolsProps) {
  const map = useMap();
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Create feature group for drawn items
    if (!drawnItemsRef.current) {
      drawnItemsRef.current = new L.FeatureGroup();
      map.addLayer(drawnItemsRef.current);
    }

    // Load existing features
    if (existingFeatures && existingFeatures.features) {
      existingFeatures.features.forEach((feature) => {
        const layer = L.geoJSON(feature);
        drawnItemsRef.current?.addLayer(layer);
      });
    }

    // Create draw control
    if (enabled && !drawControlRef.current) {
      drawControlRef.current = new L.Control.Draw({
        position: "topright",
        draw: {
          polyline: {
            shapeOptions: {
              color: "#f97316",
              weight: 4,
            },
            metric: false,
            feet: true,
          },
          polygon: {
            allowIntersection: false,
            shapeOptions: {
              color: "#f97316",
              fillColor: "#fed7aa",
              fillOpacity: 0.3,
            },
          },
          circle: false,
          circlemarker: false,
          rectangle: {
            shapeOptions: {
              color: "#f97316",
              fillColor: "#fed7aa",
              fillOpacity: 0.3,
            },
          },
          marker: {
            icon: L.divIcon({
              className: "custom-marker",
              html: `<div style="
                width: 24px;
                height: 24px;
                background: #f97316;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              "></div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            }),
          },
        },
        edit: {
          featureGroup: drawnItemsRef.current,
          remove: true,
        },
      });

      map.addControl(drawControlRef.current);
    } else if (!enabled && drawControlRef.current) {
      map.removeControl(drawControlRef.current);
      drawControlRef.current = null;
    }

    // Handle draw events
    const handleCreated = (e: L.LeafletEvent) => {
      const event = e as L.DrawEvents.Created;
      const layer = event.layer;

      // Add to drawn items
      drawnItemsRef.current?.addLayer(layer);

      // Convert to GeoJSON
      const geoJson = (layer as L.Layer & { toGeoJSON: () => GeoJSON.Feature }).toGeoJSON();

      // Add properties based on layer type
      if (event.layerType === "marker") {
        geoJson.properties = {
          ...geoJson.properties,
          type: "pole",
          name: `Pole ${Date.now()}`,
        };
      } else if (event.layerType === "polyline") {
        geoJson.properties = {
          ...geoJson.properties,
          type: "route",
          name: `Route ${Date.now()}`,
        };
      } else if (event.layerType === "polygon" || event.layerType === "rectangle") {
        geoJson.properties = {
          ...geoJson.properties,
          type: "area",
          name: `Area ${Date.now()}`,
        };
      }

      onFeatureCreate(geoJson);
    };

    map.on(L.Draw.Event.CREATED, handleCreated);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);

      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
        drawControlRef.current = null;
      }
    };
  }, [map, enabled, onFeatureCreate, existingFeatures]);

  return null;
}

// Component for rendering drawn features layer
interface DrawnFeaturesLayerProps {
  features: GeoJSON.FeatureCollection | null;
  onFeaturesChange: (features: GeoJSON.FeatureCollection) => void;
}

export function DrawnFeaturesLayer({
  features,
  onFeaturesChange,
}: DrawnFeaturesLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Remove existing layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    if (!features || !features.features || features.features.length === 0) {
      return;
    }

    // Create new feature group
    layerRef.current = new L.FeatureGroup();

    // Add features
    features.features.forEach((feature) => {
      const geoJsonLayer = L.geoJSON(feature, {
        style: () => ({
          color: "#f97316",
          weight: 3,
          opacity: 0.8,
          fillColor: "#fed7aa",
          fillOpacity: 0.3,
        }),
        pointToLayer: (_, latlng) => {
          return L.circleMarker(latlng, {
            radius: 8,
            fillColor: "#f97316",
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          });
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties?.name) {
            layer.bindPopup(`<strong>${feature.properties.name}</strong>`);
          }
        },
      });

      layerRef.current?.addLayer(geoJsonLayer);
    });

    map.addLayer(layerRef.current);

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, features]);

  return null;
}

// Helper to create a new drawn layer from features
export function createDrawnLayer(
  features: GeoJSON.Feature[],
  name: string = "Drawn Features"
): Omit<MapLayer, "id"> {
  return {
    name,
    type: "drawn",
    geoJson: {
      type: "FeatureCollection",
      features,
    } as GeoJSON.FeatureCollection,
    opacity: 1.0,
    visible: true,
    zIndex: 100,
  };
}
