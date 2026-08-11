// Church app launcher entries shown on the dashboard "Apps" tab.
// `departments: null` = visible to every signed-in user; otherwise visible to
// members/admins of any listed department (matched by the exact v5departments
// name). Superusers additionally get an "Other apps" section with the rest.
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
  {
    name: 'HadBreak',
    description: 'Church video sharing & downloads',
    url: 'https://hadbreak.ccoan-newyork.org',
    departments: ['Edit Department', 'Media Department', 'Camera Department'],
  },
  {
    name: 'Camera Switcher',
    description: 'Livestream camera switching',
    url: 'https://switch.ccoan-newyork.org',
    departments: ['Camera Department', 'Media Department'],
  },
  {
    name: 'Transfer',
    description: 'Large file transfer',
    url: 'https://transfer.ccoan-newyork.org',
    departments: ['Edit Department', 'Media Department'],
  },
  {
    name: 'Kitchen Ledger',
    description: 'Shared kitchen costs',
    url: 'https://kitchen.ccoan-newyork.org',
    departments: ['Kitchen Department', 'Girls Apartment', 'Boyz Apartment'],
  },
];
