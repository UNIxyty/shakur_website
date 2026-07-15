/** @type {import('tailwindcss').Config} */
// Mirrors src/tokens.ts. Values are the literal ones from Shakur.dc.html.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#160C00',
        orange: { DEFAULT: '#FB8500', hover: '#FFB703' },
        yellow: { DEFAULT: '#FCCC2C', hover: '#FFD84D' },
        muted: { DEFAULT: '#54504D', deep: '#3B3835', tab: '#57534E' },
        placeholder: '#A8A29E',
        stone: '#D6D3D1',
        'on-dark': '#F3F3F3',
        surface: { DEFAULT: '#F5F5F4', alt: '#FAFAF9' },
        'gallery-bg': '#0C0C0C',
        border: {
          input: '#E7E5E4',
          card: '#EAEAE8',
          section: '#EEEDEA',
          divider: '#E0DFDC',
        },
        success: { DEFAULT: '#1F8A5B', bg: '#E6F4EC' },
        error: '#D64545',
        g2: '#FB5C35',
        // v2 additions — admin panel / Dropdown / DatePicker (mirrors src/tokens.ts).
        danger: { DEFAULT: '#D64545', bg: '#FBE7E7' },
        peach: { DEFAULT: '#FFF3E4', deep: '#FFEAD0' },
        amber: { DEFAULT: '#B7791F', bg: '#FDF0DC' },
        'ink-2': '#3B3733',
        'gray-650': '#54504D',
        'gray-450': '#8A8580',
        'line-2': '#F2F1EF',
        'line-3': '#E7E5E4',
        'fill-2': '#F0EFEC',
        scroll: '#E0DEDB',
        mist: '#D6D3D1',
        'chip-blue': { DEFAULT: '#3B5BA5', bg: '#E9EDF7' },
        'chip-purple': { DEFAULT: '#8A4F9E', bg: '#F3E8F5' },
      },
      fontFamily: {
        sans: ["'Inter'", 'sans-serif'],
        serif: ["'Cormorant Garamond'", 'Georgia', 'serif'],
      },
      fontSize: {
        'hero-title': ['clamp(44px, 8.5vw, 92px)', { lineHeight: '0.98', letterSpacing: '-1px' }],
        'page-title': ['clamp(38px, 7vw, 76px)', { letterSpacing: '-1px' }],
        'detail-title': ['clamp(36px, 6.5vw, 66px)', { lineHeight: '0.98', letterSpacing: '-1.8px' }],
        'cta-title': ['clamp(38px, 7vw, 68px)', { lineHeight: '1.02', letterSpacing: '-1px' }],
        'nf-title': ['clamp(34px, 6vw, 64px)', { lineHeight: '1.0', letterSpacing: '-2px' }],
        'section-title': ['clamp(27px, 4.6vw, 40px)', { lineHeight: '1.08', letterSpacing: '-1.2px' }],
        'band-title': ['clamp(30px, 5vw, 44px)', { letterSpacing: '-1.4px' }],
        'gallery-title': ['clamp(24px, 4vw, 30px)', { letterSpacing: '-0.6px' }],
      },
      maxWidth: {
        container: '1320px',
        wide: '1200px',
        mid: '1180px',
        narrow: '1100px',
        process: '1080px',
        gallery: '1000px',
        prose: '900px',
        faq: '720px',
      },
      borderRadius: {
        xs: '5px',
        input: '10px',
        btn: '11px',
        tab: '13px',
        card: '14px',
      },
      boxShadow: {
        'hero-form': '0 30px 60px rgba(0,0,0,0.35)',
        'cta-button': '0 10px 24px rgba(228,163,0,0.4)',
        dropdown: '0 18px 44px rgba(22,12,0,0.16)',
        lightbox: '0 24px 60px rgba(0,0,0,0.5)',
        play: '0 10px 26px rgba(0,0,0,0.4)',
        'play-lg': '0 12px 34px rgba(0,0,0,0.5)',
      },
      screens: {
        // The one breakpoint the design defines: nav collapses below 900px.
        nav: '901px',
      },
      // v4: the marquee scroll keyframes moved into Marquee.tsx so the admin's
      // marquee_speed_s can drive animation-duration inline.
      transitionTimingFunction: {
        'design-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
