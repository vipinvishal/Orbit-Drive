import io

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.core.avatar_storage import delete_avatar, upload_avatar
from app.db.session import get_db
from app.models import User
from app.schemas import UserResponse, UserUpdateRequest

router = APIRouter(tags=["users"])

MAX_AVATAR_UPLOAD_BYTES = 8 * 1024 * 1024
AVATAR_SIZE = 256


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    if body.display_name is not None:
        trimmed = body.display_name.strip()
        current_user.display_name = trimmed or None
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserResponse)
async def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please upload an image file.")

    raw = await file.read()
    if len(raw) > MAX_AVATAR_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="That image is too large — please use one under 8MB."
        )

    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That doesn't look like a valid image.")

    # Respect EXIF rotation before stripping it, flatten to RGB (JPEG has no
    # alpha channel), center-crop + resize to a fixed square so every
    # avatar renders consistently regardless of the source image's shape.
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")
    img = ImageOps.fit(img, (AVATAR_SIZE, AVATAR_SIZE), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)

    current_user.avatar_url = await upload_avatar(str(current_user.id), buf.getvalue())
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.delete("/me/avatar", response_model=UserResponse)
async def delete_my_avatar(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    await delete_avatar(str(current_user.id))
    current_user.avatar_url = None
    await db.commit()
    await db.refresh(current_user)
    return current_user
