import React, { useState, useEffect, useMemo } from 'react'; // Add useMemo
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
}

const TreeNode: React.FC<TreeNodeProps> = ({
  nodeKey,
  nodeValue,
  level,
  initialExpansionState,
  searchTerm,
  path, // Receive path
  currentResultPath, // Receive current path
}) => {
  // Initialize state based on prop, default to true if prop is null (mixed/default)
  const [isExpanded, setIsExpanded] = useState(initialExpansionState ?? true);
  const nodeId = useMemo(() => generateNodeId(path), [path]); // Generate ID for scrolling

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
    // Apply highlighting to primitive values
    if (typeof nodeValue === 'string') {
      // Add quotes manually around the highlighted parts if needed, or adjust styling
      return <span className={styles.nodeValueString}>"{highlightedValue}"</span>; // Add quotes for strings
    }
    if (typeof nodeValue === 'number') {
      return <span className={styles.nodeValueNumber}>{highlightedValue}</span>;
    }
    if (typeof nodeValue === 'boolean') {
      return <span className={styles.nodeValueBoolean}>{highlightedValue}</span>;
    }
    if (nodeValue === null) {
      return <span className={styles.nodeValueNull}>null</span>; // Typically don't highlight 'null'
    }
    // Fallback for other types (undefined, symbol, etc.) - highlight the string representation
    return <span className={styles.nodeValue}>{highlightedValue}</span>;
  };

  // Combine classes for the node content div
  const nodeContentClasses = [
      styles.nodeContent,
      isCurrentResult ? styles.currentHighlight : '' // Apply highlight class if this is the current result
  ].filter(Boolean).join(' ');

  return (
    // Add the generated ID to the li element
    <li id={nodeId} className={styles.treeNode} style={{ marginLeft: `${level > 0 ? 1.5 : 0}em` }}>
      <div className={nodeContentClasses} onClick={toggleExpand}>
        <span className={styles.toggleButton}> {/* Removed expanded class here, icon handles it */}
          {isExpandable && (isExpanded ? <FiChevronDown /> : <FiChevronRight />)}
        </span>
        {/* Highlight the key if it exists and matches */}
        {nodeKey && <span className={styles.nodeKey}>{highlightMatches(nodeKey)}:</span>}
        {/* Render value (potentially highlighted) or Object/Array placeholder */}
        {!isExpandable || !isExpanded ? renderValue() : (isArray ? <span className={styles.nodeValueArray}>Array</span> : <span className={styles.nodeValueObject}>Object</span>)}
      </div>
      {isExpandable && isExpanded && (
        <ul className={styles.treeView}> {/* Use treeView class for nested list */}
          {entries.map(([key, value], index) => {
             const childKey = isArray ? index : key;
             const childPath = [...path, childKey]; // Construct path for child
             return (
               <TreeNode
                 key={childKey}
                 nodeKey={String(childKey)} // Always pass key/index as string
                 nodeValue={value}
                 level={level + 1}
                 initialExpansionState={initialExpansionState} // Pass down the global state
                 searchTerm={searchTerm} // Pass down search term
                 path={childPath} // Pass down the constructed path
                 currentResultPath={currentResultPath} // Pass down current path
               />
             );
          })}
        </ul>
      )}
    </li>
  );
};

export default TreeNode;
