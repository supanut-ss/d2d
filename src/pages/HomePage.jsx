import { useEffect, useMemo, useRef, useState } from "react";

const qrOrderingSearch = "qr ordering qrordering ร้านอาหาร สั่งอาหาร ระบบร้านอาหาร pos ครัว";
const sabaizySearch = "sabaizy branch manager สาขา จัดการธุรกิจ คิว นัดหมาย บริการ แคชเชียร์ พนักงาน สมาชิก คอร์ส";
const payYetSearch = "payyet pay yet line bot บอทไลน์ เก็บเงิน กลุ่ม เรียกเก็บเงิน qr พร้อมเพย์ สลิป แจ้งเตือน";
const jodDailySearch = "joddaily จดเดลี่ รายรับ รายจ่าย บัญชีส่วนตัว บันทึกเงิน line bot ตั้งงบ ค่าสมาชิก csv";
const bookSabuySearch = "booksabuy book sabuy บุ๊คสบาย ระบบจัดการร้านนวด จดคิว สมาชิก เติมเครดิต รายงาน line";
const apps = [
  { category: "web", search: qrOrderingSearch },
  { category: "web", search: sabaizySearch },
  { category: "web", search: bookSabuySearch },
  { category: "tool", search: payYetSearch },
  { category: "tool", search: jodDailySearch },
  { category: "web", search: "pimsaduak พิมพ์ใบปะหน้า ฉลาก พัสดุ ใบส่งของ qr barcode เว็บแอป" },
  { category: "web", search: "meestock stockroom สต็อก คลังสินค้า เว็บแอป ธุรกิจ" },
  { category: "web", search: "เล่นกันมั้ย partygame party game เกมปาร์ตี้ เล่นผลัดกัน" },
];

export default function HomePage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeDialog, setActiveDialog] = useState("");
  const dialogRefs = useRef({});
  const query = search.trim().toLocaleLowerCase("th");
  const visibleApps = useMemo(() => apps.filter((app) =>
    (activeFilter === "all" || app.category === activeFilter) &&
    (!query || app.search.toLocaleLowerCase("th").includes(query))
  ), [activeFilter, query]);
  const visibleCount = visibleApps.length;
  const isAppVisible = (category, searchText) => visibleApps.some((app) =>
    app.category === category && app.search === searchText
  );

  useEffect(() => {
    for (const [id, dialog] of Object.entries(dialogRefs.current)) {
      if (!dialog) continue;
      if (id === activeDialog && !dialog.open) dialog.showModal();
      else if (id !== activeDialog && dialog.open) dialog.close();
    }
  }, [activeDialog]);

  return (
    <>
{"\n    "}
<a className="skip-link" href="#main-content">
  {"ข้ามไปยังเนื้อหาหลัก"}
</a>
{"\n\n    "}
<header className="site-header">
  {"\n      "}
  <div className="wrap header-inner">
    {"\n        "}
    <a className="brand" href="#top" aria-label="drivetodev กลับไปด้านบน">
      {"\n          "}
      <svg className="brand-mark" viewBox="0 0 186 186" aria-hidden="true">
        {"\n            "}
        <path fill="#14243a" fillRule="evenodd" d="M24 18h73c46 0 73 29 73 74s-27 76-73 76H24v-40l44-36-44-37V18Zm45 36v77h28c25 0 40-15 40-39s-15-38-40-38H69Z"></path>
        {"\n            "}
        <path fill="#126bfa" d="M24 18h34l55 56c12 12 12 25 0 37l-55 57H24v-40l44-36-44-37V18Z"></path>
        {"\n          "}
      </svg>
      {"\n          "}
      <span className="brand-name">
        {"drive"}
        <span>
          {"to"}
        </span>
        {"dev"}
      </span>
      {"\n        "}
    </a>
    {"\n        "}
    <nav className="main-nav" aria-label="เมนูหลัก">
      {"\n          "}
      <a href="#apps">
        {"แอปทั้งหมด"}
      </a>
      {"\n          "}
      <a href="#about">
        {"เกี่ยวกับฉัน"}
      </a>
      {"\n          "}
      <a className="nav-cta" href="#contact">
        {"ติดต่อ"}
      </a>
      {"\n        "}
    </nav>
    {"\n      "}
  </div>
  {"\n    "}
</header>
{"\n\n    "}
<main id="main-content">
  {"\n      "}
  <section className="wrap hero" id="top" aria-labelledby="hero-title">
    {"\n        "}
    <div className="hero-copy">
      {"\n          "}
      <p className="eyebrow">
        {"พื้นที่ของซอฟต์แวร์จาก drivetodev"}
      </p>
      {"\n          "}
      <h1 id="hero-title">
        {"สร้างไอเดีย"}
        <br />
        {"ให้เป็นซอฟต์แวร์ที่ใช้ได้จริง"}
      </h1>
      {"\n          "}
      <p className="hero-description">
        {"\n            ยินดีต้อนรับสู่ drivetodev พื้นที่รวมแอปและเครื่องมือที่สร้างขึ้นเพื่อทำให้เรื่องซับซ้อนเข้าใจง่าย และหยิบไปใช้ได้ทุกวัน\n          "}
      </p>
      {"\n          "}
      <div className="hero-actions">
        {"\n            "}
        <a className="button button-primary" href="#apps">
          {"สำรวจแอป"}
        </a>
        {"\n            "}
        <a className="button button-secondary" href="#about">
          {"รู้จักผู้สร้าง"}
        </a>
        {"\n          "}
      </div>
      {"\n        "}
    </div>
    {"\n\n        "}
    <div className="brand-stage" aria-label="ตราสัญลักษณ์ drivetodev ในงานออกแบบสีน้ำเงิน">
      {"\n          "}
      <p className="stage-note">
        {"IDEA"}
        <span>
          {"→"}
        </span>
        {"SOFTWARE"}
      </p>
      {"\n          "}
      <div className="stage-paper">
        {"\n            "}
        <svg className="stage-logo" viewBox="0 0 186 186" aria-hidden="true">
          {"\n              "}
          <path fill="#14243a" fillRule="evenodd" d="M24 18h73c46 0 73 29 73 74s-27 76-73 76H24v-40l44-36-44-37V18Zm45 36v77h28c25 0 40-15 40-39s-15-38-40-38H69Z"></path>
          {"\n              "}
          <path fill="#126bfa" d="M24 18h34l55 56c12 12 12 25 0 37l-55 57H24v-40l44-36-44-37V18Z"></path>
          {"\n            "}
        </svg>
        {"\n          "}
      </div>
      {"\n          "}
      <div className="stage-caption">
        {"\n            "}
        <p>
          {"จากโจทย์เล็ก ๆ สู่เครื่องมือที่มีความหมาย"}
        </p>
        {"\n            "}
        <span>
          {"drivetodev"}
        </span>
        {"\n          "}
      </div>
      {"\n        "}
    </div>
    {"\n      "}
  </section>
  {"\n\n      "}
  <section className="principles" aria-label="แนวทางการพัฒนา">
    {"\n        "}
    <div className="wrap principle-row">
      {"\n          "}
      <div className="principle">
        {"\n            "}
        <span className="principle-symbol" aria-hidden="true">
          {"D"}
        </span>
        {"\n            "}
        <p>
          {"เริ่มจากปัญหาที่พบจริง"}
        </p>
        {"\n          "}
      </div>
      {"\n          "}
      <div className="principle">
        {"\n            "}
        <span className="principle-symbol" aria-hidden="true">
          {"↗"}
        </span>
        {"\n            "}
        <p>
          {"ออกแบบให้ง่ายต่อการใช้"}
        </p>
        {"\n          "}
      </div>
      {"\n          "}
      <div className="principle">
        {"\n            "}
        <span className="principle-symbol" aria-hidden="true">
          {"+"}
        </span>
        {"\n            "}
        <p>
          {"พัฒนาต่อยอดได้เสมอ"}
        </p>
        {"\n          "}
      </div>
      {"\n        "}
    </div>
    {"\n      "}
  </section>
  {"\n\n      "}
  <section className="apps-section section" id="apps" aria-labelledby="apps-title">
    {"\n        "}
    <div className="wrap">
      {"\n          "}
      <div className="section-heading">
        {"\n            "}
        <div>
          {"\n              "}
          <p className="section-label">
            {"ทำอะไรได้บ้าง"}
          </p>
          {"\n              "}
          <h2 id="apps-title">
            {"แอปและเครื่องมือ"}
          </h2>
          {"\n              "}
          <p className="section-intro">
            {"รวมโปรเจกต์ที่ช่วยให้การทำงานเป็นระบบและใช้เวลาได้คุ้มขึ้น"}
          </p>
          {"\n            "}
        </div>
        {"\n          "}
      </div>
      {"\n\n          "}
      <div className="app-toolbar">
        {"\n            "}
        <div className="filter-list" role="group" aria-label="กรองแอปตามประเภท">
          {"\n              "}
          <button className="filter-button" type="button" data-filter="all" aria-pressed={activeFilter === "all"} onClick={() => setActiveFilter("all")}>
            {"ทั้งหมด"}
          </button>
          {"\n              "}
          <button className="filter-button" type="button" data-filter="web" aria-pressed={activeFilter === "web"} onClick={() => setActiveFilter("web")}>
            {"เว็บแอป"}
          </button>
          {"\n              "}
          <button className="filter-button" type="button" data-filter="tool" aria-pressed={activeFilter === "tool"} onClick={() => setActiveFilter("tool")}>
            {"เครื่องมือ"}
          </button>
          {"\n            "}
        </div>
        {"\n            "}
        <label className="search-wrap">
          {"\n              "}
          <span className="sr-only">
            {"ค้นหาชื่อแอปหรือคำอธิบาย"}
          </span>
          {"\n              "}
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {"\n                "}
            <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8"></circle>
            {"\n                "}
            <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8"></path>
            {"\n              "}
          </svg>
          {"\n              "}
          <input className="search-input" id="app-search" type="search" placeholder="ค้นหาแอป" autoComplete="off" value={search} onChange={(event) => setSearch(event.target.value)} />
          {"\n            "}
        </label>
        {"\n          "}
      </div>
      {"\n\n          "}
      <div className="app-grid" id="app-grid">
        <article className="app-card" data-category="web" data-search={qrOrderingSearch} hidden={!isAppVisible("web", qrOrderingSearch)}>
          <div className="app-art app-art-ordering" aria-hidden="true">
            <div className="ordering-card-preview">
              <div className="ordering-card-head"><strong>QR Ordering</strong><span>โต๊ะ 08</span></div>
              <div className="ordering-card-content">
                <div className="ordering-card-code">
                  <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
                    <path d="M5 5h20v20H5zM10 10v10h10V10zM39 5h20v20H39zM44 10v10h10V10zM5 39h20v20H5zM10 44v10h10V44z" />
                    <path d="M31 5h5v5h-5zM31 14h7v5h-7zM28 23h8v5h-8zM33 32h5v6h-5zM41 31h5v5h-5zM50 31h8v5h-8zM29 39h5v8h-5zM38 41h8v5h-8zM49 41h5v8h-5zM31 51h8v8h-8zM43 52h5v7h-5zM53 51h6v8h-6z" />
                  </svg>
                </div>
                <div className="ordering-card-menu">
                  <p>เมนูวันนี้</p>
                  <div><span>ข้าวกะเพรา</span><strong>฿89</strong></div>
                  <div><span>ชาไทย</span><strong>฿45</strong></div>
                  <p className="ordering-card-basket">ตะกร้า · 2 รายการ</p>
                </div>
              </div>
            </div>
          </div>
          <div className="app-card-body">
            <div className="app-meta"><span className="badge-online">Online now</span><span>เว็บแอป</span><span>ร้านอาหาร</span><span>แนวคิด</span></div>
            <h3>QR Ordering</h3>
            <p>ให้ลูกค้าสแกน QR สั่งอาหาร เชื่อมต่อ POS และครัวในระบบเดียว</p>
            <div className="app-actions">
              <a className="text-link" href="qr-ordering.html">ดูแนวคิดของแอป</a>
              <a className="text-link" href="https://qrodrder.drivetodev.online/" target="_blank" rel="noopener noreferrer">เปิดแอปจริง ↗</a>
            </div>
          </div>
        </article>

        <article className="app-card" data-category="web" data-search={sabaizySearch} hidden={!isAppVisible("web", sabaizySearch)}>
          <div className="app-art app-art-branch" aria-hidden="true">
            <div className="branch-card-preview">
              <div className="branch-card-head"><strong>สาขาหลัก</strong><span>วันนี้</span></div>
              <div className="branch-card-stats">
                <div><span>นัด</span><strong>04</strong></div>
                <div><span>กำลังบริการ</span><strong>02</strong></div>
                <div><span>คิวหมุน</span><strong>03</strong></div>
              </div>
              <div className="branch-card-row"><span>นวดไทย · 60 นาที</span><span>กำลังบริการ</span></div>
              <div className="branch-card-row"><span>ทรีตเมนต์ · 30 นาที</span><span>คิวถัดไป</span></div>
            </div>
          </div>
          <div className="app-card-body">
            <div className="app-meta"><span className="badge-online">Online now</span><span>เว็บแอป</span><span>บริหารสาขา</span></div>
            <h3>Sabaizy</h3>
            <p>จัดคิวบริการ พนักงาน สมาชิก และรอบกะแคชเชียร์ แยกข้อมูลตามสาขา</p>
            <div className="app-actions">
              <a className="text-link" href="sabaizy.html">ดูรายละเอียดแอป</a>
              <a className="text-link" href="https://sm.drivetodev.online/" target="_blank" rel="noopener noreferrer">เปิดแอปจริง ↗</a>
            </div>
          </div>
        </article>

        <article className="app-card" data-category="web" data-search={bookSabuySearch} hidden={!isAppVisible("web", bookSabuySearch)}>
          <div className="app-art app-art-booksabuy" aria-hidden="true">
            <div className="booksabuy-preview">
              <div className="booksabuy-preview-head">
                <div><span>ร้านสบายดี · วันนี้</span><strong>คิวของร้าน</strong></div>
                <span className="booksabuy-preview-state">เปิดร้าน</span>
              </div>
              <div className="booksabuy-preview-summary"><span>รายได้วันนี้</span><strong>฿1,250</strong><small>4 คิว · เงินสด โอน สมาชิก</small></div>
              <div className="booksabuy-preview-queue">
                <div><time>10:00</time><span><strong>นวดไทย · 60 นาที</strong><small>มีน · โอน</small></span><b>฿450</b></div>
                <div><time>11:30</time><span><strong>อโรม่า · 90 นาที</strong><small>ฝน · สมาชิก</small></span><b>฿800</b></div>
              </div>
            </div>
          </div>
          <div className="app-card-body">
            <div className="app-meta"><span className="badge-online">Online now</span><span>เว็บแอป</span><span>ร้านนวด · LINE</span></div>
            <h3>Book Sabuy</h3>
            <p>จดคิวร้านนวด รับชำระ เติมเครดิตสมาชิก และดูสรุปยอดผ่าน LINE</p>
            <div className="app-actions">
              <a className="text-link" href="booksabuy.html">ดูแนวคิดของแอป</a>
              <a className="text-link" href="/booksabuy/" target="_blank" rel="noopener noreferrer">เปิดแอปจริง ↗</a>
            </div>
          </div>
        </article>

        <article className="app-card" data-category="tool" data-search={payYetSearch} hidden={!isAppVisible("tool", payYetSearch)}>
          <div className="app-art app-art-payyet" aria-hidden="true">
            <div className="payyet-preview">
              <div className="payyet-preview-head">
                <span className="payyet-mark">P</span>
                <span className="payyet-brand"><strong>PayYet</strong><small>เก็บเงินในกลุ่ม LINE</small></span>
                <span className="payyet-channel">LINE</span>
              </div>
              <div className="payyet-request">
                <span>ค่าอาหารกลุ่ม</span>
                <strong>฿1,250</strong>
                <small>ครบกำหนดวันนี้ · 3 คน</small>
              </div>
              <div className="payyet-progress"><span><i /></span><small>จ่ายแล้ว 2 จาก 3 คน</small></div>
              <div className="payyet-payment-row">
                <span className="payyet-qr" />
                <span><strong>QR พร้อมเพย์</strong><small>ชำระและแนบสลิป</small></span>
              </div>
            </div>
          </div>
          <div className="app-card-body">
            <div className="app-meta"><span className="badge-online">Online now</span><span>เครื่องมือ</span><span>LINE Bot</span></div>
            <h3>PayYet</h3>
            <p>บอท LINE ช่วยเก็บเงินในกลุ่มหรือรายคน พร้อม QR พร้อมเพย์ แนบสลิป และเตือนอัตโนมัติ</p>
            <div className="app-actions">
              <a className="text-link" href="payyet.html">รายละเอียด PayYet</a>
              <a className="text-link" href="/payyet/">เปิด PayYet →</a>
            </div>
          </div>
        </article>

        <article className="app-card" data-category="tool" data-search={jodDailySearch} hidden={!isAppVisible("tool", jodDailySearch)}>
          <div className="app-art app-art-joddaily" aria-hidden="true">
            <div className="joddaily-preview">
              <div className="joddaily-preview-head">
                <span className="joddaily-mark">J</span>
                <span className="joddaily-brand"><strong>JodDaily</strong><small>บันทึกในแชต LINE</small></span>
                <span className="joddaily-channel">LINE</span>
              </div>
              <div className="joddaily-summary"><span>คงเหลือเดือนนี้</span><strong>฿12,480</strong></div>
              <div className="joddaily-transactions">
                <div><span>กาแฟ · วันนี้</span><strong>−฿65</strong></div>
                <div><span>เงินเดือน</span><strong>+฿30,000</strong></div>
              </div>
              <div className="joddaily-budget"><span>งบอาหาร</span><span><i /></span><strong>68%</strong></div>
            </div>
          </div>
          <div className="app-card-body">
            <div className="app-meta"><span className="badge-online">Online now</span><span>เครื่องมือ</span><span>LINE Bot</span></div>
            <h3>JodDaily</h3>
            <p>จดรายรับรายจ่ายผ่านแชต LINE ตั้งงบ เตือนค่าสมาชิก และดูสรุปพร้อมส่งออก CSV</p>
            <div className="app-actions">
              <a className="text-link" href="joddaily.html">รายละเอียด JodDaily</a>
              <a className="text-link" href="/joddaily/">เปิด JodDaily →</a>
            </div>
          </div>
        </article>

        {"\n            "}
        <article className="app-card" data-category="web" data-search="pimsaduak พิมพ์ใบปะหน้า ฉลาก พัสดุ ใบส่งของ qr barcode เว็บแอป" hidden={!isAppVisible("web", "pimsaduak พิมพ์ใบปะหน้า ฉลาก พัสดุ ใบส่งของ qr barcode เว็บแอป")}>
          {"\n              "}
          <div className="app-art app-art-label" aria-hidden="true">
            {"\n                "}
            <div className="label-window">
              {"\n                  "}
              <div className="label-window-head">
                <strong>
                  {"พิมพ์สะดวก"}
                </strong>
                <span>
                  {"ใบปะหน้าพัสดุ"}
                </span>
              </div>
              {"\n                  "}
              <div className="label-window-address">
                {"\n                    "}
                <span>
                  {"ผู้รับ"}
                </span>
                {"\n                    "}
                <strong>
                  {"ชื่อผู้รับ"}
                </strong>
                {"\n                    "}
                <p>
                  {"ที่อยู่จัดส่ง · เบอร์ติดต่อ"}
                </p>
                {"\n                  "}
              </div>
              {"\n                  "}
              <div className="label-window-code"></div>
              {"\n                  "}
              <div className="label-window-foot">
                <span>
                  {"ตัวอย่างก่อนพิมพ์"}
                </span>
                <span>
                  {"10 × 15 cm"}
                </span>
              </div>
              {"\n                "}
            </div>
            {"\n              "}
          </div>
          {"\n              "}
          <div className="app-card-body">
            {"\n                "}
            <div className="app-meta">
              <span className="badge-online">{"Online now"}</span>
              <span>
                {"เว็บแอป"}
              </span>
            </div>
            {"\n                "}
            <h3>{"พิมพ์สะดวก"}</h3>
            {"\n                "}
            <p>
              {"เตรียมข้อมูลผู้รับ เลือกขนาดฉลาก ดูตัวอย่าง แล้วพิมพ์ใบปะหน้าพัสดุ"}
            </p>
            {"\n                "}
            <div className="app-actions">
              {"\n                  "}
              <a className="text-link" href="pimsaduak.html">
                {"ดูแนวคิดของแอป"}
              </a>
              {"\n                  "}
              <a className="text-link" href="https://pimsaduak.drivetodev.online" target="_blank" rel="noopener noreferrer">
                {"เปิดแอปจริง ↗"}
              </a>
              {"\n                "}
            </div>
            {"\n              "}
          </div>
          {"\n            "}
        </article>
        {"\n\n            "}
        <article className="app-card" data-category="web" data-search="meestock stockroom สต็อก คลังสินค้า เว็บแอป ธุรกิจ" hidden={!isAppVisible("web", "meestock stockroom สต็อก คลังสินค้า เว็บแอป ธุรกิจ")}>
          {"\n              "}
          <div className="app-art app-art-inventory" aria-hidden="true">
            <div className="preview-card">
              <div className="preview-top"><strong>{"MeeStock"}</strong><span>{"ภาพรวมคลัง"}</span></div>
              <div className="stock-rows">
                <div><span>{"กล่องพัสดุ"}</span><span>{"128"}</span></div>
                <div><span>{"เทปกาว"}</span><span>{"46"}</span></div>
                <div className="low"><span>{"ซองเอกสาร"}</span><span>{"8 · ใกล้หมด"}</span></div>
              </div>
              <div className="preview-bottom"><span>{"ตัวอย่างข้อมูล"}</span><span>{"แจ้งเตือนอัตโนมัติ"}</span></div>
            </div>
          </div>
          {"\n              "}
          <div className="app-card-body">
            {"\n                "}
            <div className="app-meta">
              <span className="badge-online">{"Online now"}</span>
              <span>
                {"เว็บแอป"}
              </span>
              <span>
                {"จัดการสต็อก"}
              </span>
            </div>
            {"\n                "}
            <h3>{"MeeStock"}</h3>
            {"\n                "}
            <p>
              {"ระบบจัดการสต็อก รับ-จ่ายสินค้า จัดส่ง และรายงาน ในที่เดียว"}
            </p>
            {"\n                "}
            <div className="app-actions">
              <a className="text-link" href="meestock.html">
                {"ดูแนวคิดของแอป"}
              </a>
              <a className="text-link" href="https://meestock.drivetodev.online" target="_blank" rel="noopener noreferrer">
                {"เปิดแอปจริง ↗"}
              </a>
            </div>
            {"\n              "}
          </div>
          {"\n            "}
        </article>
        {"\n\n            "}
        <article className="app-card" data-category="web" data-search="เล่นกันมั้ย partygame party game เกมปาร์ตี้ เล่นผลัดกัน" hidden={!isAppVisible("web", "เล่นกันมั้ย partygame party game เกมปาร์ตี้ เล่นผลัดกัน")}>
          {"\n              "}
          <div className="app-art app-art-games" aria-hidden="true">
            <div className="party-board">
              <div className="party-board-header">
                <div><span className="party-board-kicker">{"เล่นกันมั้ย"}</span><strong>{"เลือกเกมแล้วชวนเพื่อน"}</strong></div>
                <span className="party-game-count">{"6 เกม"}</span>
              </div>
              <div className="party-game-list">
                <div className="party-game-tile"><span>{"01"}</span><strong>{"เลขลับ"}</strong></div>
                <div className="party-game-tile"><span>{"02"}</span><strong>{"ลุ้นบึ้ม"}</strong></div>
                <div className="party-game-tile"><span>{"03"}</span><strong>{"Truth or Dare"}</strong></div>
                <div className="party-game-tile"><span>{"04"}</span><strong>{"อย่าปล่อยช้า"}</strong></div>
              </div>
              <div className="party-board-footer">
                <div className="party-player-row"><span>{"ก"}</span><span>{"น"}</span><span>{"ม"}</span><span>{"+"}</span></div>
                <span>{"เล่นผลัดกันเครื่องเดียว"}</span>
              </div>
            </div>
          </div>
          {"\n              "}
          <div className="app-card-body">
            {"\n                "}
            <div className="app-meta">
              <span className="badge-online">{"Online now"}</span>
              <span>
                {"เกมปาร์ตี้"}
              </span>
              <span>
                {"เล่นได้หลายคน"}
              </span>
            </div>
            {"\n                "}
            <h3>{"เล่นกันมั้ย"}</h3>
            {"\n                "}
            <p>
              {"รวม 6 เกมปาร์ตี้ เล่นผลัดกันบนมือถือ แท็บเล็ต หรือคอมพิวเตอร์เครื่องเดียว"}
            </p>
            {"\n                "}
            <div className="app-actions">
              <a className="text-link" href="partygame.html">
                {"ดูแนวคิดของแอป"}
              </a>
              <a className="text-link" href="https://partygame.drivetodev.online" target="_blank" rel="noopener noreferrer">
                {"เปิดแอปจริง ↗"}
              </a>
            </div>
            {"\n              "}
          </div>
          {"\n            "}
        </article>
        {"\n          "}
      </div>
      {"\n          "}
      <p className="result-count" id="result-count" aria-live="polite">
        {"แสดง "}{visibleCount}{" แอป"}
      </p>
      {"\n          "}
      <div className="empty-state" id="empty-state" hidden={visibleCount !== 0}>
        {"\n            "}
        <p>
          {"ยังไม่พบแอปที่ตรงกับคำค้นนี้"}
        </p>
        {"\n            "}
        <button className="button button-secondary" id="clear-search" type="button" onClick={() => { setActiveFilter("all"); setSearch(""); document.getElementById("app-search")?.focus(); }}>
          {"ล้างตัวกรองและค้นหาใหม่"}
        </button>
        {"\n          "}
      </div>
      {"\n        "}
    </div>
    {"\n      "}
  </section>
  {"\n\n      "}
  <section className="about-section section" id="about" aria-labelledby="about-title">
    {"\n        "}
    <div className="wrap about-grid">
      {"\n          "}
      <div className="about-copy">
        {"\n            "}
        <p className="section-label">
          {"คนที่อยู่เบื้องหลัง"}
        </p>
        {"\n            "}
        <h2 id="about-title">
          {"เกี่ยวกับ drivetodev"}
        </h2>
        {"\n            "}
        <p>
          {"\n              สนุกกับการตั้งคำถามว่าเรื่องไหนทำให้ง่ายขึ้นได้อีก แล้วเปลี่ยนคำตอบให้กลายเป็นซอฟต์แวร์ที่คนใช้ได้จริง drivetodev จึงเป็นทั้งพื้นที่ทดลองไอเดียและบ้านของแอปที่ค่อย ๆ พัฒนาไปพร้อมกับผู้ใช้\n            "}
        </p>
        {"\n          "}
      </div>
      {"\n          "}
      <aside className="about-card" aria-label="แนวคิดการทำงาน">
        {"\n            "}
        <h3>
          {"สิ่งที่ใส่ใจในทุกโปรเจกต์"}
        </h3>
        {"\n            "}
        <ul>
          {"\n              "}
          <li>
            {"เข้าใจโจทย์ก่อนเลือกเทคโนโลยี"}
          </li>
          {"\n              "}
          <li>
            {"ลดขั้นตอนที่ไม่จำเป็น"}
          </li>
          {"\n              "}
          <li>
            {"สร้างจากการใช้งานจริงและรับฟังคำแนะนำ"}
          </li>
          {"\n            "}
        </ul>
        {"\n          "}
      </aside>
      {"\n        "}
    </div>
    {"\n      "}
  </section>
  {"\n\n      "}
  <section className="contact-band" id="contact" aria-labelledby="contact-title">
    {"\n        "}
    <div className="wrap contact-inner">
      {"\n          "}
      <div>
        {"\n            "}
        <h2 id="contact-title">
          {"มีไอเดียที่อยากทำให้เกิดขึ้นจริงไหม"}
        </h2>
        {"\n            "}
        <p>
          {"เริ่มต้นจากการเล่าโจทย์ แล้วค่อยหาทางออกไปด้วยกัน"}
        </p>
        {"\n          "}
      </div>
      {"\n          "}
      <a className="button" href="mailto:hello@drivetodev.com?subject=คุยเรื่องโปรเจกต์">
        {"ชวนคุยเรื่องโปรเจกต์"}
      </a>
      {"\n        "}
    </div>
    {"\n      "}
  </section>
  {"\n    "}
</main>
{"\n\n    "}
<footer className="site-footer">
  {"\n      "}
  <div className="wrap footer-inner">
    {"\n        "}
    <p className="footer-brand">
      {"drivetodev"}
    </p>
    {"\n        "}
    <p>
      {"จากไอเดียสู่ซอฟต์แวร์ที่ใช้ได้จริง"}
    </p>
    {"\n      "}
  </div>
  {"\n    "}
</footer>
{"\n\n    "}
{"\n    "}

{"\n\n    "}
{"\n  \n\n"}
    </>
  );
}
