import { api } from "./api";

export type GeofenceScopeType = "school" | "college" | "class";

export interface Geofence {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  scopeType: GeofenceScopeType;
  scopeId: string | null;
  scopeName: string | null;
  isEnabled: boolean;
}

export const listGeofences = () => api.get<Geofence[]>("/geofences");
export const createGeofence = (data: {
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  scopeType: GeofenceScopeType;
  scopeId?: string;
}) => api.post<Geofence>("/geofences", data);
export const updateGeofence = (
  id: string,
  data: Partial<{
    name: string;
    centerLat: number;
    centerLng: number;
    radiusMeters: number;
    scopeType: GeofenceScopeType;
    scopeId: string | null;
    isEnabled: boolean;
  }>
) => api.put<Geofence>(`/geofences/${id}`, data);
export const deleteGeofence = (id: string) =>
  api.delete<{ id: string }>(`/geofences/${id}`);

export function scopeLabel(scopeType: GeofenceScopeType): string {
  const map: Record<GeofenceScopeType, string> = {
    school: "全校",
    college: "学院",
    class: "班级",
  };
  return map[scopeType];
}
