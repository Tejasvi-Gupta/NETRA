from pathlib import Path

from fpdf import FPDF
from fpdf.enums import XPos, YPos

path = Path(__file__).resolve().parent / "FIR_HarborLine_ATM_skimming.pdf"


class FirPdf(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(80, 80, 80)
        self.cell(
            0,
            6,
            "MAHARASHTRA POLICE  |  CYBER CRIME CELL, CST  |  FORM 24.5",
            new_x=XPos.LMARGIN,
            new_y=YPos.NEXT,
            align="C",
        )
        self.set_text_color(0, 0, 0)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(110, 110, 110)
        self.cell(
            0,
            8,
            "Unique test FIR for NETRA. Not a real police record. Page %s" % self.page_no(),
            align="C",
        )


def block(pdf: FirPdf, title: str, body: str):
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 6, body, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)


pdf = FirPdf()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.set_margins(18, 16, 18)
pdf.add_page()

pdf.set_font("Helvetica", "B", 16)
pdf.cell(0, 10, "FIRST INFORMATION REPORT", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
pdf.set_font("Helvetica", "", 11)
pdf.cell(0, 7, "Under Section 154 of the Code of Criminal Procedure, 1973", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
pdf.ln(3)

pdf.set_font("Helvetica", "", 11)
pdf.cell(0, 6, "Police Station: Cyber Crime Cell, CST", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "District: Mumbai    State: Maharashtra    Year: 2026", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "Date of report: 18 April 2026    Time of report: 19:15 hrs", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "Occurrence: 16 April 2026, between 21:10 hrs and 21:40 hrs", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "Place of occurrence: SBI ATM, Platform 3, Harbor Line, CST, Mumbai", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.ln(2)

block(
    pdf,
    "1. Complainant / informant",
    "Name: Suresh Patil, son of Govind Patil, age 41 years, occupation bank clerk. "
    "Residential address: Room 12, Shivaji Nagar, Wadala East, Mumbai 400037. "
    "Phone: 9811223344. Email: suresh.patil.wadala@gmail.com. "
    "Aadhaar last four digits 6721.",
)

block(
    pdf,
    "2. Accused persons",
    "Accused 1: Vikram Rao, alias Vicky Skim, age 34 years, male. "
    "Last known address: 7B, Dockyard Road, Mazgaon, Mumbai. Phone: 9001122334. "
    "Uses WhatsApp number 9001122334 and Telegram handle @vicky_skim. "
    "Accused 2: Neha Kulkarni, alias Nia, age 27 years, female. "
    "Last known address: Kurla West, Mumbai. Phone: 9766554411. "
    "Email: nia.payments@proton.me. "
    "Accused 3: Unknown male, about 25 years, seen wearing a grey hoodie, "
    "no confirmed name. Used prepaid SIM 8899001122.",
)

block(
    pdf,
    "3. Offences and legal sections",
    "Information Act 2000 Sections 66, 66C and 66D. "
    "Indian Penal Code Sections 419, 420 and 120B. "
    "Prevention of Money Laundering Act Section 3 for layering of proceeds.",
)

block(
    pdf,
    "4. Brief facts of the case",
    "On 16 April 2026 the complainant withdrew cash at the SBI ATM on Platform 3, "
    "Harbor Line, CST. CCTV later showed Accused 1 Vikram Rao installing a skimming "
    "overlay and a pinhole camera at 21:12 hrs. At 21:31 hrs the complainant card "
    "ending 4582 was cloned. On 17 April 2026 four unauthorised UPI transfers of "
    "Rs 18,500, Rs 22,000, Rs 9,750 and Rs 31,200 were made to PhonePe account "
    "9766554411 in the name of Neha Kulkarni. Part of the money was converted to "
    "USDT on Binance P2P using order ID BN-774219 and then sent to wallet "
    "T7kP2mQ9aL4cR8dW1xY6vN3bH5jF0sZ. A second victim, Priya Menon of Chembur, "
    "phone 9822007788, reported the same ATM overlay on 15 April 2026.",
)

block(
    pdf,
    "5. Property / loss",
    "Total wrongful loss to complainant: Rs 81,450. "
    "Bank: State Bank of India, Wadala branch. Account number last four 9033. "
    "Card: Visa debit ending 4582.",
)

block(
    pdf,
    "6. Investigation so far",
    "SI Farhan Qureshi seized the overlay device marked Exhibit A. "
    "Cafe footage from Irani Cafe, CST shows Vikram Rao with Neha Kulkarni at 20:40 hrs "
    "on 16 April 2026. Call detail records show 9001122334 in contact with 9766554411 "
    "eleven times that evening. Request: freeze PhonePe 9766554411, preserve SBI ATM "
    "NVR, and issue notice to Binance for order BN-774219.",
)

pdf.set_font("Helvetica", "", 10)
pdf.cell(0, 6, "Recorded by: SI Farhan Qureshi, Cyber Crime Cell, CST, Mumbai", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "Unique file id: HARBOR-ATM-2026-04-18-A", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.output(str(path))
print(path)
print(path.stat().st_size)
