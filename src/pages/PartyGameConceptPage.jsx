const appUrl = "https://partygame.drivetodev.online";

const games = [
  { players: "2–8 คน", title: "อย่าโดนเลขลับ!", description: "ผลัดกันทายเลข 1–100 ใครทายโดนเลขลับเป็นผู้แพ้รอบ" },
  { players: "2–8 คน", title: "เปิดช่อง ลุ้นบึ้ม", description: "เปิดช่องบนกระดาน 6 × 6 ใครเจอระเบิดจะเป็นผู้แพ้" },
  { players: "2–8 คน", title: "Truth or Dare", description: "เลือกความจริงหรือคำท้า เปลี่ยนโจทย์หรือส่งตาต่อได้" },
  { players: "2–8 คน", title: "อย่าปล่อยช้า!", description: "รอสัญญาณเงียบแล้วปล่อย คนช้าที่สุดหรือปล่อยก่อนเวลาแพ้" },
  { players: "3–8 คน", title: "เลขลับขั้วสุดโต่ง", description: "ส่งเลข 1–1,000 แบบซ่อนค่า เลขต่ำสุดและสูงสุดแพ้" },
  { players: "2–8 คน", title: "จับใหญ่", description: "จั่วไพ่คนละใบ แล้วผู้ที่ได้ไพ่สูงสุดเป็นผู้แพ้" },
];

export default function PartyGameConceptPage() {
  return (
    <>
      <a className="skip-link" href="#main-content">ข้ามไปยังเนื้อหาหลัก</a>
      <header className="site-header">
        <div className="wrap header-inner">
          <a className="brand" href="/" aria-label="drivetodev กลับหน้ารวมแอป">
            <svg className="brand-mark" viewBox="0 0 186 186" aria-hidden="true">
              <path fill="#14243a" fillRule="evenodd" d="M24 18h73c46 0 73 29 73 74s-27 76-73 76H24v-40l44-36-44-37V18Zm45 36v77h28c25 0 40-15 40-39s-15-38-40-38H69Z" />
              <path fill="#126bfa" d="M24 18h34l55 56c12 12 12 25 0 37l-55 57H24v-40l44-36-44-37V18Z" />
            </svg>
            <span className="brand-name">drive<span>to</span>dev</span>
          </a>
          <nav className="main-nav" aria-label="เมนูหลัก">
            <a href="/#apps">แอปทั้งหมด</a>
            <a className="nav-cta" href={appUrl} target="_blank" rel="noopener noreferrer">เปิดแอปเล่นกันมั้ย ↗</a>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="wrap hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">เว็บรวมเกมปาร์ตี้</p>
            <h1 id="hero-title">เล่นกันมั้ย: 6 เกมปาร์ตี้ เล่นกับเพื่อนบนเครื่องเดียว</h1>
            <p className="hero-description">
              เล่นกันมั้ย รวมเกมสั้น ๆ 6 แบบให้ทุกคนผลัดกันเล่นบนโทรศัพท์ แท็บเล็ต หรือคอมพิวเตอร์เครื่องเดียว
              เลือกเกม ใส่รายชื่อ แล้วทำตามตาที่แสดงบนหน้าจอ
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href={appUrl} target="_blank" rel="noopener noreferrer">เปิดแอปจริง ↗</a>
              <a className="button button-secondary" href="/#apps">กลับไปแอปทั้งหมด</a>
            </div>
          </div>
          <div className="hero-art party-hero-art" role="img" aria-label="ตัวอย่างเกมปาร์ตี้ 6 เกมและการเล่นผลัดกันบนอุปกรณ์เดียว">
            <div className="party-board">
              <div className="party-board-header">
                <div><span className="party-board-kicker">เล่นกันมั้ย</span><strong>เลือกเกมแล้วชวนเพื่อน</strong></div>
                <span className="party-game-count">6 เกม</span>
              </div>
              <div className="party-game-list" aria-hidden="true">
                <div className="party-game-tile"><span>01</span><strong>เลขลับ</strong></div>
                <div className="party-game-tile"><span>02</span><strong>ลุ้นบึ้ม</strong></div>
                <div className="party-game-tile"><span>03</span><strong>Truth or Dare</strong></div>
                <div className="party-game-tile"><span>04</span><strong>อย่าปล่อยช้า</strong></div>
              </div>
              <div className="party-board-footer">
                <div className="party-player-row" aria-hidden="true"><span>ก</span><span>น</span><span>ม</span><span>+</span></div>
                <span>เล่นผลัดกันเครื่องเดียว</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="thinking-title">
          <div className="wrap">
            <div className="section-heading">
              <p className="section-label">แนวคิดการออกแบบ</p>
              <h2 id="thinking-title">เริ่มสนุกด้วยขั้นตอนที่เข้าใจง่าย</h2>
              <p>เปิดเกมเดียวแล้วส่งอุปกรณ์ให้เพื่อนตามตา ไม่ต้องตั้งห้องหรือเตรียมอุปกรณ์เล่นเพิ่ม</p>
            </div>
            <div className="thinking-grid">
              <article className="thinking-card"><h3>เกมหลายแบบในที่เดียว</h3><p>เลือกได้ทั้งเกมทายเลข เกมเสี่ยงดวง เกมวัดจังหวะ เกมคำถาม และเกมไพ่</p></article>
              <article className="thinking-card"><h3>เล่นร่วมกันบนเครื่องเดียว</h3><p>แอปบอกว่าเป็นตาของใคร แล้วส่งโทรศัพท์หรือแท็บเล็ตให้คนนั้นเล่นต่อ</p></article>
              <article className="thinking-card"><h3>ไม่ต้องสมัครสมาชิก</h3><p>เริ่มเล่นได้ในเบราว์เซอร์ ไม่มีบัญชีผู้ใช้ ระบบจับคู่ออนไลน์ หรือการซิงก์ข้ามเครื่อง</p></article>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="games-title">
          <div className="wrap">
            <div className="section-heading">
              <p className="section-label">เกมในชุด</p>
              <h2 id="games-title">เลือกความท้าทายให้เข้ากับวงเพื่อน</h2>
              <p>เกมส่วนใหญ่เล่นได้ 2–8 คน ส่วนเลขลับขั้วสุดโต่งรองรับ 3–8 คน</p>
            </div>
            <div className="feature-grid party-feature-grid">
              {games.map((game, index) => (
                <article className="feature-card party-feature-card" key={game.title}>
                  <p className="party-feature-meta">เกม {String(index + 1).padStart(2, "0")} · {game.players}</p>
                  <h3>{game.title}</h3>
                  <p>{game.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="steps-title">
          <div className="wrap">
            <div className="section-heading">
              <p className="section-label">วิธีเล่น</p>
              <h2 id="steps-title">จัดวงให้พร้อม แล้วส่งตาตามหน้าจอ</h2>
              <p>แต่ละเกมมีกติกาเฉพาะของตัวเอง หน้าจอจะแสดงสิ่งที่ผู้เล่นปัจจุบันต้องทำ</p>
            </div>
            <div className="steps">
              <article className="step"><h3>เลือกเกมและรายชื่อ</h3><p>ตั้งชื่อผู้เล่นให้ครบ เกมส่วนใหญ่รองรับ 2–8 คน และเกมเลขลับขั้วสุดโต่งรองรับ 3–8 คน</p></article>
              <article className="step"><h3>ส่งอุปกรณ์ตามตา</h3><p>ทำตามคำแนะนำบนหน้าจอ เกมที่มีข้อมูลลับจะบอกให้ส่งเครื่องหรือซ่อนคำตอบ</p></article>
              <article className="step"><h3>เริ่มรอบใหม่ได้ทันที</h3><p>เล่นซ้ำกับรายชื่อเดิม หรือกลับไปแก้รายชื่อก่อนเริ่มรอบถัดไป</p></article>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="privacy-title">
          <div className="wrap privacy-panel">
            <h2 id="privacy-title">ข้อมูลอยู่บนเบราว์เซอร์ของคุณ</h2>
            <div>
              <p>ชื่อผู้เล่นและสถิติแพ้เก็บไว้ในเบราว์เซอร์เครื่องนี้ ไม่ส่งไปยังเซิร์ฟเวอร์ PartyGame และไม่ซิงก์ข้ามอุปกรณ์</p>
              <p>ความคืบหน้าระหว่างรอบจะไม่ถูกบันทึกไว้เล่นต่อ หากล้างข้อมูลเว็บไซต์ ชื่อและสถิติที่บันทึกไว้อาจหายไป</p>
            </div>
          </div>
        </section>

        <section className="section section-white">
          <div className="wrap closing">
            <div><p className="section-label">พร้อมเริ่มเกมหรือยัง</p><p>เปิดเล่นกันมั้ย แล้วชวนเพื่อนมาลองทั้ง 6 เกมบนอุปกรณ์เดียวกัน</p></div>
            <a className="button button-primary" href={appUrl} target="_blank" rel="noopener noreferrer">ไปที่แอปเล่นกันมั้ย ↗</a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-inner"><p className="footer-brand">drivetodev</p><p>เล่นกันมั้ย · เว็บรวมเกมปาร์ตี้</p></div>
      </footer>
    </>
  );
}
