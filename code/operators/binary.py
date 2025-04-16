### operators/binary.py ###

import pandas as pd

# 將兩個資料表合併並去除重複值（相當於 SQL 的 UNION）
def union(df1: pd.DataFrame, df2: pd.DataFrame) -> pd.DataFrame:
    try:
        if df1.empty and df2.empty:
            print("[union] 兩個表皆為空")
            return pd.DataFrame()
        if set(df1.columns) != set(df2.columns):
            print(f"[union] 欄位不一致\ndf1: {list(df1.columns)}\ndf2: {list(df2.columns)}")
            return df1
        return pd.concat([df1, df2]).drop_duplicates().reset_index(drop=True)
    except Exception as e:
        print(f"[union] 錯誤：{e}")
        return df1

# 取出只存在於 df1 而不在 df2 的資料列
def difference(df1: pd.DataFrame, df2: pd.DataFrame) -> pd.DataFrame:
    try:
        if df1.empty:
            print("[difference] df1 為空")
            return df1
        if set(df1.columns) != set(df2.columns):
            print(f"[difference] 欄位不一致\n目前欄位 df1: {list(df1.columns)}\ndf2: {list(df2.columns)}")
            return df1
        return pd.merge(df1, df2, how='outer', indicator=True).query('_merge == "left_only"').drop('_merge', axis=1)
    except Exception as e:
        print(f"[difference] 錯誤：{e}")
        return df1

# Cartesian product
def cartesian_product(df1: pd.DataFrame, df2: pd.DataFrame) -> pd.DataFrame:
    try:
        if df1.empty or df2.empty:
            print("[cartesian_product] 有一個表為空")
            return pd.DataFrame()
        df1['_tmp'] = 1
        df2['_tmp'] = 1
        result = pd.merge(df1, df2, on='_tmp').drop('_tmp', axis=1)
        df1.drop('_tmp', axis=1, inplace=True)
        df2.drop('_tmp', axis=1, inplace=True)
        return result
    except Exception as e:
        print(f"[cartesian_product] 錯誤：{e}")
        return df1
