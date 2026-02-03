/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  safelist: [
    // Fractional spacing classes used in aggressive redesign
    'mb-0.5',
    'mb-1.5',
    'gap-1.5',
    'space-y-2',
    'p-2',
  ],
  theme: {
    extend: {
      colors: {
        // AreumFire Design System - Notion-inspired neutral palette
        areum: {
          canvas: '#F7F7F5',
          surface: '#FFFFFF',
          border: '#E3E3E0',
          'border-hover': '#D0D0CE',
          'text-primary': '#37352F',
          'text-secondary': '#787774',
          'text-tertiary': '#9B9A97',
          accent: '#2383E2',
          'accent-hover': '#1B6EC2',

          // Semantic colors (status indicators)
          success: '#0F7B6C',
          'success-bg': '#F0FDF4',
          'success-border': '#BBF7D0',
          'success-text': '#166534',

          warning: '#D9730D',
          'warning-bg': '#FFFBEB',
          'warning-border': '#FDE68A',
          'warning-text': '#92400E',

          danger: '#E03E3E',
          'danger-bg': '#FEF2F2',
          'danger-border': '#FECACA',
          'danger-text': '#991B1B',
        },

        // Legacy palette (keep for gradual migration)
        "bg-primary": "#F7F8FA",
        "bg-secondary": "#FFFFFF",
        "bg-surface": "#FFFFFF",
        "bg-elevated": "#F8FAFC",
        "text-primary": "#1F2937",
        "text-secondary": "#6B7280",
        "text-tertiary": "#9CA3AF",
        "text-inverse": "#FFFFFF",
        "border-primary": "#E5E7EB",
        "border-secondary": "#D1D5DB",

        // Accent Palette (Primary Action Color)
        accent: {
          light: "#EEF2FF",
          DEFAULT: "#4338CA",
          hover: "#3730A3",
          primary: "#4338CA",
        },

        // Semantic Palettes (for status, alerts, categories)
        info: {
          light: "#DBEAFE",
          DEFAULT: "#3B82F6",
        },
        success: {
          light: "#F0FDF4",
          DEFAULT: "#16A34A",
        },
        warning: {
          light: "#FFFBEB",
          DEFAULT: "#D97706",
          600: "#D97706",
        },
        danger: {
          light: "#FEF2F2",
          DEFAULT: "#DC2626",
        },

        "accent-primary": "#4338CA",
        "accent-primary-hover": "#3730A3",
        "accent-primary-light": "#EEF2FF",
      },
      fontSize: {
        // AreumFire typography scale
        'xs-areum': '11px',
        'sm-areum': '13px',
        'base-areum': '14px',
        'md-areum': '16px',
        'lg-areum': '18px',
        'xl-areum': '24px',
      },
      fontFamily: {
        primary: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "SF Mono", "Consolas", "monospace"],
      },
      spacing: {
        1: "0.25rem", // 4px
        2: "0.5rem", // 8px
        3: "0.75rem", // 12px
        4: "1rem", // 16px
        5: "1.25rem", // 20px
        6: "1.5rem", // 24px
        8: "2rem", // 32px
        10: "2.5rem", // 40px
        12: "3rem", // 48px
        16: "4rem", // 64px
      },
      borderRadius: {
        // AreumFire rounding scale
        'sm-areum': '3px',
        'md-areum': '6px',
        'lg-areum': '8px',
        // Legacy
        sm: "0.25rem", // 4px
        base: "0.5rem", // 8px
        lg: "0.75rem", // 12px
        xl: "1rem", // 16px
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      },
      keyframes: {
        'highlight-neutral': {
          '0%': { backgroundColor: 'rgba(35, 131, 226, 0.25)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'highlight-success': {
          '0%': { backgroundColor: 'rgba(15, 123, 108, 0.25)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'highlight-danger': {
          '0%': { backgroundColor: 'rgba(224, 62, 62, 0.25)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        'highlight': 'highlight-neutral 800ms ease-out',
        'highlight-up': 'highlight-success 800ms ease-out',
        'highlight-down': 'highlight-danger 800ms ease-out',
      },
      zIndex: {
        dropdown: "1000",
        sticky: "1020",
        fixed: "1030",
        "modal-backdrop": "1040",
        modal: "1050",
        popover: "1060",
        tooltip: "1070",
      },
    },
  },
  plugins: [],
};
