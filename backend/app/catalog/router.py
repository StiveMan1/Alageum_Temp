import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.catalog.models import (
    Category,
    Product,
    ProductAttributeDefinition,
    ProductAttributeValue,
)
from app.core.database import get_session
from app.core.errors import AppError
from app.core.pagination import Page, PageParams, paginate
from app.core.schemas import APIRequest

router = APIRouter(prefix="/catalog", tags=["Catalog"])


class CategoryOut(BaseModel):
    id: uuid.UUID
    parent_id: uuid.UUID | None
    slug: str
    translations: dict[str, Any]

    model_config = {"from_attributes": True}


class AttributeOut(BaseModel):
    code: str
    value: Any
    unit: str | None


class ProductOut(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    slug: str
    sku: str | None
    translations: dict[str, Any]
    attributes: list[AttributeOut]


def product_out(product: Product) -> ProductOut:
    values = []
    for item in product.attribute_values:
        value = item.value_text
        if item.value_number is not None:
            value = float(item.value_number)
        elif item.value_boolean is not None:
            value = item.value_boolean
        elif item.value_json is not None:
            value = item.value_json
        values.append(
            AttributeOut(code=item.definition.code, value=value, unit=item.definition.unit)
        )
    return ProductOut(
        id=product.id,
        category_id=product.category_id,
        slug=product.slug,
        sku=product.sku,
        translations=product.translations,
        attributes=values,
    )


def product_query():
    return select(Product).options(
        selectinload(Product.attribute_values).selectinload(ProductAttributeValue.definition)
    )


@router.get("/categories", response_model=Page[CategoryOut])
async def categories(page: PageParams = Depends(), session: AsyncSession = Depends(get_session)):
    items, total = await paginate(
        session,
        select(Category)
        .where(Category.is_published.is_(True))
        .order_by(Category.sort_order, Category.id),
        page,
    )
    return Page(items=items, page=page.page, page_size=page.page_size, total=total)


@router.get("/products", response_model=Page[ProductOut])
async def products(
    page: PageParams = Depends(),
    category_id: uuid.UUID | None = None,
    q: str | None = Query(default=None, max_length=200),
    session: AsyncSession = Depends(get_session),
):
    query = product_query().where(Product.status == "published")
    if category_id:
        query = query.where(Product.category_id == category_id)
    if q:
        query = query.where(Product.slug.ilike(f"%{q}%"))
    items, total = await paginate(session, query.order_by(Product.id), page)
    return Page(
        items=[product_out(item) for item in items],
        page=page.page,
        page_size=page.page_size,
        total=total,
    )


@router.get("/products/{product_id}", response_model=ProductOut)
async def product(product_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    item = await session.scalar(
        product_query().where(Product.id == product_id, Product.status == "published")
    )
    if not item:
        raise AppError("product_not_found", "Product not found", 404)
    return product_out(item)


class CompareRequest(APIRequest):
    product_ids: list[uuid.UUID]


@router.post("/compare", response_model=list[ProductOut])
async def compare(body: CompareRequest, session: AsyncSession = Depends(get_session)):
    ids = list(dict.fromkeys(body.product_ids))
    if not 2 <= len(ids) <= 5:
        raise AppError("invalid_comparison", "Select between 2 and 5 unique products", 422)
    products = (
        await session.scalars(
            product_query().where(
                Product.id.in_(ids), Product.status == "published", Product.comparable.is_(True)
            )
        )
    ).all()
    return [product_out(item) for item in products]


class FilterOut(BaseModel):
    code: str
    data_type: str
    unit: str | None
    translations: dict[str, Any]


@router.get("/filters", response_model=Page[FilterOut])
async def filters(
    category_id: uuid.UUID,
    page: PageParams = Depends(),
    session: AsyncSession = Depends(get_session),
):
    items, total = await paginate(
        session,
        select(ProductAttributeDefinition).where(
            ProductAttributeDefinition.category_id == category_id,
            ProductAttributeDefinition.is_filterable.is_(True),
        ).order_by(ProductAttributeDefinition.id),
        page,
    )
    return Page(
        items=[FilterOut.model_validate(item, from_attributes=True) for item in items],
        page=page.page,
        page_size=page.page_size,
        total=total,
    )
