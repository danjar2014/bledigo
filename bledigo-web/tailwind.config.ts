import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bledi-blue': '#0A2540',
        'bledi-gold': '#D4A574',
        'mediterranean': '#00A9CE',
        'olive': '#7A8450',
        'cream': '#FAF7F2',
        'charcoal': '#1A1A2E',
        'slate': '#64748B',
        'cloud': '#F1F5F9',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        accent: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'bledi': '16px',
        'bledi-sm': '12px',
      },
      boxShadow: {
        'bledi': '0 4px 24px rgba(10, 37, 64, 0.08)',
        'bledi-hover': '0 8px 32px rgba(10, 37, 64, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
