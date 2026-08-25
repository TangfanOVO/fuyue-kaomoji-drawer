import { useEffect, useMemo, useState } from "react";
import type { KaomojiAcceptedVersion, KaomojiCandidate, KaomojiItem, KaomojiRepository, KaomojiReviewRepository } from "./types.js";

type KaomojiDrawerProps = {
  repository: KaomojiRepository;
  reviewRepository?: KaomojiReviewRepository;
  onInsert: (value: string) => void;
  title?: string;
};

export function splitKaomojiCategories(value: string) {
  return [...new Set(value.split(/[,，、/]+/).map((part) => part.trim()).filter(Boolean))].slice(0, 8);
}

export function KaomojiDrawer({ repository, reviewRepository, onInsert, title = "颜文字库" }: KaomojiDrawerProps) {
  const [items, setItems] = useState<KaomojiItem[]>([]);
  const [candidates, setCandidates] = useState<KaomojiCandidate[]>([]);
  const [candidateCategories, setCandidateCategories] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [managing, setManaging] = useState(false);
  const [manageView, setManageView] = useState<"library" | "review">("library");
  const [busyCandidate, setBusyCandidate] = useState<string | null>(null);
  const [newValue, setNewValue] = useState("");
  const [newCategories, setNewCategories] = useState("可爱");

  const refresh = () => repository.list().then(setItems);
  const refreshCandidates = () => reviewRepository?.listCandidates().then((next) => {
    setCandidates(next);
    setCandidateCategories((current) => Object.fromEntries(next.map((candidate) => [String(candidate.id), current[String(candidate.id)] ?? candidate.suggestedCategories.join("，")])))
  });
  useEffect(() => { void refresh(); }, [repository]);
  useEffect(() => { void refreshCandidates(); }, [reviewRepository]);

  const categories = useMemo(() => [...new Set(items.flatMap((item) => item.categories))], [items]);
  const visible = items.filter((item) => (!category || item.categories.includes(category)) && (!query || [item.value, item.label || "", ...item.categories].some((part) => part.toLowerCase().includes(query.toLowerCase()))));
  const insert = async (item: KaomojiItem) => { onInsert(item.value); await repository.markUsed(item.value); void refresh(); };
  const save = async () => {
    if (!newValue.trim()) return;
    await repository.upsert(newValue, splitKaomojiCategories(newCategories));
    setNewValue("");
    void refresh();
  };
  const review = async (candidate: KaomojiCandidate, decision: "approved" | "rejected", acceptedVersion: KaomojiAcceptedVersion = "original") => {
    if (!reviewRepository) return;
    const key = String(candidate.id);
    setBusyCandidate(key);
    try {
      await reviewRepository.reviewCandidate(candidate.id, decision, {
        acceptedVersion,
        categories: splitKaomojiCategories(candidateCategories[key] || candidate.suggestedCategories.join("，")),
      });
      await Promise.all([refresh(), refreshCandidates()]);
    } finally {
      setBusyCandidate(null);
    }
  };

  return <section className="fy-kaomoji" aria-label={title}>
    <header><span><b>{title}</b><small>已带审核好的默认库，使用频率只在本地排序</small></span><button onClick={() => setManaging((value) => !value)}>{managing ? "完成" : "整理"}</button></header>
    {managing && reviewRepository && <div className="fy-kaomoji-segments" role="tablist" aria-label="整理颜文字">
      <button className={manageView === "library" ? "current" : ""} onClick={() => setManageView("library")} role="tab">我的库</button>
      <button className={manageView === "review" ? "current" : ""} onClick={() => setManageView("review")} role="tab">候选箱{candidates.length ? ` ${candidates.length}` : ""}</button>
    </div>}
    {managing && manageView === "library" && <div className="fy-kaomoji-add"><input value={newValue} onChange={(event) => setNewValue(event.target.value)} placeholder="粘贴一枚颜文字"/><input value={newCategories} onChange={(event) => setNewCategories(event.target.value)} placeholder="分类，可填多个"/><button onClick={() => void save()}>收进来</button></div>}
    {managing && manageView === "review" && reviewRepository ? <div className="fy-kaomoji-review">
      {candidates.length ? candidates.map((candidate) => {
        const key = String(candidate.id);
        const busy = busyCandidate === key;
        return <article className="fy-kaomoji-candidate" key={key}>
          <strong>{candidate.value}</strong>
          {candidate.compatibility !== "stable" && <small>{candidate.compatibilityNotes.join("；") || "跨设备可能易乱码"}</small>}
          {candidate.safeValue && <div><span>兼容版</span><b>{candidate.safeValue}</b></div>}
          <label><span>分类（可多个）</span><input value={candidateCategories[key] ?? candidate.suggestedCategories.join("，")} onChange={(event) => setCandidateCategories((current) => ({ ...current, [key]: event.target.value }))}/></label>
          <footer className={candidate.safeValue ? "has-compatible" : ""}>
            <button disabled={busy} onClick={() => void review(candidate, "rejected")}>不收</button>
            <button disabled={busy} onClick={() => void review(candidate, "approved", "original")}>收原版</button>
            {candidate.safeValue && <button disabled={busy} onClick={() => void review(candidate, "approved", "compatible")}>收兼容版</button>}
          </footer>
        </article>;
      }) : <div className="fy-kaomoji-empty">候选箱已经理完啦</div>}
    </div> : <>
      <input className="fy-kaomoji-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索心情、形状或分类"/>
      <nav><button className={!category ? "current" : ""} onClick={() => setCategory("")}>全部</button>{categories.map((value) => <button className={category === value ? "current" : ""} key={value} onClick={() => setCategory(value)}>{value}</button>)}</nav>
      <div className="fy-kaomoji-grid">{visible.map((item) => <article key={item.value}>
        <button className="fy-kaomoji-value" onClick={() => void insert(item)} title={item.compatibilityNotes.join("；")}>{item.value}</button>
        {item.compatibility !== "stable" && <span>易乱码</span>}
        {managing ? <button className="fy-kaomoji-remove" onClick={async () => { await repository.remove(item.value); void refresh(); }} aria-label="删除">×</button> : <button className="fy-kaomoji-star" onClick={async () => { await repository.setFavorite(item.value, !item.favorite); void refresh(); }} aria-label="收藏">{item.favorite ? "★" : "☆"}</button>}
      </article>)}</div>
    </>}
  </section>;
}
