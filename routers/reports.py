from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_admin_user
from database import get_db
from models import Book, CopyrightReport, User
from schemas import ReportCreate, ReportRead, ReportStatus
from utils import get_or_404

router = APIRouter(tags=['Copyright reports'])


@router.post('/books/{book_id}/report', response_model=ReportRead, status_code=201)
def report_book(book_id: int, data: ReportCreate, db: Session = Depends(get_db)):
    get_or_404(db, Book, book_id)

    report = CopyrightReport(book_id=book_id, **data.model_dump())
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get('/reports', response_model=list[ReportRead])
def list_reports(
    status: Literal['new', 'reviewed', 'removed'] | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    query = db.query(CopyrightReport)
    if status:
        query = query.filter(CopyrightReport.status == status)
    return query.order_by(CopyrightReport.id.desc()).all()


@router.patch('/reports/{report_id}', response_model=ReportRead)
def set_report_status(report_id: int, data: ReportStatus, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    report = get_or_404(db, CopyrightReport, report_id)
    report.status = data.status

    if data.status == 'removed':
        book = db.get(Book, report.book_id)
        book.is_published = False  # hide the book at once

    db.commit()
    db.refresh(report)
    return report
