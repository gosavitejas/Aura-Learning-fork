from fastapi import APIRouter, Request, HTTPException, Depends
from svix.webhooks import Webhook, WebhookVerificationError
import os
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from app.db.postgres_client import get_db, User

load_dotenv()

router = APIRouter()

@router.post("/clerk")
async def clerk_webhook(request: Request, db: Session = Depends(get_db)):
    # 1. Get the secret from your .env file
    secret = os.getenv("CLERK_WEBHOOK_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="Missing Webhook Secret")

    # 2. Get the raw payload and headers
    payload = await request.body()
    headers = request.headers

    # 3. Extract the Svix security headers
    svix_id = headers.get("svix-id")
    svix_timestamp = headers.get("svix-timestamp")
    svix_signature = headers.get("svix-signature")

    if not svix_id or not svix_timestamp or not svix_signature:
        raise HTTPException(status_code=400, detail="Missing Svix headers")

    # 4. Verify the webhook securely
    webhook = Webhook(secret)
    try:
        event = webhook.verify(payload, headers)
    except WebhookVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # 5. Process the "User Created" Event
    event_type = event.get("type")
    
    print(f"🔔 Received Webhook from Clerk: {event_type}")
    
    if event_type == "user.created":
        data = event.get("data", {})
        
        user_id = data.get("id")
        email = data.get("email_addresses", [{}])[0].get("email_address", "no-email")
        first_name = data.get("first_name") or ""
        last_name = data.get("last_name") or ""
        name = f"{first_name} {last_name}".strip() or "Aura Student"

        # Check if the EMAIL already exists (handling the 'deleted in Clerk, kept in DB' edge case)
        existing_user = db.query(User).filter(User.email == email).first()
        
        if existing_user:
            # The email exists! Just update their old Postgres ID to match their new Clerk ID
            existing_user.id = user_id
            db.commit()
            print(f"🔄 SUCCESS: Re-linked existing user {name} to new Clerk ID.")
        else:
            # This is a brand new user. Insert them safely.
            new_user = User(id=user_id, name=name, email=email, role="student")
            db.add(new_user)
            db.commit()
            print(f"✅ SUCCESS: Synced new user to PostgreSQL -> {name} ({email})")

    return {"status": "success"}