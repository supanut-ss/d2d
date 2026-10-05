const pages = {
  qrOrdering: {
    name: "QR Ordering",
    appUrl: "https://qrodrder.drivetodev.online/",
    kind: "แนวคิดระบบร้านอาหาร",
    title: "ให้ลูกค้าสั่งเอง แล้วส่งต่อถึงครัว",
    description: "แนวคิดระบบที่เชื่อมเมนูบนมือถือ การทำงานหน้าร้าน และจอครัว เพื่อให้ทุกออเดอร์ไปถึงทีมที่ต้องทำต่อ",
    art: "ordering",
    artLabel: "ตัวอย่างเมนูอาหารบนมือถือสำหรับโต๊ะ 08 พร้อม QR",
    overviewTitle: "เชื่อมการสั่งอาหารกับงานทั้งร้าน",
    overviewDescription: "ลูกค้าสแกน QR ที่โต๊ะ ดูเมนู เลือกตัวเลือก แล้วส่งออเดอร์ถึงครัว โดยไม่ต้องรอพนักงานมาจด",
    principles: [
      { title: "สั่งจากโต๊ะ", description: "ดูเมนูพร้อมรูป เลือกความเผ็ด ไซซ์ หรือท็อปปิ้ง แล้วเรียกพนักงานหรือขอเช็คบิลจากมือถือ" },
      { title: "ครัวรับออเดอร์ทันที", description: "รายการจากลูกค้าส่งเข้าจอครัว KDS ให้ทีมเห็นออเดอร์และสถานะในเวลาจริง" },
      { title: "จัดการหน้าร้านได้ครบ", description: "POS ผังโต๊ะ การชำระเงิน การปิดกะ และรายงานยอดขายอยู่ในระบบเดียวกัน" },
    ],
    featureTitle: "วางระบบตามขนาดร้าน",
    features: [
      { title: "Basic", description: "QR Ordering, POS และผังโต๊ะ ย้ายหรือรวมโต๊ะ แยกบิล เงินสดและพร้อมเพย์ จอครัว เปิดปิดกะ กระทบยอด และแดชบอร์ดยอดขายวันนี้" },
      { title: "Pro", description: "เพิ่มรายงานเจาะลึกส่งออก CSV โปรโมชันพร้อมอนุมัติ แต้มสมาชิกพร้อมขอความยินยอม สต๊อกวัตถุดิบ คิวและจองโต๊ะ แจ้งเตือน LINE และเมนูไทย/อังกฤษ" },
      { title: "Advanced", description: "เพิ่มแดชบอร์ดรวมยอดขายหลายสาขา แยกข้อมูลรายสาขา และรองรับออเดอร์จำนวนมากจากหลายสาขาพร้อมกัน" },
    ],
    stepsTitle: "จากการสแกน QR ถึงการปิดบิล",
    steps: [
      { title: "เลือกอาหาร", description: "ลูกค้าสแกน QR ที่โต๊ะ ดูเมนู และเลือกตัวเลือกของอาหาร" },
      { title: "ส่งรายการเข้าครัว", description: "ออเดอร์ปรากฏบน KDS และพนักงานติดตามสถานะโต๊ะได้จาก POS" },
      { title: "ชำระและสรุปยอด", description: "รับเงินสดหรือพร้อมเพย์ แยกบิล ปิดกะ และดูรายงานยอดขาย" },
    ],
    noteTitle: "แนวคิดที่ต่อยอดได้",
    notes: [
      "ระบบวางไว้ให้เริ่มจากเครื่องมือพื้นฐานของร้านเดี่ยว แล้วเพิ่มการตลาด สต๊อก และการจัดการหลายสาขาได้",
      "หน้านี้สรุปแนวคิดและฟีเจอร์ ส่วนแอปจริงเปิดได้จากปุ่มด้านบน",
    ],
    closingTitle: "ดูภาพรวมแอปอื่นใน drivetodev",
    closingDescription: "กลับไปยังหน้าแอปทั้งหมดเพื่อสำรวจโปรเจกต์และเครื่องมืออื่น",
  },
  sabaizy: {
    name: "Sabaizy",
    appUrl: "https://sm.drivetodev.online/",
    kind: "เว็บแอปสำหรับผู้จัดการสาขา",
    title: "จัดคิว บริการ และยอดของแต่ละสาขา",
    description: "Sabaizy รวมงานจองคิว ดูแลพนักงาน ออกบิล และติดตามสมาชิกไว้ในที่เดียว ใช้งานผ่านมือถือหรือแท็บเล็ตได้",
    art: "branch",
    artLabel: "ภาพรวมคิวงานของสาขา แสดงนัดหมาย งานบริการ และคิวถัดไป",
    overviewTitle: "เห็นงานของสาขาตั้งแต่ต้นจนจบ",
    overviewDescription: "ผู้จัดการดูนัดหมาย งานที่กำลังบริการ และคิวหมุน พร้อมเลือกมุมมองตามพนักงานหรือห้อง",
    principles: [
      { title: "รับนัดและลูกค้า walk-in", description: "เพิ่มคิวล่วงหน้าหรือหน้าร้าน ระบุบริการ พนักงาน ห้อง และระยะเวลา" },
      { title: "จัดการทีมและบริการ", description: "ตั้งค่ารายการบริการ ราคา ตารางกะ วันลา และติดตามเวลาเข้าออกงานเมื่อเปิดใช้" },
      { title: "ดูแลบิลและสมาชิก", description: "เปิดกะแคชเชียร์ ออกบิล ติดตามประวัติสมาชิก และยอดคงเหลือคอร์ส" },
    ],
    featureTitle: "เครื่องมือสำหรับการทำงานรายสาขา",
    features: [
      { title: "กระดานคิว", description: "แยกนัดหมาย กำลังบริการ และคิวหมุน สลับมุมมองพนักงานหรือห้องได้" },
      { title: "บริการและพนักงาน", description: "ตั้งราคาและระยะเวลาบริการ จัดตารางกะ มอบหมายงาน และบันทึกวันลา" },
      { title: "บิลและกะแคชเชียร์", description: "เปิดหรือปิดกะ บันทึกช่องทางชำระเงิน ออกบิล และเรียกดูประวัติ" },
      { title: "สมาชิกและคอร์ส", description: "ดูประวัติลูกค้า ยอดคงเหลือ และคอร์สที่ใกล้หมดอายุ โดยเก็บประวัติการเปลี่ยนแปลง" },
      { title: "รายงานสาขา", description: "ดูรายได้รายวัน ช่องทางชำระเงิน และการใช้บริการของพนักงาน พร้อมส่งออก Excel หรือ CSV เมื่อเปิดใช้" },
      { title: "สิทธิ์และการอนุมัติ", description: "เมนูเปลี่ยนตามบทบาท และการอนุมัติจากผู้จัดการใช้ PIN พร้อมบันทึกประวัติ" },
    ],
    stepsTitle: "เริ่มจากสาขา แล้วเดินงานตามคิว",
    steps: [
      { title: "เลือกสาขา", description: "เลือกสาขาที่รับผิดชอบ ข้อมูลที่เห็นและแก้ไขจะอิงสาขานั้น" },
      { title: "จัดคิวบริการ", description: "ลงนัดหรือเพิ่มลูกค้า walk-in แล้วมอบหมายบริการ พนักงาน และห้อง" },
      { title: "ออกบิลและติดตามผล", description: "ปิดงาน ออกบิล ดูสมาชิก และตรวจรายงานเมื่อเจ้าของเปิดสิทธิ์ให้ใช้" },
    ],
    noteTitle: "ข้อมูลและสิทธิ์ตามสาขา",
    notes: [
      "พนักงานเห็นเฉพาะเมนูที่บทบาทของตนมีสิทธิ์ และข้อมูลที่จัดการจะอยู่ในสาขาที่เลือก",
      "รายงาน ค่ามือ และการลงเวลาบางส่วนขึ้นกับแพ็กเกจและการเปิดใช้โดยเจ้าของร้าน",
    ],
    closingTitle: "ดูแอปอื่นใน drivetodev",
    closingDescription: "กลับไปยังหน้าแอปทั้งหมดเพื่อสำรวจโปรเจกต์และเครื่องมืออื่น",
  },
};

function OrderingPreview() {
  return (
    <div className="concept-ordering-preview">
      <div className="concept-ordering-head"><strong>QR Ordering</strong><span>โต๊ะ 08</span></div>
      <div className="concept-ordering-body">
        <div className="concept-ordering-code">
          <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
            <path d="M5 5h20v20H5zM10 10v10h10V10zM39 5h20v20H39zM44 10v10h10V10zM5 39h20v20H5zM10 44v10h10V44z" />
            <path d="M31 5h5v5h-5zM31 14h7v5h-7zM28 23h8v5h-8zM33 32h5v6h-5zM41 31h5v5h-5zM50 31h8v5h-8zM29 39h5v8h-5zM38 41h8v5h-8zM49 41h5v8h-5zM31 51h8v8h-8zM43 52h5v7h-5zM53 51h6v8h-6z" />
          </svg>
        </div>
        <div className="concept-ordering-menu">
          <p>เมนูวันนี้</p>
          <div><span>ข้าวกะเพรา</span><strong>฿89</strong></div>
          <div><span>ชาไทย</span><strong>฿45</strong></div>
          <p className="concept-ordering-basket">ตะกร้า · 2 รายการ</p>
        </div>
      </div>
    </div>
  );
}

function BranchPreview() {
  return (
    <div className="concept-branch-preview">
      <div className="concept-branch-head"><strong>สาขาหลัก</strong><span>วันนี้</span></div>
      <div className="concept-branch-stats">
        <div><span>นัด</span><strong>04</strong></div>
        <div><span>กำลังบริการ</span><strong>02</strong></div>
        <div><span>คิวหมุน</span><strong>03</strong></div>
      </div>
      <div className="concept-branch-row"><span>นวดไทย · 60 นาที</span><span>กำลังบริการ</span></div>
      <div className="concept-branch-row"><span>ทรีตเมนต์ · 30 นาที</span><span>คิวถัดไป</span></div>
    </div>
  );
}

export default function BusinessConceptPage({ app }) {
  const page = pages[app];
  if (!page) return null;

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
            <a className="nav-cta" href="/#contact">ติดต่อ</a>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="wrap hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">{page.kind}</p>
            <h1 id="hero-title">{page.title}</h1>
            <p className="hero-description">{page.description}</p>
            <div className="hero-actions">
              {page.appUrl ? (
                <a className="button button-primary" href={page.appUrl} target="_blank" rel="noopener noreferrer">เปิดแอปจริง ↗</a>
              ) : (
                <a className="button button-primary" href="#overview">ดูภาพรวม</a>
              )}
              <a className="button button-secondary" href={page.appUrl ? "#overview" : "/#apps"}>
                {page.appUrl ? "ดูภาพรวม" : "กลับไปรายการแอป"}
              </a>
            </div>
          </div>
          <div className={`hero-art concept-${page.art}-art`} role="img" aria-label={page.artLabel}>
            {page.art === "ordering" ? <OrderingPreview /> : <BranchPreview />}
          </div>
        </section>

        <section className="section section-white" id="overview" aria-labelledby="overview-title">
          <div className="wrap">
            <div className="section-heading">
              <p className="section-label">แนวทางการใช้งาน</p>
              <h2 id="overview-title">{page.overviewTitle}</h2>
              <p>{page.overviewDescription}</p>
            </div>
            <div className="thinking-grid">
              {page.principles.map((item) => (
                <article className="thinking-card" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="features-title">
          <div className="wrap">
            <div className="section-heading">
              <p className="section-label">ฟีเจอร์</p>
              <h2 id="features-title">{page.featureTitle}</h2>
            </div>
            <div className="feature-grid">
              {page.features.map((item) => (
                <article className="feature-card" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="steps-title">
          <div className="wrap">
            <div className="section-heading">
              <p className="section-label">ลำดับการทำงาน</p>
              <h2 id="steps-title">{page.stepsTitle}</h2>
            </div>
            <div className="steps">
              {page.steps.map((item) => (
                <article className="step" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="notes-title">
          <div className="wrap privacy-panel">
            <h2 id="notes-title">{page.noteTitle}</h2>
            <div>{page.notes.map((note) => <p key={note}>{note}</p>)}</div>
          </div>
        </section>

        <section className="section section-white">
          <div className="wrap closing">
            <div>
              <p className="section-label">{page.closingTitle}</p>
              <p>{page.closingDescription}</p>
            </div>
            <a className="button button-secondary" href="/#apps">ดูแอปทั้งหมด</a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-inner">
          <p className="footer-brand">drivetodev</p>
          <p>จากไอเดียสู่ซอฟต์แวร์ที่ใช้ได้จริง</p>
        </div>
      </footer>
    </>
  );
}
