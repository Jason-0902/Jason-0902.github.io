const tables = {};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("input").addEventListener("keydown", e => {
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
  document.getElementById("input").value = "";

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
      const t = tables[name];
      if (!t) throw `❌ Table '${name}' not found`;
      if (values.length !== t.schema.length) throw `❌ Expected ${t.schema.length} values`;
      t.rows.push(values);
      result = `✅ Inserted into '${name}': (${values.join(", ")})`;
      showTable = name;

    } else if (cmd.startsWith("SELECT")) {
      const [, name] = input.match(/SELECT \* FROM (\w+)/i);
      const t = tables[name];
      if (!t) throw `❌ Table '${name}' not found`;
      if (t.rows.length === 0) return `⚠️ Table '${name}' is empty`;
      result = formatTable(t);

    } else if (cmd.startsWith("PROJECT")) {
      const [, colsRaw, name] = input.match(/PROJECT (.+) FROM (\w+)/i);
      const cols = colsRaw.split(",").map(c => c.trim());
      const t = tables[name];
      if (!t) throw `❌ Table '${name}' not found`;
      const indices = cols.map(c => {
        const idx = t.schema.indexOf(c);
        if (idx === -1) throw `❌ Column '${c}' not in '${name}'`;
        return idx;
      });
      const projected = t.rows.map(row => indices.map(i => row[i]));
      result = formatRows(cols, projected);

    } else if (cmd.startsWith("RENAME")) {
      const [, oldCol, newCol, name] = input.match(/RENAME (\w+) TO (\w+) IN (\w+)/i);
      const t = tables[name];
      if (!t) throw `❌ Table '${name}' not found`;
      const idx = t.schema.indexOf(oldCol);
      if (idx === -1) throw `❌ Column '${oldCol}' not found`;
      t.schema[idx] = newCol;
      result = `✅ Renamed '${oldCol}' to '${newCol}'`;

    } else if (cmd.startsWith("UNION")) {
      const [, a, b, colsRaw] = input.match(/UNION (\w+), (\w+) BY (.+)/i);
      result = setOp("union", a, b, colsRaw);

    } else if (cmd.startsWith("DIFFERENCE")) {
      const [, a, b, colsRaw] = input.match(/DIFFERENCE (\w+), (\w+) BY (.+)/i);
      result = setOp("difference", a, b, colsRaw);

    } else if (cmd.startsWith("INTERSECT")) {
      const [, a, b, colsRaw] = input.match(/INTERSECT (\w+), (\w+) BY (.+)/i);
      result = setOp("intersect", a, b, colsRaw);

    } else if (cmd.startsWith("DIVIDE")) {
      const [, a, b] = input.match(/DIVIDE (\w+) BY (\w+)/i);
      const t1 = tables[a], t2 = tables[b];
      if (!t1 || !t2) throw "❌ Table(s) not found";
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
      if (!t1 || !t2) throw `❌ Table(s) not found`;
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
      const t = tables[name];
      if (!t) throw `❌ Table '${name}' not found`;
      result = `📄 ${name} SCHEMA: [${t.schema.join(", ")}]`;

    } else if (cmd.startsWith("SELECT")) {
      const [, name] = input.match(/SELECT (.+) FROM (\w+)/i);
      const [, columns, condition] = input.match(/SELECT (.+) FROM (\w+)(?: WHERE (.+))?/i);
      const t = tables[condition ? condition.split(" ")[0] : name];
      if (!t) throw `❌ Table '${name}' not found`;
      let rows = t.rows;
      if (condition) {
        const col = condition.split(" ")[0];
        const op = condition.split(" ")[1];
        const val = condition.split(" ")[2].replace(/^['"]|['"]$/g, "");
        const idx = t.schema.indexOf(col);
        if (idx === -1) throw `❌ Column '${col}' not found`;
        rows = rows.filter(row => {
          const v = row[idx];
          return eval(`'${v}' ${op} '${val}'`);
        });
      }
      result = formatTable({ schema: t.schema, rows });

    } else {
      result = "❌ Unsupported command";
    }

    output.textContent = result;
    if (showTable && tables[showTable])
      tableView.innerHTML = `<h3>📊 ${showTable}</h3><pre>${formatTable(tables[showTable])}</pre>`;

  } catch (err) {
    output.textContent = typeof err === "string" ? err : "❌ Error: " + err.message;
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

function setOp(type, a, b, colsRaw) {
  const t1 = tables[a], t2 = tables[b];
  if (!t1 || !t2) throw "❌ Table(s) not found";
  const cols = colsRaw.split(",").map(c => c.trim());
  const idxs1 = cols.map(c => t1.schema.indexOf(c));
  const idxs2 = cols.map(c => t2.schema.indexOf(c));
  const r1 = t1.rows.map(r => idxs1.map(i => r[i]).join("|"));
  const r2 = t2.rows.map(r => idxs2.map(i => r[i]).join("|"));
  let final = [];
  if (type === "union") final = [...new Set([...r1, ...r2])];
  if (type === "difference") final = r1.filter(x => !new Set(r2).has(x));
  if (type === "intersect") final = r1.filter(x => new Set(r2).has(x));
  return formatRows(cols, final.map(x => x.split("|")));
}
