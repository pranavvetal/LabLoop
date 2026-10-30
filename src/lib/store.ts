export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Student' | 'Owner' | 'Admin';
  avatar?: string;
  hasSafetyTraining: boolean;
}

export interface Resource {
  id: string;
  name: string;
  description: string;
  type: string;
  category: 'Fabricators' | 'Electronics' | 'Imaging' | 'Biochemistry';
  location: string;
  hourlyRate: number;
  requiredQualification: string;
  baselinePhotoUrl?: string;
  status: 'available' | 'maintenance' | 'in-use';
}

export interface Reservation {
  id: string;
  resourceId: string;
  resourceName: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'in-use' | 'returned' | 'waitlisted';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  details: string;
}

export const mockUsers: User[] = [
  { id: 'usr-1', name: 'Alex Rivera', email: 'alex@university.edu', role: 'Student', hasSafetyTraining: true },
  { id: 'usr-2', name: 'Dr. Sarah Jenkins', email: 'sarah@university.edu', role: 'Owner', hasSafetyTraining: true },
  { id: 'usr-3', name: 'System Admin', email: 'admin@university.edu', role: 'Admin', hasSafetyTraining: true },
  { id: 'usr-4', name: 'Jamie Chen', email: 'jamie@university.edu', role: 'Student', hasSafetyTraining: false }
];

export const mockResources: Resource[] = [
  {
    id: 'res-1',
    name: 'Industrial Laser Cutter 500W',
    description: 'High-precision computer-controlled cutter for wood, acrylics, and light sheet metals.',
    type: 'Laser Cutter',
    category: 'Fabricators',
    location: 'Engineering Hall, Lab 3A',
    hourlyRate: 15,
    requiredQualification: 'Laser Safety Level 2',
    status: 'available'
  },
  {
    id: 'res-2',
    name: 'Monomer Multi-Material 3D Printer',
    description: 'Fused deposition modeling printer supporting carbon fiber, nylon, and flexible filament blends.',
    type: '3D Printer',
    category: 'Fabricators',
    location: 'Makerspace Ground Floor',
    hourlyRate: 8,
    requiredQualification: 'Makerspace General Orientation',
    status: 'available'
  },
  {
    id: 'res-3',
    name: 'Bio-Inoculation Incubator',
    description: 'Regulated atmosphere incubator for micro-bacterial or chemical molecular expansion studies.',
    type: 'Biochemistry Equipment',
    category: 'Biochemistry',
    location: 'Bioscience Center, Room 402',
    hourlyRate: 25,
    requiredQualification: 'Biosafety Level 1 Training',
    status: 'available'
  },
  {
    id: 'res-4',
    name: 'High-Speed Spectral Imager',
    description: 'Advanced imaging system for high-resolution spectral analysis across multiple wavebands.',
    type: 'Imaging System',
    category: 'Imaging',
    location: 'Imaging Lab, Room 101',
    hourlyRate: 40,
    requiredQualification: 'Imaging Safety Certification',
    status: 'maintenance'
  },
  {
    id: 'res-5',
    name: 'Digital Oscilloscope 4-Channel',
    description: 'Professional grade oscilloscope for circuit analysis and electronics debugging.',
    type: 'Oscilloscope',
    category: 'Electronics',
    location: 'Electronics Workbench 4',
    hourlyRate: 5,
    requiredQualification: 'None',
    status: 'in-use'
  }
];

export const mockReservations: Reservation[] = [
  {
    id: 'rev-1',
    resourceId: 'res-1',
    resourceName: 'Industrial Laser Cutter 500W',
    userId: 'usr-1',
    userName: 'Alex Rivera',
    startTime: new Date(Date.now() + 2 * 3600000).toISOString(),
    endTime: new Date(Date.now() + 4 * 3600000).toISOString(),
    status: 'pending'
  }
];

export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
    actor: 'Dr. Sarah Jenkins',
    action: 'CREATE_RESOURCE',
    target: 'Industrial Laser Cutter 500W',
    details: 'Asset listed in the lab database with Laser Safety Level 2 requirement.'
  }
];

export const initialStore = {
  users: mockUsers,
  resources: mockResources,
  reservations: mockReservations,
  auditLogs: mockAuditLogs
};

export const getBookingCountForUser = (userId: string, reservations: Reservation[]): number => {
  const today = new Date().toDateString();
  return reservations.filter(
    (r) => r.userId === userId &&
      new Date(r.startTime).toDateString() === today &&
      ['confirmed', 'pending', 'in-use'].includes(r.status)
  ).length;
};