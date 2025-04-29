import React, { createContext, useState, useContext, useMemo, ReactNode } from 'react';

interface JavaScriptSafetyContextProps {
    jsEnabled: boolean;
    toggleJsEnabled: () => void;
}

const JavaScriptSafetyContext = createContext<JavaScriptSafetyContextProps | undefined>(undefined);

// localStorage key
const JS_ENABLED_KEY = 'universal-tree-js-enabled';

interface JavaScriptSafetyProviderProps {
    children: ReactNode;
}

export const JavaScriptSafetyProvider: React.FC<JavaScriptSafetyProviderProps> = ({ children }) => {
    // Initialize from localStorage, defaulting to false (disabled) for security
    const [jsEnabled, setJsEnabled] = useState<boolean>(() => {
        const savedPreference = localStorage.getItem(JS_ENABLED_KEY);
        return savedPreference === 'true' ? true : false;
    });

    // Toggle JavaScript enabled state
    const toggleJsEnabled = () => {
        setJsEnabled(prevState => {
            const newState = !prevState;
            localStorage.setItem(JS_ENABLED_KEY, String(newState));
            return newState;
        });
    };

    const value = useMemo(() => ({
        jsEnabled,
        toggleJsEnabled
    }), [jsEnabled]);

    return <JavaScriptSafetyContext.Provider value={value}>{children}</JavaScriptSafetyContext.Provider>;
};

export const useJavaScriptSafety = (): JavaScriptSafetyContextProps => {
    const context = useContext(JavaScriptSafetyContext);
    if (context === undefined) {
        throw new Error('useJavaScriptSafety must be used within a JavaScriptSafetyProvider');
    }
    return context;
};