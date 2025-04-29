import React from 'react';
import styles from './SearchBar.module.css';
import { FiSearch, FiX, FiChevronUp, FiChevronDown } from 'react-icons/fi'; // Import icons

interface SearchBarProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    placeholder?: string;
    resultCount?: number; // Total number of results found
    currentResultIndex?: number; // Index of the currently focused result (0-based)
    onNext?: () => void; // Callback for next result
    onPrevious?: () => void; // Callback for previous result
    inputRef?: React.RefObject<HTMLInputElement | null>; // Update ref type to match App.tsx
}

const SearchBar: React.FC<SearchBarProps> = ({
    searchTerm,
    onSearchChange,
    placeholder = 'Search...', // Default placeholder
    resultCount = 0, // Default to 0
    currentResultIndex = -1, // Default to -1 (no focus)
    onNext,
    onPrevious,
    inputRef, // Accept the ref from parent
}) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onSearchChange(event.target.value);
    };

    const handleClear = () => {
        onSearchChange('');
    };

    // Handle Enter key press
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission or line break
            if (onNext) {
                onNext(); // Trigger the next action
            }
        }
    };

    const showResults = searchTerm && resultCount > 0;
    const canNavigate = resultCount > 1;

    return (
        <div className={styles.searchBarContainer}>
            <FiSearch className={styles.searchIcon} />
            <input
                type="text"
                className={styles.searchInput}
                value={searchTerm}
                onChange={handleChange}
                onKeyDown={handleKeyDown} // Add keydown handler
                placeholder={placeholder}
                ref={inputRef} // Attach ref to input element
            />
            {searchTerm && (
                <button onClick={handleClear} className={`${styles.controlButton} ${styles.clearButton}`} aria-label="Clear search">
                    <FiX />
                </button>
            )}
            {showResults && (
                <span className={styles.resultCount}>
                    {currentResultIndex + 1}/{resultCount}
                </span>
            )}
            {canNavigate && onPrevious && (
                <button onClick={onPrevious} className={styles.controlButton} aria-label="Previous result">
                    <FiChevronUp />
                </button>
            )}
            {canNavigate && onNext && (
                <button onClick={onNext} className={styles.controlButton} aria-label="Next result">
                    <FiChevronDown />
                </button>
            )}
        </div>
    );
};

export default SearchBar;
