from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, Preformatted, SimpleDocTemplate, Spacer


def main() -> None:
    out = Path.home() / "Downloads" / "space_query_explanation.pdf"
    doc = SimpleDocTemplate(
        str(out),
        pagesize=A4,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "TitleCustom",
        parent=styles["Heading1"],
        fontSize=18,
        textColor=HexColor("#111827"),
        spaceAfter=12,
    )
    heading = ParagraphStyle(
        "HeadingCustom",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=HexColor("#2563eb"),
        spaceBefore=14,
        spaceAfter=8,
    )
    body = ParagraphStyle(
        "BodyCustom",
        parent=styles["BodyText"],
        fontSize=11,
        leading=16,
        textColor=HexColor("#111827"),
        spaceAfter=8,
    )
    code = ParagraphStyle(
        "CodeCustom",
        parent=styles["Code"],
        fontSize=9,
        leading=13,
        backColor=HexColor("#f8f9fc"),
        textColor=HexColor("#111827"),
        leftIndent=6,
        rightIndent=6,
        spaceBefore=6,
        spaceAfter=10,
    )

    story = [
        Paragraph("NextSpace AI — _space_query() Explanation", title),
        Paragraph(
            'File: <font face="Courier">backend/app/routers/spaces.py</font> (lines 21–26)',
            body,
        ),
        Spacer(1, 6),
        Paragraph("What this function is", heading),
        Paragraph(
            '<font face="Courier">_space_query()</font> is a reusable SQLAlchemy query builder. '
            'It selects <font face="Courier">Space</font> rows and also loads related data up front '
            "so the API can return creator and members without extra lazy database hits.",
            body,
        ),
        Paragraph("Code", heading),
        Preformatted(
            """def _space_query():
    return select(Space).options(
        selectinload(Space.created_by),
        selectinload(Space.memberships).selectinload(SpaceMember.user),
    )""",
            code,
        ),
        Paragraph("Line-by-line", heading),
        Paragraph(
            '<b>1. <font face="Courier">select(Space)</font></b> — Start a query that fetches rows '
            "from the spaces table.",
            body,
        ),
        Paragraph(
            '<b>2. <font face="Courier">selectinload(Space.created_by)</font></b> — Also load each '
            'space’s creator (a <font face="Courier">User</font>) with a separate efficient '
            "SELECT … WHERE id IN (…) query.",
            body,
        ),
        Paragraph(
            '<b>3. <font face="Courier">selectinload(Space.memberships).selectinload(SpaceMember.user)'
            "</font></b> — First load membership rows for those spaces, then load each membership’s "
            "related user. This is nested eager loading: memberships → user.",
            body,
        ),
        Paragraph("Why it exists", heading),
        Paragraph(
            'Without eager loading, accessing <font face="Courier">space.created_by</font> or '
            '<font face="Courier">space.memberships</font> later can trigger one database query per '
            "space (the classic N+1 problem). With this helper, list/create/update/get endpoints get "
            "creator + members ready in a few queries total.",
            body,
        ),
        Paragraph("Where it is used", heading),
        Paragraph(
            "Shared by create, list, get, update, and member add/remove handlers in "
            '<font face="Courier">spaces.py</font>, so every Space response is consistent.',
            body,
        ),
        Paragraph("Simple analogy", heading),
        Paragraph(
            "Think of it like: “Get spaces, and in the same trip also bring each space’s creator card "
            "and the list of member cards” — so the frontend can show avatars without asking the "
            "backend again.",
            body,
        ),
    ]

    doc.build(story)
    print(out)
    print(f"exists={out.exists()} size={out.stat().st_size}")


if __name__ == "__main__":
    main()
