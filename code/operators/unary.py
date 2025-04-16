### operators/unary.py ###

import pandas as pd

# 選擇操作：回傳符合條件的資料列（相當於 SQL 的 WHERE）
# 範例：select(df, "age > 30 and gender == 'F'")
def select(df: pd.DataFrame, condition: str) -> pd.DataFrame:
    try:
        if df.empty:
            print("[select] 資料表為空，無法執行查詢")
            return df
        if not condition:
            print("[select] 請提供有效的條件字串")
            return df
        return df.query(condition)
    except Exception as e:
        print(f"[select] 錯誤：無法根據條件查詢 -> {condition}\n[提示] 現有欄位：{list(df.columns)}\n[例子] age > 30, name == 'Alice'\n錯誤訊息：{e}")
        return df

# 投影操作：只保留指定的欄位（相當於 SQL 的 SELECT col1, col2）
# 範例：project(df, ["name", "age"])
def project(df: pd.DataFrame, columns: list) -> pd.DataFrame:
    try:
        if df.empty:
            print("[project] 資料表為空，無法執行投影")
            return df
        return df[columns]
    except Exception as e:
        print(f"[project] 錯誤：選取欄位失敗 -> {columns}\n[提示] 可用欄位：{list(df.columns)}\n錯誤訊息：{e}")
        return df

# 欄位重新命名（相當於 SQL 的 RENAME col TO new_col）
# 範例：rename(df, {"name": "full_name"})
def rename(df: pd.DataFrame, rename_map: dict) -> pd.DataFrame:
    try:
        if df.empty:
            print("[rename] 資料表為空，無法重新命名")
            return df
        for col in rename_map:
            if col not in df.columns:
                print(f"[rename] 欄位 `{col}` 不存在，無法重新命名")
                print(f"[提示] 目前欄位：{list(df.columns)}")
                return df
        return df.rename(columns=rename_map)
    except Exception as e:
        print(f"[rename] 錯誤：無法重新命名欄位 {rename_map}\n錯誤訊息：{e}")
        return df
