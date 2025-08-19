import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.db import database
from backend.routes.companies import (CompanyBatchOutput,
                                      fetch_companies_with_liked)

router = APIRouter(
    prefix="/collections",
    tags=["collections"],
)

def get_liked_collection_id(db: Session) -> uuid.UUID:
    """Get the ID of the 'Liked Companies List' collection"""
    liked_collection = (
        db.query(database.CompanyCollection)
        .filter(database.CompanyCollection.collection_name == "Liked Companies List")
        .first()
    )
    
    if not liked_collection:
        raise HTTPException(status_code=404, detail="Liked Companies List not found")
    
    return liked_collection.id


@router.get("/liked-id")
def get_liked_collection_id_endpoint(db: Session = Depends(database.get_db)):
    """Endpoint to get the liked collection ID for frontend comparison"""
    liked_collection_id = get_liked_collection_id(db)
    print(liked_collection_id)
    return {"id": str(liked_collection_id)}


class CompanyCollectionMetadata(BaseModel):
    id: uuid.UUID
    collection_name: str


class CompanyCollectionOutput(CompanyBatchOutput, CompanyCollectionMetadata):
    pass


@router.get("", response_model=list[CompanyCollectionMetadata])
def get_all_collection_metadata(
    db: Session = Depends(database.get_db),
):
    collections = db.query(database.CompanyCollection).all()

    return [
        CompanyCollectionMetadata(
            id=collection.id,
            collection_name=collection.collection_name,
        )
        for collection in collections
    ]


@router.get("/{collection_id}", response_model=CompanyCollectionOutput)
def get_company_collection_by_id(
    collection_id: uuid.UUID,
    offset: int = Query(
        0, description="The number of items to skip from the beginning"
    ),
    limit: int = Query(10, description="The number of items to fetch"),
    db: Session = Depends(database.get_db),
):
    query = (
        db.query(database.CompanyCollectionAssociation, database.Company)
        .join(database.Company)
        .filter(database.CompanyCollectionAssociation.collection_id == collection_id)
    )

    total_count = query.with_entities(func.count()).scalar()

    results = query.offset(offset).limit(limit).all()
    companies = fetch_companies_with_liked(db, [company.id for _, company in results])

    return CompanyCollectionOutput(
        id=collection_id,
        collection_name=db.query(database.CompanyCollection)
        .get(collection_id)
        .collection_name,
        companies=companies,
        total=total_count,
    )


class AddCompaniesRequest(BaseModel):
    company_ids: List[int]


@router.post("/add-liked")
def add_companies_to_liked_collection(
    request: AddCompaniesRequest,
    db: Session = Depends(database.get_db),
):
    liked_collection_id = get_liked_collection_id(db)
    
    # Create associations for all requested companies
    new_associations = []
    for company_id in request.company_ids:
        new_associations.append(
            database.CompanyCollectionAssociation(
                company_id=company_id,
                collection_id=liked_collection_id
            )
        )
    
    # Add to database (SQLAlchemy will handle duplicates with the unique constraint)
    db.bulk_save_objects(new_associations)
    db.commit()
    
    return {"message": f"Added {len(request.company_ids)} companies to liked collection"}


@router.post("/remove-liked")
def remove_companies_from_liked_collection(
    request: AddCompaniesRequest,
    db: Session = Depends(database.get_db),
):
    liked_collection_id = get_liked_collection_id(db)
    
    # Remove associations for all requested companies
    deleted_count = (
        db.query(database.CompanyCollectionAssociation)
        .filter(
            database.CompanyCollectionAssociation.collection_id == liked_collection_id,
            database.CompanyCollectionAssociation.company_id.in_(request.company_ids)
        )
        .delete(synchronize_session=False)
    )
    
    db.commit()
    
    return {"message": f"Removed {deleted_count} companies from liked collection"}
