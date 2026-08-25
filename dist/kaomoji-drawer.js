import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
export function KaomojiDrawer({ repository, onInsert, title = "颜文字库" }) {
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("");
    const [managing, setManaging] = useState(false);
    const [newValue, setNewValue] = useState("");
    const [newCategories, setNewCategories] = useState("可爱");
    const refresh = () => repository.list().then(setItems);
    useEffect(() => { void refresh(); }, [repository]);
    const categories = useMemo(() => [...new Set(items.flatMap((item) => item.categories))], [items]);
    const visible = items.filter((item) => (!category || item.categories.includes(category)) && (!query || [item.value, item.label || "", ...item.categories].some((part) => part.toLowerCase().includes(query.toLowerCase()))));
    const insert = async (item, value = item.value) => { onInsert(value); await repository.markUsed(item.value); void refresh(); };
    const save = async () => {
        if (!newValue.trim())
            return;
        await repository.upsert(newValue, newCategories.split(/[,，、/]+/).map((value) => value.trim()).filter(Boolean));
        setNewValue("");
        void refresh();
    };
    return _jsxs("section", { className: "fy-kaomoji", "aria-label": title, children: [_jsxs("header", { children: [_jsxs("span", { children: [_jsx("b", { children: title }), _jsx("small", { children: "\u4F7F\u7528\u9891\u7387\u53EA\u53C2\u4E0E\u6392\u5E8F\uFF0C\u4E0D\u5BF9\u5916\u663E\u793A" })] }), _jsx("button", { onClick: () => setManaging((value) => !value), children: managing ? "完成" : "整理" })] }), managing && _jsxs("div", { className: "fy-kaomoji-add", children: [_jsx("input", { value: newValue, onChange: (event) => setNewValue(event.target.value), placeholder: "\u7C98\u8D34\u4E00\u679A\u989C\u6587\u5B57" }), _jsx("input", { value: newCategories, onChange: (event) => setNewCategories(event.target.value), placeholder: "\u5206\u7C7B\uFF0C\u7528\u987F\u53F7\u5206\u5F00" }), _jsx("button", { onClick: () => void save(), children: "\u6536\u8FDB\u6765" })] }), _jsx("input", { className: "fy-kaomoji-search", value: query, onChange: (event) => setQuery(event.target.value), placeholder: "\u641C\u7D22\u5FC3\u60C5\u3001\u5F62\u72B6\u6216\u5206\u7C7B" }), _jsxs("nav", { children: [_jsx("button", { className: !category ? "current" : "", onClick: () => setCategory(""), children: "\u5168\u90E8" }), categories.map((value) => _jsx("button", { className: category === value ? "current" : "", onClick: () => setCategory(value), children: value }, value))] }), _jsx("div", { className: "fy-kaomoji-grid", children: visible.map((item) => _jsxs("article", { children: [_jsx("button", { className: "fy-kaomoji-value", onClick: () => void insert(item), title: item.compatibilityNotes.join("；"), children: item.value }), item.compatibility !== "stable" && _jsx("span", { children: "\u6613\u4E71\u7801" }), item.safeValue && _jsx("button", { className: "fy-kaomoji-safe", onClick: () => void insert(item, item.safeValue), children: "\u7A33\u5B9A\u7248" }), managing ? _jsx("button", { className: "fy-kaomoji-remove", onClick: async () => { await repository.remove(item.value); void refresh(); }, "aria-label": "\u5220\u9664", children: "\u00D7" }) : _jsx("button", { className: "fy-kaomoji-star", onClick: async () => { await repository.setFavorite(item.value, !item.favorite); void refresh(); }, "aria-label": "\u6536\u85CF", children: item.favorite ? "★" : "☆" })] }, item.value)) })] });
}
