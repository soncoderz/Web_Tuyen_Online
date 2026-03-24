import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const themePresets = {
  aurora: {
    name: 'Aurora Violet',
    description: 'Violet + blue glow',
    colors: ['#6c63ff', '#a78bfa', '#0f0f1a'],
    css: {
      '--bg-primary': '#0f0f1a',
      '--bg-secondary': '#1a1a2e',
      '--bg-card': '#16213e',
      '--bg-header': 'rgba(15,15,26,0.9)',
      '--bg-glass': 'rgba(255,255,255,0.05)',
      '--text-primary': '#e8e8f0',
      '--text-secondary': '#a0a0b8',
      '--accent': '#6c63ff',
      '--accent-hover': '#7f78ff',
      '--accent-glow': 'rgba(108,99,255,0.3)',
      '--success': '#00d4aa',
      '--warning': '#ffb347',
      '--danger': '#ff6b6b',
      '--border': 'rgba(255,255,255,0.08)',
      '--accent-bg': 'rgba(108,99,255,0.12)',
      '--accent-border': 'rgba(108,99,255,0.3)',
      '--text-h': '#f1f3ff',
      '--social-bg': 'rgba(255,255,255,0.05)',
      '--shadow': '0 8px 32px rgba(0,0,0,0.3)',
    },
  },
  emerald: {
    name: 'Emerald Neon',
    description: 'Teal + emerald neon',
    colors: ['#00e6b8', '#1dd3b0', '#0c1414'],
    css: {
      '--bg-primary': '#0b1318',
      '--bg-secondary': '#0f1f26',
      '--bg-card': '#0f2830',
      '--bg-header': 'rgba(11,19,24,0.9)',
      '--bg-glass': 'rgba(0, 230, 184, 0.06)',
      '--text-primary': '#e3f6ff',
      '--text-secondary': '#9cc6c6',
      '--accent': '#00e6b8',
      '--accent-hover': '#19f1c8',
      '--accent-glow': 'rgba(0,230,184,0.28)',
      '--success': '#23f3c2',
      '--warning': '#ffc773',
      '--danger': '#ff7b7b',
      '--border': 'rgba(0,230,184,0.12)',
      '--accent-bg': 'rgba(0,230,184,0.12)',
      '--accent-border': 'rgba(0,230,184,0.35)',
      '--text-h': '#e8fff8',
      '--social-bg': 'rgba(0,230,184,0.08)',
      '--shadow': '0 10px 35px rgba(0,0,0,0.35)',
    },
  },
  sunset: {
    name: 'Sunset Blaze',
    description: 'Orange + rose dusk',
    colors: ['#ff7a59', '#ffb347', '#1a0f17'],
    css: {
      '--bg-primary': '#120c12',
      '--bg-secondary': '#1e1420',
      '--bg-card': '#261728',
      '--bg-header': 'rgba(30,20,32,0.9)',
      '--bg-glass': 'rgba(255,122,89,0.07)',
      '--text-primary': '#ffecec',
      '--text-secondary': '#c7a9b6',
      '--accent': '#ff7a59',
      '--accent-hover': '#ff906f',
      '--accent-glow': 'rgba(255,122,89,0.32)',
      '--success': '#3ad89f',
      '--warning': '#ffc659',
      '--danger': '#ff5f7a',
      '--border': 'rgba(255,122,89,0.14)',
      '--accent-bg': 'rgba(255,122,89,0.12)',
      '--accent-border': 'rgba(255,122,89,0.35)',
      '--text-h': '#fff5f1',
      '--social-bg': 'rgba(255,122,89,0.08)',
      '--shadow': '0 10px 40px rgba(0,0,0,0.35)',
    },
  },
  ocean: {
    name: 'Midnight Ocean',
    description: 'Deep navy + cyan',
    colors: ['#3ba7ff', '#1dd3f8', '#0a0f1f'],
    css: {
      '--bg-primary': '#070c16',
      '--bg-secondary': '#0d1726',
      '--bg-card': '#0f1e30',
      '--bg-header': 'rgba(7,12,22,0.9)',
      '--bg-glass': 'rgba(29,211,248,0.06)',
      '--text-primary': '#e5f2ff',
      '--text-secondary': '#9eb4d0',
      '--accent': '#3ba7ff',
      '--accent-hover': '#52b7ff',
      '--accent-glow': 'rgba(59,167,255,0.3)',
      '--success': '#1fd1a1',
      '--warning': '#ffd166',
      '--danger': '#ff6b81',
      '--border': 'rgba(59,167,255,0.13)',
      '--accent-bg': 'rgba(59,167,255,0.12)',
      '--accent-border': 'rgba(59,167,255,0.32)',
      '--text-h': '#f1f6ff',
      '--social-bg': 'rgba(59,167,255,0.08)',
      '--shadow': '0 10px 36px rgba(0,0,0,0.34)',
    },
  },
  crimson: {
    name: 'Crimson Edge',
    description: 'Burgundy + hot pink',
    colors: ['#ff4d6d', '#ff8fab', '#15090d'],
    css: {
      '--bg-primary': '#0f060b',
      '--bg-secondary': '#170910',
      '--bg-card': '#1f0c16',
      '--bg-header': 'rgba(15,6,11,0.9)',
      '--bg-glass': 'rgba(255,77,109,0.07)',
      '--text-primary': '#ffe6ec',
      '--text-secondary': '#c9a6b3',
      '--accent': '#ff4d6d',
      '--accent-hover': '#ff6a85',
      '--accent-glow': 'rgba(255,77,109,0.32)',
      '--success': '#4ade80',
      '--warning': '#fbbf24',
      '--danger': '#ff4d6d',
      '--border': 'rgba(255,77,109,0.14)',
      '--accent-bg': 'rgba(255,77,109,0.12)',
      '--accent-border': 'rgba(255,77,109,0.35)',
      '--text-h': '#fff2f6',
      '--social-bg': 'rgba(255,77,109,0.08)',
      '--shadow': '0 10px 38px rgba(0,0,0,0.36)',
    },
  },
  paper: {
    name: 'Paper Light',
    description: 'Nen trang + xanh duong sach',
    colors: ['#2563eb', '#0f172a', '#e2e8f0'],
    css: {
      '--bg-primary': '#f7f8fc',
      '--bg-secondary': '#eef1f7',
      '--bg-card': '#ffffff',
      '--bg-header': 'rgba(255,255,255,0.9)',
      '--bg-glass': 'rgba(15,23,42,0.04)',
      '--text-primary': '#0f172a',
      '--text-secondary': '#475569',
      '--accent': '#2563eb',
      '--accent-hover': '#1d4ed8',
      '--accent-glow': 'rgba(37,99,235,0.25)',
      '--success': '#16a34a',
      '--warning': '#d97706',
      '--danger': '#dc2626',
      '--border': 'rgba(15,23,42,0.08)',
      '--accent-bg': 'rgba(37,99,235,0.12)',
      '--accent-border': 'rgba(37,99,235,0.35)',
      '--text-h': '#0f172a',
      '--social-bg': 'rgba(15,23,42,0.04)',
      '--shadow': '0 10px 30px rgba(15,23,42,0.08)',
    },
  },
};

const ThemeContext = createContext();

const applyTheme = (key) => {
  const preset = themePresets[key] || themePresets.aurora;
  Object.entries(preset.css).forEach(([token, value]) => {
    document.documentElement.style.setProperty(token, value);
  });
  document.documentElement.dataset.theme = key;
};

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState(() => {
    if (typeof window === 'undefined') return 'aurora';
    return localStorage.getItem('theme') || 'aurora';
  });

  useEffect(() => {
    applyTheme(themeKey);
    localStorage.setItem('theme', themeKey);
  }, [themeKey]);

  const value = useMemo(
    () => ({ themeKey, setTheme: setThemeKey, themes: themePresets }),
    [themeKey]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
