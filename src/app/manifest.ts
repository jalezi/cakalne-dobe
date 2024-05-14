import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Čakalne dobe - Sledilnik',
    short_name: 'Čakalne dobe - Sledilnik',
    description:
      'Nabor čakalnih dob za zdravniške postopke v Sloveniji od 7.4.2014 dalje.',
    start_url: '/',
    display: 'standalone',
    theme_color: '#09090b',
    background_color: '#ffffff',
    icons: [
      {
        src: 'favicon.ico',
        sizes: '64x64 32x32 24x24 16x16',
        type: 'image/x-icon',
      },
      // {
      //   src: '/android-chrome-192x192.png',
      //   type: 'image/png',
      //   sizes: '192x192',
      // },
      // {
      //   src: '/android-chrome-384x384.png',
      //   type: 'image/png',
      //   sizes: '384x384',
      // },
    ],
  };
}
