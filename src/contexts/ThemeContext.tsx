import React, { createContext, useState, useContext, useMemo, ReactNode, useEffect } from 'react';

type Theme = 'light' | 'dark';
type ThemeSource = 'system' | 'user'; // Track where the theme setting came from

interface ThemeContextProps {
    theme: Theme;
    toggleTheme: () => void;
    resetToSystemTheme: () => void; // Add function to reset to system preference
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

// localStorage keys
const THEME_KEY = 'universal-tree-theme';
const THEME_SOURCE_KEY = 'universal-tree-theme-source';

// Helper to detect system theme preference
const getSystemTheme = (): Theme => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
};

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    // Read from localStorage - our preload script already handled initial theme application
    const getInitialTheme = (): Theme => {
        // The preload script already saved the theme to localStorage
        const savedTheme = localStorage.getItem(THEME_KEY) as Theme;
        return savedTheme === 'dark' ? 'dark' : 'light'; // Default to light if null
    };

    const [theme, setTheme] = useState<Theme>(getInitialTheme);
    const [themeSource, setThemeSource] = useState<ThemeSource>(
        localStorage.getItem(THEME_SOURCE_KEY) as ThemeSource || 'system'
    );

    // Toggle between light and dark theme with user preference
    const toggleTheme = () => {
        setTheme((prevTheme) => {
            const newTheme = prevTheme === 'light' ? 'dark' : 'light';
            // Save to localStorage
            localStorage.setItem(THEME_KEY, newTheme);
            localStorage.setItem(THEME_SOURCE_KEY, 'user');
            setThemeSource('user');
            return newTheme;
        });
    };

    // Reset to system theme
    const resetToSystemTheme = () => {
        const systemTheme = getSystemTheme();
        setTheme(systemTheme);
        setThemeSource('system');
        localStorage.setItem(THEME_KEY, systemTheme);
        localStorage.setItem(THEME_SOURCE_KEY, 'system');
    };

    // Listen for system theme changes if using system preference
    useEffect(() => {
        if (themeSource !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        // Initial check
        setTheme(mediaQuery.matches ? 'dark' : 'light');

        // Add listener for theme changes
        const handleChange = (e: MediaQueryListEvent) => {
            setTheme(e.matches ? 'dark' : 'light');
        };

        // Add event listener with modern API
        try {
            mediaQuery.addEventListener('change', handleChange);
        } catch (e) {
            // Fallback for older browsers
            mediaQuery.addListener(handleChange);
        }

        // Clean up
        return () => {
            try {
                mediaQuery.removeEventListener('change', handleChange);
            } catch (e) {
                // Fallback for older browsers
                mediaQuery.removeListener(handleChange);
            }
        };
    }, [themeSource]);

    // Apply theme to HTML element
    useEffect(() => {
        const html = document.documentElement;

        // Remove previous theme classes
        html.classList.remove('light-mode', 'dark-mode');

        // Add new theme class
        const themeClass = theme === 'light' ? 'light-mode' : 'dark-mode';
        html.classList.add(themeClass);

        // Save current theme to localStorage even when system-determined
        localStorage.setItem(THEME_KEY, theme);

        // Enable transitions after a delay
        const timeoutId = setTimeout(() => {
            html.classList.add('theme-transitions-enabled');
        }, 300); // Short delay to ensure no transition on first render

        return () => {
            clearTimeout(timeoutId);
        };
    }, [theme]);

    const value = useMemo(() => ({
        theme,
        toggleTheme,
        resetToSystemTheme
    }), [theme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextProps => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
