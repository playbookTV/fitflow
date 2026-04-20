import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-dm-sans)", "Helvetica Neue", "sans-serif"],
                mono: ["var(--font-ibm-plex-mono)", "Menlo", "monospace"],
                display: ["var(--font-newsreader)", "Georgia", "serif"],
            },
            colors: {
                bg: {
                    primary: "#0a0a0b",
                    secondary: "#111113",
                    card: "#151518",
                    hover: "#1a1a1e",
                    elevated: "#1e1e22",
                },
                border: {
                    DEFAULT: "#1f1f24",
                    hover: "#2a2a30",
                    accent: "#333338",
                },
                text: {
                    primary: "#f0f0f0",
                    secondary: "#a0a0a5",
                    faint: "#606065",
                    muted: "#404045",
                },
                brand: {
                    green: "#25D366",
                    "green-muted": "#1a9e4a",
                    "green-dim": "rgba(37,211,102,0.08)",
                    "green-glow": "rgba(37,211,102,0.15)",
                    "green-border": "rgba(37,211,102,0.30)",
                    blue: "#4E97F8",
                    "blue-dim": "rgba(78,151,248,0.08)",
                    "blue-glow": "rgba(78,151,248,0.15)",
                    "blue-border": "rgba(78,151,248,0.30)",
                    orange: "#F0853A",
                    "orange-dim": "rgba(240,133,58,0.08)",
                    "orange-glow": "rgba(240,133,58,0.15)",
                    "orange-border": "rgba(240,133,58,0.30)",
                    violet: "#9D7CF4",
                    "violet-dim": "rgba(157,124,244,0.08)",
                    "violet-glow": "rgba(157,124,244,0.15)",
                    "violet-border": "rgba(157,124,244,0.30)",
                    red: "#EF5350",
                    "red-dim": "rgba(239,83,80,0.08)",
                    "red-glow": "rgba(239,83,80,0.15)",
                    "red-border": "rgba(239,83,80,0.30)",
                    cyan: "#26C6DA",
                    "cyan-dim": "rgba(38,198,218,0.08)",
                    "cyan-glow": "rgba(38,198,218,0.15)",
                    "cyan-border": "rgba(38,198,218,0.30)",
                    telegram: "#2AABEE",
                },
            },
            borderRadius: {
                "2xl": "1rem",
                "3xl": "1.5rem",
                "4xl": "2rem",
            },
            boxShadow: {
                glow: "0 0 20px rgba(37,211,102,0.15)",
                "glow-lg": "0 0 40px rgba(37,211,102,0.20)",
                "glow-blue": "0 0 20px rgba(78,151,248,0.15)",
                "glow-violet": "0 0 20px rgba(157,124,244,0.15)",
                "glow-orange": "0 0 20px rgba(240,133,58,0.15)",
                "glow-cyan": "0 0 20px rgba(38,198,218,0.15)",
                "glow-red": "0 0 20px rgba(239,83,80,0.15)",
                card: "0 4px 24px rgba(0,0,0,0.4)",
                "card-hover": "0 8px 32px rgba(0,0,0,0.5)",
                inner: "inset 0 1px 0 rgba(255,255,255,0.05)",
                "inner-glow": "inset 0 0 20px rgba(37,211,102,0.05)",
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "mesh-gradient": "linear-gradient(135deg, #0a0a0b 0%, #111118 50%, #0a0a0b 100%)",
                "card-gradient": "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)",
                "glass": "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                "glow-gradient": "radial-gradient(ellipse at center, rgba(37,211,102,0.15) 0%, transparent 70%)",
            },
            animation: {
                "fade-in": "fadeIn 0.3s ease-out",
                "fade-out": "fadeOut 0.15s ease-in",
                "slide-up": "slideUp 0.2s ease-out",
                "slide-down": "slideDown 0.2s ease-out",
                "scale-in": "scaleIn 0.2s ease-out",
                "scale-out": "scaleOut 0.15s ease-in",
                "pulse-glow": "pulseGlow 2s ease-in-out infinite",
                "shimmer": "shimmer 2s linear infinite",
                "float": "float 3s ease-in-out infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(8px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                slideDown: {
                    "0%": { opacity: "0", transform: "translateY(-8px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                scaleIn: {
                    "0%": { opacity: "0", transform: "scale(0.95)" },
                    "100%": { opacity: "1", transform: "scale(1)" },
                },
                fadeOut: {
                    "0%": { opacity: "1" },
                    "100%": { opacity: "0" },
                },
                scaleOut: {
                    "0%": { opacity: "1", transform: "scale(1)" },
                    "100%": { opacity: "0", transform: "scale(0.95)" },
                },
                pulseGlow: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.6" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-4px)" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
