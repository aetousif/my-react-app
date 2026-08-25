import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { create, all } from "mathjs";
import "./index.css";

const math = create(all, {});

const COLORS = [
  "#c084fc",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#22d3ee",
  "#a78bfa",
  "#f472b6",
];

const STARTER_EXPRESSIONS = [
  {
    id: 1,
    latex: "y = x^2",
    color: COLORS[0],
    visible: true,
  },
  {
    id: 2,
    latex: "y = sin(x)",
    color: COLORS[1],
    visible: true,
  },
];

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

function normalizeExpression(input) {
  const s = input.trim();

  if (!s) return null;

  // y = ...
  const yMatch = s.match(/^y\s*=\s*(.+)$/i);

  if (yMatch) {
    return {
      kind: "explicit",
      source: yMatch[1],
    };
  }

  // x = ...
  const xMatch = s.match(/^x\s*=\s*(.+)$/i);

  if (xMatch) {
    return {
      kind: "sideways",
      source: xMatch[1],
    };
  }

  // d/dx(...)
  const derivativeMatch = s.match(/^d\/dx\s*\((.+)\)$/i);

  if (derivativeMatch) {
    return {
      kind: "derivative",
      source: derivativeMatch[1],
    };
  }

  // (x,y)
  const pointMatch = s.match(
    /^\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/
  );

  if (pointMatch) {
    return {
      kind: "point",
      x: pointMatch[1],
      y: pointMatch[2],
    };
  }

  // Default: treat as y = expression
  return {
    kind: "explicit",
    source: s,
  };
}

function compileExpression(source) {
  try {
    return math.compile(source);
  } catch {
    return null;
  }
}

function evaluateNode(node, x, variables = {}) {
  try {
    return Number(
      node.evaluate({
        ...variables,
        x,
      })
    );
  } catch {
    return NaN;
  }
}

function niceStep(range) {
  const raw = range / 8;

  const power = Math.pow(
    10,
    Math.floor(Math.log10(raw))
  );

  const normalized = raw / power;

  let nice;

  if (normalized <= 1) {
    nice = 1;
  } else if (normalized <= 2) {
    nice = 2;
  } else if (normalized <= 5) {
    nice = 5;
  } else {
    nice = 10;
  }

  return nice * power;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "";

  if (Math.abs(value) < 1e-9) {
    return "0";
  }

  if (
    Math.abs(value) >= 10000 ||
    Math.abs(value) < 0.001
  ) {
    return value.toExponential(2);
  }

  return Number(value.toFixed(4)).toString();
}

/* -------------------------------------------------------
   Graph Canvas
------------------------------------------------------- */

function GraphCanvas({
  expressions,
  variables,
  settings,
  viewport,
  onViewportChange,
}) {
  const canvasRef = useRef(null);

  const dragRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = rect.width;
    const height = rect.height;

    const {
      xMin,
      xMax,
      yMin,
      yMax,
    } = viewport;

    const sx = width / (xMax - xMin);
    const sy = height / (yMax - yMin);

    const px = (x) => {
      return (x - xMin) * sx;
    };

    const py = (y) => {
      return height - (y - yMin) * sy;
    };

    /* Background */

    ctx.fillStyle = settings.dark
      ? "#0b0b10"
      : "#ffffff";

    ctx.fillRect(0, 0, width, height);

    /* Grid */

    const step = niceStep(
      Math.max(
        xMax - xMin,
        yMax - yMin
      )
    );

    const minorStep = step / 5;

    if (settings.grid) {
      ctx.lineWidth = 1;

      ctx.strokeStyle = settings.dark
        ? "#161620"
        : "#eeeeee";

      ctx.beginPath();

      for (
        let x =
          Math.ceil(xMin / minorStep) *
          minorStep;
        x <= xMax;
        x += minorStep
      ) {
        const screenX = px(x);

        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, height);
      }

      for (
        let y =
          Math.ceil(yMin / minorStep) *
          minorStep;
        y <= yMax;
        y += minorStep
      ) {
        const screenY = py(y);

        ctx.moveTo(0, screenY);
        ctx.lineTo(width, screenY);
      }

      ctx.stroke();

      /* Major grid */

      ctx.strokeStyle = settings.dark
        ? "#252532"
        : "#dddddd";

      ctx.beginPath();

      for (
        let x =
          Math.ceil(xMin / step) * step;
        x <= xMax;
        x += step
      ) {
        const screenX = px(x);

        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, height);
      }

      for (
        let y =
          Math.ceil(yMin / step) * step;
        y <= yMax;
        y += step
      ) {
        const screenY = py(y);

        ctx.moveTo(0, screenY);
        ctx.lineTo(width, screenY);
      }

      ctx.stroke();
    }

    /* Axes */

    if (settings.axes) {
      ctx.strokeStyle = settings.dark
        ? "#a1a1aa"
        : "#444";

      ctx.lineWidth = 1.5;

      ctx.beginPath();

      if (xMin <= 0 && xMax >= 0) {
        const screenX = px(0);

        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, height);
      }

      if (yMin <= 0 && yMax >= 0) {
        const screenY = py(0);

        ctx.moveTo(0, screenY);
        ctx.lineTo(width, screenY);
      }

      ctx.stroke();

      /* Axis labels */

      ctx.font =
        "12px Inter, system-ui, sans-serif";

      ctx.fillStyle = settings.dark
        ? "#a1a1aa"
        : "#555";

      ctx.textAlign = "center";

      for (
        let x =
          Math.ceil(xMin / step) * step;
        x <= xMax;
        x += step
      ) {
        if (Math.abs(x) < step / 100) {
          continue;
        }

        const screenX = px(x);

        if (
          screenX > 24 &&
          screenX < width - 24
        ) {
          ctx.fillText(
            formatNumber(x),
            screenX,
            Math.min(
              height - 8,
              Math.max(
                16,
                py(0) + 16
              )
            )
          );
        }
      }

      ctx.textAlign = "right";

      for (
        let y =
          Math.ceil(yMin / step) * step;
        y <= yMax;
        y += step
      ) {
        if (Math.abs(y) < step / 100) {
          continue;
        }

        const screenY = py(y);

        if (
          screenY > 14 &&
          screenY < height - 8
        ) {
          ctx.fillText(
            formatNumber(y),
            Math.min(
              width - 6,
              Math.max(
                30,
                px(0) - 8
              )
            ),
            screenY + 4
          );
        }
      }
    }

    /* Functions */

    expressions
      .filter(
        (expression) =>
          expression.visible
      )
      .forEach((expression) => {
        const parsed =
          normalizeExpression(
            expression.latex
          );

        if (!parsed) return;

        ctx.strokeStyle =
          expression.color;

        ctx.lineWidth = 2.5;

        ctx.lineJoin = "round";

        ctx.lineCap = "round";

        /* Point */

        if (parsed.kind === "point") {
          const xNode =
            compileExpression(
              parsed.x
            );

          const yNode =
            compileExpression(
              parsed.y
            );

          const xValue =
            evaluateNode(
              xNode,
              0,
              variables
            );

          const yValue =
            evaluateNode(
              yNode,
              0,
              variables
            );

          if (
            Number.isFinite(xValue) &&
            Number.isFinite(yValue)
          ) {
            ctx.fillStyle =
              expression.color;

            ctx.beginPath();

            ctx.arc(
              px(xValue),
              py(yValue),
              5,
              0,
              Math.PI * 2
            );

            ctx.fill();
          }

          return;
        }

        /* x = f(y) */

        if (
          parsed.kind ===
          "sideways"
        ) {
          const node =
            compileExpression(
              parsed.source
            );

          if (!node) return;

          ctx.beginPath();

          let started = false;

          for (
            let screenY = 0;
            screenY <= height;
            screenY += 1
          ) {
            const y =
              yMin +
              (height - screenY) /
                sy;

            const x =
              evaluateNode(
                node,
                y,
                variables
              );

            if (
              !Number.isFinite(x)
            ) {
              started = false;
              continue;
            }

            const screenX =
              px(x);

            if (
              screenX < -30 ||
              screenX > width + 30
            ) {
              started = false;
              continue;
            }

            if (!started) {
              ctx.moveTo(
                screenX,
                screenY
              );

              started = true;
            } else {
              ctx.lineTo(
                screenX,
                screenY
              );
            }
          }

          ctx.stroke();

          return;
        }

        /* Derivative */

        let source =
          parsed.source;

        if (
          parsed.kind ===
          "derivative"
        ) {
          source = `derivative(${source}, x)`;
        }

        const node =
          compileExpression(
            source
          );

        if (!node) return;

        ctx.beginPath();

        let started = false;

        let previousY = null;

        for (
          let screenX = 0;
          screenX <= width;
          screenX += 1
        ) {
          const x =
            xMin +
            screenX / sx;

          const y =
            evaluateNode(
              node,
              x,
              variables
            );

          const screenY =
            py(y);

          const valid =
            Number.isFinite(y) &&
            Math.abs(y) < 1e7 &&
            Number.isFinite(screenY);

          if (
            !valid ||
            (
              previousY !== null &&
              Math.abs(
                screenY -
                  previousY
              ) >
                height * 1.5
            )
          ) {
            started = false;
            previousY = null;
            continue;
          }

          if (!started) {
            ctx.moveTo(
              screenX,
              screenY
            );

            started = true;
          } else {
            ctx.lineTo(
              screenX,
              screenY
            );
          }

          previousY = screenY;
        }

        ctx.stroke();
      });

    /* Cursor */

    if (
      settings.showCoordinates &&
      viewport.cursor
    ) {
      const {
        x,
        y,
      } = viewport.cursor;

      const screenX = px(x);
      const screenY = py(y);

      if (
        screenX >= 0 &&
        screenX <= width &&
        screenY >= 0 &&
        screenY <= height
      ) {
        ctx.strokeStyle =
          settings.dark
            ? "#71717a"
            : "#999";

        ctx.setLineDash([
          4,
          4,
        ]);

        ctx.beginPath();

        ctx.moveTo(
          screenX,
          0
        );

        ctx.lineTo(
          screenX,
          height
        );

        ctx.moveTo(
          0,
          screenY
        );

        ctx.lineTo(
          width,
          screenY
        );

        ctx.stroke();

        ctx.setLineDash([]);
      }
    }
  }, [
    expressions,
    variables,
    settings,
    viewport,
  ]);

  useEffect(() => {
    draw();

    const observer =
      new ResizeObserver(
        draw
      );

    if (canvasRef.current) {
      observer.observe(
        canvasRef.current
      );
    }

    return () => {
      observer.disconnect();
    };
  }, [draw]);

  const screenToGraph = (
    clientX,
    clientY
  ) => {
    const rect =
      canvasRef.current.getBoundingClientRect();

    return {
      x:
        viewport.xMin +
        ((clientX -
          rect.left) /
          rect.width) *
          (
            viewport.xMax -
            viewport.xMin
          ),

      y:
        viewport.yMax -
        ((clientY -
          rect.top) /
          rect.height) *
          (
            viewport.yMax -
            viewport.yMin
          ),
    };
  };

  const zoom = (
    factor,
    clientX,
    clientY
  ) => {
    const rect =
      canvasRef.current.getBoundingClientRect();

    const mouseX =
      clientX == null
        ? rect.width / 2
        : clientX - rect.left;

    const mouseY =
      clientY == null
        ? rect.height / 2
        : clientY - rect.top;

    const graphX =
      viewport.xMin +
      (mouseX / rect.width) *
        (
          viewport.xMax -
          viewport.xMin
        );

    const graphY =
      viewport.yMax -
      (mouseY / rect.height) *
        (
          viewport.yMax -
          viewport.yMin
        );

    onViewportChange({
      ...viewport,

      xMin:
        graphX -
        (graphX -
          viewport.xMin) *
          factor,

      xMax:
        graphX +
        (viewport.xMax -
          graphX) *
          factor,

      yMin:
        graphY -
        (graphY -
          viewport.yMin) *
          factor,

      yMax:
        graphY +
        (viewport.yMax -
          graphY) *
          factor,
    });
  };

  return (
    <div
      className="relative h-full w-full touch-none select-none"
      onWheel={(event) => {
        event.preventDefault();

        zoom(
          event.deltaY > 0
            ? 1.12
            : 0.88,
          event.clientX,
          event.clientY
        );
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(
          event.pointerId
        );

        const point =
          screenToGraph(
            event.clientX,
            event.clientY
          );

        dragRef.current = {
          clientX:
            event.clientX,

          clientY:
            event.clientY,

          viewport: {
            ...viewport,
          },

          point,
        };
      }}
      onPointerMove={(event) => {
        const point =
          screenToGraph(
            event.clientX,
            event.clientY
          );

        if (!dragRef.current) {
          onViewportChange({
            ...viewport,
            cursor: point,
          });

          return;
        }

        const rect =
          canvasRef.current.getBoundingClientRect();

        const dx =
          (event.clientX -
            dragRef.current.clientX) /
          rect.width;

        const dy =
          (event.clientY -
            dragRef.current.clientY) /
          rect.height;

        const old =
          dragRef.current.viewport;

        onViewportChange({
          xMin:
            old.xMin -
            dx *
              (
                old.xMax -
                old.xMin
              ),

          xMax:
            old.xMax -
            dx *
              (
                old.xMax -
                old.xMin
              ),

          yMin:
            old.yMin +
            dy *
              (
                old.yMax -
                old.yMin
              ),

          yMax:
            old.yMax +
            dy *
              (
                old.yMax -
                old.yMin
              ),

          cursor: point,
        });
      }}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      onPointerLeave={() => {
        if (!dragRef.current) {
          onViewportChange({
            ...viewport,
            cursor: null,
          });
        }
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />

      {settings.showCoordinates &&
        viewport.cursor && (
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-zinc-700/70 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-300 backdrop-blur">
            x ={" "}
            {formatNumber(
              viewport.cursor.x
            )}{" "}
            · y ={" "}
            {formatNumber(
              viewport.cursor.y
            )}
          </div>
        )}
    </div>
  );
}

/* -------------------------------------------------------
   Expression Row
------------------------------------------------------- */

function ExpressionRow({
  expression,
  index,
  onChange,
  onDelete,
  onToggle,
  onDuplicate,
}) {
  const [focused, setFocused] =
    useState(false);

  return (
    <div
      className={`group border-b border-zinc-800/80 px-3 py-2 ${
        focused
          ? "bg-zinc-900"
          : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() =>
            onToggle(
              expression.id
            )
          }
          className="mt-2 h-5 w-5 shrink-0 rounded-full border-2"
          style={{
            borderColor:
              expression.color,

            background:
              expression.visible
                ? expression.color
                : "transparent",
          }}
        />

        <div className="relative flex-1">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600">
            {index + 1}
          </div>

          <input
            value={
              expression.latex
            }
            onFocus={() =>
              setFocused(true)
            }
            onBlur={() =>
              setFocused(false)
            }
            onChange={(event) =>
              onChange(
                expression.id,
                event.target.value
              )
            }
            placeholder="y = x^2"
            className="w-full rounded-lg border border-transparent bg-zinc-950/50 py-2 pl-8 pr-2 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-zinc-700 focus:bg-zinc-950"
          />
        </div>

        <button
          onClick={() =>
            onDuplicate(
              expression
            )
          }
          className="mt-1 hidden rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-white group-hover:block"
        >
          ⧉
        </button>

        <button
          onClick={() =>
            onDelete(
              expression.id
            )
          }
          className="mt-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-red-950 hover:text-red-300"
        >
          ×
        </button>
      </div>

      {expression.error && (
        <div className="ml-7 mt-1 text-xs text-red-400">
          {expression.error}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------
   Slider
------------------------------------------------------- */

function Slider({
  name,
  value,
  min,
  max,
  step,
  onChange,
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-sm text-purple-300">
          {name}
        </span>

        <span className="font-mono text-xs text-zinc-400">
          {formatNumber(value)}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) =>
          onChange(
            Number(
              event.target.value
            )
          )
        }
        className="w-full accent-purple-500"
      />

      <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   Table
------------------------------------------------------- */

function TablePanel({
  variables,
}) {
  const [start, setStart] =
    useState(-5);

  const [step, setStep] =
    useState(1);

  const [formula, setFormula] =
    useState("x^2");

  const node = useMemo(
    () =>
      compileExpression(
        formula
      ),
    [formula]
  );

  return (
    <div className="border-t border-zinc-800 p-3">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold">
          Table
        </span>

        <input
          value={formula}
          onChange={(event) =>
            setFormula(
              event.target.value
            )
          }
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs outline-none focus:border-purple-600"
        />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="text-[10px] text-zinc-500">
          Start
          <input
            type="number"
            value={start}
            onChange={(event) =>
              setStart(
                Number(
                  event.target.value
                )
              )
            }
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300"
          />
        </label>

        <label className="text-[10px] text-zinc-500">
          Step
          <input
            type="number"
            value={step}
            onChange={(event) =>
              setStep(
                Number(
                  event.target.value
                )
              )
            }
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300"
          />
        </label>
      </div>

      <div className="overflow-auto rounded-lg border border-zinc-800">
        <table className="w-full text-xs">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-3 py-2 text-left text-purple-300">
                x
              </th>

              <th className="px-3 py-2 text-left text-blue-300">
                f(x)
              </th>
            </tr>
          </thead>

          <tbody>
            {Array.from(
              {
                length: 9,
              },
              (_, i) => {
                const x =
                  start +
                  i * step;

                const y =
                  evaluateNode(
                    node,
                    x,
                    variables
                  );

                return (
                  <tr
                    key={i}
                    className="border-t border-zinc-900"
                  >
                    <td className="px-3 py-1.5 font-mono">
                      {formatNumber(x)}
                    </td>

                    <td className="px-3 py-1.5 font-mono text-zinc-400">
                      {formatNumber(y)}
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   Main App
------------------------------------------------------- */

export default function App() {
  const [
    expressions,
    setExpressions,
  ] = useState(
    STARTER_EXPRESSIONS
  );

  const [
    variables,
    setVariables,
  ] = useState({
    a: 2,
    b: 1,
  });

  const [
    viewport,
    setViewport,
  ] = useState({
    xMin: -10,
    xMax: 10,
    yMin: -6,
    yMax: 6,
    cursor: null,
  });

  const [
    settings,
    setSettings,
  ] = useState({
    dark: true,
    grid: true,
    axes: true,
    showCoordinates: true,
  });

  const [
    showTable,
    setShowTable,
  ] = useState(false);

  const [
    showSettings,
    setShowSettings,
  ] = useState(false);

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(true);

  const [
    toast,
    setToast,
  ] = useState("");

  /* Add expression */

  const addExpression =
    () => {
      const id =
        Date.now();

      setExpressions(
        (items) => [
          ...items,
          {
            id,
            latex: "",
            color:
              COLORS[
                items.length %
                  COLORS.length
              ],
            visible: true,
          },
        ]
      );
    };

  /* Update expression */

  const updateExpression = (
    id,
    latex
  ) => {
    setExpressions(
      (items) =>
        items.map(
          (expression) => {
            if (
              expression.id !==
              id
            ) {
              return expression;
            }

            let error = "";

            if (latex.trim()) {
              const parsed =
                normalizeExpression(
                  latex
                );

              if (
                parsed?.source &&
                !compileExpression(
                  parsed.kind ===
                    "derivative"
                    ? `derivative(${parsed.source}, x)`
                    : parsed.source
                ) &&
                parsed.kind !==
                  "point"
              ) {
                error =
                  "Couldn't parse this expression.";
              }
            }

            return {
              ...expression,
              latex,
              error,
            };
          }
        )
    );
  };

  /* Delete */

  const deleteExpression =
    (id) => {
      setExpressions(
        (items) =>
          items.filter(
            (expression) =>
              expression.id !== id
          )
      );
    };

  /* Duplicate */

  const duplicateExpression =
    (expression) => {
      setExpressions(
        (items) => [
          ...items,
          {
            ...expression,
            id: Date.now(),
            color:
              COLORS[
                items.length %
                  COLORS.length
              ],
          },
        ]
      );
    };

  /* Toggle */

  const toggleExpression =
    (id) => {
      setExpressions(
        (items) =>
          items.map(
            (expression) =>
              expression.id === id
                ? {
                    ...expression,
                    visible:
                      !expression.visible,
                  }
                : expression
          )
      );
    };

  /* Reset */

  const resetView = () => {
    setViewport({
      xMin: -10,
      xMax: 10,
      yMin: -6,
      yMax: 6,
      cursor: null,
    });
  };

  /* Derivative */

  const addDerivative = () => {
    const last =
      expressions.find(
        (expression) =>
          expression.latex.trim()
      );

    if (!last) return;

    const parsed =
      normalizeExpression(
        last.latex
      );

    if (!parsed) return;

    setExpressions(
      (items) => [
        ...items,
        {
          id: Date.now(),
          latex: `d/dx(${parsed.source})`,
          color:
            COLORS[
              items.length %
                COLORS.length
            ],
          visible: true,
        },
      ]
    );
  };

  /* Copy graph */

  const copyState =
    async () => {
      const payload =
        JSON.stringify(
          {
            expressions,
            variables,
            viewport,
          },
          null,
          2
        );

      try {
        await navigator.clipboard.writeText(
          payload
        );

        setToast(
          "Graph state copied"
        );

        setTimeout(
          () => setToast(""),
          1600
        );
      } catch {
        setToast(
          "Clipboard unavailable"
        );

        setTimeout(
          () => setToast(""),
          1600
        );
      }
    };

  /* Keyboard shortcuts */

  useEffect(() => {
    const handleKeyDown =
      (event) => {
        if (
          event.ctrlKey &&
          event.key === "Enter"
        ) {
          event.preventDefault();

          addExpression();
        }

        if (
          event.key === "Escape"
        ) {
          setShowSettings(
            false
          );
        }

        if (
          event.key === "Home"
        ) {
          resetView();
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
  });

  return (
    <div className="h-screen overflow-hidden bg-[#08080d] text-zinc-100">
      {/* TOP BAR */}

      <header className="flex h-12 items-center border-b border-zinc-800 bg-[#111116] px-3">
        <button
          onClick={() =>
            setSidebarOpen(
              (value) => !value
            )
          }
          className="mr-3 rounded-lg px-2 py-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          ☰
        </button>

        <div className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-purple-600 font-bold">
            N
          </span>

          Nova Graph
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={
              addExpression
            }
            className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            + Expression
          </button>

          <button
            onClick={() =>
              setShowTable(
                (value) => !value
              )
            }
            className={`rounded-lg px-3 py-1.5 text-xs ${
              showTable
                ? "bg-purple-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            Table
          </button>

          <button
            onClick={
              addDerivative
            }
            className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            d/dx
          </button>

          <button
            onClick={() =>
              setShowSettings(
                (value) => !value
              )
            }
            className="rounded-lg px-3 py-1.5 text-lg text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* CONTENT */}

      <div className="flex h-[calc(100vh-48px)]">
        {/* SIDEBAR */}

        {sidebarOpen && (
          <aside className="flex w-[330px] shrink-0 flex-col border-r border-zinc-800 bg-[#111116]">
            <div className="flex-1 overflow-auto">
              {/* Expression header */}

              <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Expressions
                </span>

                <button
                  onClick={
                    addExpression
                  }
                  className="rounded-md px-2 py-1 text-purple-400 hover:bg-zinc-800"
                >
                  ＋
                </button>
              </div>

              {/* Expressions */}

              {expressions.map(
                (
                  expression,
                  index
                ) => (
                  <ExpressionRow
                    key={
                      expression.id
                    }
                    expression={
                      expression
                    }
                    index={index}
                    onChange={
                      updateExpression
                    }
                    onDelete={
                      deleteExpression
                    }
                    onToggle={
                      toggleExpression
                    }
                    onDuplicate={
                      duplicateExpression
                    }
                  />
                )
              )}

              {/* Add button */}

              <div className="p-3">
                <button
                  onClick={
                    addExpression
                  }
                  className="w-full rounded-xl border border-dashed border-zinc-700 py-2 text-sm text-zinc-500 hover:border-purple-700 hover:text-purple-300"
                >
                  + Add expression
                </button>
              </div>

              {/* Variables */}

              <div className="border-t border-zinc-800 p-3">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Variables
                </div>

                <Slider
                  name="a"
                  value={
                    variables.a
                  }
                  min={-10}
                  max={10}
                  step={0.1}
                  onChange={(
                    value
                  ) =>
                    setVariables(
                      (current) => ({
                        ...current,
                        a: value,
                      })
                    )
                  }
                />

                <div className="mt-2">
                  <Slider
                    name="b"
                    value={
                      variables.b
                    }
                    min={-10}
                    max={10}
                    step={0.1}
                    onChange={(
                      value
                    ) =>
                      setVariables(
                        (current) => ({
                          ...current,
                          b: value,
                        })
                      )
                    }
                  />
                </div>
              </div>

              {/* Table */}

              {showTable && (
                <TablePanel
                  variables={
                    variables
                  }
                />
              )}
            </div>

            {/* Bottom buttons */}

            <div className="border-t border-zinc-800 p-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={
                    resetView
                  }
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  Reset View
                </button>

                <button
                  onClick={
                    copyState
                  }
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  Copy Graph
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* GRAPH */}

        <main className="relative min-w-0 flex-1">
          <GraphCanvas
            expressions={
              expressions
            }
            variables={
              variables
            }
            settings={
              settings
            }
            viewport={
              viewport
            }
            onViewportChange={
              setViewport
            }
          />

          {/* Zoom controls */}

          <div className="absolute right-4 top-4 flex flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950/90 shadow-xl backdrop-blur">
            <button
              onClick={() => {
                const xCenter =
                  (viewport.xMin +
                    viewport.xMax) /
                  2;

                const yCenter =
                  (viewport.yMin +
                    viewport.yMax) /
                  2;

                setViewport({
                  ...viewport,

                  xMin:
                    xCenter -
                    (xCenter -
                      viewport.xMin) *
                      0.8,

                  xMax:
                    xCenter +
                    (viewport.xMax -
                      xCenter) *
                      0.8,

                  yMin:
                    yCenter -
                    (yCenter -
                      viewport.yMin) *
                      0.8,

                  yMax:
                    yCenter +
                    (viewport.yMax -
                      yCenter) *
                      0.8,
                });
              }}
              className="border-b border-zinc-800 px-4 py-2 text-lg hover:bg-zinc-800"
            >
              +
            </button>

            <button
              onClick={() => {
                const xCenter =
                  (viewport.xMin +
                    viewport.xMax) /
                  2;

                const yCenter =
                  (viewport.yMin +
                    viewport.yMax) /
                  2;

                setViewport({
                  ...viewport,

                  xMin:
                    xCenter -
                    (xCenter -
                      viewport.xMin) *
                      1.25,

                  xMax:
                    xCenter +
                    (viewport.xMax -
                      xCenter) *
                      1.25,

                  yMin:
                    yCenter -
                    (yCenter -
                      viewport.yMin) *
                      1.25,

                  yMax:
                    yCenter +
                    (viewport.yMax -
                      yCenter) *
                      1.25,
                });
              }}
              className="border-b border-zinc-800 px-4 py-2 text-lg hover:bg-zinc-800"
            >
              −
            </button>

            <button
              onClick={
                resetView
              }
              className="px-4 py-2 text-xs text-zinc-400 hover:bg-zinc-800"
            >
              Home
            </button>
          </div>

          {/* Settings */}

          {showSettings && (
            <div className="absolute right-4 top-16 z-20 w-64 rounded-2xl border border-zinc-700 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur">
              <div className="mb-3 text-sm font-semibold">
                Graph Settings
              </div>

              {[
                [
                  "grid",
                  "Grid",
                ],
                [
                  "axes",
                  "Axes",
                ],
                [
                  "showCoordinates",
                  "Coordinates",
                ],
              ].map(
                ([
                  key,
                  label,
                ]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between border-b border-zinc-900 py-3 text-sm"
                  >
                    <span className="text-zinc-400">
                      {label}
                    </span>

                    <input
                      type="checkbox"
                      checked={
                        settings[
                          key
                        ]
                      }
                      onChange={(
                        event
                      ) =>
                        setSettings(
                          (
                            current
                          ) => ({
                            ...current,
                            [key]:
                              event
                                .target
                                .checked,
                          })
                        )
                      }
                      className="accent-purple-500"
                    />
                  </label>
                )
              )}
            </div>
          )}

          {/* Help */}

          <div className="absolute bottom-4 right-4 hidden rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-[11px] text-zinc-500 backdrop-blur sm:block">
            Scroll to zoom · Drag
            to pan · Enter
            expressions like{" "}
            <span className="font-mono text-zinc-300">
              y=x^2
            </span>
          </div>

          {/* Toast */}

          {toast && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm shadow-xl">
              {toast}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}