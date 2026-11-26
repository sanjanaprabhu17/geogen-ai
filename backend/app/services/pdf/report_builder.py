import io
from datetime import datetime
from typing import Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from app.schemas.trip import TripItinerary, ReportOptions

class PDFReportBuilder:
    @staticmethod
    def generate_pdf(trip: TripItinerary, options: ReportOptions) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )

        styles = getSampleStyleSheet()
        
        # Editorial Orvante-inspired typography
        title_style = ParagraphStyle(
            'EditorialTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=24,
            leading=28,
            textColor=colors.HexColor('#111827'),
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'EditorialSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            leading=16,
            textColor=colors.HexColor('#4B5563'),
            spaceAfter=15
        )
        section_heading = ParagraphStyle(
            'EditorialSection',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#111827'),
            spaceBefore=14,
            spaceAfter=8,
            keepWithNext=True
        )
        body_style = ParagraphStyle(
            'EditorialBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=14,
            textColor=colors.HexColor('#1F2937')
        )
        meta_label = ParagraphStyle(
            'MetaLabel',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#6B7280'),
            textTransform='uppercase'
        )
        disclaimer_style = ParagraphStyle(
            'Disclaimer',
            parent=styles['Italic'],
            fontName='Helvetica-Oblique',
            fontSize=8,
            leading=12,
            textColor=colors.HexColor('#9CA3AF')
        )

        elements = []

        # Header Badge & Title
        badge_text = f"GEOGEN AI / TRIP DOSSIER • {trip.source.upper()} DATA"
        elements.append(Paragraph(badge_text, meta_label))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(trip.title, title_style))
        gen_date = datetime.now().strftime("%B %d, %Y")
        elements.append(Paragraph(f"Destination: <b>{trip.destination}</b> &nbsp;|&nbsp; Duration: <b>{trip.duration_days} Day(s)</b> &nbsp;|&nbsp; Generated: <b>{gen_date}</b>", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#111827'), spaceAfter=14))

        # 1. Overview Section
        if options.include_overview:
            elements.append(Paragraph("1. EXECUTIVE TRIP SUMMARY", section_heading))
            elements.append(Paragraph(trip.overview, body_style))
            elements.append(Spacer(1, 8))
            
            meta_data = [
                ["TRAVELLERS", "TRANSIT MODE", "DATA SOURCE", "EST. TOTAL BUDGET"],
                [
                    str(trip.travellers),
                    trip.transport_mode.capitalize(),
                    trip.source.upper(),
                    f"₹{trip.budget_breakdown.total_estimated:,.0f}"
                ]
            ]
            t_meta = Table(meta_data, colWidths=[130, 130, 130, 140])
            t_meta.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F3F4F6')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#4B5563')),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,0), 8),
                ('FONTNAME', (0,1), (-1,1), 'Helvetica-Bold'),
                ('FONTSIZE', (0,1), (-1,1), 10),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('LINEBELOW', (0,1), (-1,1), 1, colors.HexColor('#E5E7EB'))
            ]))
            elements.append(t_meta)
            elements.append(Spacer(1, 14))

        # 2. Day-by-Day Itinerary
        if options.include_itinerary:
            elements.append(Paragraph("2. DAY-BY-DAY ITINERARY", section_heading))
            for day in trip.days:
                elements.append(Paragraph(f"<b>{day.title}</b>", ParagraphStyle('DayTitle', parent=body_style, fontName='Helvetica-Bold', fontSize=11, spaceBefore=6, spaceAfter=4)))
                day_rows = [["STOP", "TIME", "LOCATION", "EST. STAY", "AI CURATION REASON"]]
                for s in day.stops:
                    day_rows.append([
                        f"#{s.stop_number}",
                        s.arrival_time_label,
                        Paragraph(f"<b>{s.place.name}</b><br/>{s.place.category}", body_style),
                        f"{s.suggested_duration_minutes}m",
                        Paragraph(s.ai_reason, body_style)
                    ])
                t_day = Table(day_rows, colWidths=[35, 65, 170, 60, 200])
                t_day.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#111827')),
                    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0,0), (-1,0), 8),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                    ('TOPPADDING', (0,0), (-1,-1), 5),
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB'))
                ]))
                elements.append(t_day)
                elements.append(Spacer(1, 10))

        # 3. Route Distance & Time Table
        if options.include_routes:
            elements.append(Paragraph("3. ROUTE TRANSIT & TRAVEL LEGS", section_heading))
            route_rows = [["LEG", "ORIGIN", "DESTINATION", "DISTANCE", "EST. TIME", "MODE"]]
            leg_num = 1
            for day in trip.days:
                for s in day.stops:
                    if s.route_to_next:
                        r = s.route_to_next
                        route_rows.append([
                            f"L{leg_num}",
                            r.origin_name[:25],
                            r.destination_name[:25],
                            r.formatted_distance,
                            r.formatted_duration,
                            r.travel_mode.capitalize()
                        ])
                        leg_num += 1

            if len(route_rows) > 1:
                t_routes = Table(route_rows, colWidths=[35, 150, 150, 75, 60, 60])
                t_routes.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F3F4F6')),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0,0), (-1,0), 8),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                    ('TOPPADDING', (0,0), (-1,-1), 5),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB'))
                ]))
                elements.append(t_routes)
            else:
                elements.append(Paragraph("Single-destination stops or pedestrian access between proximate points.", body_style))
            elements.append(Spacer(1, 14))

        # 4. Budget Breakdown
        if options.include_budget:
            elements.append(Paragraph("4. ESTIMATED BUDGET BREAKDOWN", section_heading))
            budget_rows = [["EXPENSE CATEGORY", "AMOUNT (INR)", "SOURCE ATTRIBUTION", "NOTES"]]
            for b in trip.budget_breakdown.items:
                budget_rows.append([
                    b.category,
                    f"₹{b.amount:,.0f}",
                    b.source_label,
                    b.note or "-"
                ])
            budget_rows.append([
                "TOTAL ESTIMATED",
                f"₹{trip.budget_breakdown.total_estimated:,.0f}",
                f"₹{trip.budget_breakdown.per_person_estimated:,.0f} / person",
                "Calculated for " + str(trip.travellers) + " traveller(s)"
            ])
            t_b = Table(budget_rows, colWidths=[140, 90, 110, 190])
            t_b.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F3F4F6')),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,0), 8),
                ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
                ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#F9FAFB')),
                ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                ('TOPPADDING', (0,0), (-1,-1), 5),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB'))
            ]))
            elements.append(t_b)
            if trip.budget_breakdown.note:
                elements.append(Spacer(1, 4))
                elements.append(Paragraph(f"<i>Note: {trip.budget_breakdown.note}</i>", body_style))
            elements.append(Spacer(1, 14))

        # 5. Travel Tips & Caveats
        if options.include_tips:
            elements.append(Paragraph("5. AI TRAVEL GUIDELINES & CAVEATS", section_heading))
            for tip in trip.travel_tips:
                elements.append(Paragraph(f"• <b>Tip:</b> {tip}", body_style))
            elements.append(Spacer(1, 6))
            for cav in trip.assumptions_and_caveats:
                elements.append(Paragraph(f"• <b>Notice:</b> {cav}", disclaimer_style))
            elements.append(Spacer(1, 14))

        # Footer Disclaimer
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#D1D5DB'), spaceAfter=8))
        elements.append(Paragraph("DISCLAIMER: GeoGen AI travel dossiers ground recommendations in real places and routes. Opening hours, entry tariffs, ticket queues, and traffic timings remain variable. Confirm live details before departing.", disclaimer_style))

        doc.build(elements)
        return buffer.getvalue()
