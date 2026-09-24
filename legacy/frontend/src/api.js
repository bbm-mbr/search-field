const json = (r) => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json(); };
export const getFields = () => fetch("/api/fields").then(json);
export const runFieldDive = (fieldId) => fetch(`/api/deep-dive/${fieldId}`, { method: "POST" }).then(json);
export const runSubDive = (fieldId, subId) => fetch(`/api/deep-dive/${fieldId}/${subId}`, { method: "POST" }).then(json);
export const getActivity = (fieldId, sub) =>
  fetch(`/api/recent-activity/${fieldId}${sub ? `?sub=${encodeURIComponent(sub)}` : ""}`).then(json);
