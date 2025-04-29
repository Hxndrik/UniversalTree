import React, { useState, useEffect, useCallback } from 'react'; // Import hooks
import styles from './OutputPane.module.css'; // Import CSS Module
import TreeView from './TreeView'; // Import TreeView
import SearchBar from './SearchBar'; // Import SearchBar
import { FiMaximize, FiMinimize } from 'react-icons/fi'; // Icons for buttons

// Helper to generate a unique ID for scrolling
const generateNodeId = (path: (string | number)[]): string => {
    // Simple join, ensure keys/indices are valid for ID. Replace problematic chars.
    return `node-${path.map(p => String(p).replace(/[^a-zA-Z0-9_-]/g, '_')).join('-')}`;
};

// Recursive function to find all paths matching the search term
const findResultsRecursive = (
    value: unknown,
    searchTerm: string,
    currentPath: (string | number)[] = []
): Array<{ path: (string | number)[] }> => {
    let results: Array<{ path: (string | number)[] }> = [];
    if (!searchTerm) return results; // No search term, no results

    const lowerSearchTerm = searchTerm.toLowerCase();

    // Check if the current node's key matches (if it's part of an object, NOT an array index)
    const currentKey = currentPath[currentPath.length - 1];
    // Check if currentKey exists and is NOT a number (simple check for array index)
    if (currentKey !== undefined && typeof currentKey !== 'number' && String(currentKey).toLowerCase().includes(lowerSearchTerm)) {
        // A match in the key means the node itself should be highlighted/navigable
        results.push({ path: currentPath });
    }

    // Check primitive values
    if (value !== null && typeof value !== 'object') {
        if (String(value).toLowerCase().includes(lowerSearchTerm)) {
            results.push({ path: currentPath });
        }
    }
    // Recurse into objects and arrays
    else if (typeof value === 'object' && value !== null) {
        for (const [key, nestedValue] of Object.entries(value)) {
            // Determine the correct path segment (index for array, key for object)
            const pathSegment = Array.isArray(value) ? parseInt(key, 10) : key;
            const newPath = [...currentPath, pathSegment];
            results = results.concat(findResultsRecursive(nestedValue, searchTerm, newPath));
        }
    }

    // Deduplicate results based on path string (important if key and value match)
    const uniquePaths = new Set<string>();
    const uniqueResults = results.filter(result => {
        const pathString = JSON.stringify(result.path);
        if (!uniquePaths.has(pathString)) {
            uniquePaths.add(pathString);
            return true;
        }
        return false;
    });

    return uniqueResults;
};


// Define the props based on the useParser hook result
interface OutputPaneProps {
    data: unknown | null;
    error: string | null; // Error is handled in App.tsx for now, but pass it in case needed here later
    inputType: 'json' | 'xml' | 'unknown' | 'empty';
    searchTerm: string; // Add search term prop
    onSearchChange: (term: string) => void; // Add search change handler prop
    onDataChange?: (newData: unknown) => void; // Add handler for data changes
    // Update ref type to match usage in App.tsx
    searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

const OutputPane: React.FC<OutputPaneProps> = ({
    data,
    error,
    inputType,
    searchTerm,
    onSearchChange,
    onDataChange,
    searchInputRef,
}) => {
    const [isAllExpanded, setIsAllExpanded] = useState<boolean | null>(null); // null: mixed/default, true: all expanded, false: all collapsed
    const [searchResults, setSearchResults] = useState<Array<{ path: (string | number)[] }>>([]);
    const [currentResultIndex, setCurrentResultIndex] = useState<number>(-1);

    const expandAll = () => setIsAllExpanded(true);
    const collapseAll = () => {
        setIsAllExpanded(false);
        // If collapsing all during a search, clear the search focus
        // setCurrentResultIndex(-1); // Optional: Decide if collapse should reset focus
    };

    // Effect to find results when data or search term changes
    useEffect(() => {
        if (searchTerm && data) {
            const results = findResultsRecursive(data, searchTerm);
            setSearchResults(results);
            setCurrentResultIndex(results.length > 0 ? 0 : -1); // Focus first result or none
        } else {
            setSearchResults([]);
            setCurrentResultIndex(-1);
        }
        // When search term changes, reset manual expansion control?
        // setIsAllExpanded(null); // Let auto-expand handle it
    }, [data, searchTerm]);

    // Effect to scroll to the current result
    useEffect(() => {
        if (currentResultIndex !== -1 && searchResults[currentResultIndex]) {
            const currentPath = searchResults[currentResultIndex].path;
            const nodeId = generateNodeId(currentPath);
            const element = document.getElementById(nodeId);
            element?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest', // 'center', 'start', 'end', 'nearest'
                inline: 'nearest',
            });
            // Optionally add a temporary highlight class here too
            // element?.classList.add(styles.currentHighlightScroll); // Need to define this style
            // setTimeout(() => element?.classList.remove(styles.currentHighlightScroll), 1000);
        }
    }, [currentResultIndex, searchResults]);


    // Navigation handlers
    const handleNext = useCallback(() => {
        setCurrentResultIndex((prevIndex) => {
            if (searchResults.length === 0) return -1;
            return (prevIndex + 1) % searchResults.length;
        });
    }, [searchResults.length]);

    const handlePrevious = useCallback(() => {
        setCurrentResultIndex((prevIndex) => {
            if (searchResults.length === 0) return -1;
            return (prevIndex - 1 + searchResults.length) % searchResults.length;
        });
    }, [searchResults.length]);

    // Determine the path of the currently highlighted node for TreeNode styling
    const currentResultPath = currentResultIndex !== -1 && searchResults[currentResultIndex]
        ? searchResults[currentResultIndex].path
        : null;

    // Handler for tree data changes
    const handleTreeDataChange = useCallback(
        (newData: unknown) => {
            if (onDataChange) {
                onDataChange(newData);
            }
        },
        [onDataChange]
    );

    const renderContent = () => {
        if (inputType === 'empty') {
            return <div className={styles.placeholder}>Output will appear here...</div>;
        }
        if (error) {
            // Error is displayed globally in App.tsx, show a simpler message here
            return <div className={styles.placeholder}>Invalid input</div>;
        }
        if (data) {
            // Render the TreeView component, passing expansion state and search term
            return (
                <TreeView
                    data={data}
                    initialExpansionState={isAllExpanded}
                    searchTerm={searchTerm}
                    currentResultPath={currentResultPath} // Pass current path for highlight
                    onChange={handleTreeDataChange} // Pass down the change handler
                />
            );
        }
        // Input is valid but data is null/undefined
        return <div className={styles.placeholder}>No data to display</div>;
    };

    return (
        <div className={styles.outputPane}>
            <h2 className={styles.title}>Output Tree</h2>
            <div className={styles.controls}>
                <SearchBar
                    searchTerm={searchTerm}
                    onSearchChange={onSearchChange}
                    placeholder="Search tree..."
                    resultCount={searchResults.length}
                    currentResultIndex={currentResultIndex}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                    inputRef={searchInputRef}
                />
                <div className={styles.buttonGroup}> {/* Group buttons */}
                    <button onClick={expandAll} title="Expand All" className={styles.controlButton}>
                        <FiMaximize />
                    </button>
                    <button onClick={collapseAll} title="Collapse All" className={styles.controlButton}>
                        <FiMinimize />
                    </button>
                </div>
            </div>
            <div className={styles.treeContainer}>
                {renderContent()}
            </div>
        </div>
    );
};

export default OutputPane;
