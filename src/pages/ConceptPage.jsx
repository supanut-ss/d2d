export default function ConceptPage() {
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
    <a className="brand" href="/" aria-label="drivetodev กลับหน้ารวมแอป">
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
      <a href="/#apps">
        {"แอปทั้งหมด"}
      </a>
      {"\n          "}
      <a className="nav-cta" href="https://pimsaduak.drivetodev.online" target="_blank" rel="noopener noreferrer">
        {"เปิดแอปพิมพ์สะดวก ↗"}
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
  <section className="wrap hero" aria-labelledby="hero-title">
    {"\n        "}
    <div className="hero-copy">
      {"\n          "}
      <p className="eyebrow">
        {"เว็บแอปสำหรับพิมพ์ใบปะหน้า"}
      </p>
      {"\n          "}
      <h1 id="hero-title">
        {"เตรียมใบปะหน้า แล้วพิมพ์ได้ในที่เดียว"}
      </h1>
      {"\n          "}
      <p className="hero-description">
        {"\n            พิมพ์สะดวกช่วยเปลี่ยนข้อมูลผู้รับและผู้ส่งให้เป็นใบปะหน้าพัสดุพร้อมพิมพ์ ตั้งแต่กรอกข้อมูลทีละใบหรือนำเข้าหลายรายการ ไปจนถึงตรวจตัวอย่างก่อนสั่งพิมพ์\n          "}
      </p>
      {"\n          "}
      <div className="hero-actions">
        {"\n            "}
        <a className="button button-primary" href="https://pimsaduak.drivetodev.online" target="_blank" rel="noopener noreferrer">
          {"เปิดแอปจริง ↗"}
        </a>
        {"\n            "}
        <a className="button button-secondary" href="/#apps">
          {"กลับไปแอปทั้งหมด"}
        </a>
        {"\n          "}
      </div>
      {"\n        "}
    </div>
    {"\n\n        "}
    <div className="hero-art" role="img" aria-label="ตัวอย่างใบปะหน้าพัสดุพร้อมชื่อผู้รับ ที่อยู่ และบาร์โค้ด">
      {"\n          "}
      <div className="preview-card">
        {"\n            "}
        <div className="preview-top">
          <strong>
            {"พิมพ์สะดวก"}
          </strong>
          <span>
            {"ใบปะหน้าพัสดุ"}
          </span>
        </div>
        {"\n            "}
        <div className="address-block">
          {"\n              "}
          <span>
            {"ส่งถึง"}
          </span>
          {"\n              "}
          <strong>
            {"ชื่อผู้รับ"}
          </strong>
          {"\n              "}
          <p>
            {"ที่อยู่จัดส่ง · เบอร์ติดต่อ"}
          </p>
          {"\n            "}
        </div>
        {"\n            "}
        <div className="barcode"></div>
        {"\n            "}
        <div className="preview-bottom">
          <span>
            {"ตัวอย่างก่อนพิมพ์"}
          </span>
          <span>
            {"10 × 15 cm"}
          </span>
        </div>
        {"\n          "}
      </div>
      {"\n        "}
    </div>
    {"\n      "}
  </section>
  {"\n\n      "}
  <section className="section section-white" aria-labelledby="thinking-title">
    {"\n        "}
    <div className="wrap">
      {"\n          "}
      <div className="section-heading">
        {"\n            "}
        <p className="section-label">
          {"แนวคิดการออกแบบ"}
        </p>
        {"\n            "}
        <h2 id="thinking-title">
          {"ให้ขั้นตอนเตรียมฉลากชัดเจนตั้งแต่ต้นจนจบ"}
        </h2>
        {"\n            "}
        <p>
          {"รวมงานที่มักต้องสลับไปมาระหว่างแบบฟอร์ม ตาราง และหน้าพิมพ์ ไว้ในลำดับเดียวที่ตรวจทานได้"}
        </p>
        {"\n          "}
      </div>
      {"\n          "}
      <div className="thinking-grid">
        {"\n            "}
        <article className="thinking-card">
          {"\n              "}
          <h3>
            {"รองรับทั้งงานเดี่ยวและงานชุด"}
          </h3>
          {"\n              "}
          <p>
            {"กรอกข้อมูลเพื่อพิมพ์หนึ่งใบ หรือนำเข้า Excel, CSV และไฟล์ข้อความ โดยหนึ่งแถวจะกลายเป็นหนึ่งฉลาก"}
          </p>
          {"\n            "}
        </article>
        {"\n            "}
        <article className="thinking-card">
          {"\n              "}
          <h3>
            {"ตรวจขนาดและหน้าตาก่อนพิมพ์"}
          </h3>
          {"\n              "}
          <p>
            {"เลือกขนาดมาตรฐานหรือกำหนดเอง แล้วดูตัวอย่างฉลากก่อนเปิดหน้าพิมพ์ของเบราว์เซอร์"}
          </p>
          {"\n            "}
        </article>
        {"\n            "}
        <article className="thinking-card">
          {"\n              "}
          <h3>
            {"เก็บข้อมูลไว้บนอุปกรณ์"}
          </h3>
          {"\n              "}
          <p>
            {"ทำงานในเบราว์เซอร์โดยไม่ต้องมีบัญชี ข้อมูลชื่อ ที่อยู่ และเบอร์โทรไม่ถูกส่งไปยังเซิร์ฟเวอร์"}
          </p>
          {"\n            "}
        </article>
        {"\n          "}
      </div>
      {"\n        "}
    </div>
    {"\n      "}
  </section>
  {"\n\n      "}
  <section className="section" aria-labelledby="steps-title">
    {"\n        "}
    <div className="wrap">
      {"\n          "}
      <div className="section-heading">
        {"\n            "}
        <p className="section-label">
          {"วิธีทำงาน"}
        </p>
        {"\n            "}
        <h2 id="steps-title">
          {"จากข้อมูลจัดส่งสู่ฉลากที่พร้อมพิมพ์"}
        </h2>
        {"\n            "}
        <p>
          {"แอปช่วยจัดลำดับงานและแจ้งแถวที่มีปัญหา เพื่อให้แก้ข้อมูลก่อนส่งไปพิมพ์"}
        </p>
        {"\n          "}
      </div>
      {"\n          "}
      <div className="steps">
        {"\n            "}
        <article className="step">
          {"\n              "}
          <h3>
            {"เลือกขนาดฉลาก"}
          </h3>
          {"\n              "}
          <p>
            {"เลือกขนาดกระดาษที่ใช้ หรือระบุความกว้างและความสูงเอง"}
          </p>
          {"\n            "}
        </article>
        {"\n            "}
        <article className="step">
          {"\n              "}
          <h3>
            {"กรอกหรือนำเข้ารายการ"}
          </h3>
          {"\n              "}
          <p>
            {"เพิ่มผู้รับและผู้ส่งทีละใบ หรือนำเข้าไฟล์ได้สูงสุด 200 แถวต่อไฟล์"}
          </p>
          {"\n            "}
        </article>
        {"\n            "}
        <article className="step">
          {"\n              "}
          <h3>
            {"ตรวจตัวอย่างและพิมพ์"}
          </h3>
          {"\n              "}
          <p>
            {"เลือกรหัส QR หรือบาร์โค้ดได้ตามต้องการ แล้วตรวจตัวอย่างก่อนพิมพ์"}
          </p>
          {"\n            "}
        </article>
        {"\n          "}
      </div>
      {"\n        "}
    </div>
    {"\n      "}
  </section>
  {"\n\n      "}
  <section className="section section-white" aria-labelledby="features-title">
    {"\n        "}
    <div className="wrap">
      {"\n          "}
      <div className="section-heading">
        {"\n            "}
        <p className="section-label">
          {"รายละเอียดที่ช่วยให้งานต่อเนื่อง"}
        </p>
        {"\n            "}
        <h2 id="features-title">
          {"เครื่องมือที่อยู่ใกล้กับงานจริง"}
        </h2>
        {"\n          "}
      </div>
      {"\n          "}
      <div className="feature-grid">
        {"\n            "}
        <article className="feature-card">
          {"\n              "}
          <h3>
            {"แม่แบบนำเข้าพร้อมใช้"}
          </h3>
          {"\n              "}
          <p>
            {"ดาวน์โหลดตัวอย่าง Excel, CSV หรือข้อความ แล้วแทนที่ข้อมูลตัวอย่างด้วยรายการของคุณ"}
          </p>
          {"\n            "}
        </article>
        {"\n            "}
        <article className="feature-card">
          {"\n              "}
          <h3>
            {"QR Code และบาร์โค้ด"}
          </h3>
          {"\n              "}
          <p>
            {"เพิ่มรหัสติดตามหรือลิงก์ลงบนฉลาก หรือเว้นช่องรหัสไว้ได้"}
          </p>
          {"\n            "}
        </article>
        {"\n            "}
        <article className="feature-card">
          {"\n              "}
          <h3>
            {"ประวัติในเบราว์เซอร์"}
          </h3>
          {"\n              "}
          <p>
            {"ค้นหาและพิมพ์รายการเดิมซ้ำได้ ประวัตินี้บันทึกคำสั่งพิมพ์ ไม่ได้ยืนยันว่ากระดาษออกจากเครื่องพิมพ์แล้ว"}
          </p>
          {"\n            "}
        </article>
        {"\n          "}
      </div>
      {"\n        "}
    </div>
    {"\n      "}
  </section>
  {"\n\n      "}
  <section className="section" aria-labelledby="privacy-title">
    {"\n        "}
    <div className="wrap">
      {"\n          "}
      <div className="privacy-panel">
        {"\n            "}
        <h2 id="privacy-title">
          {"ข้อมูลจัดส่งยังอยู่บนอุปกรณ์ของคุณ"}
        </h2>
        {"\n            "}
        <div>
          {"\n              "}
          <p>
            {"พิมพ์สะดวกทำงานในเบราว์เซอร์โดยไม่ต้องสมัครสมาชิกหรือพึ่งบริการออนไลน์ ข้อมูลที่กรอกและไฟล์ที่นำเข้าจะไม่ถูกส่งไปยังเซิร์ฟเวอร์"}
          </p>
          {"\n              "}
          <p>
            {"ประวัติการพิมพ์เก็บไว้ในเบราว์เซอร์เครื่องนี้ หากล้างข้อมูลเว็บไซต์หรือเปลี่ยนเบราว์เซอร์ ประวัติก็จะไม่แสดง"}
          </p>
          {"\n            "}
        </div>
        {"\n          "}
      </div>
      {"\n        "}
    </div>
    {"\n      "}
  </section>
  {"\n\n      "}
  <section className="section section-white">
    {"\n        "}
    <div className="wrap closing">
      {"\n          "}
      <div>
        {"\n            "}
        <p className="section-label">
          {"ลองใช้งาน"}
        </p>
        {"\n            "}
        <p>
          {"เปิดแอปพิมพ์สะดวกเพื่อเตรียมข้อมูลและพิมพ์ใบปะหน้าพัสดุจากเบราว์เซอร์ของคุณ"}
        </p>
        {"\n          "}
      </div>
      {"\n          "}
      <a className="text-link" href="https://pimsaduak.drivetodev.online" target="_blank" rel="noopener noreferrer">
        {"ไปที่แอปพิมพ์สะดวก ↗"}
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
{"\n  \n\n"}
    </>
  );
}
