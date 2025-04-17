const tables = {};

document.addEventListener("DOMContentLoaded", () => {
  const inputBox = document.getElementById("input");

  // ✅ 按下 Enter 自動執行（Shift+Enter 另起一行）
  inputBox.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runCommand();
    }
  });
});

function runCommand() {
  const input = document.getElementById("input").value.trim();
  const output = document.getElementById("output");
  const tableView = document.getElementById("table-view");
  document.getElementById("input").value = ""; // ✅ 清空輸入欄位

  try {
    const cmd = input.toUpperCase();
    let result = "";
    let showTable = null;

    if (cmd.startsWith("CREATE TABLE")) {
      const [, name, colsRaw] = input.match(/CREATE TABLE (\w+)\s*\((.+)\)/i);
      const cols = colsRaw.split(",").map(c => c.trim());
      tables[name] = { schema: cols, rows: [] };
      result = `✅ Created table '${name}' with columns: ${cols.join(", ")}`;

    } else if (cmd.startsWith("INSERT INTO")) {
      const [, name, valuesRaw] = input.match(/INSERT INTO (\w+)\s*VALUES\s*\((.+)\)/i);
      const values = valuesRaw.split(",").map(v => v.trim().replace(/^['"]|['"]$/g, ""));
      if (!tables[name]) throw `Table '${name}' not found`;
      if (values.length !== tables[name].schema.length) throw `Expected ${tables[name].schema.length} values`;
      tables[name].rows.push(values);
      result = `✅ Inserted into '${name}': (${values.join(", ")})`;
      showTable = name;

    } else if (cmd.startsWith("SELECT * FROM")) {
      const [, name] = input.match(/SELECT \* FROM (\w+)/i);
      if (!tables[name]) throw `Table '${name}' not found`;
      result = formatTable(tables[name]);

    } else if (cmd.startsWith("PROJECT")) {
      const [, colsRaw, name] = input.match(/PROJECT (.+) FROM (\w+)/i);
      const cols = colsRaw.split(",").map(c => c.trim());
      if (!tables[name]) throw `Table '${name}' not found`;
      const indices = cols.map(c => tables[name].schema.indexOf(c));
      result = formatRows(cols, tables[name].rows.map(row => indices.map(i => row[i])));

    } else if (cmd.startsWith("RENAME")) {
      const [, oldCol, newCol, name] = input.match(/RENAME (\w+) TO (\w+) IN (\w+)/i);
      const table = tables[name];
      if (!table) throw `Table '${name}' not found`;
      const idx = table.schema.indexOf(oldCol);
      if (idx === -1) throw `Column '${oldCol}' not found`;
      table.schema[idx] = newCol;
      result = `✅ Renamed '${oldCol}' to '${newCol}'`;

    } else if (cmd.startsWith("UNION")) {
      const [, a, b, colsRaw] = input.match(/UNION (\w+), (\w+) BY (.+)/i);
      const cols = colsRaw.split(",").map(c => c.trim());
      result = setOp("union", a, b, cols);

    } else if (cmd.startsWith("DIFFERENCE")) {
      const [, a, b, colsRaw] = input.match(/DIFFERENCE (\w+), (\w+) BY (.+)/i);
      const cols = colsRaw.split(",").map(c => c.trim());
      result = setOp("difference", a, b, cols);

    } else if (cmd.startsWith("INTERSECT")) {
      const [, a, b, colsRaw] = input.match(/INTERSECT (\w+), (\w+) BY (.+)/i);
      const cols = colsRaw.split(",").map(c => c.trim());
      result = setOp("intersect", a, b, cols);

    } else if (cmd.startsWith("DIVIDE")) {
      const [, a, b] = input.match(/DIVIDE (\w+) BY (\w+)/i);
      const t1 = tables[a], t2 = tables[b];
      const shared = t2.schema;
      const remaining = t1.schema.filter(c => !shared.includes(c));
      const grouped = {};
      for (const row of t1.rows) {
        const key = remaining.map(c => row[t1.schema.indexOf(c)]).join("|");
        grouped[key] = grouped[key] || [];
        grouped[key].push(shared.map(c => row[t1.schema.indexOf(c)]).join("|"));
      }
      const allShared = new Set(t2.rows.map(r => r.join("|")));
      const res = [];
      for (const [key, vals] of Object.entries(grouped)) {
        if ([...allShared].every(v => vals.includes(v))) res.push(key.split("|"));
      }
      result = formatRows(remaining, res);

    } else if (cmd.startsWith("JOIN")) {
      const [, a, b] = input.match(/JOIN (\w+), (\w+)/i);
      const t1 = tables[a], t2 = tables[b];
      const shared = t1.schema.filter(c => t2.schema.includes(c));
      const resultSchema = [...t1.schema, ...t2.schema.filter(c => !shared.includes(c))];
      const rows = [];
      for (const r1 of t1.rows) {
        for (const r2 of t2.rows) {
          if (shared.every(c => r1[t1.schema.indexOf(c)] === r2[t2.schema.indexOf(c)])) {
            const joined = [...r1, ...t2.schema.filter(c => !shared.includes(c)).map(c => r2[t2.schema.indexOf(c)])];
            rows.push(joined);
          }
        }
      }
      result = formatRows(resultSchema, rows);

    } else if (cmd.startsWith("SHOW SCHEMA")) {
      const [, name] = input.match(/SHOW SCHEMA (\w+)/i);
      const table = tables[name];
      result = `📄 ${name}: ${table.schema.join(", ")}`;

    } else {
      result = "❌ Unsupported command";
    }

    output.textContent = result;

    // ✅ 插入完自動顯示該表內容
    if (showTable && tables[showTable]) {
      tableView.innerHTML = `<h3>📊 ${showTable}</h3><pre>${formatTable(tables[showTable])}</pre>`;
    }

  } catch (err) {
    output.textContent = `❌ Error: ${err}`;
  }
}

function formatTable(t) {
  return formatRows(t.schema, t.rows);
}

function formatRows(cols, rows) {
  const pad = s => String(s).padEnd(12);
  const header = cols.map(pad).join("");
  const body = rows.map(r => r.map(pad).join("")).join("\n");
  return header + "\n" + "-".repeat(header.length) + "\n" + body;
}

function setOp(type, a, b, cols) {
  const t1 = tables[a], t2 = tables[b];
  const idxs = cols.map(c => t1.schema.indexOf(c));
  const rows1 = new Set(t1.rows.map(r => idxs.map(i => r[i]).join("|")));
  const rows2 = new Set(t2.rows.map(r => idxs.map(i => r[i]).join("|")));
  let final = [];
  if (type === "union") final = [...new Set([...rows1, ...rows2])];
  if (type === "difference") final = [...rows1].filter(x => !rows2.has(x));
  if (type === "intersect") final = [...rows1].filter(x => rows2.has(x));
  return formatRows(cols, final.map(r => r.split("|")));
}
