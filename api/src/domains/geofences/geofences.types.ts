export type GeofenceScopeType = 'school' | 'college' | 'class';

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
  createdAt: string;
  updatedAt: string;
}

export interface CreateGeofenceInput {
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  scopeType: GeofenceScopeType;
  scopeId?: string;
  isEnabled?: boolean;
}

export interface UpdateGeofenceInput {
  name?: string;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  scopeType?: GeofenceScopeType;
  scopeId?: string | null;
  isEnabled?: boolean;
}
