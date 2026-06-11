import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: 'class',
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // Rampa de marca — azul profundo y desaturado ("Sober Premium").
                // La usan las páginas directamente (primary-600, primary-50, etc.).
                primary: {
                    50: '#eef2f9',
                    100: '#d7e0ef',
                    200: '#aebfdd',
                    300: '#7e96c5',
                    400: '#5572a8',
                    500: '#3a5688',
                    600: '#2d4773',
                    700: '#25395c',
                    800: '#1e2e49',
                    900: '#18243a',
                    950: '#0f1726',
                    // Tokens semánticos para variantes (default/foreground)
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                // Tokens semánticos (sistema de diseño premium)
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                success: {
                    DEFAULT: 'hsl(var(--success))',
                    foreground: 'hsl(var(--success-foreground))',
                },
                warning: {
                    DEFAULT: 'hsl(var(--warning))',
                    foreground: 'hsl(var(--warning-foreground))',
                },
                info: {
                    DEFAULT: 'hsl(var(--info))',
                    foreground: 'hsl(var(--info-foreground))',
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
            },
            borderRadius: {
                sm: 'calc(var(--radius) - 2px)',
                md: 'calc(var(--radius) - 1px)',
                lg: 'var(--radius)',
                xl: 'calc(var(--radius) + 2px)',
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                sm: '0 1px 2px 0 rgb(12 14 18 / 0.04)',
                DEFAULT: '0 1px 2px 0 rgb(12 14 18 / 0.05), 0 1px 1px -1px rgb(12 14 18 / 0.04)',
                md: '0 2px 4px -1px rgb(12 14 18 / 0.06), 0 1px 2px -1px rgb(12 14 18 / 0.05)',
                lg: '0 8px 24px -6px rgb(12 14 18 / 0.12), 0 2px 6px -2px rgb(12 14 18 / 0.07)',
            },
            keyframes: {
                'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
                'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
            },
        },
    },
    plugins: [
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('tailwindcss-animate'),
    ],
};

export default config;
