from pathlib import Path

from fpdf import FPDF
from fpdf.enums import XPos, YPos

root = Path(__file__).resolve().parents[1]
path = root / "public" / "FIR_582_2026_Operation_Monsoon_Ledger.pdf"


class FirPdf(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(80, 80, 80)
        self.cell(
            0,
            6,
            "MAHARASHTRA POLICE  |  CRIME BRANCH  |  FIR 582/2026",
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
            "Demo FIR for NETRA preview. Not a real police record. Page %s" % self.page_no(),
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

pdf.set_font("Helvetica", "B", 12)
pdf.cell(0, 8, "FIR No. 582/2026", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_font("Helvetica", "", 11)
pdf.cell(0, 6, "Case ID: ed7b5cb0-f21f-459b-b767-9d0fcb70cd7d", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "Title: Operation Monsoon Ledger", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "Depot Redevelopment, Tender Manipulation and Contract-Killing Conspiracy", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "Police Station: Crime Branch    District: Mumbai    Year: 2026", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.ln(2)

block(
    pdf,
    "1. Victim / informant",
    "Aarohi S. Sen, recorded as victim. Mobile not recovered. "
    "Witnesses include Vikas Mahesh Tiwari, Meera Nitin Joshi, and Aniket Suresh Rao.",
)

block(
    pdf,
    "2. Accused persons",
    "Santosh Gajanan Patil, Rehana Yusuf Mirza, Farhan Salim Qureshi, Alka Ramesh Menon, "
    "Neel Arvind Shah, Rafiq Abdul Ansari, Ishaan Prakash Desai, and Ritesh Mahadev Bhalerao "
    "are named in the case graph as accused in a conspiracy around depot redevelopment tenders.",
)

block(
    pdf,
    "3. Offences and legal sections",
    "IPC 302, 201, 120-B, 34. Prevention of Corruption Act sections 7 and 13. PMLA. FEMA.",
)

block(
    pdf,
    "4. Brief facts of the case",
    "This FIR records a conspiracy to manipulate depot redevelopment tenders and silence opposition "
    "through contract killing. Corporate filings, LLP records, and telecom subscriber verification "
    "are cited as supporting material for ownership and contact links among the named accused.",
)

block(
    pdf,
    "5. File note",
    "Original scan stored on FIR document 3795f5c5-5a47-4f6d-ad32-e57d07a9587a. "
    "This copy is hardcoded in NETRA for in-app preview of case 582/2026.",
)

pdf.set_font("Helvetica", "", 10)
pdf.cell(0, 6, "Recorded for NETRA workspace preview", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.output(str(path))
print(path)
print(path.stat().st_size)
