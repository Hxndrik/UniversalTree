import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { FiSun, FiMoon, FiMonitor, FiMoreVertical } from 'react-icons/fi'; // Added FiMonitor for system theme
import styles from './ThemeToggle.module.css'; // Import CSS module

const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme, resetToSystemTheme } = useTheme();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Handle click outside to close the menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setShowMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Simple toggle for the current theme
    const handleToggle = () => {
        toggleTheme();
    };

    return (
        <div className={styles.themeToggleContainer}>
            <button
                onClick={handleToggle}
                className={styles.themeToggleButton}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                ref={buttonRef}
            >
                {theme === 'light' ? <FiMoon /> : <FiSun />}
            </button>

            {/* Additional options button */}
            <button
                onClick={() => setShowMenu(!showMenu)}
                className={styles.themeOptionsButton}
                aria-label="Theme options"
            >
                <FiMoreVertical />
            </button>

            {/* Dropdown menu */}
            {showMenu && (
                <div className={styles.themeMenu} ref={menuRef}>
                    <button
                        className={`${styles.themeMenuItem} ${theme === 'light' ? styles.active : ''}`}
                        onClick={() => {
                            if (theme !== 'light') toggleTheme();
                            setShowMenu(false);
                        }}
                    >
                        <FiSun className={styles.themeIcon} /> Light
                    </button>

                    <button
                        className={`${styles.themeMenuItem} ${theme === 'dark' ? styles.active : ''}`}
                        onClick={() => {
                            if (theme !== 'dark') toggleTheme();
                            setShowMenu(false);
                        }}
                    >
                        <FiMoon className={styles.themeIcon} /> Dark
                    </button>

                    <button
                        className={styles.themeMenuItem}
                        onClick={() => {
                            resetToSystemTheme();
                            setShowMenu(false);
                        }}
                    >
                        <FiMonitor className={styles.themeIcon} /> System
                    </button>
                </div>
            )}
        </div>
    );
};

export default ThemeToggle;
