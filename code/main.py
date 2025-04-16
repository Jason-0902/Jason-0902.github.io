from operators.unary import select, project, rename
from operators.binary import union, difference, cartesian_product
from operators.additional import intersection, division, natural_join
from utils.io_utils import show_schema
import pandas as pd

tables = {}

def parse_values(raw: str):
    raw = raw.strip().strip("()")
    parts = [p.strip().strip("'\"") for p in raw.split(",")]
    return [int(p) if p.isdigit() else p for p in parts]

def input_table(prompt):
    name = input(prompt).strip()
    if name not in tables:
        print(f"[錯誤] 表格 `{name}` 不存在")
        return None
    return name, tables[name]

def main():
    print("=== 關係代數 CLI(互動式模式) ===")

    while True:
        print("\n[可用指令] create / insert / select / rename / project / union / difference / cartesian / intersect / divide / join / show / schema / quit")
        cmd = input("輸入指令: ").strip().lower()

        if cmd == "quit":
            print("see you")
            break

        elif cmd == "create":
            name = input("請輸入表格名稱:").strip()
            cols = input("請輸入欄位(用逗號分隔):").split(",")
            cols = [c.strip() for c in cols]
            tables[name] = pd.DataFrame(columns=cols)
            print(f"[create] 已建立表 `{name}`，欄位為:{cols}")

        elif cmd == "insert":
            name, df = input_table("請輸入要插入的表格名稱：")
            if df is None: continue
            print(f"[insert] 欄位：{list(df.columns)}")
            raw = input(f"請輸入資料(格式如:1, 'Alice', 30):")
            values = parse_values(raw)
            if len(values) != len(df.columns):
                print(f"[insert] 欄位數不符，需 {len(df.columns)} 個欄位")
            else:
                df.loc[len(df)] = values
                print(f"[insert] 已插入 {values}")

        elif cmd == "select":
            name, df = input_table("請輸入要查詢的表格名稱：")
            if df is None: continue
            print(f"[select] 該表欄位有：{list(df.columns)}")
            cols = input("請輸入要查詢的欄位(用逗號分隔，或 * 表示全部):").strip()
            condition = input("請輸入查詢條件(可留空):").strip()
            df_query = select(df, condition) if condition else df
            if cols == "*":
                print(df_query)
            else:
                col_list = [c.strip() for c in cols.split(",")]
                print(project(df_query, col_list))

        elif cmd == "project":
            name, df = input_table("請輸入表格名稱:")
            if df is None: continue
            print(f"[project] 可用欄位: {list(df.columns)}")
            cols = input("請輸入欄位(用逗號分隔):").split(",")
            col_list = [c.strip() for c in cols]
            print(project(df, col_list))

        elif cmd == "rename":
            name, df = input_table("請輸入要重新命名欄位的表格:")
            if df is None: continue
            print(f"[rename] 可用欄位：{list(df.columns)}")
            old = input("請輸入要更名的欄位:").strip()
            new = input("請輸入新名稱:").strip()
            tables[name] = rename(df, {old: new})
            print(f"[rename] `{old}` → `{new}`")
            
        elif cmd == "union":
            name1, df1 = input_table("請輸入第一個表格名稱:")
            if df1 is None: continue
            print(f"第一張表 `{name1}` 的欄位：{list(df1.columns)}")
            cols1 = input("請輸入第一張表欲選取的欄位(逗號分隔):").split(",")
            cols1 = [c.strip() for c in cols1]

            name2, df2 = input_table("請輸入第二個表格名稱：")
            if df2 is None: continue
            print(f"第二張表 `{name2}` 的欄位：{list(df2.columns)}")
            cols2 = input("請輸入第二張表欲選取的欄位(順序需對應上方，逗號分隔):").split(",")
            cols2 = [c.strip() for c in cols2]

            if len(cols1) != len(cols2):
                print(f"[union] 兩邊選取的欄位數不一致 表1: {len(cols1)}, 表2: {len(cols2)}")
                continue

            try:
                proj1 = project(df1, cols1)
                proj2 = project(df2, cols2)
                result = union(proj1, proj2)
                print("[union] 結果如下:")
                print(result.to_string(index=False, header=False))

            except Exception as e:
                print(f"[union] 錯誤：{e}")

        elif cmd == "join":
            name1, df1 = input_table("請輸入第一個表格名稱：")
            if df1 is None: continue
            name2, df2 = input_table("請輸入第二個表格名稱：")
            if df2 is None: continue

            print(f" `{name1}` 欄位：{list(df1.columns)}")
            print(f" `{name2}` 欄位：{list(df2.columns)}")

            from operators.additional import natural_join
            joined = natural_join(df1, df2)

            if joined.empty:
                print("[join] JOIN 結果為空")
                continue

            print(f" JOIN 成功，可用欄位：{list(joined.columns)}")
            cols = input("請輸入要顯示的欄位（逗號分隔，或留空顯示全部）：").strip()
            if not cols:
                print(joined)
            else:
                col_list = [c.strip() for c in cols.split(",") if c.strip() in joined.columns]
                if col_list:
                    print(joined[col_list])
                else:
                    print("[join] 無有效欄位輸入，將顯示所有欄位")
                    print(joined)

        elif cmd in {"difference", "cartesian", "intersect", "divide"}:
            name1, df1 = input_table("請輸入第一個表格名稱：")
            if df1 is None: continue
            name2, df2 = input_table("請輸入第二個表格名稱：")
            
            if df2 is None: continue
            elif cmd == "difference":
                print(difference(df1, df2))
            elif cmd == "cartesian":
                print(cartesian_product(df1, df2))
            elif cmd == "intersect":
                print(intersection(df1, df2))
            elif cmd == "divide":
                print(division(df1, df2))

        elif cmd == "show":
            name, df = input_table("請輸入要顯示的表格名稱：")
            if df is not None:
                print(df)

        elif cmd == "schema":
            name, df = input_table("請輸入要顯示欄位結構的表格名稱：")
            if df is not None:
                show_schema(df, name)

        else:
            print("無效指令，請重新輸入")

if __name__ == "__main__":
    main()
