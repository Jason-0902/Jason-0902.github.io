let pyodideReady = false;

async function loadPyodideAndPackages() {
  const pyodide = await loadPyodide();
  await pyodide.loadPackage(["pandas"]);
  const code = document.getElementById("pycode").textContent;
  pyodide.runPython(code);
  window.pyodide = pyodide;
  pyodideReady = true;
}

async function runPython() {
  if (!pyodideReady) {
    document.getElementById("output").textContent = "⏳ Pyodide is still loading...";
    return;
  }

  // ✅ 使用 JSON.stringify() 處理輸入，避免引號錯誤
  const userInput = document.getElementById("input").value;
  const safeCode = `run_command(${JSON.stringify(userInput)})`;

  try {
    const result = await pyodide.runPythonAsync(safeCode);
    document.getElementById("output").textContent = result;
  } catch (err) {
    document.getElementById("output").textContent = "❌ Error: " + err;
  }

  // ✅ 執行後自動清空輸入欄
  document.getElementById("input").value = "";
}

// ⌨️ Enter 執行、Shift+Enter 換行
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("input").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runPython();
    }
  });
});

loadPyodideAndPackages();
