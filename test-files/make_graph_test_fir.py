from pathlib import Path

from fpdf import FPDF
from fpdf.enums import XPos, YPos

path = Path(__file__).resolve().parent / "FIR_Nightwire_graph_test.pdf"


class FirPdf(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(80, 80, 80)
        self.cell(
            0,
            6,
            "MAHARASHTRA POLICE  |  CYBER CRIME CELL, BANDRA  |  FORM 24.5",
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
            "NETRA graph-test FIR. Not a real police record. Page %s" % self.page_no(),
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
pdf.cell(0, 6, "Police Station: Cyber Crime Cell, Bandra", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "District: Mumbai    State: Maharashtra    Year: 2026", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "Date of report: 06 September 2026    Time of report: 21:40 hrs", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "Occurrence: 04 September 2026, between 22:05 hrs and 22:35 hrs", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "Place of occurrence: HDFC ATM, Linking Road, Bandra West, Mumbai", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.ln(2)

block(
    pdf,
    "1. Complainant / informant",
    "Name: Meera Joshi, daughter of Anil Joshi, age 36 years, occupation school teacher. "
    "Residential address: 14, Hill Road, Bandra West, Mumbai 400050. "
    "Phone: 9821114455. Email: meera.joshi.bandra@gmail.com.",
)

block(
    pdf,
    "2. Accused persons",
    "Accused 1: Kabir Malhotra, alias Nightwire, age 31 years, male. "
    "Last known address: 9C, Pali Hill, Bandra West, Mumbai. Phone: 9003344556. "
    "Uses Telegram handle @nightwire. "
    "Accused 2: Rhea Sen, alias Rhea Pay, age 26 years, female. "
    "Last known address: Khar West, Mumbai. Phone: 9876501234. "
    "PhonePe account 9876501234. "
    "Accused 3: Imran Shaikh, age 29 years, male, electronics technician. "
    "Last known address: Mahim, Mumbai. Phone: 9766008899. "
    "Unknown person: Courier in black jacket, about 23 years, no confirmed name, "
    "collected cash near Linking Road at 23:10 hrs.",
)

block(
    pdf,
    "3. Offences and legal sections",
    "Information Technology Act 2000 Sections 66, 66C and 66D. "
    "Indian Penal Code Sections 419, 420 and 120B.",
)

block(
    pdf,
    "4. Brief facts of the case",
    "On 04 September 2026 Meera Joshi used the HDFC ATM, Linking Road, Bandra West. "
    "CCTV shows Imran Shaikh fitting a skimming overlay at 22:08 hrs while "
    "Kabir Malhotra waited nearby. Cafe footage from Candies, Pali Hill shows "
    "Kabir Malhotra with Imran Shaikh at 21:20 hrs. Call records show "
    "Kabir Malhotra contacted Rhea Sen 14 times between 20:00 hrs and 23:40 hrs. "
    "Rhea Sen introduced Imran Shaikh to Kabir Malhotra in the Nightwire Telegram group. "
    "On 05 September 2026 three UPI transfers of Rs 24,000, Rs 18,500 and Rs 31,000 "
    "went to PhonePe 9876501234 in the name of Rhea Sen. Rhea Sen paid the "
    "Courier in black jacket Rs 8,000 in cash. Part of the proceeds was sent to "
    "USDT wallet T9nW4qR7bK2pL8cX1mY5vH6dJ0sA.",
)

block(
    pdf,
    "5. Property / loss",
    "Total wrongful loss to complainant: Rs 73,500. "
    "Bank: HDFC Bank, Bandra West. Card: Visa debit ending 7719.",
)

block(
    pdf,
    "6. Investigation so far",
    "SI Ananya Deshpande seized the overlay device marked Exhibit B. "
    "Preserve HDFC ATM NVR, freeze PhonePe 9876501234, and preserve Telegram @nightwire.",
)

pdf.set_font("Helvetica", "", 10)
pdf.cell(0, 6, "Recorded by: SI Ananya Deshpande, Cyber Crime Cell, Bandra", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "Unique file id: NIGHTWIRE-ATM-2026-09-06-G", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.output(str(path))
print(path)
