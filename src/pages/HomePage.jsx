import { useEffect, useMemo, useRef, useState } from "react";

const apps = [{"category":"web","search":"pimsaduak พิมพ์ใบปะหน้า ฉลาก พัสดุ ใบส่งของ qr barcode เว็บแอป"},{"category":"web","search":"meestock stockroom สต็อก คลังสินค้า เว็บแอป ธุรกิจ"},{"category":"tool","search":"dev notes devnotes โน้ต โค้ด นักพัฒนา เครื่องมือ"}];

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
        {"\n            "}
        <p className="sample-note">
          {"พิมพ์สะดวก เปิดใช้งานจริง"}
        </p>
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
              <span>
                {"เว็บแอป"}
              </span>
              <span>
                {"พร้อมใช้งาน"}
              </span>
            </div>
            {"\n                "}
            <h3>
              {"พิมพ์สะดวก"}
            </h3>
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
            {"\n                "}
            <div className="mini-window">
              {"\n                  "}
              <div className="mini-window-head">
                <span>
                  {"ภาพรวมคลัง"}
                </span>
                <span>
                  {"ล่าสุด"}
                </span>
              </div>
              {"\n                  "}
              <div className="stock-list">
                <span>
                  {"กล่องพัสดุ"}
                </span>
                <span>
                  {"128"}
                </span>
                <span className="stock-status"></span>
              </div>
              {"\n                  "}
              <div className="stock-list">
                <span>
                  {"เทปกาว"}
                </span>
                <span>
                  {"46"}
                </span>
                <span className="stock-status"></span>
              </div>
              {"\n                  "}
              <div className="stock-list">
                <span>
                  {"ซองเอกสาร"}
                </span>
                <span>
                  {"32"}
                </span>
                <span className="stock-status"></span>
              </div>
              {"\n                "}
            </div>
            {"\n              "}
          </div>
          {"\n              "}
          <div className="app-card-body">
            {"\n                "}
            <div className="app-meta">
              <span>
                {"เว็บแอป"}
              </span>
              <span>
                {"จัดการสต็อก"}
              </span>
            </div>
            {"\n                "}
            <h3>
              {"MeeStock"}
            </h3>
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
        <article className="app-card" data-category="tool" data-search="dev notes devnotes โน้ต โค้ด นักพัฒนา เครื่องมือ" hidden={!isAppVisible("tool", "dev notes devnotes โน้ต โค้ด นักพัฒนา เครื่องมือ")}>
          {"\n              "}
          <div className="app-art app-art-notes" aria-hidden="true">
            {"\n                "}
            <div className="code-window">
              {"\n                  "}
              <p className="code-comment">
                {"// บันทึกไว้ใช้ครั้งต่อไป"}
              </p>
              {"\n                  "}
              <p>
                <span className="code-function">
                  {"function"}
                </span>
                {" keepUsefulNotes() {"}
              </p>
              {"\n                  "}
              <p>
                {"  return notes.find("}
                <span className="code-function">
                  {"useful"}
                </span>
                {");"}
              </p>
              {"\n                  "}
              <p>
                {"}"}
              </p>
              {"\n                "}
            </div>
            {"\n              "}
          </div>
          {"\n              "}
          <div className="app-card-body">
            {"\n                "}
            <div className="app-meta">
              <span>
                {"เครื่องมือ"}
              </span>
              <span>
                {"สำหรับนักพัฒนา"}
              </span>
            </div>
            {"\n                "}
            <h3>
              {"Dev Notes"}
            </h3>
            {"\n                "}
            <p>
              {"เก็บโค้ดตัวอย่างและโน้ตสั้น ๆ ให้กลับมาค้นเจอง่าย"}
            </p>
            {"\n                "}
            <button className="text-link" type="button" data-dialog="devnotes-dialog" onClick={() => setActiveDialog("devnotes-dialog")}>
              {"ดูแนวคิดของแอป"}
            </button>
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
<dialog id="devnotes-dialog" aria-labelledby="devnotes-title" ref={(node) => { dialogRefs.current["devnotes-dialog"] = node; }} onClose={() => setActiveDialog("")}>
  {"\n      "}
  <div className="dialog-content">
    {"\n        "}
    <p className="section-label">
      {"ตัวอย่างข้อมูลสำหรับ mockup · เครื่องมือ"}
    </p>
    {"\n        "}
    <h2 id="devnotes-title">
      {"Dev Notes"}
    </h2>
    {"\n        "}
    <p>
      {"แนวคิดพื้นที่เก็บ snippet และโน้ตด้านเทคนิค เพื่อค้นกลับมาใช้ได้ในเวลาที่ต้องการ"}
    </p>
    {"\n        "}
    <ul>
      <li>
        {"จัดกลุ่มโน้ตตามหัวข้อหรือภาษา"}
      </li>
      <li>
        {"ค้นหาจากเนื้อหาและแท็ก"}
      </li>
    </ul>
    {"\n        "}
    <button className="dialog-close" type="button" onClick={() => setActiveDialog("")}>
      {"ปิดรายละเอียด"}
    </button>
    {"\n      "}
  </div>
  {"\n    "}
</dialog>
{"\n\n    "}
{"\n  \n\n"}
    </>
  );
}
