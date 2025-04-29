import { useState, useEffect } from 'react';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

interface ParserResult {
    data: unknown | null; // Parsed data (can be any type)
    error: string | null; // Error message if parsing fails
    inputType: 'json' | 'xml' | 'html' | 'unknown' | 'empty'; // Added 'html' type
    rawContent?: string; // Raw content for HTML rendering
}

// Configure the XML parser
const xmlParserOptions = {
    ignoreAttributes: false, // Keep attributes
    attributeNamePrefix: "@_", // Prefix for attributes
    allowBooleanAttributes: true,
};
const parser = new XMLParser(xmlParserOptions);

/**
 * Parse JSON with support for duplicate keys by using a specialized tokenizer approach.
 * This method manually parses the JSON string and preserves duplicate keys.
 */
function parseJsonWithDuplicateKeys(input: string): unknown {
    // A simple JSON lexer - breaks JSON into tokens
    function tokenize(input: string) {
        const tokens: { type: string, value: string, pos: number }[] = [];
        let pos = 0;

        while (pos < input.length) {
            const char = input[pos];

            // Skip whitespace
            if (/\s/.test(char)) {
                pos++;
                continue;
            }

            // String
            if (char === '"') {
                let value = '"';
                pos++;

                let escaped = false;
                while (pos < input.length) {
                    const c = input[pos];
                    value += c;
                    pos++;

                    if (c === '\\') {
                        escaped = !escaped;
                    } else if (c === '"' && !escaped) {
                        break;
                    } else {
                        escaped = false;
                    }
                }

                tokens.push({ type: 'string', value, pos: pos - value.length });
                continue;
            }

            // Symbols and punctuation
            if (/[{}[\]:,]/.test(char)) {
                tokens.push({ type: 'punctuation', value: char, pos });
                pos++;
                continue;
            }

            // Numbers
            if (/[0-9.-]/.test(char)) {
                let value = '';
                while (pos < input.length && /[0-9.eE+-]/.test(input[pos])) {
                    value += input[pos];
                    pos++;
                }
                tokens.push({ type: 'number', value, pos: pos - value.length });
                continue;
            }

            // Boolean or null
            if (/[a-z]/.test(char)) {
                let value = '';
                while (pos < input.length && /[a-z]/.test(input[pos])) {
                    value += input[pos];
                    pos++;
                }

                if (value === 'true' || value === 'false' || value === 'null') {
                    tokens.push({ type: 'keyword', value, pos: pos - value.length });
                } else {
                    throw new Error(`Unexpected token at position ${pos - value.length}: ${value}`);
                }
                continue;
            }

            throw new Error(`Unexpected character at position ${pos}: ${char}`);
        }

        return tokens;
    }

    /**
     * Parse the JSON tokens into an object structure that preserves duplicate keys
     */
    function parseTokens(tokens: { type: string, value: string, pos: number }[]) {
        let position = 0;

        // Helper to get current token
        function peek() {
            return tokens[position];
        }

        // Helper to move to next token
        function next() {
            return tokens[position++];
        }

        // Helper to parse a value
        function parseValue() {
            const token = peek();

            if (!token) {
                throw new Error('Unexpected end of input');
            }

            if (token.type === 'string') {
                next(); // Consume token
                // Remove quotes from string value
                return token.value.slice(1, -1);
            }

            if (token.type === 'number') {
                next(); // Consume token
                return parseFloat(token.value);
            }

            if (token.type === 'keyword') {
                next(); // Consume token
                if (token.value === 'true') return true;
                if (token.value === 'false') return false;
                if (token.value === 'null') return null;
            }

            if (token.type === 'punctuation') {
                // Object
                if (token.value === '{') {
                    return parseObject();
                }

                // Array
                if (token.value === '[') {
                    return parseArray();
                }
            }

            throw new Error(`Unexpected token at position ${token.pos}: ${token.value}`);
        }

        // Parse a JSON array
        function parseArray() {
            next(); // Consume '['
            const result: unknown[] = [];

            // Empty array
            if (peek()?.value === ']') {
                next(); // Consume ']'
                return result;
            }

            while (true) {
                const value = parseValue();
                result.push(value);

                const token = peek();
                if (!token) {
                    throw new Error('Unexpected end of input in array');
                }

                if (token.value === ']') {
                    next(); // Consume ']'
                    break;
                }

                if (token.value !== ',') {
                    throw new Error(`Expected comma or end of array at ${token.pos}`);
                }

                next(); // Consume ','
            }

            return result;
        }

        // Parse a JSON object, preserving duplicate keys
        function parseObject() {
            next(); // Consume '{'
            const result: Record<string, unknown> = {};

            // Track keys to count duplicates
            const keyCounter: Record<string, number> = {};

            // Empty object
            if (peek()?.value === '}') {
                next(); // Consume '}'
                return result;
            }

            while (true) {
                // Get key
                const keyToken = next();
                if (keyToken.type !== 'string') {
                    throw new Error(`Expected string key at position ${keyToken.pos}`);
                }

                // Remove quotes from key
                let key = keyToken.value.slice(1, -1);

                // Expect colon
                const colonToken = next();
                if (colonToken.value !== ':') {
                    throw new Error(`Expected colon at position ${colonToken.pos}`);
                }

                // Get value
                const value = parseValue();

                // Handle duplicate keys by appending a counter
                if (key in result) {
                    if (!(key in keyCounter)) {
                        keyCounter[key] = 0;
                    }
                    keyCounter[key]++;

                    // Create a new key with a suffix
                    // Using a non-breaking space + counter for visual separation
                    result[`${key}\u00A0(Duplicate ${keyCounter[key]})`] = value;
                } else {
                    result[key] = value;
                }

                const token = peek();
                if (!token) {
                    throw new Error('Unexpected end of input in object');
                }

                if (token.value === '}') {
                    next(); // Consume '}'
                    break;
                }

                if (token.value !== ',') {
                    throw new Error(`Expected comma or end of object at ${token.pos}`);
                }

                next(); // Consume ','
            }

            return result;
        }

        return parseValue();
    }

    try {
        const tokens = tokenize(input);
        return parseTokens(tokens);
    } catch (error) {
        throw error; // Re-throw for the caller to handle
    }
}

/**
 * Function to detect if content is actually HTML
 * This only identifies content as HTML if it contains specific HTML structural elements
 */
function detectHtml(input: string): boolean {
    // Trim whitespace
    const trimmed = input.trim();

    // Only identify as HTML if it contains specific HTML structural elements
    const hasHtmlStructure = /<!DOCTYPE\s+html|<html|<head|<body/i.test(trimmed);

    return hasHtmlStructure;
}

export const useParser = (input: string): ParserResult => {
    const [result, setResult] = useState<ParserResult>({
        data: null,
        error: null,
        inputType: 'empty',
    });

    useEffect(() => {
        const trimmedInput = input.trim();

        if (!trimmedInput) {
            setResult({ data: null, error: null, inputType: 'empty' });
            return;
        }

        // First, check if it's likely HTML
        if (detectHtml(trimmedInput)) {
            setResult({
                data: null,
                error: null,
                inputType: 'html',
                rawContent: trimmedInput
            });
            return; // Successfully identified as HTML
        }

        // Try parsing as JSON with our custom parser
        try {
            // Use our custom parser that preserves duplicate keys
            const jsonData = parseJsonWithDuplicateKeys(trimmedInput);
            setResult({ data: jsonData, error: null, inputType: 'json' });
            return; // Successfully parsed as JSON
        } catch (jsonError: any) {
            // JSON parsing failed, now try XML
            console.log('Custom JSON parse failed:', jsonError.message);

            // Try standard JSON parse as a fallback
            try {
                const standardJsonData = JSON.parse(trimmedInput);
                setResult({
                    data: standardJsonData,
                    error: "Warning: Standard JSON parser used. Duplicate keys will be overwritten.",
                    inputType: 'json'
                });
                return;
            } catch {
                // Continue to XML parsing
            }

            // Validate XML structure
            const validationResult = XMLValidator.validate(trimmedInput, {
                allowBooleanAttributes: true,
            });

            if (validationResult === true) {
                // XML is valid, parse it
                try {
                    const xmlData = parser.parse(trimmedInput);
                    setResult({ data: xmlData, error: null, inputType: 'xml' });
                    return; // Successfully parsed as XML
                } catch (xmlError: any) {
                    // Should not happen if validator passed, but handle just in case
                    setResult({
                        data: null,
                        error: `XML parsing failed: ${xmlError?.message || 'Unknown error'}`,
                        inputType: 'unknown',
                    });
                    return;
                }
            } else {
                // XML validation failed
                setResult({
                    data: null,
                    error: `Input is not valid JSON, XML, or HTML. ${validationResult.err?.msg ? `XML Error: ${validationResult.err.msg}` : ''}`.trim(),
                    inputType: 'unknown',
                });
                return;
            }
        }
    }, [input]); // Re-run effect when input changes

    return result;
};
