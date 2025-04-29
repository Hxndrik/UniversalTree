import React, { useState, useEffect, useCallback, useRef } from 'react'; // Import hooks and useRef
import styles from './InputPane.module.css'; // Import CSS Module
import SearchBar from './SearchBar'; // Import SearchBar

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
        onInputChange(event.target.value);
    };

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
            <div className={styles.controls}>
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
            <div className={styles.textAreaContainer} ref={containerRef}>
                <textarea
                    ref={textAreaRef} // Attach ref
                    className={styles.textArea}
                    value={inputValue}
                    onChange={handleChange}
                    placeholder="Enter JSON or XML here..."
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
