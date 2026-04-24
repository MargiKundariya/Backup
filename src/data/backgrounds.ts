import { BackgroundScene } from '@/types';

export const backgroundScenes: BackgroundScene[] = [
  {
    id: 'transparent',
    name: 'Transparent',
    type: 'solid',
    value: 'transparent',
  },
  {
    id: 'white',
    name: 'White',
    type: 'solid',
    value: '#ffffff',
  },
  {
    id: 'light-gray',
    name: 'Light Gray',
    type: 'solid',
    value: '#f0f0f0',
  },
  {
    id: 'dark',
    name: 'Dark',
    type: 'solid',
    value: '#1a1a2e',
  },
  {
    id: 'gradient-sunset',
    name: 'Sunset',
    type: 'gradient',
    value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    id: 'gradient-ocean',
    name: 'Ocean',
    type: 'gradient',
    value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 'gradient-mint',
    name: 'Mint',
    type: 'gradient',
    value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  },
  {
    id: 'gradient-warm',
    name: 'Warm',
    type: 'gradient',
    value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  },
  {
    id: 'black',
    name: 'Black',
    type: 'solid',
    value: '#000000',
  },
];
