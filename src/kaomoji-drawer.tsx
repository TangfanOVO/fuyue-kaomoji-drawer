import { useEffect, useMemo, useState } from "react";
import type { KaomojiItem, KaomojiRepository } from "./types.js";

export function KaomojiDrawer({ repository, onInsert, title = "颜文字库" }: { repository: KaomojiRepository; onInsert: (value: string) => void; title?: string }) {
  const [items, setItems] = useState<KaomojiItem[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [managing, setManaging] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [newCategories, setNewCategories] = useState("可爱");
  const refresh = () => repository.list().then(setItems);
  useEffect(() => { void refresh(); }, [repository]);
  const categories = useMemo(() => [...new Set(items.flatMap((item) => item.categories))], [items]);
  const visible = items.filter((item) => (!category || item.categories.includes(category)) && (!query || [item.value, item.label || "", ...item.categories].some((part) => part.toLowerCase().includes(query.toLowerCase()))));
  const insert = async (item: KaomojiItem, value = item.value) => { onInsert(value); await repository.markUsed(item.value); void refresh(); };
  const save = async () => {
    if (!newValue.trim()) return;
    await repository.upsert(newValue, newCategories.split(/[,，、/]+/).map((value) => value.trim()).filter(Boolean));
    setNewValue(""); void refresh();
  };
  return <section className="fy-kaomoji" aria-label={title}>
    <header><span><b>{title}</b><small>使用频率只参与排序，不对外显示</small></span><button onClick={() => setManaging((value) => !value)}>{managing ? "完成" : "整理"}</button></header>
    {managing && <div className="fy-kaomoji-add"><input value={newValue} onChange={(event) => setNewValue(event.target.value)} placeholder="粘贴一枚颜文字"/><input value={newCategories} onChange={(event) => setNewCategories(event.target.value)} placeholder="分类，用顿号分开"/><button onClick={() => void save()}>收进来</button></div>}
    <input className="fy-kaomoji-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索心情、形状或分类"/>
    <nav><button className={!category ? "current" : ""} onClick={() => setCategory("")}>全部</button>{categories.map((value) => <button className={category === value ? "current" : ""} key={value} onClick={() => setCategory(value)}>{value}</button>)}</nav>
    <div className="fy-kaomoji-grid">{visible.map((item) => <article key={item.value}>
      <button className="fy-kaomoji-value" onClick={() => void insert(item)} title={item.compatibilityNotes.join("；")}>{item.value}</button>
      {item.compatibility !== "stable" && <span>易乱码</span>}
      {item.safeValue && <button className="fy-kaomoji-safe" onClick={() => void insert(item, item.safeValue)}>稳定版</button>}
      {managing ? <button className="fy-kaomoji-remove" onClick={async () => { await repository.remove(item.value); void refresh(); }} aria-label="删除">×</button> : <button className="fy-kaomoji-star" onClick={async () => { await repository.setFavorite(item.value, !item.favorite); void refresh(); }} aria-label="收藏">{item.favorite ? "★" : "☆"}</button>}
    </article>)}</div>
  </section>;
}
