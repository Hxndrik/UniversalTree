// Default templates for JSON, XML, and HTML

export const defaultJsonTemplate = `{
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

export const defaultXmlTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<application>
  <AppName>Universal Tree App</AppName>
  <version>1.0.0</version>
  <features>
    <feature>JSON Parsing</feature>
    <feature>XML Parsing</feature>
    <feature>HTML Rendering</feature>
    <feature>Tree View</feature>
    <feature>Theming</feature>
    <feature>Search</feature>
  </features>
  <config>
    <darkMode>true</darkMode>
    <fontSize>14</fontSize>
    <settings></settings>
  </config>
</application>`;

export const defaultHtmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>JS Example</title>
  <style>
    body {
      font-family: sans-serif;
      padding: 2rem;
      transition: background 0.3s;
    }
    button {
      font-size: 1rem;
      padding: 0.5rem 1rem;
    }
  </style>
</head>
<body>
  <h1>Click the button to change background color</h1>
  <button onclick="changeBackground()">Change Color</button>

  <script>
    function changeBackground() {
      const colors = ['#f87171', '#60a5fa', '#34d399', '#facc15', '#a78bfa'];
      document.body.style.backgroundColor =
        colors[Math.floor(Math.random() * colors.length)];
    }
  </script>
</body>
</html>`;