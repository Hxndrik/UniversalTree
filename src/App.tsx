import { useState, useEffect, useRef, useCallback } from 'react'; // Add useCallback
import InputPane from './components/InputPane';
import OutputPane from './components/OutputPane';
import ThemeToggle from './components/ThemeToggle'; // Import ThemeToggle
import { useParser } from './hooks/useParser'; // Import the hook
import styles from './App.module.css'; // Import the CSS module
import { JavaScriptSafetyProvider } from './contexts/JavaScriptSafetyContext';

// Default JSON content
const defaultJsonInput = `{
  "name": "Universal Tree App",
  "version": "1.0.0",
  "features": [
    "JSON Parsing",
    "XML Parsing",
    "HTML Rendering",
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

// LocalStorage key for saving input data
const STORAGE_KEY = 'universal-tree-input';

// Helper function to get saved input from localStorage
const getSavedInput = (): string => {
    try {
        const savedInput = localStorage.getItem(STORAGE_KEY);
        return savedInput ? savedInput : defaultJsonInput;
    } catch (error) {
        console.error('Error retrieving saved input:', error);
        return defaultJsonInput;
    }
};

const App: React.FC = () => { // Add React.FC type
    // Initialize with saved input from localStorage or default JSON
    const [rawInput, setRawInput] = useState<string>(getSavedInput());
    const { data: parsedData, error: parseError, inputType, rawContent } = useParser(rawInput); // Use the parser hook
    const [inputSearchTerm, setInputSearchTerm] = useState<string>(''); // State for input search
    const [outputSearchTerm, setOutputSearchTerm] = useState<string>(''); // State for output search

    // Flag to prevent infinite update loops when syncing data changes
    const isUpdatingFromOutput = useRef(false);
    // Debounce timer for localStorage updates
    const saveTimerRef = useRef<number | null>(null);

    // Fix ref types
    const inputSearchRef = useRef<HTMLInputElement>(null);
    const outputSearchRef = useRef<HTMLInputElement>(null);
    const inputTextAreaRef = useRef<HTMLTextAreaElement>(null);

    // Custom setRawInput function that saves to localStorage
    const updateRawInput = useCallback((newInput: string) => {
        setRawInput(newInput);

        // Debounce the save operation to avoid excessive writes
        if (saveTimerRef.current) {
            window.clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = window.setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEY, newInput);
            } catch (error) {
                console.error('Error saving input to localStorage:', error);
            }
        }, 500); // Wait 500ms after typing stops before saving
    }, []);

    // Handler for data changes from the output pane
    const handleDataChange = useCallback((newData: unknown) => {
        // Prevent infinite loops by setting a flag
        isUpdatingFromOutput.current = true;

        try {
            let updatedInput: string;

            // Handle data based on the original input type
            if (inputType === 'xml') {
                // For XML, convert back to XML format
                import('fast-xml-parser').then(({ XMLBuilder }) => {
                    try {
                        // Configure the XML builder with options matching the parser
                        const builder = new XMLBuilder({
                            ignoreAttributes: false,
                            attributeNamePrefix: "@_",
                            suppressBooleanAttributes: false,
                            format: true, // Pretty print
                            indentBy: '  ', // 2 spaces
                        });
                        const xmlContent = builder.build(newData);
                        // Update the input text and save to localStorage
                        updateRawInput(xmlContent);
                    } catch (err) {
                        console.error('Error converting data back to XML:', err);
                        // Fallback to JSON if XML conversion fails
                        const fallbackJson = JSON.stringify(newData, null, 2);
                        updateRawInput(fallbackJson);
                    }
                }).catch(err => {
                    console.error('Error importing XMLBuilder:', err);
                });
            } else {
                // For JSON and other formats, convert to JSON
                updatedInput = JSON.stringify(newData, null, 2);
                // Update the input text and save to localStorage
                updateRawInput(updatedInput);
            }
        } catch (error) {
            console.error('Error converting updated data:', error);
        } finally {
            // Reset the flag
            setTimeout(() => {
                isUpdatingFromOutput.current = false;
            }, 0);
        }
    }, [updateRawInput, inputType]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (saveTimerRef.current) {
                window.clearTimeout(saveTimerRef.current);
            }
        };
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
        <JavaScriptSafetyProvider>
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
                        onInputChange={updateRawInput} // Use updateRawInput instead of setRawInput
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
                        rawContent={rawContent} // Pass raw content for HTML rendering
                    />
                </div>

                {/* Error Display Area */}
                {parseError && (
                    <div className={styles.errorMessage}>
                        <strong>Parsing Error:</strong> {parseError}
                    </div>
                )}
            </div>
        </JavaScriptSafetyProvider>
    );
}

export default App;
