import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/drink-ledger.css";

const ledgerApi = "/matchdesk/api/drink-ledgers/current";
const defaultNames = ["แชมป์", "จิ๊บ", "พู", "บีบี", "อ๊อฟ"];
const recordDateFormat = new Intl.DateTimeFormat("th-TH", {
  day: "numeric", month: "short", timeZone: "Asia/Bangkok",
});
const formDateFormat = new Intl.DateTimeFormat("en-CA", {
  year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Bangkok",
});

function formDateValue(date) {
  const parts = Object.fromEntries(formDateFormat.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
const icons = {
  add: "M12 5v14M5 12h14",
  close: "m6 6 12 12M18 6 6 18",
  edit: "m15 5 4 4M4 20l4-.7L20 7l-3-3L5 16l-1 4Z",
  trash: "M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5",
  share: "M10 13a4 4 0 0 0 6 .3l3-3a4 4 0 0 0-5.7-5.7l-1.7 1.7M14 11a4 4 0 0 0-6-.3l-3 3a4 4 0 0 0 5.7 5.7l1.7-1.7",
  check: "m5 12 4 4L19 6",
  balance: "M4 8h15m-4-4 4 4-4 4m5 4H5m4-4-4 4 4 4",
  back: "M19 12H5m6-6-6 6 6 6",
  receipt: "M6 3l3 2 3-2 3 2 3-2v18l-3-2-3 2-3-2-3 2V3Zm3 6h6m-6 4h6",
};

function Icon({ name }) {
  return <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" aria-hidden="true"><path d={icons[name]} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function parseRecordDate(value) {
  const date = typeof value === "string" ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function RecordDate({ value }) {
  const date = parseRecordDate(value);
  return date
    ? <time className="record-date" dateTime={value}>{recordDateFormat.format(date)}</time>
    : <span className="record-date">ไม่ระบุวันที่</span>;
}

function settleBalances(records) {
  const pairs = new Map();
  for (const { payer, recipients } of records) {
    for (const { name, bottles } of recipients) {
      if (payer === name) continue;
      const [first, second] = payer < name ? [payer, name] : [name, payer];
      const key = JSON.stringify([first, second]);
      const pair = pairs.get(key) ?? { first, second, balance: 0 };
      pair.balance += payer === first ? bottles : -bottles;
      pairs.set(key, pair);
    }
  }

  return [...pairs.values()]
    .filter(({ balance }) => balance !== 0)
    .map(({ first, second, balance }) => balance > 0
      ? { from: second, to: first, bottles: balance }
      : { from: first, to: second, bottles: -balance })
    .sort((a, b) => a.from.localeCompare(b.from, "th") || a.to.localeCompare(b.to, "th"));
}

function DrinkLedger() {
  const [records, setRecords] = useState([]);
  const [payer, setPayer] = useState("");
  const [rows, setRows] = useState([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [recordDay, setRecordDay] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(null);
  const [pending, setPending] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const payerInput = useRef(null);
  const entryDialog = useRef(null);
  const formTrigger = useRef(null);
  const reportTitle = useRef(null);

  useEffect(() => {
    if (pending || formOpen) return;
    const controller = new AbortController();
    let loading = false;
    async function refresh() {
      if (loading) return;
      loading = true;
      try {
        const response = await fetch(ledgerApi, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Load failed");
        const ledger = await response.json();
        if (controller.signal.aborted) return;
        setRecords(ledger.records);
        setRevision(ledger.revision);
        setLoadError("");
      } catch {
        if (!controller.signal.aborted) setLoadError("เปิดข้อมูลกลางไม่ได้ กำลังลองใหม่");
      } finally {
        loading = false;
      }
    }
    function refreshWhenVisible() {
      if (!document.hidden) refresh();
    }
    refresh();
    const timer = window.setInterval(refreshWhenVisible, 10000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [pending, formOpen]);

  const names = new Set(defaultNames);
  for (const record of records) {
    names.add(record.payer);
    for (const { name } of record.recipients) names.add(name);
  }
  const settlements = settleBalances(records);
  const editingRecord = records.find(({ id }) => id === editingId);
  const recipientNames = new Set([...names, ...rows.map(({ name }) => name)]);
  recipientNames.delete(payer.trim());
  const busy = pending || revision === null;

  async function persist(updated, status) {
    const clearHistory = updated.length > 0 && settleBalances(updated).length === 0;
    const nextRecords = clearHistory ? [] : updated;
    setMessage("");
    setPending(true);
    try {
      const response = await fetch(ledgerApi, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision, records: nextRecords }),
      });
      if (response.status === 409) {
        setError("มีคนแก้ข้อมูลก่อนคุณ กรุณาปิดฟอร์มแล้วเปิดใหม่หลังข้อมูลอัปเดต");
        return false;
      }
      if (!response.ok) throw new Error("Save failed");
      const saved = await response.json();
      setRevision(saved.revision);
    } catch {
      setError("บันทึกข้อมูลกลางไม่ได้ กรุณาลองอีกครั้ง");
      return false;
    } finally {
      setPending(false);
    }
    setRecords(nextRecords);
    setError("");
    setMessage(clearHistory ? "ไม่เหลือยอดค้าง ล้างรายการทั้งหมดแล้ว" : status);
    return true;
  }

  async function share() {
    const url = new URL("/whopay/", location.origin).href;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setMessage("คัดลอกลิงก์แล้ว");
    } catch {
      setMessage("แตะช่องลิงก์เพื่อคัดลอก");
    }
  }

  function resetForm() {
    setEditingId(null);
    setRecordDay("");
    setPayer("");
    setRows([]);
    setNewRecipient("");
  }

  function openForm(event, date = new Date()) {
    formTrigger.current = event.currentTarget;
    setRecordDay(formDateValue(date));
    setError("");
    setMessage("");
    setFormOpen(true);
    entryDialog.current.showModal();
    payerInput.current.focus({ preventScroll: true });
  }

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    const payerName = payer.trim();
    const recipients = [...rows];
    if (newRecipient.trim()) recipients.push({ name: newRecipient.trim(), bottles: 1 });
    const seen = new Set();
    if (!payerName || recipients.length === 0) {
      setError("เลือกคนจ่ายและคนรับอย่างน้อย 1 คน");
      return;
    }
    for (const { name } of recipients) {
      if (name === payerName || seen.has(name)) {
        setError(name === payerName ? "ชื่อคนรับต้องต่างจากคนจ่าย" : "กรุณารวมจำนวนของคนรับที่ชื่อซ้ำกัน");
        return;
      }
      seen.add(name);
    }
    const previousDate = parseRecordDate(editingRecord?.createdAt);
    const createdAt = previousDate && formDateValue(previousDate) === recordDay
      ? editingRecord.createdAt
      : `${recordDay}T00:00:00+07:00`;
    const record = {
      id: editingId ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      payer: payerName,
      recipients,
      createdAt,
    };
    const updated = editingId
      ? records.map((item) => item.id === editingId ? record : item)
      : [record, ...records];
    if (await persist(updated, editingId ? "แก้ไขรายการแล้ว" : "บันทึกรายการแล้ว")) entryDialog.current.close();
  }

  function edit(event, record) {
    openForm(event, parseRecordDate(record.createdAt) ?? new Date());
    setEditingId(record.id);
    setPayer(record.payer);
    setRows(record.recipients);
    setNewRecipient("");
  }

  async function remove(record) {
    if (!window.confirm(`ลบรายการที่ ${record.payer} จ่ายให้ ${record.recipients.map(({ name }) => name).join(", ")} หรือไม่?`)) return;
    if (await persist(records.filter(({ id }) => id !== record.id), "ลบรายการแล้ว")) {
      if (editingId === record.id) resetForm();
      else reportTitle.current.focus();
    }
  }

  function selectPayer(name) {
    setPayer(name);
    setRows((current) => current.filter((row) => row.name !== name.trim()));
    setError("");
  }

  function incrementRecipient(name) {
    setRows((current) => current.some((row) => row.name === name)
      ? current.map((row) => row.name === name
        ? { ...row, bottles: Math.min(9999, row.bottles + 1) }
        : row)
      : [...current, { name, bottles: 1 }]);
    setError("");
  }

  function clearRecipient(name) {
    setRows((current) => current.filter((row) => row.name !== name));
    setError("");
  }

  function addRecipient() {
    const name = newRecipient.trim();
    if (!name) return;
    if (name === payer.trim() || rows.some((row) => row.name === name)) {
      setError(name === payer.trim() ? "ชื่อคนรับต้องต่างจากคนจ่าย" : "เลือกคนรับชื่อนี้แล้ว");
      return;
    }
    incrementRecipient(name);
    setNewRecipient("");
  }

  return (
    <>
      <header className="masthead">
        <div className="wrap">
          <div className="topbar">
            <a href="/" aria-label="กลับหน้าแรก"><Icon name="back" /></a>
            <span>สมุดค่าเครื่องดื่ม</span>
          </div>
          <div className="hero">
            <div>
              <h1>ใครจ่าย</h1>
              <p>จดไว้ว่าใครจ่ายให้ใคร</p>
            </div>
            <svg className="hero-mark" viewBox="0 0 88 76" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m31 20 8 3-5 17c-1 5-6 8-11 6s-8-6-6-11l6-18 8 3Zm-8 26-5 14m-7-2 14 5m33-43-8 3 5 17c1 5 6 8 11 6s8-6 6-11l-6-18-8 3Zm8 26 5 14m7-2-14 5M42 8l3 6m8-8-2 7M38 28l-17-5m31 5 17-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <section className="settlement" aria-labelledby="settlement-title">
            <h2 className="settlement-heading" id="settlement-title"><Icon name="balance" />ใครค้างใคร</h2>
            {revision === null ? (
              <p className="note" role="status">{loadError || "กำลังเปิดสมุดกลาง"}</p>
            ) : settlements.length > 0 ? (
              <ul className="settlement-list">
                {settlements.map(({ from, to, bottles }) => (
                  <li key={JSON.stringify([from, to])}>
                    <span><strong>{from}</strong> <span className="settlement-verb">ค้าง</span> <strong>{to}</strong></span>
                    <b className="settlement-count">{bottles}</b>
                  </li>
                ))}
              </ul>
            ) : <p className="note">{records.length ? "หักล้างครบแล้ว ทุกคนมียอดค้างเป็นศูนย์" : "ยังไม่มีรายการให้คำนวณ"}</p>}
          </section>
        </div>
      </header>
      <main className="wrap ledger">
        <dialog ref={entryDialog} className="sheet entry" aria-labelledby="entry-title"
          onCancel={(event) => { if (pending) event.preventDefault(); }} onClose={() => {
          setFormOpen(false);
          resetForm();
          setError("");
          formTrigger.current?.focus({ preventScroll: true });
        }}>
          <div className="section-title">
            <h2 id="entry-title">{editingId ? "แก้ไขรายการ" : "บันทึกรายการ"}</h2>
            <button type="button" className="subtle icon-button" aria-label="ปิด" disabled={pending}
              onClick={() => entryDialog.current.close()}><Icon name="close" /></button>
          </div>
          <form onSubmit={submit}>
            <fieldset>
              <legend>ใครจ่าย</legend>
              <div className="person-options payer-options">
                {[...names].map((name, index) => (
                  <button key={name} ref={index === 0 ? payerInput : null} type="button" className="person-option"
                    aria-pressed={payer.trim() === name} title={name} onClick={() => selectPayer(name)}>
                    <span className="person-name">{name}</span>
                  </button>
                ))}
              </div>
              <details>
                <summary>{payer.trim() && !names.has(payer.trim()) ? `คนจ่าย: ${payer.trim()}` : "ใช้ชื่ออื่น"}</summary>
                <label className="field">ชื่อคนจ่าย
                  <input value={payer} onChange={(event) => { setPayer(event.target.value); setError(""); }}
                    onBlur={(event) => selectPayer(event.target.value.trim())} maxLength={60} />
                </label>
              </details>
            </fieldset>
            <fieldset>
              <legend>จ่ายให้ใคร</legend>
              <p className="hint">แตะชื่อผู้รับเพื่อเพิ่มทีละ 1</p>
              <div className="person-options recipient-options">
                {[...recipientNames].map((name) => {
                  const row = rows.find((item) => item.name === name);
                  return (
                    <div key={name} className="recipient-option" data-selected={Boolean(row)}>
                      <button type="button" className="person-option"
                        aria-label={`เพิ่มให้ ${name} ตอนนี้ ${row?.bottles ?? 0}`} title={name}
                        onClick={() => incrementRecipient(name)}>
                        <span className="person-details">
                          <span className="person-name">{name}</span>
                          {row && <span className="person-count" aria-hidden="true">{row.bottles}</span>}
                        </span>
                      </button>
                      {row && <button type="button" className="recipient-clear" aria-label={`ล้างจำนวนของ ${name}`}
                        onClick={(event) => {
                          const target = names.has(name) ? event.currentTarget.previousElementSibling
                            : event.currentTarget.closest("fieldset").querySelector(".person-option");
                          target?.focus();
                          clearRecipient(name);
                        }}><Icon name="close" /></button>}
                    </div>
                  );
                })}
              </div>
              {(rows.length > 0 || newRecipient) && <button type="button" className="clear-recipients"
                onClick={(event) => {
                  event.currentTarget.closest("fieldset").querySelector(".person-option")?.focus();
                  setRows([]);
                  setNewRecipient("");
                  setError("");
                }}>ล้างผู้รับทั้งหมด</button>}
              <details>
                <summary>เพิ่มชื่อคนรับ</summary>
                <label className="field">ชื่อคนรับ
                  <input value={newRecipient} maxLength={60} onChange={(event) => setNewRecipient(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        addRecipient();
                      }
                    }} />
                </label>
                <button type="button" className="subtle icon-button" aria-label="เพิ่มคนรับ" onClick={addRecipient}><Icon name="add" /></button>
              </details>
            </fieldset>
            <label className="field">วันที่จ่าย
              <input type="date" value={recordDay} onChange={(event) => setRecordDay(event.target.value)} required />
            </label>
            <div className="actions">
              <button className="primary icon-label" type="submit" disabled={busy}><Icon name="check" />
                {pending ? "กำลังบันทึก" : editingId ? "บันทึกการแก้ไข" : "บันทึกรอบนี้"}
              </button>
            </div>
            <p className="error" role="alert">{error}</p>
          </form>
          <p className="note">ทุกรายการบันทึกลงสมุดกลาง</p>
        </dialog>
        <div className="reports">
          <p className="save-feedback status" role="status">{message}</p>
          {revision !== null && loadError && <p className="note" role="status">{loadError}</p>}
          {shareUrl && <label className="sheet field">ลิงก์เปิดและแก้ไขข้อมูล
            <input readOnly value={shareUrl} onFocus={(event) => event.target.select()} />
          </label>}
          <section className="sheet">
            <div className="section-title records-title">
              <h2 ref={reportTitle} tabIndex={-1}><Icon name="receipt" />รายการที่บันทึก</h2>
              <span>{records.length} รายการ</span>
            </div>
            <p className="report-feedback error" role="alert">{error}</p>
            {records.length === 0 && <p className="note">ยังไม่มีรายการ</p>}
            <ul className="records">
              {records.map((record) => (
                <li key={record.id}>
                  <div className="record-title">
                    <div className="record-heading">
                      <strong>{record.payer} <span>จ่ายให้</span></strong>
                      <RecordDate value={record.createdAt} />
                    </div>
                    <div className="record-actions">
                      <button type="button" className="subtle icon-button" disabled={busy} aria-label={`แก้ไขรายการของ ${record.payer}`} onClick={(event) => edit(event, record)}><Icon name="edit" /></button>
                      <button type="button" className="subtle danger icon-button" disabled={busy} aria-label={`ลบรายการของ ${record.payer}`} onClick={() => remove(record)}><Icon name="trash" /></button>
                    </div>
                  </div>
                  <ul className="recipients person-options">
                    {record.recipients.map(({ name, bottles }) => (
                      <li key={name}>
                        <span className="person-name" title={name}>{name}</span>
                        <b>{bottles}</b>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <footer className="dock">
        <div className="wrap dock-inner">
          <button type="button" className="primary" disabled={busy} aria-haspopup="dialog" onClick={openForm}>
            <Icon name="add" />
            จดรอบ
          </button>
          <button type="button" className="icon-button" disabled={busy} aria-label="แชร์ลิงก์ใช้ร่วมกัน" onClick={share}><Icon name="share" /></button>
        </div>
      </footer>
    </>
  );
}

createRoot(document.getElementById("root")).render(<DrinkLedger />);
