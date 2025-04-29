import React from 'react';
import TreeNode from './TreeNode';
import styles from './TreeView.module.css';

interface TreeViewProps {
    data: unknown | null; // The parsed data to display
    initialExpansionState: boolean | null; // Prop from parent
    searchTerm: string; // Add search term prop
    currentResultPath: (string | number)[] | null; // Path of current search result
}

const TreeView: React.FC<TreeViewProps> = ({
    data,
    initialExpansionState,
    searchTerm,
    currentResultPath, // Receive prop
}) => {
    if (data === null || data === undefined) {
        return null; // Don't render anything if there's no data
    }

    // Determine if the root is an object or array to render appropriately
    const isRootArray = Array.isArray(data);
    const rootEntries = Object.entries(data as object | any[]);

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
                        />
                    );
                })
            )}
        </ul>
    );
};

export default TreeView;
