# NovaGraph

> A fast, interactive graphing calculator built with React, Vite, Tailwind CSS, and math.js.

NovaGraph turns mathematical expressions into interactive graphs directly in the browser. It is designed to feel lightweight and responsive while still supporting more than simple `y = f(x)` plots.

## ✨ Features

- 📈 **Interactive function plotting** — graph expressions such as `y = x^2` and `y = sin(x)`.
- ↔️ **Sideways graphs** — plot expressions in the form `x = f(y)`.
- ∂ **Derivatives** — visualize expressions such as `d/dx(x^2)`.
- 📍 **Points** — plot coordinates such as `(2, 3)`.
- 🎛️ **Interactive viewport** — pan and zoom around the graph canvas.
- 🧮 **math.js-powered expressions** — mathematical expressions are compiled and evaluated in the browser.
- 🌙 **Dark/light graph styling** — customize the graph appearance through the built-in settings.
- 🗂️ **Multiple expressions** — keep several expressions on the canvas at once, each with its own color and visibility state.
- 🧭 **Grid, axes, labels, and coordinates** — configure the graph to match how you want to explore it.
- ⚡ **Client-side and fast** — no backend is required to evaluate and render graphs.

## 🖥️ Demo

**Live app:** https://aetousif.github.io/my-react-app

> The GitHub Pages URL is configured in the project's `package.json`.

## 🛠️ Tech Stack

| Technology | Purpose |
| --- | --- |
| [React](https://react.dev/) | UI and application state |
| [Vite](https://vite.dev/) | Development server and production build tooling |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |
| [math.js](https://mathjs.org/) | Mathematical expression parsing, compilation, and evaluation |
| JavaScript / JSX | Application logic |
| HTML Canvas | Graph rendering |

## 🚀 Getting Started

### Prerequisites

Make sure you have **Node.js** and **npm** installed.

### Installation

```bash
git clone https://github.com/aetousif/NovaGraph.git
cd NovaGraph
npm install
```

### Start the development server

```bash
npm run dev
```

Vite will start a local development server. Open the URL shown in your terminal to use NovaGraph.

### Create a production build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## 📐 Expression Examples

NovaGraph accepts several useful expression formats:

```text
y = x^2
y = sin(x)
x = y^2
d/dx(x^3)
(2, 3)
```

An expression without an explicit `y =` prefix is treated as a regular `y = expression` plot.

## 🎮 Graph Controls

NovaGraph provides an interactive canvas for exploring functions:

- **Zoom** to inspect details or see a wider range.
- **Pan** to move around the coordinate plane.
- **Toggle expressions** to show or hide individual plots.
- **Adjust graph settings** such as axes, grid, theme, and coordinate display.
- **Use multiple expressions together** to compare functions visually.

## 📦 Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the app for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run deploy` | Build and deploy the `dist` directory with `gh-pages` |

## 🗂️ Project Structure

```text
NovaGraph/
├── public/          # Static assets
├── src/
│   ├── App.jsx      # Main application and graphing logic
│   ├── index.css     # Global styles and Tailwind import
│   └── main.jsx      # React entry point
├── index.html        # HTML entry point
├── package.json      # Dependencies and npm scripts
└── README.md
```

## 🔬 How It Works

At the core of NovaGraph is an HTML Canvas renderer backed by math.js:

1. User-entered expressions are normalized into supported expression types.
2. math.js compiles the mathematical expression.
3. The app evaluates the compiled expression across the visible graph range.
4. The resulting coordinates are mapped to canvas pixels.
5. The canvas draws the grid, axes, labels, curves, points, and coordinate guides.
6. Panning and zooming update the viewport and trigger a redraw.

This approach keeps graph evaluation and rendering entirely in the browser.

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a feature branch:

   ```bash
   git checkout -b feature/my-feature
   ```

3. Make your changes.
4. Run the checks:

   ```bash
   npm run lint
   npm run build
   ```

5. Commit your changes and open a pull request.

If you find a bug or have an idea for a new graphing feature, feel free to open an issue.

## 📄 License

No license file is currently included in the repository. If you intend to reuse or distribute NovaGraph, please check with the repository owner regarding licensing terms.

## 👤 Author

Created by [@aetousif](https://github.com/aetousif).

---

⭐ If NovaGraph is useful to you, consider starring the repository and sharing it with others who enjoy interactive math tools.
