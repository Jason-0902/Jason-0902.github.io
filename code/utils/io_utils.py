### utils/io_utils.py ###

import pandas as pd

# 顯示欄位名稱與資料型別（相當於 SQL 的 DESCRIBE）
# 範例：show_schema(df, "students")
def show_schema(df: pd.DataFrame, table_name: str = "資料表"):
    if df.empty:
        print(f"[SCHEMA] `{table_name}` 為空表格")
        return

    print(f"\n 表格 `{table_name}` 結構")
    print(f" 共 {len(df)} 筆資料，{len(df.columns)} 欄位")
    print("-" * 40)
    print(df.dtypes.rename("資料型別"))
    print("-" * 40)
