import React, { useState, useEffect, useCallback, useRef } from 'react'; // Import hooks and useRef
import styles from './InputPane.module.css'; // Import CSS Module
import SearchBar from './SearchBar'; // Import SearchBar
import { FiChevronDown, FiCode, FiFileText, FiGrid, FiCopy, FiCornerUpLeft, FiCornerUpRight } from 'react-icons/fi'; // Added undo/redo/copy icons
import { defaultJsonTemplate, defaultXmlTemplate, defaultHtmlTemplate } from '../utils/DefaultTemplates'; // Import templates

interface InputPaneProps {
    inputValue: string;
    onInputChange: (value: string) => void;
    searchTerm: string; // Add search term prop
    onSearchChange: (term: string) => void; // Add search change handler prop
    // Update ref types to match usage in App.tsx
    searchInputRef?: React.RefObject<HTMLInputElement | null>;
    textAreaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

// Function to find all occurrences of a substring (case-insensitive)
const findInputResults = (text: string, term: string): number[] => {
    if (!term || !text) return [];
    const results: number[] = [];
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    let startIndex = 0;
    let index = lowerText.indexOf(lowerTerm, startIndex);

    while (index !== -1) {
        results.push(index);
        startIndex = index + 1; // Move past the current match
        index = lowerText.indexOf(lowerTerm, startIndex);
    }
    return results;
};

const InputPane: React.FC<InputPaneProps> = ({
    inputValue,
    onInputChange,
    searchTerm,
    onSearchChange,
    searchInputRef, // Accept ref from parent
    textAreaRef: externalTextAreaRef, // Accept textarea ref from parent
}) => {
    // Use external ref if provided, or create a local one
    const localTextAreaRef = useRef<HTMLTextAreaElement>(null);
    const textAreaRef = externalTextAreaRef || localTextAreaRef;

    const containerRef = useRef<HTMLDivElement>(null); // Ref for the container
    const [searchResults, setSearchResults] = useState<number[]>([]); // Store indices
    const [currentResultIndex, setCurrentResultIndex] = useState<number>(-1);
    const [showTemplateMenu, setShowTemplateMenu] = useState<boolean>(false);
    const templateButtonRef = useRef<HTMLButtonElement>(null);
    const templateMenuRef = useRef<HTMLDivElement>(null);

    // Undo/redo history management
    const [history, setHistory] = useState<string[]>([inputValue]); // Initialize with current value
    const [historyIndex, setHistoryIndex] = useState<number>(0);
    const isUndoRedoAction = useRef<boolean>(false);

    const [textareaMetrics, setTextareaMetrics] = useState<{
        lineHeight: number;
        charWidth: number;
        paddingLeft: number;
        paddingTop: number;
    }>({
        lineHeight: 20,
        charWidth: 8,
        paddingLeft: 12,
        paddingTop: 12,
    });

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = event.target.value;
        onInputChange(newValue);

        // Only add to history if it's not an undo/redo action
        if (!isUndoRedoAction.current) {
            // Add to history, remove any future states if we've gone back in history
            const newHistory = [...history.slice(0, historyIndex + 1), newValue];
            // Keep a reasonable history size (max 100 steps)
            if (newHistory.length > 100) {
                newHistory.shift();
            }
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        } else {
            // Reset the flag
            isUndoRedoAction.current = false;
        }
    };

    // Handle undo action
    const handleUndo = () => {
        if (historyIndex > 0) {
            isUndoRedoAction.current = true;
            setHistoryIndex(historyIndex - 1);
            onInputChange(history[historyIndex - 1]);
        }
    };

    // Handle redo action
    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            isUndoRedoAction.current = true;
            setHistoryIndex(historyIndex + 1);
            onInputChange(history[historyIndex + 1]);
        }
    };

    // Handle copy to clipboard
    const handleCopy = () => {
        if (textAreaRef.current) {
            navigator.clipboard.writeText(textAreaRef.current.value)
                .then(() => {
                    // Optional: Could add a small visual feedback that copy was successful
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                });
        }
    };

    // Template insertion handlers
    const insertTemplate = (template: string) => {
        onInputChange(template);
        setShowTemplateMenu(false);
    };

    // Handle click outside to close the template menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                templateMenuRef.current &&
                !templateMenuRef.current.contains(event.target as Node) &&
                templateButtonRef.current &&
                !templateButtonRef.current.contains(event.target as Node)
            ) {
                setShowTemplateMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Calculate textarea metrics on mount for positioning highlights
    useEffect(() => {
        if (textAreaRef.current) {
            const style = window.getComputedStyle(textAreaRef.current);
            const lineHeight =
                parseFloat(style.lineHeight) ||
                parseFloat(style.fontSize) * 1.2;

            // Test character width using monospace characteristics
            const tempSpan = document.createElement('span');
            tempSpan.style.visibility = 'hidden';
            tempSpan.style.position = 'absolute';
            tempSpan.style.font = style.font;
            tempSpan.innerText = 'X';
            document.body.appendChild(tempSpan);
            const charWidth = tempSpan.getBoundingClientRect().width;
            document.body.removeChild(tempSpan);

            setTextareaMetrics({
                lineHeight,
                charWidth,
                paddingLeft: parseFloat(style.paddingLeft),
                paddingTop: parseFloat(style.paddingTop),
            });
        }
    }, []);

    // Effect to find results when input or search term changes
    useEffect(() => {
        const results = findInputResults(inputValue, searchTerm);
        setSearchResults(results);
        setCurrentResultIndex(results.length > 0 ? 0 : -1); // Focus first result or none
    }, [inputValue, searchTerm]);

    // Effect to scroll to the current result without focusing the textarea
    useEffect(() => {
        if (
            currentResultIndex !== -1 &&
            searchResults[currentResultIndex] !== undefined &&
            textAreaRef.current
        ) {
            const start = searchResults[currentResultIndex];
            const textarea = textAreaRef.current;

            // Calculate scroll position to make the result visible
            const textBeforeMatch = inputValue.substring(0, start);
            const lineCount = (textBeforeMatch.match(/\n/g) || []).length;

            const targetScrollTop = lineCount * textareaMetrics.lineHeight;
            // Offset to show some context before the match
            const scrollOffset = 5 * textareaMetrics.lineHeight;
            textarea.scrollTop = Math.max(0, targetScrollTop - scrollOffset);

            // If the textarea has focus, also set the selection for keyboard navigation
            if (document.activeElement === textarea) {
                textarea.setSelectionRange(
                    start,
                    start + searchTerm.length
                );
            }
        }
    }, [
        currentResultIndex,
        searchResults,
        searchTerm,
        inputValue,
        textareaMetrics,
    ]);

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

    // Calculate highlight positions
    const getHighlightPositions = useCallback(() => {
        if (!searchTerm || !inputValue || !textAreaRef.current) return [];

        return searchResults.map((start, index) => {
            const textBeforeMatch = inputValue.substring(0, start);
            const lines = textBeforeMatch.split('\n');
            const lineNumber = lines.length - 1;
            const charPosition = lines[lines.length - 1].length;

            const left =
                charPosition * textareaMetrics.charWidth +
                textareaMetrics.paddingLeft;
            const top =
                lineNumber * textareaMetrics.lineHeight +
                textareaMetrics.paddingTop;

            return {
                left,
                top,
                width: searchTerm.length * textareaMetrics.charWidth,
                height: textareaMetrics.lineHeight,
                isCurrent: index === currentResultIndex,
            };
        });
    }, [
        searchResults,
        inputValue,
        searchTerm,
        currentResultIndex,
        textareaMetrics,
    ]);

    return (
        <div className={styles.inputPane}>
            <h2 className={styles.title}>Input</h2>
            <div className={styles.controlsRow}>
                {/* Search bar */}
                <div className={styles.searchBarContainer}>
                    <SearchBar
                        searchTerm={searchTerm}
                        onSearchChange={onSearchChange}
                        placeholder="Search input..."
                        resultCount={searchResults.length}
                        currentResultIndex={currentResultIndex}
                        onNext={handleNext}
                        onPrevious={handlePrevious}
                        inputRef={searchInputRef}
                    />
                </div>

                {/* Template dropdown */}
                <div className={styles.templateDropdown}>
                    <button
                        ref={templateButtonRef}
                        onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                        className={styles.templateButton}
                        title="Insert template"
                    >
                        Insert Default <FiChevronDown className={styles.dropdownIcon} />
                    </button>

                    {showTemplateMenu && (
                        <div ref={templateMenuRef} className={styles.templateMenu}>
                            <button
                                className={styles.templateMenuItem}
                                onClick={() => insertTemplate(defaultJsonTemplate)}
                            >
                                <FiCode className={styles.templateIcon} /> JSON Template
                            </button>
                            <button
                                className={styles.templateMenuItem}
                                onClick={() => insertTemplate(defaultXmlTemplate)}
                            >
                                <FiFileText className={styles.templateIcon} /> XML Template
                            </button>
                            <button
                                className={styles.templateMenuItem}
                                onClick={() => insertTemplate(defaultHtmlTemplate)}
                            >
                                <FiGrid className={styles.templateIcon} /> HTML Template
                            </button>
                        </div>
                    )}
                </div>

                {/* Edit buttons */}
                <div className={styles.editButtons}>
                    <button
                        onClick={handleUndo}
                        className={styles.editButton}
                        disabled={historyIndex <= 0}
                        title="Undo"
                    >
                        <FiCornerUpLeft />
                    </button>
                    <button
                        onClick={handleRedo}
                        className={styles.editButton}
                        disabled={historyIndex >= history.length - 1}
                        title="Redo"
                    >
                        <FiCornerUpRight />
                    </button>
                    <button
                        onClick={handleCopy}
                        className={styles.editButton}
                        title="Copy to clipboard"
                    >
                        <FiCopy />
                    </button>
                </div>
            </div>

            <div className={styles.textAreaContainer} ref={containerRef}>
                <textarea
                    ref={textAreaRef} // Attach ref
                    className={styles.textArea}
                    value={inputValue}
                    onChange={handleChange}
                    placeholder="Enter JSON, XML, or HTML here..."
                    spellCheck="false" // Disable spellcheck for code-like input
                />

                {/* Highlight overlay */}
                {searchTerm &&
                    searchResults.length > 0 &&
                    getHighlightPositions().map((pos, index) => (
                        <div
                            key={index}
                            className={`${styles.highlightMarker} ${pos.isCurrent
                                ? styles.currentHighlight
                                : ''
                                }`}
                            style={{
                                left: `${pos.left}px`,
                                top: `${pos.top}px`,
                                width: `${pos.width}px`,
                                height: `${pos.height}px`,
                            }}
                        />
                    ))}
            </div>
        </div>
    );
};

export default InputPane;
