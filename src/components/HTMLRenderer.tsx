import React, { useRef, useEffect } from 'react';
import { useJavaScriptSafety } from '../contexts/JavaScriptSafetyContext';
import styles from './HTMLRenderer.module.css';

interface HTMLRendererProps {
    htmlContent: string;
}

const HTMLRenderer: React.FC<HTMLRendererProps> = ({ htmlContent }) => {
    const { jsEnabled } = useJavaScriptSafety();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Ensure the content has proper HTML structure
    const ensureProperHtmlStructure = (content: string): string => {
        // Check if it has HTML, HEAD, and BODY tags
        const hasHtmlTag = /<html[\s>]/i.test(content);
        const hasBodyTag = /<body[\s>]/i.test(content);

        // If it's already a complete HTML document, return as is
        if (hasHtmlTag && hasBodyTag) {
            return content;
        }

        // If it's a fragment, wrap it in proper HTML structure
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6;
            margin: 0;
            padding: 16px;
        }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;
    };

    useEffect(() => {
        if (!iframeRef.current) return;

        try {
            const iframe = iframeRef.current;

            // Use srcdoc for better security and reliability
            if (!jsEnabled) {
                // Create a DOM parser to parse and sanitize the HTML
                const parser = new DOMParser();
                const htmlDoc = parser.parseFromString(
                    ensureProperHtmlStructure(htmlContent),
                    'text/html'
                );

                // Remove all script tags
                const scripts = htmlDoc.getElementsByTagName('script');
                while (scripts.length > 0) {
                    scripts[0].parentNode?.removeChild(scripts[0]);
                }

                // Remove on* attributes (onclick, onload, etc.)
                const allElements = htmlDoc.getElementsByTagName('*');
                for (let i = 0; i < allElements.length; i++) {
                    const element = allElements[i];
                    for (let j = 0; j < element.attributes.length; j++) {
                        const attr = element.attributes[j].name.toLowerCase();
                        if (attr.startsWith('on')) {
                            element.removeAttribute(element.attributes[j].name);
                            j--; // Adjust index since we removed an attribute
                        }
                    }
                }

                // Set the sanitized content to srcdoc
                iframe.srcdoc = htmlDoc.documentElement.outerHTML;
            } else {
                // JavaScript is enabled, render as-is with proper structure
                iframe.srcdoc = ensureProperHtmlStructure(htmlContent);
            }
        } catch (error) {
            console.error('Error rendering HTML content:', error);

            // Fallback rendering for error cases
            if (iframeRef.current) {
                iframeRef.current.srcdoc = `
                <html>
                <body>
                    <h2 style="color: #d32f2f;">Error Rendering HTML</h2>
                    <p>The HTML content could not be properly rendered.</p>
                    <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${String(error).replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    }</pre>
                </body>
                </html>`;
            }
        }
    }, [htmlContent, jsEnabled]);

    return (
        <div className={styles.htmlRendererContainer}>
            {!jsEnabled}
            <iframe
                ref={iframeRef}
                title="HTML Content"
                className={styles.htmlFrame}
                sandbox={jsEnabled ? "allow-scripts allow-same-origin" : "allow-same-origin"}
            ></iframe>
        </div>
    );
};

export default HTMLRenderer;