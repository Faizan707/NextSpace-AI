"""Shared SlowAPI limiter — IP based."""

from slowapi import Limiter
from slowapi.util import get_remote_address

# One limiter for the whole app. Limits = "count / period" e.g. "10/minute".
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])
