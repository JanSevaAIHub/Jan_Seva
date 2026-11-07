"""Role administration must affect only the explicitly selected profile."""

from uuid import uuid4

import pytest

from app.config import ConfigurationError
from app.models import Role
from app.scripts.toggle_role import toggle_role


def test_role_toggle_selects_one_profile_and_preserves_names(db_session, profiles):
    citizen = profiles["citizen"]
    original_name = citizen.name
    assert toggle_role(db_session, citizen.user_id) == Role.OFFICER
    db_session.commit()
    assert citizen.name == original_name
    assert profiles["other_citizen"].role == Role.CITIZEN
    assert profiles["officer"].role == Role.OFFICER
    assert toggle_role(db_session, citizen.user_id) == Role.CITIZEN
    db_session.commit()
    assert toggle_role(db_session, citizen.user_id, Role.CITIZEN) == Role.CITIZEN


def test_unknown_profile_cannot_fall_back_to_another_user(db_session, profiles):
    with pytest.raises(ConfigurationError, match="does not exist"):
        toggle_role(db_session, uuid4(), Role.OFFICER)
    db_session.rollback()
    assert profiles["citizen"].role == Role.CITIZEN


def test_invalid_role_does_not_change_selected_profile(db_session, profiles):
    citizen = profiles["citizen"]
    with pytest.raises(ValueError):
        toggle_role(db_session, citizen.user_id, "admin")
    assert citizen.role == Role.CITIZEN
