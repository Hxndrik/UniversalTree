import React, { useState, useEffect, useMemo, useRef, KeyboardEvent } from 'react'; // Add useRef and KeyboardEvent
import styles from './TreeNode.module.css';
import { FiChevronRight, FiChevronDown } from 'react-icons/fi'; // Icons for expand/collapse

// Helper to generate a unique ID for scrolling (must match OutputPane)
const generateNodeId = (path: (string | number)[]): string => {
    // Simple join, ensure keys/indices are valid for ID. Replace problematic chars.
    return `node-${path.map(p => String(p).replace(/[^a-zA-Z0-9_-]/g, '_')).join('-')}`;
};

// Recursive helper to check if a node or its children contain the search term
const checkIfContainsMatch = (value: unknown, searchTerm: string): boolean => {
    if (!searchTerm) return false;
    const lowerSearchTerm = searchTerm.toLowerCase();

    // Check primitive values
    if (value !== null && typeof value !== 'object') {
        return String(value).toLowerCase().includes(lowerSearchTerm);
    }
    // Recurse into objects and arrays
    else if (typeof value === 'object' && value !== null) {
        for (const [key, nestedValue] of Object.entries(value)) {
            // Check key (only if it's an object, not array index)
            if (!Array.isArray(value) && key.toLowerCase().includes(lowerSearchTerm)) {
                return true;
            }
            // Check nested value
            if (checkIfContainsMatch(nestedValue, searchTerm)) {
                return true;
            }
        }
    }
    return false;
};

interface TreeNodeProps {
    nodeKey?: string; // The key for this node (optional for array items)
    nodeValue: unknown; // The value of the node
    level: number; // Current nesting level (for styling/indentation)
    initialExpansionState: boolean | null; // Prop to control expansion
    searchTerm: string; // Add search term prop
    path: (string | number)[]; // Path to this node
    currentResultPath: (string | number)[] | null; // Path of current search result
    onValueChange?: (path: (string | number)[], newValue: unknown) => void; // Handler for value changes
    onKeyChange?: (path: (string | number)[], oldKey: string, newKey: string) => void; // Handler for key changes
    isKeyEditable?: boolean; // Whether the key can be edited (false for array indices)
}

const TreeNode: React.FC<TreeNodeProps> = ({
    nodeKey,
    nodeValue,
    level,
    initialExpansionState,
    searchTerm,
    path, // Receive path
    currentResultPath, // Receive current path
    onValueChange,
    onKeyChange,
    isKeyEditable = true, // Default to true for object keys
}) => {
    // Initialize state based on prop, default to true if prop is null (mixed/default)
    const [isExpanded, setIsExpanded] = useState(initialExpansionState ?? true);
    const nodeId = useMemo(() => generateNodeId(path), [path]); // Generate ID for scrolling

    // States for editing mode
    const [isEditingKey, setIsEditingKey] = useState(false);
    const [isEditingValue, setIsEditingValue] = useState(false);
    const [editedKey, setEditedKey] = useState(nodeKey || '');
    const [editedValue, setEditedValue] = useState('');

    // Refs for input elements
    const keyInputRef = useRef<HTMLInputElement>(null);
    const valueInputRef = useRef<HTMLInputElement>(null);

    const isObject = typeof nodeValue === 'object' && nodeValue !== null;
    const isArray = Array.isArray(nodeValue);
    const isExpandable = isObject || isArray;
    const entries = isExpandable ? Object.entries(nodeValue as object | any[]) : [];

    // Check if this node or its children contain a match (memoized)
    // This is used for auto-expansion
    const containsMatchInChildren = useMemo(() => {
        return checkIfContainsMatch(nodeValue, searchTerm);
    }, [nodeValue, searchTerm]);

    // Check if the node *itself* is a match (key or primitive value)
    const isDirectMatch = useMemo(() => {
        if (!searchTerm) return false;
        const lowerSearchTerm = searchTerm.toLowerCase();
        // Check key
        if (nodeKey && nodeKey.toLowerCase().includes(lowerSearchTerm)) return true;
        // Check primitive value
        if (nodeValue !== null && typeof nodeValue !== 'object') {
            return String(nodeValue).toLowerCase().includes(lowerSearchTerm);
        }
        return false;
    }, [nodeKey, nodeValue, searchTerm]);

    // Effect to handle global expansion state changes
    useEffect(() => {
        if (initialExpansionState !== null) {
            setIsExpanded(initialExpansionState);
        }
    }, [initialExpansionState]);

    // Effect for auto-expansion based on search term
    useEffect(() => {
        // If search is active and this node contains a match in its children (or is a direct match itself)
        // and it's expandable, force it to be expanded.
        if (searchTerm && (containsMatchInChildren || isDirectMatch) && isExpandable) {
            setIsExpanded(true);
        }
        // Note: We don't automatically collapse when search term is cleared.
        // User retains manual control unless global collapse is triggered.
    }, [searchTerm, containsMatchInChildren, isDirectMatch, isExpandable]);

    const toggleExpand = () => {
        if (isExpandable) {
            // Allow manual toggle, but the effect above might re-expand it if search is active
            setIsExpanded(!isExpanded);
        }
    };

    // Function to start editing a key
    const startEditingKey = (e: React.MouseEvent) => {
        if (!isKeyEditable || !nodeKey) return;
        e.stopPropagation();
        setIsEditingKey(true);
        setEditedKey(nodeKey);
        // Focus the input on the next render
        setTimeout(() => {
            keyInputRef.current?.focus();
            keyInputRef.current?.select();
        }, 0);
    };

    // Function to start editing a value
    const startEditingValue = (e: React.MouseEvent) => {
        if (isExpandable) return; // Don't allow editing of objects/arrays directly
        e.stopPropagation();
        setIsEditingValue(true);

        // Convert value to string for editing
        if (typeof nodeValue === 'string') {
            // For strings, don't add extra quotes in the edit field
            setEditedValue(nodeValue);
        } else {
            // For non-strings, convert to string representation
            setEditedValue(nodeValue === null ? '' : String(nodeValue));
        }

        // Focus the input on the next render
        setTimeout(() => {
            valueInputRef.current?.focus();
            valueInputRef.current?.select();
        }, 0);
    };

    // Function to save the edited key
    const saveKey = () => {
        if (editedKey.trim() === '' || !nodeKey || editedKey === nodeKey) {
            setIsEditingKey(false);
            return;
        }

        if (onKeyChange) {
            onKeyChange(path, nodeKey, editedKey.trim());
        }

        setIsEditingKey(false);
    };

    // Function to save the edited value
    const saveValue = () => {
        if (!onValueChange) {
            setIsEditingValue(false);
            return;
        }

        try {
            let parsedValue: unknown;

            // Check if the edit box is completely empty - convert to null
            if (editedValue === '') {
                parsedValue = null;
            }
            // Handle string values with explicit quotes
            else if (
                (editedValue.startsWith('"') && editedValue.endsWith('"')) ||
                (editedValue.startsWith("'") && editedValue.endsWith("'"))
            ) {
                // If user entered an explicitly quoted string, extract the content between quotes
                parsedValue = editedValue.slice(1, -1);
            }
            // Handle special literals
            else if (editedValue.toLowerCase() === 'null') {
                parsedValue = null;
            } else if (editedValue.toLowerCase() === 'true') {
                parsedValue = true;
            } else if (editedValue.toLowerCase() === 'false') {
                parsedValue = false;
            }
            // Handle numbers
            else {
                const numberValue = Number(editedValue);
                if (!isNaN(numberValue)) {
                    // Keep integer or decimal as appropriate
                    parsedValue = Number.isInteger(numberValue) ?
                        parseInt(editedValue, 10) : numberValue;
                }
                // Handle JSON objects/arrays
                else if (
                    (editedValue.startsWith('{') && editedValue.endsWith('}')) ||
                    (editedValue.startsWith('[') && editedValue.endsWith(']'))
                ) {
                    try {
                        parsedValue = JSON.parse(editedValue);
                    } catch (e) {
                        // If JSON parsing fails, treat as regular string
                        parsedValue = editedValue;
                    }
                }
                // Default to string for all other cases
                else {
                    parsedValue = editedValue;
                }
            }

            // Use the correct path when updating
            onValueChange(path, parsedValue);
        } catch (e) {
            console.error('Error parsing edited value:', e);
        }

        setIsEditingValue(false);
    };

    // Handle keyboard events in the input fields
    const handleKeyDown = (
        e: KeyboardEvent<HTMLInputElement>,
        saveFunction: () => void,
        cancelEditing: () => void
    ) => {
        if (e.key === 'Enter') {
            saveFunction();
        } else if (e.key === 'Escape') {
            cancelEditing();
        }
    };

    // Handler for blur events to save changes
    const handleBlur = () => {
        if (isEditingKey) {
            saveKey();
        }
        if (isEditingValue) {
            saveValue();
        }
    };

    // Helper function for highlighting matches
    const highlightMatches = (text: string): React.ReactNode => {
        if (!searchTerm || !text) {
            return text;
        }
        // Escape special regex characters in the search term
        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Ensure the search term is not empty after escaping (e.g., if it was just '.')
        if (!escapedSearchTerm) return text;

        const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
        const parts = String(text).split(regex);

        return parts.map((part, index) =>
            // Check if the part exactly matches the capturing group (case-insensitive)
            part.toLowerCase() === searchTerm.toLowerCase() ? (
                <span key={index} className={styles.highlight}>
                    {part}
                </span>
            ) : (
                part
            )
        );
    };

    // Check if the current node is the focused search result
    const isCurrentResult = useMemo(() => {
        if (!currentResultPath || !path) return false;
        // Compare stringified paths for reliable comparison of arrays
        return JSON.stringify(path) === JSON.stringify(currentResultPath);
    }, [path, currentResultPath]);

    const renderValue = () => {
        if (isEditingValue) {
            return (
                <input
                    ref={valueInputRef}
                    className={styles.editInput}
                    value={editedValue}
                    onChange={(e) => setEditedValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, saveValue, () => setIsEditingValue(false))}
                    onBlur={handleBlur}
                />
            );
        }

        const valueStr = String(nodeValue);
        // Highlight the value itself if it's primitive and matches
        const highlightedValue = (typeof nodeValue !== 'object' || nodeValue === null)
            ? highlightMatches(valueStr)
            : valueStr; // Don't highlight object/array placeholders here

        if (isArray) {
            return <span className={styles.nodeValueArray}>Array({entries.length})</span>;
        }
        if (isObject) {
            return <span className={styles.nodeValueObject}>Object({entries.length})</span>;
        }

        // Apply highlighting to primitive values - make them double-clickable for editing
        if (typeof nodeValue === 'string') {
            return <span className={styles.nodeValueString} onDoubleClick={startEditingValue}>"{highlightedValue}"</span>;
        }
        if (typeof nodeValue === 'number') {
            return <span className={styles.nodeValueNumber} onDoubleClick={startEditingValue}>{highlightedValue}</span>;
        }
        if (typeof nodeValue === 'boolean') {
            return <span className={styles.nodeValueBoolean} onDoubleClick={startEditingValue}>{highlightedValue}</span>;
        }
        if (nodeValue === null) {
            return <span className={styles.nodeValueNull} onDoubleClick={startEditingValue}>null</span>;
        }

        // Fallback for other types
        return <span className={styles.nodeValue} onDoubleClick={startEditingValue}>{highlightedValue}</span>;
    };

    // Combine classes for the node content div
    const nodeContentClasses = [
        styles.nodeContent,
        isCurrentResult ? styles.currentHighlight : '' // Apply highlight class if this is the current result
    ].filter(Boolean).join(' ');

    return (
        <li id={nodeId} className={styles.treeNode} style={{ marginLeft: `${level > 0 ? 1.5 : 0}em` }}>
            <div className={nodeContentClasses} onClick={isEditingKey || isEditingValue ? undefined : toggleExpand}>
                <span className={styles.toggleButton}>
                    {isExpandable && (isExpanded ? <FiChevronDown /> : <FiChevronRight />)}
                </span>

                {/* Render the key with editing capability */}
                {nodeKey && (
                    isEditingKey ? (
                        <span className={styles.nodeKeyEdit}>
                            <input
                                ref={keyInputRef}
                                className={styles.editInput}
                                value={editedKey}
                                onChange={(e) => setEditedKey(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, saveKey, () => setIsEditingKey(false))}
                                onBlur={handleBlur}
                            />:
                        </span>
                    ) : (
                        <span
                            className={styles.nodeKey}
                            onDoubleClick={isKeyEditable ? startEditingKey : undefined}
                            style={isKeyEditable ? { cursor: 'pointer' } : undefined}
                        >
                            {highlightMatches(nodeKey)}:
                        </span>
                    )
                )}

                {/* Render value (potentially highlighted) or Object/Array placeholder */}
                {!isExpandable || !isExpanded ? renderValue() : (
                    isArray ? (
                        <span className={styles.nodeValueArray}>Array</span>
                    ) : (
                        <span className={styles.nodeValueObject}>Object</span>
                    )
                )}
            </div>

            {isExpandable && isExpanded && (
                <ul className={styles.treeView}>
                    {entries.map(([key, value], index) => {
                        const childKey = isArray ? index : key;
                        const childPath = [...path, childKey]; // Construct path for child
                        return (
                            <TreeNode
                                key={childKey}
                                nodeKey={String(childKey)}
                                nodeValue={value}
                                level={level + 1}
                                initialExpansionState={initialExpansionState}
                                searchTerm={searchTerm}
                                path={childPath}
                                currentResultPath={currentResultPath}
                                onValueChange={onValueChange}
                                onKeyChange={onKeyChange}
                                isKeyEditable={!isArray} // Array indices aren't editable
                            />
                        );
                    })}
                </ul>
            )}
        </li>
    );
};

export default TreeNode;
