"""Compact FIR 582/2026 with human-looking handwriting in the filled fields."""

from __future__ import annotations

import random
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "FIR_582_2026_Operation_Monsoon_Ledger.pdf"
DOWNLOADS = Path.home() / "Downloads" / "FIR_582_2026_Operation_Monsoon_Ledger.pdf"
FONTS = Path(r"C:\Windows\Fonts")

INK = (18, 20, 28)
PRINT = (20, 24, 32)
RULE = (210, 214, 220)
MARGIN_RED = (176, 48, 48)


class FirPdf(FPDF):
    def __init__(self) -> None:
        super().__init__(format="A4", unit="mm")
        self.set_auto_page_break(auto=False, margin=12)
        self.set_margins(14, 12, 14)
        self.add_font("Times", "", str(FONTS / "times.ttf"))
        self.add_font("Times", "B", str(FONTS / "timesbd.ttf"))
        self.add_font("Times", "I", str(FONTS / "timesi.ttf"))
        self.add_font("Ink", "", str(FONTS / "segoepr.ttf"))
        self.add_font("Script", "", str(FONTS / "segoepr.ttf"))
        self._seed = random.Random(5822026)

    def header(self) -> None:
        return

    def footer(self) -> None:
        self.set_y(-11)
        self.set_font("Times", "I", 7.5)
        self.set_text_color(110, 110, 118)
        self.cell(
            0,
            5,
            f"FIR No. 582/2026  |  Kurla Police Station, Mumbai City  |  Page {self.page_no()}",
            align="C",
        )

    def print_label(self, text: str, size: float = 8.5, bold: bool = True) -> None:
        self.set_font("Times", "B" if bold else "", size)
        self.set_text_color(*PRINT)

    def hand_words(
        self,
        text: str,
        x: float,
        y: float,
        max_w: float,
        size: float = 10.2,
        script: bool = False,
        leading: float = 4.7,
    ) -> float:
        """Write text with slight wobble so it reads as human ink, not a font sample."""
        rng = self._seed
        font = "Script" if script else "Ink"
        words = text.replace("\n", " \n ").split(" ")
        cx, cy = x + rng.uniform(-0.15, 0.4), y
        line_h = leading
        for raw in words:
            if raw == "\n":
                cx = x + rng.uniform(-0.2, 0.7)
                cy += line_h + rng.uniform(0.05, 0.35)
                continue
            if not raw:
                continue
            word = raw + " "
            bump = 1.15 if script else 0.0
            self.set_font(font, "", size + bump + rng.uniform(-0.7, 0.9))
            ww = self.get_string_width(word)
            if cx + ww > x + max_w and cx > x + 8:
                cx = x + rng.uniform(-0.25, 0.65)
                cy += line_h + rng.uniform(0.0, 0.28)
            d = rng.randint(-12, 8)
            self.set_text_color(max(6, INK[0] + d), max(8, INK[1] + d), max(10, INK[2] + d))
            angle = rng.uniform(-1.6, 1.8)
            tx = cx + rng.uniform(-0.18, 0.22)
            ty = cy + rng.uniform(-0.35, 0.32)
            with self.rotation(angle, tx, ty):
                self.text(tx, ty, word.strip())
            cx += ww + rng.uniform(-0.28, 0.12)
        return cy + line_h

    def hand_line(self, label: str, value: str, label_w: float = 38) -> None:
        x = self.l_margin
        y = self.get_y()
        self.print_label(label, 8.4)
        self.text(x, y + 3.4, label)
        self.set_draw_color(*RULE)
        self.set_line_width(0.18)
        self.line(x + label_w, y + 4.1, self.w - self.r_margin, y + 4.1)
        self.hand_words(value, x + label_w + 1.2, y + 3.3, self.epw - label_w - 3, size=10.4)
        self.set_y(y + 6.2)

    def section_title(self, text: str) -> None:
        y = self.get_y()
        self.set_fill_color(236, 238, 242)
        self.rect(self.l_margin, y, self.epw, 5.6, style="F")
        self.print_label(text, 9)
        self.text(self.l_margin + 1.5, y + 3.9, text)
        self.set_y(y + 7.0)

    def red_margin(self) -> None:
        self.set_draw_color(*MARGIN_RED)
        self.set_line_width(0.55)
        self.line(self.l_margin - 2.2, 12, self.l_margin - 2.2, self.h - 13)


def add_form_page(pdf: FirPdf) -> None:
    pdf.add_page()
    pdf.red_margin()
    w = pdf.epw
    x = pdf.l_margin

    pdf.print_label("FORM NO. 1", 9)
    pdf.text(x, 16, "FORM NO. 1")
    pdf.print_label("FIRST INFORMATION REPORT", 14)
    pdf.text(x + 48, 16.2, "FIRST INFORMATION REPORT")
    pdf.set_font("Times", "I", 8)
    pdf.set_text_color(70, 70, 78)
    pdf.text(x + 72, 20.2, "(Under Section 154 CrPC)")
    pdf.print_label("N.C.R.B. (I.I.F-1)", 8, bold=False)
    pdf.text(x + w - 32, 16, "N.C.R.B. (I.I.F-1)")

    pdf.set_y(23)
    pdf.hand_line("1. District", "Mumbai City", 22)
    pdf.set_xy(x + 78, pdf.get_y() - 6.2)
    y = pdf.get_y()
    pdf.print_label("P.S.", 8.4)
    pdf.text(x + 78, y + 3.4, "P.S.")
    pdf.hand_words("Kurla", x + 88, y + 3.3, 28, size=10.6)
    pdf.print_label("Year", 8.4)
    pdf.text(x + 128, y + 3.4, "Year")
    pdf.hand_words("2026", x + 140, y + 3.3, 22, size=10.6)
    pdf.set_y(y + 6.2)

    pdf.hand_line("FIR No.", "582/2026", 20)
    y = pdf.get_y() - 6.2
    pdf.print_label("Date", 8.4)
    pdf.text(x + 72, y + 3.4, "Date")
    pdf.hand_words("04/08/2026", x + 84, y + 3.3, 32)
    pdf.print_label("Time", 8.4)
    pdf.text(x + 128, y + 3.4, "Time")
    pdf.hand_words("09:20 hrs", x + 140, y + 3.3, 32)
    pdf.set_y(y + 6.2)

    pdf.section_title("2. Act(s) / Section(s)")
    y = pdf.get_y()
    pdf.hand_words(
        "IPC 1860; PMLA; Prevention of Corruption Act; FEMA.  Sections: 302, 201, 120-B, 34 IPC.",
        x,
        y + 3.2,
        w,
        size=10,
        leading=4.6,
    )
    pdf.set_y(y + 10)

    pdf.section_title("3. Occurrence of offence / information received")
    pdf.hand_line("Date", "03/08/2026", 16)
    y = pdf.get_y() - 6.2
    pdf.print_label("Approx. time", 8.4)
    pdf.text(x + 72, y + 3.4, "Approx. time")
    pdf.hand_words("Evening", x + 98, y + 3.3, 22)
    pdf.print_label("GD Ref.", 8.4)
    pdf.text(x + 128, y + 3.4, "GD Ref.")
    pdf.hand_words("0317", x + 144, y + 3.3, 22)
    pdf.set_y(y + 6.2)
    pdf.hand_line("Info at P.S.", "04/08/2026, 08:35 hrs", 26)

    pdf.section_title("4. Type of information")
    y = pdf.get_y()
    pdf.hand_words(
        "Written complaint / witness statement with supporting records",
        x,
        y + 3.2,
        w,
        size=10.2,
    )
    pdf.set_y(y + 7.2)

    pdf.section_title("5. Place of occurrence")
    pdf.hand_line("(a) Distance from P.S.", "About 7 km east of Kurla Police Station", 42)
    y = pdf.get_y()
    pdf.print_label("(b) Address", 8.4)
    pdf.text(x, y + 3.4, "(b) Address")
    end = pdf.hand_words(
        "Kurla Depot, Mumbai - redevelopment site. Also Fort Tender Office, Prabhadevi office, Kurla Storage Yard, Chembur Materials Yard.",
        x + 28,
        y + 3.3,
        w - 28,
        size=9.8,
        leading=4.5,
    )
    pdf.set_y(end + 2.2)

    pdf.section_title("6. Complainant / informant")
    pdf.hand_line("Name", "Vikas Mahesh Tiwari", 28)
    pdf.hand_line("Father's name", "Mahesh Tiwari", 28)
    pdf.hand_line("Occupation", "Senior accountant / former group accounts staff", 28)
    pdf.hand_line("Address", "Wardha, Maharashtra - protected accommodation", 28)
    pdf.hand_line("Phone", "Withheld - protected witness", 28)

    pdf.section_title("7. Known / suspected accused")
    rows = [
        ("1", "Devendra Wagh", "Promoter / controller", "Suryanagar Mobility", "Arrested"),
        ("2", "Ritika Menon", "Finance controller", "Treasury / factoring", "Arrested"),
        ("3", "Ritesh Bhalerao", "Political liaison", "Tender / inspection", "Arrested"),
        ("4", "Farhan Qureshi", "Fleet coordinator", "Vehicles / storage", "Arrested"),
        ("5", "Ishaan Desai", "Field supervisor", "Surveillance", "Arrested"),
        ("6", "Neel Shah", "Consultancy partner", "Invoices / nominees", "Arrested"),
    ]
    cols = [8, 38, 42, 48, 28]
    y = pdf.get_y()
    pdf.set_fill_color(236, 238, 242)
    pdf.rect(x, y, w, 5.2, style="F")
    pdf.print_label("S.No.   Name                    Occupation / role           Known connection          Status", 7.4)
    pdf.text(x + 1, y + 3.6, "S.No.     Name                         Role                              Connection                    Status")
    y += 5.6
    for row in rows:
        cx = x + 1
        pdf.hand_words(row[0], cx, y + 3.2, cols[0] - 1, size=8.8)
        cx += cols[0]
        pdf.hand_words(row[1], cx, y + 3.2, cols[1] - 1, size=8.8)
        cx += cols[1]
        pdf.hand_words(row[2], cx, y + 3.2, cols[2] - 1, size=8.6)
        cx += cols[2]
        pdf.hand_words(row[3], cx, y + 3.2, cols[3] - 1, size=8.6)
        cx += cols[3]
        pdf.hand_words(row[4], cx, y + 3.2, cols[4] - 1, size=8.8)
        pdf.set_draw_color(*RULE)
        pdf.set_line_width(0.12)
        pdf.line(x, y + 4.6, x + w, y + 4.6)
        y += 5.3
    pdf.set_y(y + 1.5)

    pdf.section_title("8-10. Delay, property, amounts")
    y = pdf.get_y()
    end = pdf.hand_words(
        "Delay: records were checked before the detailed statement. Property: bank statements, tender files, coded ledger, CDRs, devices, vehicles, warehouse and digital records. Amounts seen: Rs 64,00,000; 29,50,000; 18,00,000; 11,50,000 and related settlements.",
        x,
        y + 3.2,
        w,
        size=9.7,
        leading=4.5,
    )
    pdf.set_y(end + 2.4)

    pdf.section_title("11. First information (brief)")
    y = pdf.get_y()
    end = pdf.hand_words(
        "On information from Vikas Mahesh Tiwari and after checking the papers, it appears Dr Aarohi S. Sen had been looking into Kurla Depot redevelopment, tenders, accounts and vehicles. She is the deceased. Detailed facts are in the continuation sheets. FIR registered. Investigation taken up.",
        x,
        y + 3.2,
        w,
        size=9.8,
        leading=4.55,
    )
    pdf.set_y(end + 8)

    sig_y = min(pdf.get_y() + 4, 268)
    pdf.hand_words("Vikas M. Tiwari", x + 4, sig_y, 70, size=12.5, script=True)
    pdf.hand_words("Inspector Pranav D. Joshi", x + 108, sig_y, 70, size=12.2, script=True)
    pdf.set_font("Times", "", 7.2)
    pdf.set_text_color(90, 90, 96)
    pdf.text(x + 8, sig_y + 5.5, "Signature of Complainant / Informant")
    pdf.text(x + 118, sig_y + 5.5, "Signature of Officer-in-Charge")


CONTINUATION = [
    (
        "STATEMENT OF FACTS AND INVESTIGATION",
        [
            "During checking of company and staff records, the following was noted.",
            "Telecom papers show +91-98XXX-11101 is in the name of Madhav Kamat. +91-97XXX-22102 is in the name of Alka Menon. +91-96XXX-33103 is in the name of Ritesh Bhalerao. +91-89XXX-99113 is in the name of Meera Joshi.",
            "Board papers name Madhav Kamat as controlling shareholder of Suryanagar Mobility Consortium. Rehana Mirza is shown as director of Harborline Transit Projects Pvt. Ltd. Neel Shah is linked with Meridian Advisory Partners. Rehana Mirza is also shown as director of Coastal Works & Materials. Farhan Qureshi is proprietor of Qureshi Fleet Solutions.",
            "Bank KYC shows Suryanagar Current A/c used by the consortium, Harborline Project A/c used by Harborline Transit, Meridian Advisory A/c used by Meridian Advisory Partners, and Blue Meridian Bridge A/c used by Blue Meridian Finance.",
            "Banking was then compared with vendor papers. Suryanagar is tied to the Prabhadevi Consortium Office. Qureshi Fleet to Kurla Storage Yard. Coastal Works & Materials to Chembur Materials Yard.",
            "On 12 June 2026, Suryanagar Current A/c sent Rs 6,40,000 to Harborline Project A/c, called a project advance, with no matching work. On 15 June, Harborline Project A/c sent Rs 2,95,000 to Meridian Advisory A/c. On 17 June, Meridian Advisory A/c sent Rs 1,80,000 to Blue Meridian Bridge A/c. On 20 June, Blue Meridian Bridge A/c sent Rs 11,50,000 to Settlement Ledger - West. On 21 June that ledger sent Rs 6,00,000 to Ritesh Bhalerao. On 22 June it sent Rs 2,75,000 to Farhan Qureshi. On 23 June, Blue Meridian Bridge A/c sent Rs 3,20,000 to Neel Shah. On 25 June, Harborline Project A/c sent Rs 16,80,000 to Coastal Works & Materials against an inflated quantity list.",
            "Santosh Patil is tied to Kurla Depot by receipt books, stock ledger, gate register and vehicle MH-02-AX-7710. Vasai Aggregates & Haulage invoices sit with Blue Meridian Finance.",
        ],
    ),
    (
        "STATEMENT OF FACTS AND INVESTIGATION",
        [
            "Telecom, devices and electronic records were then seen with the witness papers.",
            "Mails and vendor letters put Rehana Mirza over billing raised by Coastal Works & Materials. Neel Shah appears with Meridian Advisory Partners on signed invoice packs. Alka Menon coordinated invoice and treasury work with Neel Shah. Visitor books show Ritesh Bhalerao getting into Western Civic Procurement Office around tender dates. Meeting notes show Madhav Kamat using Bhalerao as a political and office go-between. Call times show Bhalerao got tender information from Alka Menon before formal release.",
            "On 14 July 2026, CDR of +91-96XXX-33103 shows 9 calls to +91-98XXX-11101, before two tender revisions and one inspection. On 11 June, +91-98XXX-11101 made 17 calls to +91-97XXX-22102. On 20 June, +91-97XXX-22102 made 12 calls to Project burner 9B around payment windows. Ishaan Desai is seen with MH-43-KQ-3204, Kurla Storage Yard CCTV, and in field notes on watching Dr Aarohi Sen. Her own notes name Kurla Depot as a main site.",
            "Dr Aarohi Sen had been looking at Suryanagar Mobility Consortium, Harborline invoices, and K-17 Systems Services at the Prabhadevi office. Kabir Sheikh appears as admin of the project burner later used as Project burner 9B. On 2 July, K-17 Systems Services paid Rs 8,00,000 to Blue Meridian Bridge A/c, later used against a bridge facility. System logs show Sheikh sharing depot access with Santosh Patil.",
            "The same logins turn up in sessions tied to Patil and K-17 Systems Services. Tickets and calls place Alka Menon with Kabir Sheikh in a payment window. Purchase orders show Harborline still depending on Coastal Works & Materials. Farhan Qureshi is on Qureshi Fleet papers and on MH-01-FE-6412 at Kurla Depot.",
        ],
    ),
    (
        "STATEMENT OF FACTS AND INVESTIGATION",
        [
            "Field notes and vehicle movement show Ishaan Desai used MH-01-FE-6412 while watching. Papers put Farhan Qureshi with MH-01-FE-6412 and Santosh Patil with MH-04-LP-2288. MH-04-LP-2288 is also at Chembur Materials Yard. Coastal Works & Materials is at that yard. Madhav Kamat is on Kurla Depot chairmans visit logs and project approvals. Ritesh Bhalerao and Meera Joshi both appear at Fort Tender Office. Alka Menon is at Prabhadevi Consortium Office on treasury work. Dr Aarohi Sen is tied to Vile Parle Residence by the search and recovery memo.",
            "Coded messages sit between Aniket Rao and Dr Aarohi Sen on procurement papers. Draft notes show Rao looking at Suryanagar. Protected-witness papers say Vikas Tiwari had been giving her supplier figures through Meridian Advisory Partners.",
            "Vikas Tiwari is also on Harborline invoice ledgers copied before he left. Aniket Rao was looking at the tender history of Western Civic Procurement Office. Mails show papers moving between Meera Joshi and Ritesh Bhalerao; no clear proof of criminal intent on that channel yet. Diary meetings tie Joshi with Madhav Kamat. Board mails show Kamat instructing Rehana Mirza on project payments. Alka Menon is on treasury instructions with Mirza. Farhan Qureshi is with Ishaan Desai on calls and shared vehicle staging, and with Santosh Patil on dispatch books.",
            "Nominee and consultancy papers were made jointly by Neel Shah and Rehana Mirza. Invoice packs show Shah billing Harborline. Bank mandates give Kamat authority over Suryanagar Current A/c. Older coded notes put Rafiq Ansari at Itwari Settlement Office. Two later notes speak of a cash handoff between Ansari and Qureshi. Factoring files put Blue Meridian Finance with Coastal Works invoices.",
            "On 5 July 2026, Blue Meridian Bridge A/c sent Rs 7,50,000 to Suryanagar Current A/c, written as a credit adjustment. On 8 July, Meridian Advisory A/c sent Rs 4,00,000 to Harborline Project A/c, called a round-trip consultancy refund. Treasury and vehicle-staging papers put Alka Menon and Farhan Qureshi on the same payment path. Gate sheets put Harborline with MH-01-FE-6412. Delivery notes put Coastal Works material on MH-04-LP-2288. Monthly mails show Neel Shah reporting invoice work to Madhav Kamat.",
        ],
    ),
    (
        "PERSONS AT THE EDGE OF THE RECORD  /  CERTIFICATION",
        [
            "CCTV and visitor books put Farhan Qureshi near Fort Tender Office on a tender-document day. Office papers show Neel Shah putting in papers there more than once. Aniket Rao is also at Fort Tender Office, with a draft report and copies of tender revisions. Dr Aarohi Sen is on that office notebook and the building visitor register.",
            "Rafiq Abdul Ansari, phone +91-93XXX-60606, is shown as proprietor of Ansari Bullion House and sits only at the edge of the money trail. Kabir Imran Sheikh, phone +91-95XXX-40404, is a systems contractor on the technical record. Vikas Mahesh Tiwari remains a protected-records witness. Aniket Suresh Rao remains a protected procurement source. Their names are here because papers, devices or statements mention them. That is not, by itself, proof they joined the main offence. Identity and the reason each name appears are being checked separately.",
            "I certify that the information in this FIR and the sheets after it was received and written for investigation into the death of Dr Aarohi S. Sen and the offences found during enquiry. Money, telecom, digital, vehicle, tender, land and witness material referred above is being kept and examined. Further statements and expert reports will be added as the enquiry goes on.",
            "Place: Mumbai. Police Station: Kurla Police Station, Mumbai City. FIR No. 582/2026. Date: 04/08/2026.",
        ],
    ),
]


def start_cont_page(pdf: FirPdf) -> float:
    pdf.add_page()
    pdf.red_margin()
    x = pdf.l_margin
    w = pdf.epw
    pdf.print_label("FORM NO. 1 - CONTINUATION SHEET", 8.5)
    pdf.text(x, 16, "FORM NO. 1 - CONTINUATION SHEET")
    pdf.set_font("Times", "", 8)
    pdf.set_text_color(70, 70, 78)
    pdf.text(x + w - 34, 16, "FIR No. 582/2026")
    pdf.set_y(19)
    return 21.5


def add_continuations(pdf: FirPdf) -> None:
    x = pdf.l_margin
    w = pdf.epw
    y = start_cont_page(pdf)
    last_title = ""
    for title, paras in CONTINUATION:
        if title != last_title:
            if y > 268:
                y = start_cont_page(pdf)
            pdf.set_y(y)
            pdf.section_title(title)
            y = pdf.get_y() + 0.4
            last_title = title
        for para in paras:
            if y > 268:
                y = start_cont_page(pdf)
                pdf.set_y(y)
                pdf.section_title(title)
                y = pdf.get_y() + 0.4
            y = pdf.hand_words(para, x, y + 2.15, w, size=9.85, leading=4.2) + 0.55

    if y > 268:
        y = start_cont_page(pdf)
    pdf.hand_words("Vikas M. Tiwari", x + 4, y + 5.5, 70, size=12.2, script=True)
    pdf.hand_words("Inspector Pranav D. Joshi", x + 108, y + 5.5, 72, size=12.0, script=True)
    pdf.set_font("Times", "", 7)
    pdf.set_text_color(90, 90, 96)
    pdf.text(x + 8, y + 10.4, "Signature of Informant")
    pdf.text(x + 122, y + 10.4, "Signature of Recording Officer")


def main() -> None:
    pdf = FirPdf()
    add_form_page(pdf)
    add_continuations(pdf)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    DOWNLOADS.write_bytes(OUT.read_bytes())
    print(OUT)
    print("pages", pdf.page_no(), "bytes", OUT.stat().st_size)


if __name__ == "__main__":
    main()
