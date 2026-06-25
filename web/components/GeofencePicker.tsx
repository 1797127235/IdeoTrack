"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";

const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_JSAPI_KEY || "";

export interface GeofenceValue {
  lat: number;
  lng: number;
  radius: number;
  address: string;
}

interface GeofencePickerProps {
  value?: GeofenceValue | null;
  onChange: (value: GeofenceValue | null) => void;
}

const DEFAULT_CENTER = { lat: 39.90923, lng: 116.397428 };
const DEFAULT_RADIUS = 100;

type AMapInstance = Record<string, unknown>;

declare global {
  interface Window {
    AMap?: AMapInstance;
  }
}

export default function GeofencePicker({ value, onChange }: GeofencePickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMapInstance | null>(null);
  const circleRef = useRef<AMapInstance | null>(null);
  const markerRef = useRef<AMapInstance | null>(null);
  const [keyword, setKeyword] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ name: string; lat: number; lng: number; address: string }>>([]);
  const [radius, setRadius] = useState(value?.radius ?? DEFAULT_RADIUS);
  const [address, setAddress] = useState(value?.address ?? "");
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(AMAP_KEY ? "" : "缺少高德地图 Key，请配置 NEXT_PUBLIC_AMAP_JSAPI_KEY");

  const emitChange = useCallback((lat: number, lng: number, r: number, addr: string) => {
    onChange({ lat, lng, radius: r, address: addr });
  }, [onChange]);

  const reverseGeocode = useCallback((lat: number, lng: number, r: number) => {
    const AMap = window.AMap;
    if (!AMap) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Geocoder = (AMap as any).Geocoder;
    if (typeof Geocoder !== "function") return;
    const geocoder = new Geocoder();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geocoder.getAddress([lng, lat], (status: string, result: any) => {
      if (status === "complete" && result?.regeocode?.formattedAddress) {
        const addr = result.regeocode.formattedAddress as string;
        setAddress(addr);
        emitChange(lat, lng, r, addr);
      }
    });
  }, [emitChange]);

  const updateCenter = useCallback((lat: number, lng: number, moveMarker: boolean) => {
    const center = [lng, lat];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (circleRef.current as any)?.setCenter?.(center);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (circleRef.current as any)?.setRadius?.(radius);
    if (moveMarker) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (markerRef.current as any)?.setPosition?.(center);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mapRef.current as any)?.setCenter?.(center);
    emitChange(lat, lng, radius, address);
    reverseGeocode(lat, lng, radius);
  }, [radius, address, emitChange, reverseGeocode]);

  useEffect(() => {
    if (!AMAP_KEY) return;

    let mounted = true;

    AMapLoader.load({
      key: AMAP_KEY,
      version: "2.0",
      plugins: ["AMap.PlaceSearch", "AMap.Geocoder"],
    })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((AMap: any) => {
        if (!mounted || !mapContainerRef.current) return;

        const initialCenter = value
          ? [value.lng, value.lat]
          : [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat];

        const map = new AMap.Map(mapContainerRef.current, {
          zoom: 15,
          center: initialCenter,
        });
        mapRef.current = map;

        const circle = new AMap.Circle({
          center: initialCenter,
          radius: value?.radius ?? DEFAULT_RADIUS,
          fillColor: "#3b82f6",
          fillOpacity: 0.2,
          strokeColor: "#3b82f6",
          strokeWeight: 2,
        });
        circleRef.current = circle;

        const marker = new AMap.Marker({
          position: initialCenter,
          draggable: true,
        });
        markerRef.current = marker;

        map.add([marker, circle]);

        marker.on("dragend", () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pos = (markerRef.current as any).getPosition();
          updateCenter(pos.lat, pos.lng, false);
        });

        map.on("click", (e: Record<string, unknown>) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lnglat = e.lnglat as any;
          updateCenter(lnglat.lat, lnglat.lng, true);
        });

        setReady(true);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setLoadError("地图加载失败：" + (err?.message || String(err)));
      });

    return () => {
      mounted = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapRef.current as any)?.destroy?.();
      mapRef.current = null;
    };
  }, [value, updateCenter]);

  const handleSearch = () => {
    if (!keyword.trim() || !window.AMap) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AMap = window.AMap as any;
    const placeSearch = new AMap.PlaceSearch({
      pageSize: 10,
      pageIndex: 1,
    });

    placeSearch.search(keyword, (status: string, result: Record<string, unknown>) => {
      if (status === "complete") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pois = (result as any).poiList?.pois ?? [];
        const list = pois.map((poi: Record<string, unknown>) => ({
          name: String(poi.name ?? ""),
          address: String(poi.address ?? ""),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lat: (poi.location as any).lat as number,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lng: (poi.location as any).lng as number,
        }));
        setSuggestions(list);
      } else {
        setSuggestions([]);
      }
    });
  };

  const selectSuggestion = (item: { name: string; lat: number; lng: number; address: string }) => {
    setKeyword(item.name);
    setAddress(item.address);
    setSuggestions([]);
    updateCenter(item.lat, item.lng, true);
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const r = Number(e.target.value);
    setRadius(r);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (circleRef.current as any)?.setRadius?.(r);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const center = (circleRef.current as any)?.getCenter?.();
    if (center) {
      emitChange(center.lat, center.lng, r, address);
    }
  };

  const handleClear = () => {
    onChange(null);
    setAddress("");
    setKeyword("");
    setSuggestions([]);
  };

  if (loadError) {
    return <div className="text-sm text-[var(--color-danger)]">{loadError}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="搜索地点"
          className="flex-1 h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="h-10 px-3 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-ink-secondary)] hover:bg-[var(--color-bg)] transition-colors"
        >
          搜索
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="h-10 px-3 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] transition-colors"
        >
          清除
        </button>
      </div>

      {suggestions.length > 0 && (
        <ul className="max-h-40 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm">
          {suggestions.map((item, idx) => (
            <li
              key={idx}
              onClick={() => selectSuggestion(item)}
              className="px-3 py-2 cursor-pointer hover:bg-[var(--color-bg)] border-b border-[var(--color-border)] last:border-b-0"
            >
              <div className="font-medium">{item.name}</div>
              <div className="text-xs text-[var(--color-ink-secondary)]">{item.address}</div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <label className="block text-xs font-medium text-[var(--color-ink-secondary)] mb-1">
          半径（米）：{radius}
        </label>
        <input
          type="range"
          min={50}
          max={1000}
          step={10}
          value={radius}
          onChange={handleRadiusChange}
          className="w-full"
        />
      </div>

      {address && (
        <div className="text-xs text-[var(--color-ink-secondary)]">
          已选位置：{address}
        </div>
      )}

      {!ready && <div className="text-sm text-[var(--color-ink-secondary)]">地图加载中…</div>}

      <div
        ref={mapContainerRef}
        className="w-full h-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]"
      />
    </div>
  );
}
