import { serverApi } from "../server-api";

export interface College {
  id: string;
  name: string;
}

export interface Class {
  id: string;
  collegeId: string;
  name: string;
  collegeName?: string;
}

export const listCollegesServer = () => serverApi.get<College[]>("/users/colleges");

export const listClassesServer = () => serverApi.get<Class[]>("/users/classes");
