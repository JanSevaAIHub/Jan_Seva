"""Five core models. Supabase owns auth.users; the application never creates it."""

from datetime import datetime
from enum import StrEnum
import math
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime, Enum, ForeignKey,
    ForeignKeyConstraint, Integer, JSON, String, Table, Text, Uuid, func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.config import ConfigurationError, get_settings
from app.db import Base


class Role(StrEnum):
    CITIZEN = "citizen"
    OFFICER = "officer"


class ComplaintCategory(StrEnum):
    ROAD = "road"
    WATER = "water"
    SANITATION = "sanitation"
    STREETLIGHT = "streetlight"
    OTHER = "other"


class InternalStatus(StrEnum):
    DRAFT = "DRAFT"
    LOCAL_SUBMITTED = "LOCAL_SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"
    REOPENED = "REOPENED"


def enum_type(enum: type[StrEnum], name: str) -> Enum:
    return Enum(enum, name=name, native_enum=False, create_constraint=True,
                values_callable=lambda members: [member.value for member in members])


json_type = JSON(none_as_null=True).with_variant(JSONB(none_as_null=True), "postgresql")

# Metadata reference only, excluded from CORE_TABLES and all application DDL.
Table("users", Base.metadata, Column("id", Uuid, primary_key=True), schema="auth",
      info={"externally_managed": True})


class Profile(Base):
    __tablename__ = "profiles"
    __table_args__ = (
        ForeignKeyConstraint(["user_id"], ["auth.users.id"], name="profiles_auth_user_fk", ondelete="RESTRICT").ddl_if(dialect="postgresql"),
        CheckConstraint("length(trim(name)) > 0", name="profiles_name_nonempty"),
    )

    user_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)  # supplied by verified provider
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[Role] = mapped_column(enum_type(Role, "profiles_role"), default=Role.CITIZEN, server_default="citizen")
    state: Mapped[str | None] = mapped_column(String(100))
    occupation: Mapped[str | None] = mapped_column(String(100))
    complaints: Mapped[list["Complaint"]] = relationship(back_populates="owner", foreign_keys="Complaint.user_id")
    assigned_complaints: Mapped[list["Complaint"]] = relationship(back_populates="assigned_officer", foreign_keys="Complaint.assigned_officer_id")


class Scheme(Base):
    __tablename__ = "schemes"
    __table_args__ = (CheckConstraint("length(trim(title)) > 0", name="schemes_title_nonempty"),)

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String(250))
    category: Mapped[str] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    source_url: Mapped[str] = mapped_column(Text)
    rules_json: Mapped[dict] = mapped_column(json_type, default=dict, server_default="{}")
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    chunks: Mapped[list["SchemeChunk"]] = relationship(back_populates="scheme", passive_deletes=True)


class SchemeChunk(Base):
    __tablename__ = "scheme_chunks"
    __table_args__ = (
        CheckConstraint("embedding_dimensions IS NULL OR embedding_dimensions > 0", name="scheme_chunks_positive_dimensions"),
        CheckConstraint(
            "(embedding IS NULL AND embedding_model IS NULL AND embedding_dimensions IS NULL) OR "
            "(embedding IS NOT NULL AND embedding_model IS NOT NULL AND embedding_dimensions IS NOT NULL)",
            name="scheme_chunks_embedding_metadata",
        ),
        CheckConstraint(
            "embedding IS NULL OR (jsonb_typeof(embedding) = 'array' AND "
            "jsonb_array_length(embedding) = embedding_dimensions)",
            name="scheme_chunks_embedding_shape",
        ).ddl_if(dialect="postgresql"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    scheme_id: Mapped[UUID] = mapped_column(ForeignKey("schemes.id", ondelete="CASCADE"), index=True)
    chunk_text: Mapped[str] = mapped_column(Text)
    source_url: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float] | None] = mapped_column(json_type)
    embedding_model: Mapped[str | None] = mapped_column(String(200))
    embedding_dimensions: Mapped[int | None] = mapped_column(Integer)
    scheme: Mapped[Scheme] = relationship(back_populates="chunks")

    @validates("embedding")
    def validate_embedding(self, key: str, value: list[float] | None) -> list[float] | None:
        del key
        if value is None:
            self.embedding_model = self.embedding_dimensions = None
            return None
        settings = get_settings()
        if not settings.embedding_model or settings.embedding_dimensions is None:
            raise ConfigurationError("Set EMBEDDING_MODEL and EMBEDDING_DIMENSIONS before storing embeddings.")
        if (not isinstance(value, list) or len(value) != settings.embedding_dimensions
            or any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in value)):
            raise ValueError("Embedding must contain the configured number of finite numeric values.")
        self.embedding_model = settings.embedding_model
        self.embedding_dimensions = settings.embedding_dimensions
        return value


class Complaint(Base):
    __tablename__ = "complaints"
    __table_args__ = (CheckConstraint("length(trim(title)) > 0", name="complaints_title_nonempty"),)

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.user_id", ondelete="RESTRICT"), index=True)
    title: Mapped[str] = mapped_column(String(250))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[ComplaintCategory] = mapped_column(enum_type(ComplaintCategory, "complaints_category"))
    locality: Mapped[str] = mapped_column(String(250))
    status: Mapped[InternalStatus] = mapped_column(enum_type(InternalStatus, "complaints_status"), default=InternalStatus.LOCAL_SUBMITTED, server_default="LOCAL_SUBMITTED", index=True)
    assigned_officer_id: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.user_id", ondelete="SET NULL"), index=True)
    official_ref: Mapped[str | None] = mapped_column(String(250))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    seed_key: Mapped[str | None] = mapped_column(String(100), unique=True)
    owner: Mapped[Profile] = relationship(back_populates="complaints", foreign_keys=[user_id])
    assigned_officer: Mapped[Profile | None] = relationship(back_populates="assigned_complaints", foreign_keys=[assigned_officer_id])
    events: Mapped[list["ComplaintEvent"]] = relationship(back_populates="complaint", order_by="ComplaintEvent.event_time", passive_deletes=True)

    @property
    def official_status(self) -> str:
        return "USER_REPORTED_FILED" if self.official_ref else "NOT_FILED"


class ComplaintEvent(Base):
    __tablename__ = "complaint_events"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    complaint_id: Mapped[UUID] = mapped_column(ForeignKey("complaints.id", ondelete="RESTRICT"), index=True)
    actor_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.user_id", ondelete="RESTRICT"))
    old_status: Mapped[InternalStatus | None] = mapped_column(enum_type(InternalStatus, "complaint_events_old_status"))
    new_status: Mapped[InternalStatus] = mapped_column(enum_type(InternalStatus, "complaint_events_new_status"))
    note: Mapped[str] = mapped_column(Text, default="", server_default="")
    event_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    complaint: Mapped[Complaint] = relationship(back_populates="events")
    actor: Mapped[Profile] = relationship()


CORE_TABLES = [Profile.__table__, Scheme.__table__, SchemeChunk.__table__, Complaint.__table__, ComplaintEvent.__table__]
