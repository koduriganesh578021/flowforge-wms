from app.schemas.validation_errors import AllocationBlockResponse


class OrderBlockedError(Exception):
    """A user-actionable block that routers serialize as a structured 422 response."""

    def __init__(self, response: AllocationBlockResponse) -> None:
        self.response = response
        super().__init__(response.reasons[0].message)
