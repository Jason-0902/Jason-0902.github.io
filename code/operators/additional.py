### operators/additional.py ###

import pandas as pd

# 交集操作
def intersection(df1: pd.DataFrame, df2: pd.DataFrame) -> pd.DataFrame:
    try:
        if df1.empty or df2.empty:
            print("[intersection] 表格為空")
            return pd.DataFrame()
        if set(df1.columns) != set(df2.columns):
            print(f"[intersection] 欄位不一致\ndf1: {list(df1.columns)}\ndf2: {list(df2.columns)}")
            return df1
        return pd.merge(df1, df2)
    except Exception as e:
        print(f"[intersection] 錯誤：{e}")
        return df1

# 除法
def division(dividend: pd.DataFrame, divisor: pd.DataFrame) -> pd.DataFrame:
    try:
        if dividend.empty or divisor.empty:
            print("[division] ⚠️ 輸入表為空")
            return pd.DataFrame()
        common = list(divisor.columns)
        if not set(common).issubset(set(dividend.columns)):
            print(f"[division] 除數欄位不存在於被除表\n除數欄位：{common}\n被除欄位：{list(dividend.columns)}")
            return dividend
        grouped = dividend.groupby(common).size().reset_index().iloc[:, :-1]
        return grouped
    except Exception as e:
        print(f"[division] 錯誤：{e}")
        return dividend

# NATURAL JOIN
def natural_join(df1: pd.DataFrame, df2: pd.DataFrame) -> pd.DataFrame:
    try:
        if df1.empty or df2.empty:
            print("[natural_join] 有一個表為空")
            return pd.DataFrame()
        common = list(set(df1.columns) & set(df2.columns))
        if not common:
            print("[natural_join] 無共同欄位，無法 natural join")
            return df1
        return pd.merge(df1, df2, on=common)
    except Exception as e:
        print(f"[natural_join] 錯誤：{e}")
        return df1
