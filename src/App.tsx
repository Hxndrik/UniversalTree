import { useState, useEffect, useRef, useCallback } from 'react'; // Add useCallback
import InputPane from './components/InputPane';
import OutputPane from './components/OutputPane';
import ThemeToggle from './components/ThemeToggle'; // Import ThemeToggle
import { useParser } from './hooks/useParser'; // Import the hook
import styles from './App.module.css'; // Import the CSS module

// Default JSON content
const defaultJsonInput = `{
  "name": "Universal Tree App",
  "version": "1.0.0",
  "features": [
    "JSON Parsing",
    "XML Parsing",
    "Tree View",
    "Theming",
    "Search"
  ],
  "config": {
    "darkMode": true,
    "fontSize": 14,
    "settings": null
  }
}`;

const App: React.FC = () => { // Add React.FC type
    const [rawInput, setRawInput] = useState<string>(defaultJsonInput); // Initialize with default JSON
    const { data: parsedData, error: parseError, inputType } = useParser(rawInput); // Use the parser hook
    const [inputSearchTerm, setInputSearchTerm] = useState<string>(''); // State for input search
    const [outputSearchTerm, setOutputSearchTerm] = useState<string>(''); // State for output search

    // Flag to prevent infinite update loops when syncing data changes
    const isUpdatingFromOutput = useRef(false);

    // Fix ref types
    const inputSearchRef = useRef<HTMLInputElement>(null);
    const outputSearchRef = useRef<HTMLInputElement>(null);
    const inputTextAreaRef = useRef<HTMLTextAreaElement>(null);

    // Handler for data changes from the output pane
    const handleDataChange = useCallback((newData: unknown) => {
        // Prevent infinite loops by setting a flag
        isUpdatingFromOutput.current = true;

        try {
            // Convert modified data back to formatted JSON
            const formattedJson = JSON.stringify(newData, null, 2);
            // Update the input text
            setRawInput(formattedJson);
        } catch (error) {
            console.error('Error converting updated data to JSON:', error);
        } finally {
            // Reset the flag
            setTimeout(() => {
                isUpdatingFromOutput.current = false;
            }, 0);
        }
    }, []);

    // Handler for Ctrl+F keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Check if it's Ctrl+F (or Command+F on Mac)
            if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                event.preventDefault(); // Prevent browser's native search

                // Determine which search to focus based on current focus
                const activeElement = document.activeElement;

                // If focus is in the input textarea or its search bar, focus the input search
                if (inputTextAreaRef.current === activeElement ||
                    (activeElement && inputSearchRef.current && inputSearchRef.current.contains(activeElement))) {
                    inputSearchRef.current?.focus();
                }
                // Otherwise focus the output search by default
                else {
                    outputSearchRef.current?.focus();
                }
            }
        };

        // Add event listener
        document.addEventListener('keydown', handleKeyDown);

        // Clean up
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Main layout adjustments for header and error message
    return (
        <div className={styles.appContainer}>
            {/* Header Section */}
            <div className={styles.header}>
                <h1 className={styles.title}>Universal Tree</h1>
                <ThemeToggle /> {/* ThemeToggle positioning might need adjustment in its own CSS */}
            </div>

            {/* Main Content Panes */}
            <div className={styles.mainContent}>
                <InputPane
                    inputValue={rawInput}
                    onInputChange={setRawInput}
                    searchTerm={inputSearchTerm}
                    onSearchChange={setInputSearchTerm}
                    searchInputRef={inputSearchRef} // Pass the ref
                    textAreaRef={inputTextAreaRef} // Pass textarea ref
                />
                <OutputPane
                    data={parsedData}
                    error={parseError}
                    inputType={inputType}
                    searchTerm={outputSearchTerm}
                    onSearchChange={setOutputSearchTerm}
                    searchInputRef={outputSearchRef} // Pass the ref
                    onDataChange={handleDataChange} // Add data change handler
                />
            </div>

            {/* Error Display Area */}
            {parseError && (
                <div className={styles.errorMessage}>
                    <strong>Parsing Error:</strong> {parseError}
                </div>
            )}
        </div>
    );
}

export default App;
