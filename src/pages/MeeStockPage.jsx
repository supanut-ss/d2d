export default function MeeStockPage() {
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
    <a className="brand" href="index.html" aria-label="drivetodev กลับหน้ารวมแอป">
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
      <a href="index.html#apps">
        {"แอปทั้งหมด"}
      </a>
      {"\n          "}
      <a className="nav-cta" href="https://meestock.drivetodev.online" target="_blank" rel="noopener noreferrer">
        {"เปิดแอป MeeStock ↗"}
      </a>
      {"\n        "}
    </nav>
    {"\n      "}
  </div>
  {"\n    "}
</header>
{"\n\n    "}
<main id="main-content">
      <section className="wrap hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">{"โปรแกรมจัดการสต็อกสำหรับร้านค้า"}</p>
          <h1 id="hero-title">{"รู้สต็อก รู้ยอดขาย ในระบบเดียว"}</h1>
          <p className="hero-description">{"MeeStock ช่วยบันทึกสินค้า รับสินค้าเข้า จ่ายสินค้า ติดตามการจัดส่ง และดูรายงาน พร้อมแจ้งเตือนเมื่อสินค้าใกล้หมดหรือใกล้หมดอายุ"}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="https://meestock.drivetodev.online" target="_blank" rel="noopener noreferrer">{"เปิดแอปจริง ↗"}</a>
            <a className="button button-secondary" href="index.html#apps">{"กลับไปแอปทั้งหมด"}</a>
          </div>
        </div>
        <div className="hero-art" role="img" aria-label="ตัวอย่างรายการสต็อกสินค้าพร้อมการแจ้งเตือนสินค้าใกล้หมด">
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
      </section>

      <section className="section section-white"><div className="wrap"><div className="section-heading"><p className="section-label">{"แนวคิดการออกแบบ"}</p><h2>{"จัดการสต็อกให้ตรวจสอบย้อนหลังได้"}</h2><p>{"ทุกการเคลื่อนไหวของสินค้าถูกบันทึก เพื่อให้ตอบได้ว่าทำไมจำนวนจึงเปลี่ยน"}</p></div><div className="thinking-grid">
        <article className="thinking-card"><h3>{"ทุกการเปลี่ยนแปลงมีประวัติ"}</h3><p>{"รับเข้า ขาย ปรับยอด และคืนสินค้า ถูกบันทึกเป็นประวัติที่แก้ไขหรือลบไม่ได้"}</p></article>
        <article className="thinking-card"><h3>{"รองรับสินค้าหลายรูปแบบ"}</h3><p>{"มีตัวเลือกสินค้า (ขนาด สี) และสินค้าเซ็ตที่คำนวณจำนวนเซ็ตสูงสุดจากสต็อกจริง"}</p></article>
        <article className="thinking-card"><h3>{"แยกสิทธิ์ผู้ใช้"}</h3><p>{"Admin จัดการผู้ใช้ได้ ส่วน Staff ทำงานประจำวัน เช่น สต็อก ขาย และจัดส่ง"}</p></article>
      </div></div></section>

      <section className="section"><div className="wrap"><div className="section-heading"><p className="section-label">{"วิธีทำงาน"}</p><h2>{"จากสินค้าเข้าถึงสินค้าออก"}</h2></div><div className="steps">
        <article className="step"><h3>{"รับสินค้า"}</h3><p>{"ระบุจำนวน ราคาทุน เลข LOT วันหมดอายุ และซัพพลายเออร์ สต็อกเพิ่มทันที"}</p></article>
        <article className="step"><h3>{"จ่ายสินค้าและขาย"}</h3><p>{"เพิ่มรายการด้วยการเลือก สแกนบาร์โค้ด หรือสแกนด้วยกล้อง แล้วบันทึกการขาย"}</p></article>
        <article className="step"><h3>{"จัดส่งและดูรายงาน"}</h3><p>{"ใส่เลขพัสดุเพื่อเปลี่ยนสถานะเป็นจัดส่งแล้ว พิมพ์ใบปะหน้า และส่งออกรายงานเป็น Excel"}</p></article>
      </div></div></section>

      <section className="section section-white"><div className="wrap"><div className="section-heading"><p className="section-label">{"ฟีเจอร์เด่น"}</p><h2>{"เครื่องมือที่ใช้ได้จริงทุกวัน"}</h2></div><div className="feature-grid">
        <article className="feature-card"><h3>{"แดชบอร์ดและรายงาน"}</h3><p>{"ดูยอดขาย มูลค่าสต็อก สินค้าขายดี สินค้าขายช้า และกำไร-ขาดทุน"}</p></article>
        <article className="feature-card"><h3>{"แจ้งเตือนอัตโนมัติ"}</h3><p>{"กระดิ่งแจ้งเตือนเมื่อสต็อกต่ำกว่าขั้นต่ำหรือมี LOT ใกล้หมดอายุ"}</p></article>
        <article className="feature-card"><h3>{"นำเข้า/ส่งออก Excel"}</h3><p>{"เพิ่มสินค้าจำนวนมากพร้อมตรวจตัวอย่างก่อนยืนยัน และส่งออกรายการได้ทุกเมื่อ"}</p></article>
      </div></div></section>

      <section className="section">
        <div className="wrap closing">
          <div>
            <p className="section-label">{"ลองใช้งาน"}</p>
            <p>{"เปิด MeeStock เพื่อจัดการสต็อก การขาย และการจัดส่งของร้านคุณ"}</p>
          </div>
          <a className="text-link" href="https://meestock.drivetodev.online" target="_blank" rel="noopener noreferrer">{"ไปที่แอป MeeStock ↗"}</a>
        </div>
      </section>
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
{"\n  \n\n"}
    </>
  );
}
