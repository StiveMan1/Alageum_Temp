import uuid
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.audit.service import record_audit
from app.auth.dependencies import AuthContext, require_permission
from app.commerce.models import (
    Invoice,
    Order,
    Payment,
    QuoteRequest,
    QuoteRequestItem,
    Ticket,
    TicketCategory,
    TicketMessage,
    TicketStatus,
)
from app.core.database import get_session
from app.core.errors import AppError
from app.core.pagination import Page, PageParams, paginate
from app.core.rate_limit import RateLimitPolicy, rate_limit
from app.core.schemas import APIRequest

orders_router = APIRouter(prefix="/orders", tags=["Orders"])
finance_router = APIRouter(prefix="/finance", tags=["Finance"])
quotes_router = APIRouter(prefix="/quotes", tags=["Quotes"])
support_router = APIRouter(prefix="/support", tags=["Support"])


class OrderItemOut(BaseModel):
    id: uuid.UUID
    description: str
    quantity: Decimal
    unit_price: Decimal | None
    configuration: dict[str, Any]

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: uuid.UUID
    external_id: str | None
    number: str
    currency: str
    amount: Decimal
    status: str
    items: list[OrderItemOut]


def order_out(item: Order) -> OrderOut:
    return OrderOut(
        id=item.id,
        external_id=item.external_id,
        number=item.number,
        currency=item.currency,
        amount=item.amount,
        status=item.status.code,
        items=[OrderItemOut.model_validate(value) for value in item.items],
    )


def order_query():
    return select(Order).options(selectinload(Order.status), selectinload(Order.items))


@orders_router.get("", response_model=Page[OrderOut])
async def list_orders(
    page: PageParams = Depends(),
    context: AuthContext = Depends(require_permission("order.read")),
    session: AsyncSession = Depends(get_session),
):
    items, total = await paginate(
        session,
        order_query()
        .where(Order.organization_id == context.organization_id)
        .order_by(Order.created_at.desc(), Order.id),
        page,
    )
    return Page(
        items=[order_out(item) for item in items],
        page=page.page,
        page_size=page.page_size,
        total=total,
    )


@orders_router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: uuid.UUID,
    request: Request,
    context: AuthContext = Depends(require_permission("order.read")),
    session: AsyncSession = Depends(get_session),
):
    item = await session.scalar(
        order_query().where(Order.id == order_id, Order.organization_id == context.organization_id)
    )
    if not item:
        raise AppError("order_not_found", "Order not found", 404)
    await record_audit(
        session,
        request,
        "order.view",
        context.user.id,
        context.organization_id,
        "order",
        str(item.id),
    )
    await session.commit()
    return order_out(item)


class FinanceOut(BaseModel):
    id: uuid.UUID
    number: str | None = None
    amount: Decimal
    currency: str
    status: str | None = None
    source: str


@finance_router.get("/invoices", response_model=Page[FinanceOut])
async def invoices(
    page: PageParams = Depends(),
    context: AuthContext = Depends(require_permission("finance.read")),
    session: AsyncSession = Depends(get_session),
):
    items, total = await paginate(
        session,
        select(Invoice)
        .where(Invoice.organization_id == context.organization_id)
        .order_by(Invoice.created_at.desc(), Invoice.id),
        page,
    )
    return Page(
        items=[FinanceOut.model_validate(item, from_attributes=True) for item in items],
        page=page.page,
        page_size=page.page_size,
        total=total,
    )


@finance_router.get("/payments", response_model=Page[FinanceOut])
async def payments(
    page: PageParams = Depends(),
    context: AuthContext = Depends(require_permission("finance.read")),
    session: AsyncSession = Depends(get_session),
):
    items, total = await paginate(
        session,
        select(Payment)
        .where(Payment.organization_id == context.organization_id)
        .order_by(Payment.created_at.desc(), Payment.id),
        page,
    )
    return Page(
        items=[
            FinanceOut(id=item.id, amount=item.amount, currency=item.currency, source=item.source)
            for item in items
        ],
        page=page.page,
        page_size=page.page_size,
        total=total,
    )


class QuoteItemIn(APIRequest):
    product_id: uuid.UUID | None = None
    quantity: Decimal = Field(gt=0)
    parameters: dict[str, Any] = Field(default_factory=dict)


class QuoteIn(APIRequest):
    comment: str | None = Field(default=None, max_length=4000)
    items: list[QuoteItemIn] = Field(min_length=1, max_length=100)


class QuoteOut(BaseModel):
    id: uuid.UUID
    status: str
    comment: str | None
    item_count: int


@quotes_router.get("", response_model=Page[QuoteOut])
async def list_quotes(
    page: PageParams = Depends(),
    context: AuthContext = Depends(require_permission("quote.read")),
    session: AsyncSession = Depends(get_session),
):
    items, total = await paginate(
        session,
        select(QuoteRequest)
        .where(QuoteRequest.organization_id == context.organization_id)
        .options(selectinload(QuoteRequest.items))
        .order_by(QuoteRequest.created_at.desc(), QuoteRequest.id),
        page,
    )
    return Page(
        items=[
            QuoteOut(id=x.id, status=x.status, comment=x.comment, item_count=len(x.items))
            for x in items
        ],
        page=page.page,
        page_size=page.page_size,
        total=total,
    )


@quotes_router.post("", response_model=QuoteOut, status_code=201)
async def create_quote(
    body: QuoteIn,
    request: Request,
    _: None = Depends(rate_limit(RateLimitPolicy.QUOTE_CREATE)),
    context: AuthContext = Depends(require_permission("quote.create")),
    session: AsyncSession = Depends(get_session),
):
    quote = QuoteRequest(
        organization_id=context.organization_id,
        created_by_id=context.user.id,
        status="submitted",
        comment=body.comment,
    )
    session.add(quote)
    await session.flush()
    session.add_all(
        [QuoteRequestItem(quote_request_id=quote.id, **item.model_dump()) for item in body.items]
    )
    await record_audit(
        session,
        request,
        "quote.create",
        context.user.id,
        context.organization_id,
        "quote",
        str(quote.id),
    )
    await session.commit()
    return QuoteOut(
        id=quote.id, status=quote.status, comment=quote.comment, item_count=len(body.items)
    )


class TicketIn(APIRequest):
    category_id: uuid.UUID
    subject: str = Field(min_length=1, max_length=300)
    message: str = Field(min_length=1, max_length=10000)


class TicketOut(BaseModel):
    id: uuid.UUID
    subject: str
    category: str
    status: str


class TicketCategoryOut(BaseModel):
    id: uuid.UUID
    code: str
    label: str

    model_config = {"from_attributes": True}


@support_router.get("/categories", response_model=Page[TicketCategoryOut])
async def ticket_categories(
    page: PageParams = Depends(),
    _: AuthContext = Depends(require_permission("ticket.create")),
    session: AsyncSession = Depends(get_session),
):
    items, total = await paginate(
        session, select(TicketCategory).order_by(TicketCategory.code, TicketCategory.id), page
    )
    return Page(items=items, page=page.page, page_size=page.page_size, total=total)


@support_router.get("/tickets", response_model=Page[TicketOut])
async def list_tickets(
    page: PageParams = Depends(),
    context: AuthContext = Depends(require_permission("ticket.read")),
    session: AsyncSession = Depends(get_session),
):
    items, total = await paginate(
        session,
        select(Ticket)
        .where(Ticket.organization_id == context.organization_id)
        .options(selectinload(Ticket.category), selectinload(Ticket.status))
        .order_by(Ticket.created_at.desc(), Ticket.id),
        page,
    )
    return Page(
        items=[
            TicketOut(id=x.id, subject=x.subject, category=x.category.code, status=x.status.code)
            for x in items
        ],
        page=page.page,
        page_size=page.page_size,
        total=total,
    )


@support_router.post("/tickets", response_model=TicketOut, status_code=201)
async def create_ticket(
    body: TicketIn,
    request: Request,
    context: AuthContext = Depends(require_permission("ticket.create")),
    session: AsyncSession = Depends(get_session),
):
    category = await session.get(TicketCategory, body.category_id)
    status = await session.scalar(select(TicketStatus).where(TicketStatus.code == "new"))
    if not category or not status:
        raise AppError(
            "ticket_configuration_missing", "Ticket category or initial status missing", 422
        )
    ticket = Ticket(
        organization_id=context.organization_id,
        created_by_id=context.user.id,
        category_id=category.id,
        status_id=status.id,
        subject=body.subject,
    )
    session.add(ticket)
    await session.flush()
    session.add(
        TicketMessage(ticket_id=ticket.id, author_user_id=context.user.id, body=body.message)
    )
    await record_audit(
        session,
        request,
        "ticket.create",
        context.user.id,
        context.organization_id,
        "ticket",
        str(ticket.id),
    )
    await session.commit()
    return TicketOut(
        id=ticket.id, subject=ticket.subject, category=category.code, status=status.code
    )
