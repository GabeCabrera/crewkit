"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useMap } from "react-leaflet";
import { Search, MapPin, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

interface AddressSearchProps {
  onLocationSelect?: (lat: number, lng: number, name: string) => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function AddressSearch({ onLocationSelect }: AddressSearchProps) {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 400);

  // Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setResults([]);
      return;
    }

    const searchAddress = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            debouncedQuery
          )}&limit=5&addressdetails=1`,
          {
            headers: {
              "Accept-Language": "en",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data: NominatimResult[] = await response.json();
        setResults(data);
        setShowResults(true);
      } catch (err) {
        console.error("Address search error:", err);
        setError("Search failed. Please try again.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchAddress();
  }, [debouncedQuery]);

  // Close results on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (result: NominatimResult) => {
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      // Fly to location
      map.flyTo([lat, lng], 16, {
        duration: 1.5,
      });

      // Callback if provided
      if (onLocationSelect) {
        onLocationSelect(lat, lng, result.display_name);
      }

      // Clear search
      setQuery("");
      setResults([]);
      setShowResults(false);
    },
    [map, onLocationSelect]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  }, []);

  // Format display name to be shorter
  const formatDisplayName = (name: string): string => {
    const parts = name.split(", ");
    if (parts.length <= 3) return name;
    return parts.slice(0, 3).join(", ");
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search address..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className="h-8 pl-8 pr-8 w-48 text-sm bg-white/95 backdrop-blur-sm shadow-md border-slate-200"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && (results.length > 0 || error) && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-[1001]">
          {error ? (
            <div className="p-3 text-sm text-red-600">{error}</div>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((result) => (
                <li key={result.place_id}>
                  <button
                    onClick={() => handleSelect(result)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-start gap-2 transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm text-slate-700 truncate">
                        {formatDisplayName(result.display_name)}
                      </div>
                      <div className="text-xs text-slate-400 capitalize">
                        {result.type.replace(/_/g, " ")}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* No results message */}
      {showResults && query.length >= 3 && !isLoading && results.length === 0 && !error && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-slate-200 p-3 z-[1001]">
          <p className="text-sm text-slate-500">No results found for &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}

// Wrapper component for use outside of MapContainer
export function AddressSearchWrapper({ onLocationSelect }: AddressSearchProps) {
  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          type="text"
          placeholder="Search address..."
          disabled
          className="h-8 pl-8 pr-8 w-48 text-sm bg-white/95 backdrop-blur-sm shadow-md border-slate-200 opacity-50"
        />
      </div>
    </div>
  );
}
