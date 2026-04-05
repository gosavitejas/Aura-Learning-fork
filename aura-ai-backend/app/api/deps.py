import os
from fastapi import Depends, HTTPException, status
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.postgres_client import get_db, User
from dotenv import load_dotenv

load_dotenv()

# 1. Setup Clerk Security Guard
jwks_url = os.getenv("CLERK_JWKS_URL")
if not jwks_url:
    raise ValueError("Missing CLERK_JWKS_URL in .env file")

clerk_config = ClerkConfig(jwks_url=jwks_url)
clerk_auth_guard = ClerkHTTPBearer(config=clerk_config)

# 2. The Identity Bouncer (Who are you?)
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(clerk_auth_guard), 
    db: Session = Depends(get_db)
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    # Extract the user ID directly from the decoded JWT payload
    user_id = credentials.decoded.get("sub")
    
    # Check if this user actually exists in our PostgreSQL database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in database")
        
    return user

# 3. The Instructor Bouncer (Can you build courses?)
def require_instructor(current_user: User = Depends(get_current_user)):
    # Since we default everyone to "student" in the webhook, this blocks them!
    if current_user.role not in ["instructor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Instructor privileges required to access this resource."
        )
    return current_user

# 🚀 NEW: 4. The Admin Bouncer (God Mode)
def require_admin(current_user: User = Depends(get_current_user)):
    # Strictly isolates platform administration to Admins ONLY
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="God Mode required. Admin privileges only."
        )
    return current_user