from pathlib import Path

from fpdf import FPDF
from fpdf.enums import XPos, YPos

out_dir = Path(__file__).resolve().parent
path = out_dir / "FIR_ShadowNet_sample.pdf"


class FirPdf(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(90, 90, 90)
        self.cell(0, 6, "CYBER CRIME CELL  |  CONFIDENTIAL SAMPLE", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
        self.set_text_color(0, 0, 0)
        self.ln(2)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(110, 110, 110)
        self.cell(0, 8, "Sample FIR for NETRA testing. Not a real police record.  Page %s" % self.page_no(), align="C")


pdf = FirPdf()
pdf.set_auto_page_break(auto=True, margin=20)
pdf.set_margins(18, 16, 18)
pdf.add_page()

pdf.set_font("Helvetica", "B", 16)
pdf.cell(0, 10, "FIRST INFORMATION REPORT", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
pdf.set_font("Helvetica", "", 11)
pdf.cell(0, 7, "Section 154 CrPC / Cyber Crime Cell, Andheri", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
pdf.ln(4)

pdf.set_font("Helvetica", "B", 12)
pdf.cell(0, 8, "FIR No. FIR-968389", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_font("Helvetica", "", 11)
pdf.cell(0, 6, "Police Station: Cyber Crime, Andheri    District: Mumbai    Date: 12 March 2026", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.cell(0, 6, "Case type: Cyber Syndicate    Priority: HIGH", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.ln(3)

pdf.set_font("Helvetica", "B", 12)
pdf.cell(0, 8, "Complainant", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_font("Helvetica", "", 11)
pdf.multi_cell(
    0,
    6,
    "Name: Meera Joshi, Deputy IT Officer, Municipal Cloud Operations. "
    "Phone: 9820123456. Address: Bandra East, Mumbai. "
    "Email: meera.joshi@mumbai.gov.in",
    new_x=XPos.LMARGIN,
    new_y=YPos.NEXT,
)
pdf.ln(2)

pdf.set_font("Helvetica", "B", 12)
pdf.cell(0, 8, "Accused / suspects", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_font("Helvetica", "", 11)
pdf.multi_cell(
    0,
    6,
    "1. Ravi Sharma, alias ShadowFox, age 29, last known address Andheri West, Mumbai. "
    "Phone: 9876543210. Telegram handle @shadowfox_ops.",
    new_x=XPos.LMARGIN,
    new_y=YPos.NEXT,
)
pdf.multi_cell(
    0,
    6,
    "2. Kabir Khan, alias Pixel, suspected money mule. Phone: 9988776655. "
    "Operates a P2P crypto desk near Crawford Market.",
    new_x=XPos.LMARGIN,
    new_y=YPos.NEXT,
)
pdf.multi_cell(
    0,
    6,
    "3. Unknown operator using email ransom.shadow.net@proton.me and "
    "Monero wallet 4A8fR2kP9vLqW3tY7uC1bN6dE5hJ0mS8xZ2.",
    new_x=XPos.LMARGIN,
    new_y=YPos.NEXT,
)
pdf.ln(2)

pdf.set_font("Helvetica", "B", 12)
pdf.cell(0, 8, "Brief facts", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_font("Helvetica", "", 11)
pdf.multi_cell(
    0,
    6,
    "On 11 March 2026 at about 02:40 hrs, municipal cloud servers hosting property tax "
    "and water billing were encrypted. A ransom note demanded 40 Monero for decryption "
    "keys and threatened public leak of citizen records. The note was signed Operation ShadowNet. "
    "Traffic logs show outbound connections to 185.244.25.91 and a C2 domain shadow-net-panel.xyz.",
    new_x=XPos.LMARGIN,
    new_y=YPos.NEXT,
)
pdf.ln(2)
pdf.multi_cell(
    0,
    6,
    "Funds appear to have been routed through Kabir Khan to a Binance P2P account linked "
    "to phone 9988776655, then to the Monero wallet above. A second victim, Western Logistics "
    "Pvt Ltd, reported a similar note on 08 March 2026.",
    new_x=XPos.LMARGIN,
    new_y=YPos.NEXT,
)
pdf.ln(2)

pdf.set_font("Helvetica", "B", 12)
pdf.cell(0, 8, "Sections invoked", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_font("Helvetica", "", 11)
pdf.multi_cell(0, 6, "IT Act 66, 66C, 66F; IPC 384, 420, 120B.", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.ln(2)

pdf.set_font("Helvetica", "B", 12)
pdf.cell(0, 8, "Investigation notes", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_font("Helvetica", "", 11)
pdf.multi_cell(
    0,
    6,
    "Ravi Sharma was seen with Kabir Khan at Cafe Noir, Andheri on 10 March 2026. "
    "A USB recovered from Sharma contained a ransomware builder named netra_lock_v3.exe "
    "and a contact list including Meera Joshi. Request CCTV from Cafe Noir and freeze "
    "the P2P desk account.",
    new_x=XPos.LMARGIN,
    new_y=YPos.NEXT,
)
pdf.ln(6)
pdf.set_font("Helvetica", "", 10)
pdf.cell(0, 6, "Recorded by: SI Anjali Deshmukh, Cyber Crime Cell, Andheri", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.output(str(path))
print(path)
print(path.stat().st_size)
