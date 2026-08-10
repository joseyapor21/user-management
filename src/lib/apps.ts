// Church app launcher entries shown on the dashboard "Apps" tab.
// `departments: null` = visible to every signed-in user; otherwise visible to
// superusers and to members/admins of any listed department (matched by the
// exact v5departments name).
export interface AppLink {
  name: string;
  description: string;
  url: string;
  departments: string[] | null;
}

export const APP_LINKS: AppLink[] = [
  {
    name: 'Expenses',
    description: 'Accounting — transactions, fixed bills, safe & assets',
    url: 'https://expenses.ccoan-newyork.org',
    departments: ['Accounting Department'],
  },
  {
    name: 'Emergency Department',
    description: 'Prayer line visitors & seating',
    url: 'https://emergency.ccoan-newyork.org',
    departments: ['Emergency Department', 'Confirmation Department'],
  },
  {
    name: 'Confirmation',
    description: 'Prayer line confirmation',
    url: 'https://confirmation.ccoan-newyork.org',
    departments: ['Confirmation Department'],
  },
  {
    name: 'Protocol',
    description: 'Protocol department',
    url: 'https://protocol.ccoan-newyork.org',
    departments: ['Protocol Department'],
  },
  {
    name: 'Testimony',
    description: 'Testimonies',
    url: 'https://testimony.ccoan-newyork.org',
    departments: ['Testimony Department'],
  },
  {
    name: 'Provisions',
    description: 'Provisions department',
    url: 'https://provisions.ccoan-newyork.org',
    departments: ['Provisions Department'],
  },
];
