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
            "MAHARASHTRA POLICE  |  KURLA POLICE STATION, MUMBAI CITY  |  FIR 582/2026",
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
            "FIR 582/2026  |  Case ID ed7b5cb0-f21f-459b-b767-9d0fcb70cd7d  |  Page %s"
            % self.page_no(),
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
pdf.cell(
    0,
    7,
    "Under Section 154 of the Code of Criminal Procedure, 1973",
    new_x=XPos.LMARGIN,
    new_y=YPos.NEXT,
    align="C",
)
pdf.ln(3)

pdf.set_font("Helvetica", "B", 12)
pdf.cell(0, 8, "FIR No. 582/2026", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_font("Helvetica", "", 11)
pdf.multi_cell(
    0,
    6,
    "Title: Operation Monsoon Ledger - Depot Redevelopment, Tender Manipulation and Contract-Killing Conspiracy",
    new_x=XPos.LMARGIN,
    new_y=YPos.NEXT,
)
pdf.cell(0, 6, "Case type: Murder and Criminal Conspiracy", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "Priority: CRITICAL    Status: OPEN", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "Police Station: Kurla Police Station, Mumbai City", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "District: Mumbai City    State: Maharashtra", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "Registered on: 04 August 2026", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(
    0,
    6,
    "Agency: Special Investigation Team (SIT), Mumbai Crime Branch + Anti-Corruption Bureau",
    new_x=XPos.LMARGIN,
    new_y=YPos.NEXT,
)
pdf.cell(0, 6, "Case ID: ed7b5cb0-f21f-459b-b767-9d0fcb70cd7d", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.ln(2)

block(
    pdf,
    "1. Legal sections",
    "302, 201, 120-B, 34 IPC; PMLA; Prevention of Corruption Act; PC Act 7 & 13; FEMA.",
)

block(
    pdf,
    "2. Victim / informant",
    "Dr. Aarohi S. Sen, 46, Investigative Infrastructure Researcher, Vile Parle, Mumbai. "
    "Role: VICTIM. Mobile not recovered. Arrests recorded against this FIR: 7.",
)

block(
    pdf,
    "3. Accused persons (as recorded on this case)",
    "1. Santosh Gajanan Patil, ACCUSED, Kurla Depot, Mumbai, +91-90XXX-88112.\n"
    "2. Rehana Yusuf Mirza, ACCUSED, Chembur, Mumbai, +91-91XXX-77111.\n"
    "3. Farhan Salim Qureshi, ACCUSED, Kurla West, Mumbai, +91-95XXX-44104.\n"
    "4. Alka Ramesh Menon, ACCUSED, Andheri East, Mumbai, +91-97XXX-22102.\n"
    "5. Neel Arvind Shah, ACCUSED, Bandra West, Mumbai, +91-92XXX-66110.\n"
    "6. Rafiq Abdul Ansari, ACCUSED, Itwari, Nagpur, +91-93XXX-60606.\n"
    "7. Ishaan Prakash Desai, ACCUSED, Ghatkopar, Mumbai, +91-94XXX-55105.\n"
    "8. Ritesh Mahadev Bhalerao, ACCUSED, Worli, Mumbai, +91-96XXX-33103.\n"
    "9. Madhav Shridhar Kamat, ACCUSED, Prabhadevi, Mumbai, +91-98XXX-11101.",
)

block(
    pdf,
    "4. Witnesses (as recorded on this case)",
    "1. Vikas Mahesh Tiwari, WITNESS, Wardha, Maharashtra.\n"
    "2. Meera Nitin Joshi, WITNESS, South Mumbai, +91-89XXX-99113.\n"
    "3. Aniket Suresh Rao, WITNESS, Pune, Maharashtra.\n"
    "4. Kabir Imran Sheikh, WITNESS, Sadar, Nagpur, +91-95XXX-40404.",
)

block(
    pdf,
    "5. Organizations named in this case",
    "Suryanagar Mobility Consortium; Harborline Transit Projects Pvt. Ltd.; "
    "Meridian Advisory Partners; Coastal Works & Materials; Qureshi Fleet Solutions; "
    "Blue Meridian Finance; K-17 Systems Services; Western Civic Procurement Office; "
    "Vasai Aggregates & Haulage.",
)

block(
    pdf,
    "6. Accounts, vehicles and places named in this case",
    "Accounts: Suryanagar Current A/c; Harborline Project A/c; Meridian Advisory A/c; "
    "Blue Meridian Bridge A/c; Settlement Ledger - West.\n"
    "Vehicles: MH-01-FE-6412; MH-04-LP-2288; MH-03-TR-9901; MH-02-AX-7710; MH-43-KQ-3204.\n"
    "Places: Kurla Depot; Fort Tender Office; Prabhadevi Consortium Office; "
    "Kurla Storage Yard; Chembur Materials Yard; Itwari Settlement Office; Vile Parle Residence.",
)

block(
    pdf,
    "7. Brief facts of the case",
    "This FIR records a conspiracy around depot redevelopment tenders at Kurla, "
    "manipulation of civic procurement, and a contract-killing plot against Dr. Aarohi S. Sen. "
    "Corporate filings, LLP/board records, and telecom subscriber verification on this case "
    "link the accused to Suryanagar Mobility Consortium, Harborline Transit Projects Pvt. Ltd., "
    "and related advisory and finance entities. Classification: Restricted - Fictional Prototype Dataset.",
)

pdf.set_font("Helvetica", "", 10)
pdf.cell(0, 6, "File: FIR_582_2026_Operation_Monsoon_Ledger.pdf", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(
    0,
    6,
    "Document ID: 3795f5c5-5a47-4f6d-ad32-e57d07a9587a",
    new_x=XPos.LMARGIN,
    new_y=YPos.NEXT,
)

pdf.output(str(path))
print(path)
print(path.stat().st_size)
