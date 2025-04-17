
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
  const userInput = document.getElementById("input").value.replaceAll("'", "\'");
  const script = `run_command('${userInput}')`;
  try {
    const result = await pyodide.runPythonAsync(script);
    document.getElementById("output").textContent = result;
    document.getElementById("input").value = "";
  } catch (err) {
    document.getElementById("output").textContent = "❌ Error: " + err;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("input").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runPython();
    }
  });
});

loadPyodideAndPackages();
