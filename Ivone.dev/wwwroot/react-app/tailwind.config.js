module.exports = {
    content: [
        "./index.html",
        "./App.jsx",
        "./components/**/*.{js,jsx}",  // Scan all components
        "./**/*.{js,jsx}"              // Scan all JS/JSX files in root
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}
