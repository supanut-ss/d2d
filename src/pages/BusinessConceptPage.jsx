import { downloadTools } from "../data/downloadTools.js";
import ToolPreview from "../components/ToolPreview.jsx";
import "../styles/download-tools.css";

const pages = {
  ...Object.fromEntries(downloadTools.map((tool) => [tool.id, {
    ...tool,
    kind: "เครื่องมือสำหรับ Windows · ดาวน์โหลดได้ทันที",
    artLabel: `ภาพแนะนำ ${tool.name}`,
    overviewTitle: `รู้จัก ${tool.name}`,
    overviewDescription: tool.description,
    principles: tool.features,
    featureTitle: "สิ่งที่เครื่องมือช่วยได้",
    stepsTitle: "เริ่มใช้งานใน 3 ขั้นตอน",
    noteTitle: "ข้อมูลก่อนเริ่มใช้งาน",
    closingTitle: "เครื่องมืออื่นจาก drivetodev",
    closingDescription: "เลือกดูแอปและเครื่องมืออื่นที่ช่วยให้การทำงานสะดวกขึ้น",
  }])),
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
  payYet: {
    name: "PayYet",
    appUrl: "/payyet/",
    kind: "เครื่องมือเก็บเงินใน LINE",
    title: "เก็บเงินในกลุ่ม LINE ด้วยข้อความบรรทัดเดียว",
    description: "PayYet ช่วยสร้างบิลให้กลุ่มหรือรายคน ให้เพื่อนจ่ายด้วย QR พร้อมเพย์และแนบสลิป โดยบอทติดตามและเตือนอัตโนมัติ",
    art: "payyet",
    artLabel: "ตัวอย่างบิลกลุ่มใน PayYet แสดงยอดที่เรียกเก็บ สถานะผู้จ่าย และ QR พร้อมเพย์",
    overviewTitle: "เริ่มเก็บเงินได้จากแชต LINE",
    overviewDescription: "ตั้งค่าพร้อมเพย์ เพิ่มบอทเข้ากลุ่ม แล้วพิมพ์คำสั่งเพื่อสร้างบิลและติดตามการชำระในหน้าเดียว",
    principles: [
      { title: "สร้างบิลได้หลายแบบ", description: "เรียกเก็บรายคนหรือหารยอดรวม เลือกสมาชิกหรือแท็กคนในกลุ่มได้" },
      { title: "จ่ายและส่งหลักฐานในหน้าเดียว", description: "ผู้จ่ายสแกน QR พร้อมเพย์ แล้วแนบสลิปไว้กับบิลได้ทันที" },
      { title: "ตามยอดค้างให้อัตโนมัติ", description: "บอทแจ้งเตือนคนที่ยังไม่จ่าย และแสดงสถานะของแต่ละบิล" },
    ],
    featureTitle: "เครื่องมือจัดการบิลที่อยู่ในแชต",
    features: [
      { title: "เก็บเงินหรือหารยอด", description: "สร้างบิลให้คนเดียวหรือทั้งกลุ่ม เลือกผู้จ่ายและแท็กสมาชิกได้" },
      { title: "QR พร้อมเพย์และสลิป", description: "สร้าง QR ให้ผู้จ่ายสแกน และแนบรูปสลิปกับรายการชำระ" },
      { title: "เตือนอัตโนมัติ", description: "ส่งเตือนทุก 10:00 น. และปรับความถี่การเตือนได้" },
      { title: "บิลประจำ", description: "ตั้งรอบเรียกเก็บรายสัปดาห์หรือรายเดือนได้" },
      { title: "จัดการสถานะบิล", description: "รับเงินสด ยกหนี้ หรือยกเลิกรายการได้" },
      { title: "ประวัติและ CSV", description: "ย้อนดูรายการเก็บเงินและส่งออกข้อมูลเป็น CSV" },
    ],
    stepsTitle: "เริ่มต้นใช้งานใน 3 ขั้นตอน",
    steps: [
      { title: "ตั้งค่าพร้อมเพย์", description: "กำหนดพร้อมเพย์ของผู้เก็บเงิน เพื่อให้การชำระโอนเข้าตรงบัญชี" },
      { title: "ชวนบอทเข้ากลุ่ม", description: "เพิ่ม PayYet ในกลุ่ม แล้วให้สมาชิกทักทายบอทหนึ่งครั้ง" },
      { title: "สั่งเก็บและรับชำระ", description: "พิมพ์คำสั่งสร้างบิล ส่ง QR ให้เพื่อนสแกน และแนบสลิป" },
    ],
    noteTitle: "ข้อมูลและการรับชำระ",
    notes: [
      "เงินโอนเข้าพร้อมเพย์ของผู้เก็บโดยตรง",
      "ข้อมูลที่จัดเก็บประกอบด้วยชื่อโปรไฟล์ LINE ยอดบิล และรูปสลิปที่แนบ",
    ],
    closingTitle: "ดูเครื่องมือและแอปอื่นใน drivetodev",
    closingDescription: "กลับไปที่รายการแอปและเลือกหมวดเครื่องมือเพื่อดู PayYet กับโปรเจกต์อื่น",
  },
  jodDaily: {
    name: "JodDaily",
    appUrl: "/joddaily/",
    kind: "เครื่องมือบันทึกรายรับรายจ่ายใน LINE",
    title: "จดรายรับรายจ่าย แค่พิมพ์บรรทัดเดียว",
    description: "พิมพ์รายการในแชต LINE เช่น “กาแฟ 65” แล้วดูยอด งบ และประวัติได้ในที่เดียว",
    art: "joddaily",
    artLabel: "ตัวอย่างสรุปรายรับรายจ่ายใน JodDaily แสดงยอดเดือนนี้ รายการล่าสุด และงบรายหมวด",
    overviewTitle: "ดูภาพรวมการเงินในหน้าเดียว",
    overviewDescription: "บันทึกรายการผ่านแชต แล้วเปิดดูยอดคงเหลือ ประวัติ รายงาน และค่าสมาชิกได้จากเมนู",
    principles: [
      { title: "จดจากแชตได้ทันที", description: "พิมพ์รายจ่ายหรือรายรับเป็นข้อความสั้น ๆ แล้ว JodDaily ช่วยจัดรายการให้" },
      { title: "เห็นงบและรายการชัดเจน", description: "ดูยอดคงเหลือ รายงานรายวัน และการใช้จ่ายตามหมวดได้" },
      { title: "ติดตามค่าใช้จ่ายที่เกิดซ้ำ", description: "ตั้งงบรายหมวด บันทึกรายการประจำ และรับเตือนค่าสมาชิกได้" },
    ],
    featureTitle: "จัดการรายรับรายจ่ายที่ใช้ทุกวัน",
    features: [
      { title: "บันทึกด้วยข้อความ", description: "พิมพ์หลายรายการในประโยคเดียว ระบบช่วยเดาหมวดและแก้รายการภายหลังได้" },
      { title: "หลายบัญชี", description: "แยกเงินสด ธนาคาร บัตร และ e-wallet พร้อมโอนย้ายระหว่างบัญชี" },
      { title: "งบรายหมวด", description: "ตั้งงบและรับแจ้งเตือนเมื่อใช้ใกล้ถึงหรือเกินงบ" },
      { title: "เตือนค่าสมาชิก", description: "รับการเตือนก่อนถึงวันตัดเงินของบริการที่สมัครไว้" },
      { title: "รายการประจำ", description: "บันทึกรายการรายสัปดาห์ รายเดือน หรือรายปีให้อัตโนมัติ" },
      { title: "รายงานและ CSV", description: "ดูสรุปรายเดือนตามหมวดและส่งออกประวัติเป็น CSV" },
    ],
    stepsTitle: "เริ่มต้นใช้งานใน 3 ขั้นตอน",
    steps: [
      { title: "เพิ่มเพื่อนบอท", description: "เปิดแชต LINE แบบ 1:1 กับ JodDaily" },
      { title: "พิมพ์รายการ", description: "บันทึกรายจ่าย เช่น “กาแฟ 65” หรือรายรับ “เงินเดือน +30000”" },
      { title: "ดูสรุปและตั้งงบ", description: "เปิดเมนูเพื่อดูรายงาน ประวัติ ค่าสมาชิก และตั้งงบรายหมวด" },
    ],
    noteTitle: "ข้อมูลและการใช้งาน",
    notes: [
      "บอทใช้งานในแชต LINE แบบ 1:1 ไม่รองรับการใช้งานในกลุ่ม",
      "แต่ละคนเห็นข้อมูลของตัวเอง โดยจัดเก็บชื่อโปรไฟล์ LINE และรายการที่จด",
    ],
    closingTitle: "ดูเครื่องมือและแอปอื่นใน drivetodev",
    closingDescription: "กลับไปที่รายการแอปและเลือกหมวดเครื่องมือเพื่อสำรวจ JodDaily กับโปรเจกต์อื่น",
  },
  bookSabuy: {
    name: "Book Sabuy",
    appUrl: "https://drivetodev.online/booksabuy/",
    kind: "แนวคิดระบบจัดการร้านนวดผ่าน LINE",
    title: "จัดคิว ดูแลสมาชิก และสรุปยอดผ่าน LINE",
    description: "Book Sabuy ช่วยร้านนวดบันทึกคิว เลือกพนักงาน คอร์ส เวลา และวิธีชำระ พร้อมดูแลเครดิตสมาชิกและสรุปรายได้รายวันหรือรายเดือน",
    art: "booksabuy",
    artLabel: "ตัวอย่างหน้าจอ Book Sabuy แสดงคิวร้านนวด รายได้วันนี้ และรายการบริการ",
    overviewTitle: "เชื่อมคิว สมาชิก และยอดของร้าน",
    overviewDescription: "จัดการคิวประจำวัน รับชำระ ดูแลเครดิตสมาชิก และเปิดรายงานในแอปเดียวที่ใช้งานผ่าน LINE",
    principles: [
      { title: "ลงคิวพร้อมรายละเอียด", description: "เลือกพนักงาน คอร์ส ระยะเวลา เวลาเริ่ม และวิธีชำระ แล้วดูคิวทั้งหมดของวันได้ในหน้าเดียว" },
      { title: "ดูแลสมาชิกและเครดิต", description: "ค้นหาสมาชิกด้วยเลขท้ายเบอร์โทร ดูเครดิตคงเหลือและประวัติ พร้อมบันทึกการเติมเครดิต" },
      { title: "เห็นรายได้ของร้าน", description: "ดูยอดรายวันหรือรายเดือน แยกตามวิธีจ่าย คอร์ส และพนักงาน พร้อมบันทึกค่าใช้จ่าย" },
    ],
    featureTitle: "งานร้านนวดที่จัดการได้จากมือถือ",
    features: [
      { title: "คิวและการรับชำระ", description: "บันทึกคิวตามพนักงาน คอร์ส เวลา และระยะเวลา พร้อมระบุเงินสด โอน หรือใช้เครดิตสมาชิก" },
      { title: "สมาชิกและเครดิต", description: "ค้นหาจากเลขท้าย 4 หลัก ดูยอดคงเหลือ ประวัติการใช้ และเติมเครดิตให้สมาชิก" },
      { title: "รายงานร้าน", description: "สรุปรายได้และจำนวนคิว แยกตามช่องทางชำระ คอร์ส และพนักงาน พร้อมดูเงินสดและค่าใช้จ่าย" },
      { title: "ตั้งค่าคอร์สและทีม", description: "กำหนดราคาตามระยะเวลา เพิ่มคอร์สพิเศษ และจัดการรายชื่อพนักงานของร้าน" },
    ],
    stepsTitle: "จากการลงคิวสู่การดูรายงาน",
    steps: [
      { title: "ตั้งค่าร้าน", description: "กำหนดพนักงาน คอร์ส และราคาตามระยะเวลาที่ให้บริการ" },
      { title: "บันทึกคิวและการชำระ", description: "เลือกพนักงานกับบริการ ระบุเวลาเริ่ม แล้วบันทึกวิธีรับชำระหรือใช้เครดิต" },
      { title: "ติดตามสมาชิกและยอด", description: "เติมเครดิตให้สมาชิกและตรวจรายงานรายวันหรือรายเดือนของร้าน" },
    ],
    noteTitle: "ออกแบบให้ใช้ผ่าน LINE",
    notes: [
      "เปิดแอปผ่าน LINE ได้โดยไม่ต้องติดตั้งแอปเพิ่ม และรองรับการจัดการหลายร้านหลายสาขา",
      "รายละเอียดในหน้านี้สรุปจากฟีเจอร์ของ Book Sabuy; เปิดแอปจริงจากปุ่มด้านบน",
    ],
    closingTitle: "ดูแอปอื่นใน drivetodev",
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

function PayYetPreview() {
  return (
    <div className="concept-payyet-preview">
      <div className="concept-payyet-head">
        <span className="concept-payyet-mark">P</span>
        <span><strong>PayYet</strong><small>กลุ่มทริป · LINE</small></span>
        <span className="concept-payyet-channel">LINE</span>
      </div>
      <div className="concept-payyet-bill">
        <small>บิลกลุ่ม</small>
        <strong>ค่าอาหาร</strong>
        <b>฿1,250</b>
        <span>ครบกำหนดวันนี้</span>
      </div>
      <div className="concept-payyet-status">
        <span>จ่ายแล้ว 2 จาก 3 คน</span>
        <div><i /></div>
      </div>
      <div className="concept-payyet-footer">
        <span className="concept-payyet-qr" />
        <span><strong>QR พร้อมเพย์</strong><small>สแกนและแนบสลิป</small></span>
      </div>
    </div>
  );
}

function JodDailyPreview() {
  return (
    <div className="concept-joddaily-preview">
      <div className="concept-joddaily-head">
        <span className="concept-joddaily-mark">J</span>
        <span><strong>JodDaily</strong><small>บันทึกผ่าน LINE</small></span>
        <span className="concept-joddaily-channel">LINE</span>
      </div>
      <div className="concept-joddaily-summary">
        <span>คงเหลือเดือนนี้</span>
        <strong>฿12,480</strong>
        <small>รายรับ ฿30,000 · รายจ่าย ฿17,520</small>
      </div>
      <div className="concept-joddaily-transactions">
        <div><span>กาแฟ · วันนี้</span><strong>−฿65</strong></div>
        <div><span>เงินเดือน</span><strong>+฿30,000</strong></div>
      </div>
      <div className="concept-joddaily-budget">
        <span>งบอาหาร · ใช้ไป 68%</span>
        <div><i /></div>
      </div>
    </div>
  );
}

function BookSabuyPreview() {
  return (
    <div className="concept-booksabuy-preview">
      <div className="concept-booksabuy-head">
        <span className="concept-booksabuy-mark">B</span>
        <span><strong>ร้านสบายดี</strong><small>Book Sabuy · วันนี้</small></span>
        <span className="concept-booksabuy-tag">LINE</span>
      </div>
      <div className="concept-booksabuy-summary">
        <span>รายได้วันนี้</span>
        <strong>฿1,250</strong>
        <small>4 คิว · เงินสด ฿0 · โอน ฿450 · สมาชิก ฿800</small>
      </div>
      <div className="concept-booksabuy-queue">
        <div><time>10:00</time><span><strong>นวดไทย · 60 นาที</strong><small>มีน · โอน</small></span><b>฿450</b></div>
        <div><time>11:30</time><span><strong>อโรม่า · 90 นาที</strong><small>ฝน · สมาชิก</small></span><b>฿800</b></div>
      </div>
      <div className="concept-booksabuy-footer"><span>คิววันนี้</span><span>สมาชิก</span><span>รายงาน</span></div>
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
              {page.downloadUrl ? (
                <a className="button button-primary" href={page.downloadUrl} download={page.filename}>ดาวน์โหลด {page.name} ↓</a>
              ) : page.appUrl ? (
                <a className="button button-primary" href={page.appUrl} {...(page.appUrl.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>เปิดแอปจริง {page.appUrl.startsWith("http") ? "↗" : "→"}</a>
              ) : (
                <a className="button button-primary" href="#overview">ดูภาพรวม</a>
              )}
              <a className="button button-secondary" href={page.appUrl ? "#overview" : "/#apps"}>
                {page.appUrl ? "ดูภาพรวม" : "กลับไปรายการแอป"}
              </a>
            </div>
            {page.downloadUrl && <p className="tool-download-note">ไฟล์ {page.filename} · Windows · ดาวน์โหลดโดยไม่ต้องสมัครสมาชิก</p>}
          </div>
          <div className={`hero-art concept-${page.art}-art`} role="img" aria-label={page.artLabel}>
            {page.downloadUrl ? <ToolPreview tool={page} /> : page.art === "ordering" ? <OrderingPreview /> : page.art === "branch" ? <BranchPreview /> : page.art === "payyet" ? <PayYetPreview /> : page.art === "booksabuy" ? <BookSabuyPreview /> : <JodDailyPreview />}
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
