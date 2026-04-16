import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VAT100 - Intelligent Invoicing',
    short_name: 'VAT100',
    description: 'De slimste facturatie- en administratie-app voor zzp\'ers.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0d0d0b',
    theme_color: '#0d0d0b',
    orientation: 'portrait-primary',
    categories: ['finance', 'business', 'productivity'],
    lang: 'nl-NL',
    dir: 'ltr',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Nieuwe factuur',
        short_name: 'Factuur',
        description: 'Maak direct een nieuwe factuur aan',
        url: '/dashboard/invoices/new',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Bon scannen',
        short_name: 'Bon',
        description: 'Scan een bon met AI-herkenning',
        url: '/dashboard/expenses',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'BTW overzicht',
        short_name: 'BTW',
        description: 'Bekijk je actuele BTW-positie',
        url: '/dashboard/tax',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
      },
    ],
    share_target: {
      action: '/dashboard/expenses',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
        files: [
          {
            name: 'receipt',
            accept: ['image/*', 'application/pdf'],
          },
        ],
      },
    },
  };
}
