"""Generate NextSpace Indexes Interview Guide PDF."""

from pathlib import Path

from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).resolve().parents[2] / "NextSpace_Indexes_Interview_Guide.pdf"

BLUE = HexColor("#1e3a5f")
ACCENT = HexColor("#2563eb")
LIGHT = HexColor("#f1f5f9")
MUTED = HexColor("#64748b")
SOFT = HexColor("#e2e8f0")


def build() -> Path:
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="CoverTitle",
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=28,
            textColor=BLUE,
            alignment=TA_CENTER,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CoverSub",
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="H1Custom",
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=BLUE,
            spaceBefore=14,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyCustom",
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=black,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Answer",
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            textColor=HexColor("#0f172a"),
            alignment=TA_JUSTIFY,
            spaceAfter=8,
            leftIndent=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Q",
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=13,
            textColor=BLUE,
            spaceBefore=8,
            spaceAfter=3,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Speak",
            fontName="Helvetica-Oblique",
            fontSize=9.2,
            leading=13,
            textColor=HexColor("#1e293b"),
            spaceAfter=6,
            leftIndent=6,
            rightIndent=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Small",
            fontName="Helvetica",
            fontSize=8.5,
            leading=11.5,
            textColor=MUTED,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BulletBody",
            fontName="Helvetica",
            fontSize=9.2,
            leading=12.5,
            textColor=black,
            spaceAfter=2,
            leftIndent=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableCell",
            fontName="Helvetica",
            fontSize=8.2,
            leading=11,
            textColor=black,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableHeader",
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11,
            textColor=white,
        )
    )

    story: list = []

    # Cover
    story.append(Spacer(1, 1.6 * inch))
    story.append(Paragraph("NextSpace AI", styles["CoverTitle"]))
    story.append(
        Paragraph(
            "Database Indexes — Interview Guide + Full Mock Q&amp;A",
            styles["CoverSub"],
        )
    )
    story.append(Spacer(1, 8))
    story.append(
        HRFlowable(
            width="60%",
            thickness=1.5,
            color=ACCENT,
            spaceBefore=4,
            spaceAfter=12,
            hAlign="CENTER",
        )
    )
    story.append(
        Paragraph(
            "FastAPI / SQLAlchemy models mein index kahan use hue,<br/>"
            "kyun use hue, aur interview mein kaise answer dena hai.",
            styles["CoverSub"],
        )
    )
    story.append(Spacer(1, 20))
    story.append(
        Paragraph(
            "Project: NextSpace AI &nbsp;|&nbsp; Stack: FastAPI + SQLAlchemy + PostgreSQL (Neon)",
            styles["Small"],
        )
    )
    story.append(
        Paragraph(
            "Language: Roman Urdu + English (interview speaking style)",
            styles["Small"],
        )
    )
    story.append(PageBreak())

    # Section 1
    story.append(Paragraph("1. Index kya hai? (Short definition)", styles["H1Custom"]))
    story.append(
        Paragraph(
            "Index ek database structure hai jo <b>WHERE</b>, <b>JOIN</b>, aur <b>ORDER BY</b> "
            "queries ko full table scan ke bajaye fast lookup deta hai. Socho jaise book ki "
            "index page — poori book na padho, seedha page number pe jao.",
            styles["BodyCustom"],
        )
    )
    story.append(
        Paragraph(
            "<b>Speak this:</b> “Index read performance improve karta hai un columns pe jo hum "
            "frequently filter, join, ya lookup karte hain. Trade-off yeh hai ke INSERT/UPDATE "
            "thora slow ho sakta hai aur disk space zyada lagti hai — is liye har column pe nahi, "
            "sirf hot-path columns pe lagate hain.”",
            styles["Speak"],
        )
    )

    story.append(Paragraph("2. Humne indexes kab use kiye? (3 rules)", styles["H1Custom"]))
    for b in [
        "<b>Foreign keys</b> — jo har JOIN / tenant filter pe chalte hain "
        "(<font face='Courier'>company_id</font>, <font face='Courier'>space_id</font>, "
        "<font face='Courier'>project_id</font>).",
        "<b>Lookup hot paths</b> — login email, invite token, DM key — ek row jaldi milni chahiye.",
        "<b>Filter columns</b> — status, priority, space_type — dashboard / board pe bar-bar filter.",
    ]:
        story.append(Paragraph(f"• {b}", styles["BulletBody"]))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            "<b>UniqueConstraint</b> membership tables pe is liye: same user do dafa member na bane, "
            "aur unique columns pe index naturally fast lookup bhi deta hai.",
            styles["BodyCustom"],
        )
    )

    story.append(Paragraph("3. Model-wise index map (NextSpace)", styles["H1Custom"]))

    def cell(text: str, header: bool = False):
        return Paragraph(text, styles["TableHeader"] if header else styles["TableCell"])

    rows = [
        [
            cell("Model / Area", True),
            cell("Indexed columns", True),
            cell("Interview reason (kyun?)", True),
        ],
        [
            cell("<b>User</b>"),
            cell("email (unique+index)<br/>company_id"),
            cell("Login/register pe email lookup; company ke users list"),
        ],
        [
            cell("<b>Company</b>"),
            cell("name"),
            cell("Company search / listing"),
        ],
        [
            cell("<b>Space</b>"),
            cell("name, space_type,<br/>company_id, created_by_id"),
            cell("Tenant filter + private/public filter + ownership"),
        ],
        [
            cell("<b>Team</b>"),
            cell("name, space_id, created_by_id"),
            cell("Space ke teams; name search"),
        ],
        [
            cell("<b>Invite</b>"),
            cell("token (unique), email,<br/>status, company_id, invited_by_id"),
            cell("Invite link = hot path; pending invites list"),
        ],
        [
            cell("<b>Project / Task</b>"),
            cell("space_id, project_id, stage_id,<br/>status, priority, created_by_id"),
            cell("Kanban board path + dashboard filters"),
        ],
        [
            cell("<b>Members</b><br/>(space/project/team/doc)"),
            cell("FK pair + UniqueConstraint"),
            cell("“Is user member?” check; no duplicates"),
        ],
        [
            cell("<b>Chat / Notify / AI</b>"),
            cell(
                "company_id, user_id,<br/>conversation_id, sender_id, dm_key, type/role"
            ),
            cell("Inbox, DM find/create, messages by thread"),
        ],
    ]

    t = Table(rows, colWidths=[1.35 * inch, 2.35 * inch, 3.0 * inch])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BLUE),
                ("TEXTCOLOR", (0, 0), (-1, 0), white),
                ("BACKGROUND", (0, 1), (-1, 1), LIGHT),
                ("BACKGROUND", (0, 3), (-1, 3), LIGHT),
                ("BACKGROUND", (0, 5), (-1, 5), LIGHT),
                ("BACKGROUND", (0, 7), (-1, 7), LIGHT),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.4, SOFT),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(t)
    story.append(PageBreak())

    story.append(Paragraph("4. Ready-to-speak paragraph (memorize)", styles["H1Custom"]))
    story.append(
        Paragraph(
            "“Maine indexes mainly teen cases mein use kiye. Pehla — foreign keys jo har join "
            "aur tenant filter pe chalte hain, jaise company_id, space_id, project_id. Doosra — "
            "lookup hot paths: login pe email, invite accept pe token, aur DM pe dm_key. Teesra — "
            "filter columns jaise status, priority, space_type jo dashboard aur Kanban board pe "
            "bar-bar filter hote hain. Membership tables pe UniqueConstraint is liye hai ke "
            "duplicate membership na bane. Har column pe index nahi lagaya kyunki write cost aur "
            "disk overhead badh jati hai — sirf high-read columns pe.”",
            styles["Speak"],
        )
    )

    story.append(Paragraph("5. Full Mock Interview Q&amp;A", styles["H1Custom"]))
    story.append(
        Paragraph(
            "Neeche interviewer → aap wale answers hain. Bold idea pehle bolo, phir detail.",
            styles["Small"],
        )
    )

    qa = [
        (
            "Q1. Index kya hota hai aur FastAPI/SQLAlchemy mein kaise lagate ho?",
            "“Index DB-level structure hai; FastAPI khud index nahi banata — SQLAlchemy model pe "
            "<font face='Courier'>index=True</font> ya <font face='Courier'>UniqueConstraint</font> "
            "se migration/create_all pe PostgreSQL index ban jata hai.” "
            "Example: <font face='Courier'>mapped_column(String(255), unique=True, index=True)</font>.",
        ),
        (
            "Q2. User model pe email pe index kyun?",
            "“Login aur register pe hum email se user dhundhte hain — yeh hottest lookup path hai. "
            "Is liye unique + index: duplicate accounts block, aur fast lookup. Bina index ke har "
            "login pe full table scan hota.”",
        ),
        (
            "Q3. company_id / space_id pe index kyun almost har table mein?",
            "“NextSpace multi-tenant hai. Almost har query company ya space se scoped hoti hai — "
            "‘is company ke spaces’, ‘is space ke projects’. Foreign key columns pe index JOIN aur "
            "WHERE dono ko tez karta hai. Agar na ho to tenant queries slow ho jati hain jaise "
            "jaise data badhe.”",
        ),
        (
            "Q4. Invite.token pe unique index ka special reason?",
            "“Invite link open hote hi token se ek row milni chahiye — exact match, high frequency. "
            "Unique ensure karta hai ke do invites same token share na karein; index ensure karta "
            "hai ke lookup milliseconds mein ho. Yeh security + performance dono hai.”",
        ),
        (
            "Q5. Project.status aur Task.priority pe index — overkill nahi?",
            "“Dashboard pe users continuously filter karte hain: open projects, high priority tasks. "
            "Agar selectivity theek ho (kai values + large table) to index useful hai. Agar table "
            "chhoti ho to DB kabhi index skip bhi kar sakta hai — lekin production growth ke liye "
            "humne pehle se rakha.”",
        ),
        (
            "Q6. Membership table pe UniqueConstraint(space_id, user_id) ka matlab?",
            "“Composite unique: ek user ek space mein sirf ek dafa member ho sakta hai. Yeh data "
            "integrity hai. Practically DB unique index bhi banata hai, jo ‘is this user a member?’ "
            "check ko fast banata hai — authorization path pe bahut kaam aata hai.”",
        ),
        (
            "Q7. Chat mein dm_key pe index kyun?",
            "“DM open karte waqt hum do users ke beech existing conversation dhundhte hain. dm_key "
            "deterministic key hai (sorted user ids). Index se find-or-create fast hota hai; warna "
            "har DM pe heavy scan.”",
        ),
        (
            "Q8. AI chat messages pe role index kyun?",
            "“Kabhi hum sirf user ya assistant messages filter karte hain (history rebuild, "
            "analytics). role low-cardinality hai, is liye main benefit conversation_id index ke "
            "sath combo mein aata hai — pehle thread, phir role.”",
        ),
        (
            "Q9. Har column pe index kyun nahi lagaya?",
            "“Teen reasons: (1) har write pe index update — INSERT/UPDATE slow, (2) disk/memory "
            "cost, (3) planner confuse ho sakta hai useless indexes se. Rule: pehle query patterns "
            "dekho (WHERE/JOIN/ORDER BY), phir index. Dead index = cost without benefit.”",
        ),
        (
            "Q10. Primary key pe alag se index=True likha hai kya?",
            "“Nahi zaroori. SQLAlchemy/Postgres primary key pe already unique index hota hai. "
            "Humne index=True foreign keys, lookup fields, aur filters pe explicitly diya.”",
        ),
        (
            "Q11. Composite index kab banate? Kya tumhare project mein hai?",
            "“Jab query aksar AND filter karti ho, jaise WHERE company_id=? AND status=?. "
            "Humare paas UniqueConstraint composites hain (membership, conversation participant, "
            "dm_key+company). Agar interviewer pooche improvement: dashboard ke liye "
            "(project_id, priority) composite consider kar sakte hain after EXPLAIN ANALYZE.”",
        ),
        (
            "Q12. Index kaise verify karoge production mein?",
            "“PostgreSQL mein <font face='Courier'>EXPLAIN ANALYZE</font> — Index Scan vs Seq Scan. "
            "Agar Seq Scan aa raha hai large table pe aur filter selective hai, index missing/wrong "
            "hai. Slow query log + pg_stat_user_indexes se unused indexes bhi nikaalte hain.”",
        ),
        (
            "Q13. Load test mein slow queries — index se kya farq?",
            "“Humare 100-user load test mein remote Neon latency + pool size pehle bottleneck tha. "
            "Indexes help karte hain jab DB CPU/IO query planning pe waste na kare. Lekin network "
            "RTT aur connection pool alag problem hai — index sirf query shape fix karta hai, "
            "remote latency nahi.”",
        ),
        (
            "Q14. SQLite local vs Postgres — indexes same?",
            "“Concept same, implementation alag. Hum models mein index=True rakhte hain taake dono "
            "backends pe same schema intent ho. Production Postgres pe indexes zyada matter karte "
            "hain kyunki data volume aur concurrency zyada hoti hai.”",
        ),
        (
            "Q15. Ek strong closing line?",
            "“Maine indexes randomly nahi lagaye — query access patterns se map kiye: tenant FKs, "
            "auth lookups, aur board/dashboard filters. Integrity ke liye unique constraints, "
            "performance ke liye selective indexes — yeh intentional design hai.”",
        ),
    ]

    for q, a in qa:
        block = [
            Paragraph(q, styles["Q"]),
            Paragraph(f"<b>Answer:</b> {a}", styles["Answer"]),
        ]
        story.append(KeepTogether(block))

    story.append(PageBreak())

    story.append(Paragraph("6. Follow-up traps — short replies", styles["H1Custom"]))
    traps = [
        (
            "“B-tree vs Hash index?”",
            "Postgres default B-tree. Equality + range dono. Hash mostly equality — hum B-tree pe "
            "rely karte hain.",
        ),
        (
            "“Partial index kab?”",
            "Jab aksar subset filter ho, e.g. WHERE status='pending' — sirf pending rows index. "
            "Abhi simple indexes use kiye; scale pe add kar sakte hain.",
        ),
        (
            "“Covering index?”",
            "Index mein woh columns bhi jo SELECT mein chahiye taake heap fetch na ho. Advanced "
            "optimization — pehle EXPLAIN ke baad.",
        ),
        (
            "“Migration mein index concurrent?”",
            "Postgres pe bade table par CREATE INDEX CONCURRENTLY lock avoid karta hai. "
            "Production deploy tip.",
        ),
    ]
    for q, a in traps:
        story.append(Paragraph(q, styles["Q"]))
        story.append(Paragraph(a, styles["Answer"]))

    story.append(Paragraph("7. 60-second elevator answer (last revision)", styles["H1Custom"]))
    story.append(
        Paragraph(
            "“NextSpace multi-tenant SaaS hai, is liye almost har table pe company_id / space_id / "
            "project_id indexed hain — tenant isolation queries fast rahein. Auth hot paths pe "
            "email aur invite token unique+indexed hain. Board aur dashboard ke liye "
            "status/priority indexed hain. Membership tables pe composite unique constraints hain "
            "taake duplicates na aaye aur membership checks tez hon. Design principle: index where "
            "you filter and join, not everywhere.”",
            styles["Speak"],
        )
    )

    story.append(Spacer(1, 16))
    story.append(
        HRFlowable(width="100%", thickness=0.8, color=SOFT, spaceBefore=4, spaceAfter=8)
    )
    story.append(
        Paragraph(
            "Files reference: backend/app/models/*.py — index=True / UniqueConstraint<br/>"
            "Good luck for the interview — calm raho, pehle 1-line answer, phir example.",
            styles["Small"],
        )
    )

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(SOFT)
        canvas.setLineWidth(0.5)
        canvas.line(20 * mm, 14 * mm, A4[0] - 20 * mm, 14 * mm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(20 * mm, 8 * mm, "NextSpace AI — Indexes Interview Guide")
        canvas.drawRightString(A4[0] - 20 * mm, 8 * mm, f"Page {doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title="NextSpace Indexes Interview Guide",
        author="NextSpace AI",
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return OUT


if __name__ == "__main__":
    path = build()
    print(path)
