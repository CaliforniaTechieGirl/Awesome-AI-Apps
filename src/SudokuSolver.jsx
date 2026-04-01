import { useState, useCallback, useRef } from "react";

const FONT = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap";

// 9 pastel colors, one per 3x3 box (row 0-2 / col 0-2 mapping)
const BOX_COLORS = [
  "#e8f4fd", // top-left     — soft sky blue
  "#fde8f4", // top-mid      — soft pink
  "#e8fdf0", // top-right    — soft mint
  "#fdf4e8", // mid-left     — soft peach
  "#f0e8fd", // center       — soft lavender
  "#e8fdfd", // mid-right    — soft aqua
  "#fdfde8", // bot-left     — soft lemon
  "#fde8e8", // bot-mid      — soft rose
  "#e8f0fd", // bot-right    — soft periwinkle
];

const BOX_COLORS_DARKER = [
  "#c5dff5",
  "#f5c5df",
  "#c5f5da",
  "#f5dfc5",
  "#dac5f5",
  "#c5f5f5",
  "#f5f5c5",
  "#f5c5c5",
  "#c5d5f5",
];

const boxIndex = (r, c) => Math.floor(r / 3) * 3 + Math.floor(c / 3);

const emptyGrid = () => Array(9).fill(null).map(() => Array(9).fill(""));

const isValid = (grid, row, col, num) => {
  const n = String(num);
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === n && i !== col) return false;
    if (grid[i][col] === n && i !== row) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if (grid[r][c] === n && !(r === row && c === col)) return false;
  return true;
};

const validateGrid = (grid) => {
  const errors = new Set();
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (grid[r][c] !== "" && !isValid(grid, r, c, grid[r][c]))
        errors.add(`${r}-${c}`);
  return errors;
};

const solve = (grid) => {
  const g = grid.map(r => [...r]);
  const backtrack = () => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (g[r][c] === "") {
          for (let n = 1; n <= 9; n++) {
            if (isValid(g, r, c, n)) {
              g[r][c] = String(n);
              if (backtrack()) return true;
              g[r][c] = "";
            }
          }
          return false;
        }
      }
    }
    return true;
  };
  return backtrack() ? g : null;
};

const SAMPLE_PUZZLE = [
  ["5","3","","","7","","","",""],
  ["6","","","1","9","5","","",""],
  ["","9","8","","","","","6",""],
  ["8","","","","6","","","","3"],
  ["4","","","8","","3","","","1"],
  ["7","","","","2","","","","6"],
  ["","6","","","","","2","8",""],
  ["","","","4","1","9","","","5"],
  ["","","","","8","","","7","9"],
];

export default function SudokuSolver() {
  const [grid, setGrid] = useState(emptyGrid());
  const [given, setGiven] = useState(new Set());
  const [solved, setSolved] = useState(new Set());
  const [errors, setErrors] = useState(new Set());
  const [status, setStatus] = useState("idle");
  const [selected, setSelected] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const handleInput = useCallback((r, c, val) => {
    if (given.has(`${r}-${c}`)) return;
    const v = val.replace(/[^1-9]/g, "").slice(-1);
    const ng = grid.map(row => [...row]);
    ng[r][c] = v;
    setSolved(new Set());
    setStatus("idle");
    setErrors(validateGrid(ng));
    setGrid(ng);
  }, [grid, given]);

  const loadSample = () => {
    const g = SAMPLE_PUZZLE.map(r => [...r]);
    const g2 = new Set();
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (g[r][c] !== "") g2.add(`${r}-${c}`);
    setGrid(g); setGiven(g2); setSolved(new Set());
    setErrors(new Set()); setStatus("idle"); setSelected(null);
    setShowUpload(false); setPreviewUrl(null); setScanStatus("");
  };

  const handleSolve = () => {
    setStatus("solving");
    setTimeout(() => {
      const result = solve(grid);
      if (!result) {
        setStatus("fail");
      } else {
        const newSolved = new Set();
        for (let r = 0; r < 9; r++)
          for (let c = 0; c < 9; c++)
            if (grid[r][c] === "" && result[r][c] !== "") newSolved.add(`${r}-${c}`);
        setGrid(result); setSolved(newSolved);
        setErrors(new Set()); setStatus("success");
      }
    }, 300);
  };

  const handleClear = () => {
    setGrid(emptyGrid()); setGiven(new Set()); setSolved(new Set());
    setErrors(new Set()); setStatus("idle"); setSelected(null);
    setPreviewUrl(null); setShowUpload(false); setScanStatus("");
  };

  const handleKeyDown = (e, r, c) => {
    if (e.key === "ArrowRight") setSelected([r, Math.min(c + 1, 8)]);
    if (e.key === "ArrowLeft") setSelected([r, Math.max(c - 1, 0)]);
    if (e.key === "ArrowDown") setSelected([Math.min(r + 1, 8), c]);
    if (e.key === "ArrowUp") setSelected([Math.max(r - 1, 0), c]);
    if (e.key === "Backspace" || e.key === "Delete") handleInput(r, c, "");
  };

  const isHighlighted = (r, c) => {
    if (!selected) return false;
    const [sr, sc] = selected;
    return sr === r || sc === c || (Math.floor(sr/3)===Math.floor(r/3) && Math.floor(sc/3)===Math.floor(c/3));
  };

  const getCellBg = (r, c, isError, isSel, isHigh) => {
    if (isError) return "#ffe0e0";
    const bi = boxIndex(r, c);
    if (isSel) return BOX_COLORS_DARKER[bi];
    if (isHigh) return BOX_COLORS[bi];
    return BOX_COLORS[bi];
  };

  const processImage = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setScanStatus("Please upload an image file.");
      return;
    }
    setScanning(true);
    setScanStatus("Scanning puzzle with AI…");
    setShowUpload(false);

    try {
      const dataUrl = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      setPreviewUrl(dataUrl);
      const base64 = dataUrl.split(",")[1];

      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: file.type, data: base64 } },
              {
                type: "text",
                text: `Analyze this Sudoku puzzle image carefully. Extract the full 9x9 grid.
Return ONLY a JSON object with no other text, preamble, or markdown backticks:
{"grid":[[r0c0,r0c1,r0c2,r0c3,r0c4,r0c5,r0c6,r0c7,r0c8],[r1c0,...],...]]}
Use 0 for empty/blank cells and the digit 1-9 for filled cells.
Read every row carefully from top to bottom, left to right.`
              }
            ]
          }]
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const text = data.content.map(b => b.text || "").join("").trim();
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      if (!parsed.grid || parsed.grid.length !== 9) throw new Error("Invalid grid");

      const newGrid = parsed.grid.map(row =>
        row.map(v => (v === 0 || v === "0" || v === "") ? "" : String(v))
      );
      const newGiven = new Set();
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if (newGrid[r][c] !== "") newGiven.add(`${r}-${c}`);

      setGrid(newGrid); setGiven(newGiven); setSolved(new Set());
      setErrors(validateGrid(newGrid)); setStatus("idle");
      setScanStatus(`✓ Detected ${newGiven.size} clues — review then hit Solve`);
    } catch (err) {
      console.error(err);
      setScanStatus(`⚠ ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImage(file);
  };

  return (
    <>
      <style>{`
        @import url('${FONT}');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f5f7ff; }

        .app {
          min-height: 100vh;
          background: #f5f7ff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem 3rem;
          font-family: 'Nunito', sans-serif;
          color: #2d2d3a;
        }

        .title {
          font-family: 'Nunito', sans-serif;
          font-size: clamp(2.2rem, 6vw, 3.8rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #2d2d3a;
          margin-bottom: 0.15rem;
          text-align: center;
        }
        .title span { color: #7c6fea; }

        .subtitle {
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #9a96b4;
          margin-bottom: 2rem;
          text-align: center;
        }

        .board-wrap {
          background: white;
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 8px 40px rgba(100,90,200,0.12), 0 2px 8px rgba(0,0,0,0.06);
        }

        .board {
          display: grid;
          grid-template-columns: repeat(9, 1fr);
          border: 3px solid #3d3a5c;
          border-radius: 6px;
          overflow: hidden;
          width: min(85vw, 486px);
          height: min(85vw, 486px);
        }

        .cell {
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(100,90,160,0.18);
          cursor: pointer;
          transition: filter 0.1s;
          position: relative;
        }
        .cell:hover { filter: brightness(0.95); }

        /* Bold box borders */
        .cell.box-border-right  { border-right: 2.5px solid #3d3a5c; }
        .cell.box-border-bottom { border-bottom: 2.5px solid #3d3a5c; }

        .cell.selected { filter: brightness(0.88) !important; }
        .cell.error { background: #ffe0e0 !important; }

        .cell input {
          width: 100%; height: 100%;
          background: transparent;
          border: none; outline: none;
          text-align: center;
          font-family: 'Nunito', sans-serif;
          font-size: clamp(1.2rem, 3.5vw, 1.8rem);
          font-weight: 700;
          color: #4a4870;
          cursor: pointer;
          caret-color: transparent;
        }
        .cell.given input  { color: #2d2d3a; font-weight: 800; }
        .cell.solved input { color: #22a05a; font-weight: 700; }
        .cell.error input  { color: #d03030; font-weight: 700; }

        .controls {
          display: flex; gap: 0.6rem;
          margin-top: 1.5rem;
          flex-wrap: wrap; justify-content: center;
        }

        .btn {
          padding: 0.6rem 1.3rem;
          border-radius: 50px;
          border: 2px solid transparent;
          font-family: 'Nunito', sans-serif;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.18s;
        }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .btn-default {
          background: white;
          border-color: #d0cde8;
          color: #5a5880;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }
        .btn-default:hover:not(:disabled) {
          border-color: #7c6fea; color: #7c6fea;
          box-shadow: 0 2px 10px rgba(124,111,234,0.2);
        }

        .btn-solve {
          background: linear-gradient(135deg, #7c6fea, #a78bfa);
          color: white; border-color: transparent;
          box-shadow: 0 4px 14px rgba(124,111,234,0.35);
        }
        .btn-solve:hover:not(:disabled) {
          box-shadow: 0 6px 18px rgba(124,111,234,0.5);
          transform: translateY(-1px);
        }

        .btn-scan {
          background: white;
          border-color: #6ab4d4;
          color: #3a90b8;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }
        .btn-scan:hover:not(:disabled), .btn-scan.active {
          background: #e8f6fd; border-color: #3a90b8;
        }

        .btn-clear {
          background: white;
          border-color: #f0a0a0;
          color: #c05050;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }
        .btn-clear:hover:not(:disabled) {
          background: #fff0f0; border-color: #c05050;
        }

        .solve-status {
          margin-top: 1rem;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          height: 1.4em;
          text-align: center;
        }
        .solve-status.success { color: #22a05a; }
        .solve-status.fail    { color: #d03030; }
        .solve-status.solving { color: #7c6fea; }
        .solve-status.conflict { color: #e07020; }

        /* Upload panel */
        .upload-panel {
          margin-top: 1.2rem;
          width: min(85vw, 486px);
          animation: fadeSlide 0.2s ease;
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .drop-zone {
          border: 2px dashed #6ab4d4;
          border-radius: 12px;
          padding: 2.2rem 1rem;
          text-align: center; cursor: pointer;
          background: #f0f8fd;
          transition: all 0.2s;
        }
        .drop-zone:hover, .drop-zone.over {
          background: #e0f2fa; border-color: #3a90b8;
        }
        .drop-icon { font-size: 2rem; margin-bottom: 0.6rem; }
        .drop-label {
          font-size: 0.8rem; font-weight: 700;
          color: #3a90b8; line-height: 1.8;
        }
        .drop-sub {
          font-size: 0.68rem; color: #90b8d0;
          font-weight: 600; margin-top: 0.3rem;
        }

        .scan-result {
          margin-top: 1rem;
          width: min(85vw, 486px);
          display: flex; gap: 1rem; align-items: center;
          background: white; border-radius: 12px;
          padding: 0.8rem 1rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.07);
          animation: fadeSlide 0.2s ease;
        }
        .preview-img {
          width: 80px; height: 80px;
          object-fit: cover; border-radius: 8px;
          border: 2px solid #e0e0f0; flex-shrink: 0;
        }
        .scan-info { flex: 1; }
        .scan-msg {
          font-size: 0.78rem; font-weight: 700;
          line-height: 1.6;
        }
        .scan-msg.ok      { color: #22a05a; }
        .scan-msg.err     { color: #d03030; }
        .scan-msg.loading { color: #3a90b8; }
        .spinner {
          display: inline-block; width: 12px; height: 12px;
          border: 2.5px solid #3a90b8; border-top-color: transparent;
          border-radius: 50%; animation: spin 0.65s linear infinite;
          vertical-align: middle; margin-right: 6px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .rescan-btn {
          margin-top: 0.4rem;
          font-size: 0.7rem; font-weight: 600;
          color: #90a0b8; background: none; border: none;
          cursor: pointer; text-decoration: underline;
          font-family: 'Nunito', sans-serif; padding: 0;
        }
        .rescan-btn:hover { color: #3a90b8; }

        .legend {
          margin-top: 1.5rem;
          display: flex; gap: 1.4rem;
          font-size: 0.7rem; font-weight: 700;
          color: #9a96b4;
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .dot {
          display: inline-block; width: 8px; height: 8px;
          border-radius: 50%; margin-right: 5px; vertical-align: middle;
        }
      `}</style>

      <div className="app">
        <h1 className="title">Su<span>doku</span></h1>
        <p className="subtitle">Solver & Playground</p>

        <div className="board-wrap">
          <div className="board">
            {grid.map((row, r) =>
              row.map((val, c) => {
                const key = `${r}-${c}`;
                const isGiven = given.has(key);
                const isSolvedCell = solved.has(key);
                const isError = errors.has(key);
                const isSel = selected && selected[0] === r && selected[1] === c;
                const isHigh = isHighlighted(r, c);

                const bi = boxIndex(r, c);
                const bg = isError ? "#ffe0e0" : isSel ? BOX_COLORS_DARKER[bi] : BOX_COLORS[bi];

                let cls = "cell";
                if (isError) cls += " error";
                if (isSel) cls += " selected";
                if (isGiven) cls += " given";
                if (isSolvedCell) cls += " solved";
                // thick borders on box edges (not outermost)
                if ((c + 1) % 3 === 0 && c !== 8) cls += " box-border-right";
                if ((r + 1) % 3 === 0 && r !== 8) cls += " box-border-bottom";

                return (
                  <div key={key} className={cls} style={{ background: bg }} onClick={() => setSelected([r, c])}>
                    <input
                      value={val}
                      onChange={e => handleInput(r, c, e.target.value)}
                      onKeyDown={e => handleKeyDown(e, r, c)}
                      onFocus={() => setSelected([r, c])}
                      maxLength={1}
                      readOnly={isGiven}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="controls">
          <button
            className={`btn btn-scan${showUpload ? " active" : ""}`}
            onClick={() => { setShowUpload(v => !v); setScanStatus(""); }}
            disabled={scanning}
          >
            📷 Scan Image
          </button>
          <button className="btn btn-default" onClick={loadSample} disabled={scanning}>Sample</button>
          <button
            className="btn btn-solve"
            onClick={handleSolve}
            disabled={status === "solving" || scanning || errors.size > 0}
          >
            {status === "solving" ? "Solving…" : "✨ Solve"}
          </button>
          <button className="btn btn-clear" onClick={handleClear} disabled={scanning}>Clear</button>
        </div>

        <div className={`solve-status ${status === "idle" && errors.size > 0 ? "conflict" : status}`}>
          {status === "success" && "✓ Puzzle solved!"}
          {status === "fail" && "No solution found — check your inputs"}
          {status === "solving" && "Solving…"}
          {errors.size > 0 && status === "idle" && "Conflicts detected"}
        </div>

        {showUpload && !scanning && !previewUrl && (
          <div className="upload-panel">
            <div
              className={`drop-zone${dragOver ? " over" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="drop-icon">🔍</div>
              <div className="drop-label">Drop a puzzle photo here<br/>or click to browse</div>
              <div className="drop-sub">JPG · PNG · WEBP · HEIC</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>
        )}

        {(previewUrl || scanning) && (
          <div className="scan-result">
            {previewUrl && <img src={previewUrl} className="preview-img" alt="Uploaded puzzle" />}
            <div className="scan-info">
              <div className={`scan-msg ${scanning ? "loading" : scanStatus.startsWith("✓") ? "ok" : scanStatus.startsWith("⚠") ? "err" : "loading"}`}>
                {scanning && <span className="spinner" />}
                {scanStatus}
              </div>
              {!scanning && (
                <button
                  className="rescan-btn"
                  onClick={() => { setPreviewUrl(null); setScanStatus(""); setShowUpload(true); }}
                >
                  Upload a different image
                </button>
              )}
            </div>
          </div>
        )}

        <div className="legend">
          <span><span className="dot" style={{background:"#2d2d3a"}}/>Given</span>
          <span><span className="dot" style={{background:"#22a05a"}}/>Solved</span>
          <span><span className="dot" style={{background:"#d03030"}}/>Conflict</span>
        </div>
      </div>
    </>
  );
}
