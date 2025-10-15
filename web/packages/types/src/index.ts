// Shared TypeScript types across frontend and backend

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface Target {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

export interface Weapon {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

// Add more shared types here
