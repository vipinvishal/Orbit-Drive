DOCUMENT_PREFIXES = ("application/pdf", "application/msword", "application/vnd", "text/")


def categorize(mime_type: str | None) -> str:
    """Single source of truth for the four buckets shown in both the
    sidebar storage breakdown and the search "type" filter — keeping this
    in one place means the two can never disagree on what counts as a
    "document"."""
    if not mime_type:
        return "other"
    if mime_type.startswith("image/"):
        return "image"
    if mime_type.startswith("video/"):
        return "video"
    if mime_type.startswith(DOCUMENT_PREFIXES):
        return "document"
    return "other"
