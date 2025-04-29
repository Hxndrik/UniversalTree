import React from 'react';
import TreeNode from './TreeNode';
import styles from './TreeView.module.css';

interface TreeViewProps {
    data: unknown | null; // The parsed data to display
    initialExpansionState: boolean | null; // Prop from parent
    searchTerm: string; // Add search term prop
    currentResultPath: (string | number)[] | null; // Path of current search result
    onChange?: (newData: unknown) => void; // Add onChange handler for updating data
}

const TreeView: React.FC<TreeViewProps> = ({
    data,
    initialExpansionState,
    searchTerm,
    currentResultPath, // Receive prop
    onChange, // Receive onChange handler
}) => {
    if (data === null || data === undefined) {
        return null; // Don't render anything if there's no data
    }

    // Determine if the root is an object or array to render appropriately
    const isRootArray = Array.isArray(data);
    const rootEntries = Object.entries(data as object | any[]);

    // Handler to update data when an item changes
    const handleNodeChange = (path: (string | number)[], newValue: unknown) => {
        if (!onChange) return; // Exit if no handler provided

        // Create a deep copy of the data to avoid direct mutations
        const newData = JSON.parse(JSON.stringify(data));

        // Navigate to the parent of the changed node
        let current = newData;
        const lastIdx = path.length - 1;

        // Traverse to the parent of the node to update
        for (let i = 0; i < lastIdx; i++) {
            current = current[path[i]];
        }

        // Update the value at the final path segment
        current[path[lastIdx]] = newValue;

        // Call the parent handler with the updated data
        onChange(newData);
    };

    // Handler to rename a key in an object
    const handleKeyChange = (path: (string | number)[], oldKey: string, newKey: string) => {
        if (!onChange || oldKey === newKey) return; // Exit if no change or no handler

        // Create a deep copy of the data
        const newData = JSON.parse(JSON.stringify(data));

        // For nested properties, path contains all segments to reach the property
        // The oldKey is the actual key name to change, not part of the path

        // Navigate to the parent object that contains the key we want to rename
        let current = newData;

        // If we're at the root level (path length is 1), then the parent is the root
        if (path.length === 1) {
            // Handle root level key rename
            if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
                const value = current[oldKey];
                delete current[oldKey];
                current[newKey] = value;
            }
        } else {
            // For nested objects, navigate to the parent
            let parent = current;
            let i = 0;

            // Navigate through all but the last path segment
            // The last segment is the one we want to rename
            while (i < path.length - 1) {
                parent = current;
                current = current[path[i]];
                i++;
            }

            // Now current is the object containing our key, and the last path segment is the old key
            if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
                // Store the value to preserve it
                const value = current[oldKey];

                // Create a new object to maintain order of keys
                const newObj: Record<string, unknown> = {};

                // Add all keys, replacing the old one with the new one
                for (const key of Object.keys(current)) {
                    if (key === oldKey) {
                        newObj[newKey] = value;
                    } else {
                        newObj[key] = current[key];
                    }
                }

                // Replace the entire object in the parent
                parent[path[i - 1]] = newObj;
            }
        }

        // Call the parent handler with the updated data
        onChange(newData);
    };

    return (
        <ul className={styles.treeView}>
            {isRootArray ? (
                // If root is array, render each item as a node, passing index as the key
                rootEntries.map(([indexStr, value]) => {
                    const index = parseInt(indexStr, 10);
                    const path = [index]; // Path for this root array item
                    return (
                        <TreeNode
                            key={index}
                            nodeKey={String(index)} // Pass index as string for the key display
                            nodeValue={value}
                            level={0} // Start at level 0
                            initialExpansionState={initialExpansionState} // Pass down
                            searchTerm={searchTerm} // Pass down search term
                            path={path} // Pass down path
                            currentResultPath={currentResultPath} // Pass down current path
                            onValueChange={handleNodeChange} // Pass down value change handler
                            onKeyChange={handleKeyChange} // Pass down key change handler
                            isKeyEditable={false} // Array indices aren't editable
                        />
                    );
                })
            ) : (
                // If root is object, iterate through top-level keys
                rootEntries.map(([key, value]) => {
                    const path = [key]; // Path for this root object item
                    return (
                        <TreeNode
                            key={key}
                            nodeKey={key}
                            nodeValue={value}
                            level={0} // Start at level 0
                            initialExpansionState={initialExpansionState} // Pass down
                            searchTerm={searchTerm} // Pass down search term
                            path={path} // Pass down path
                            currentResultPath={currentResultPath} // Pass down current path
                            onValueChange={handleNodeChange} // Pass down value change handler
                            onKeyChange={handleKeyChange} // Pass down key change handler
                            isKeyEditable={true} // Object keys are editable
                        />
                    );
                })
            )}
        </ul>
    );
};

export default TreeView;
