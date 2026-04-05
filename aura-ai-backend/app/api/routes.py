import os
import uuid
import shutil
import razorpay 
import hmac # IMPORT for cryptographic verification
import hashlib 
from sqlalchemy.dialects.postgresql import insert
from app.db.postgres_client import LessonProgress, QuizAttempt
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session, selectinload, aliased
from sqlalchemy import func, exists

from app.db.minio_client import minio_client
from app.db.redis_client import ingestion_queue
from app.rag.query import tutor_pipeline, sales_pipeline, generate_quiz_pipeline 
from app.rag.ingest import ingest_course_pdf

from app.db.postgres_client import get_db, User, Course, Enrollment, Module, Lesson, InstructorApplication, Order, LessonProgress, QuizAttempt, Note, Comment, CommentLike
from app.api.deps import get_current_user, require_instructor, require_admin

router = APIRouter()

# --- Initialize Razorpay Client ---
# Fetches keys securely from your .env file
razorpay_client = razorpay.Client(
    auth=(os.getenv("RAZORPAY_KEY_ID", ""), os.getenv("RAZORPAY_KEY_SECRET", ""))
)

# --- 1. COURSE IDENTITY (The Spark) ---

@router.post("/courses")
async def create_course(
    id: str = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form("General"),
    price: int = Form(0),
    thumbnail: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    thumbnail_url = None

    if thumbnail:
        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        file_extension = os.path.splitext(thumbnail.filename)[1]
        local_file_path = os.path.join(temp_dir, f"thumb_{uuid.uuid4()}{file_extension}")

        with open(local_file_path, "wb") as buffer:
            shutil.copyfileobj(thumbnail.file, buffer)

        bucket_name = "course-thumbnails"
        object_name = f"{id}/{thumbnail.filename}"
        
        try:
            minio_client.fput_object(bucket_name, object_name, local_file_path)
            thumbnail_url = f"http://localhost:9000/{bucket_name}/{object_name}"
        except Exception as e:
            if os.path.exists(local_file_path): os.remove(local_file_path)
            raise HTTPException(status_code=500, detail=f"MinIO Image Upload Error: {str(e)}")
        finally:
            if os.path.exists(local_file_path): os.remove(local_file_path)

    db_course = Course(
        id=id, 
        title=title, 
        description=description, 
        category=category,
        price=price,
        thumbnail_url=thumbnail_url,
        instructor_id=current_user.id
    )
    db.add(db_course)
    
    try:
        db.commit()
        db.refresh(db_course)
        return {"status": "success", "course": db_course}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Course already exists or database error.")

# --- 2. CURRICULUM BUILDER (The Studio) ---

class ModuleCreate(BaseModel):
    title: str
    order_index: int = 0

@router.post("/courses/{course_id}/modules")
async def create_module(
    course_id: str,
    module_in: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    course = db.query(Course).filter(Course.id == course_id, Course.instructor_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=403, detail="Not authorized to edit this course.")

    new_module = Module(course_id=course_id, title=module_in.title, order_index=module_in.order_index)
    db.add(new_module)
    db.commit()
    db.refresh(new_module)
    return {"status": "success", "module": new_module}

class LessonCreate(BaseModel):
    title: str
    video_url: str
    duration: str = "0:00"
    order_index: int = 0

@router.post("/modules/{module_id}/lessons")
async def create_lesson(
    module_id: int,
    lesson_in: LessonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found.")
    
    course = db.query(Course).filter(Course.id == module.course_id, Course.instructor_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=403, detail="Not authorized to edit this module.")

    new_lesson = Lesson(
        module_id=module_id, 
        title=lesson_in.title, 
        video_url=lesson_in.video_url, 
        duration=lesson_in.duration,
        order_index=lesson_in.order_index
    )
    db.add(new_lesson)
    db.commit()
    db.refresh(new_lesson)
    return {"status": "success", "lesson": new_lesson}

@router.put("/courses/{course_id}/publish")
async def publish_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    course = db.query(Course).filter(Course.id == course_id, Course.instructor_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=403, detail="Not authorized.")
    
    course.status = "Published"
    db.commit()
    return {"status": "success", "message": "Course is now live in the catalog!"}



# ═════════════════════════════════════════════════════════
# 🛡️ SPRINT 5: COURSE MODERATION ENGINE
# ═════════════════════════════════════════════════════════

@router.put("/dashboard/instructor/courses/{course_id}/status")
async def toggle_course_status(
    course_id: str,
    new_status: str = Body(..., embed=True), # Expected: "Published" or "Archived"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    SOFT DELETE / UNPUBLISH: 
    Changes the course status. If 'Archived', it vanishes from the public catalog, 
    but existing enrolled students retain full access.
    """
    course = db.query(Course).filter(
        Course.id == course_id, 
        Course.instructor_id == current_user.id
    ).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized.")

    # 🚀 Admin Kill Switch Defense
    if course.status == "Banned":
        raise HTTPException(status_code=403, detail="This course has been suspended by an Admin and cannot be modified.")

    course.status = new_status
    db.commit()
    
    return {"status": "success", "course_id": course.id, "new_status": course.status}


@router.delete("/dashboard/instructor/courses/{course_id}")
async def hard_delete_course(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    HARD DELETE: 
    Permanently destroys the course, its modules, and lessons. 
    Protected by a strict Zero-Enrollment Safety Lock.
    """
    course = db.query(Course).filter(
        Course.id == course_id, 
        Course.instructor_id == current_user.id
    ).first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized.")

    # 🚀 The Safety Lock: Count active paying students
    student_count = db.query(Enrollment).filter(Enrollment.course_id == course_id).count()
    
    if student_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Safety Lock Triggered: Cannot delete a course with {student_count} active students. Please 'Unpublish' it instead."
        )

    # Because of 'cascade="all, delete-orphan"' in models.py, 
    # this will automatically wipe all child modules and lessons!
    db.delete(course)
    db.commit()
    
    return {"status": "success", "message": "Course permanently destroyed."}

# --- 3. AURA AI TRAINING (The Brain) ---

@router.post("/upload-course")
async def upload_course(
    course_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor)
):
    course = db.query(Course).filter(Course.id == course_id, Course.instructor_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=403, detail="Course not found or you do not own it.")

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_extension = os.path.splitext(file.filename)[1]
    local_file_path = os.path.join(temp_dir, f"{uuid.uuid4()}{file_extension}")

    with open(local_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    bucket_name = "course-pdfs"
    object_name = f"{course_id}/{file.filename}"
    
    try:
        minio_client.fput_object(bucket_name, object_name, local_file_path)
        minio_url = f"http://localhost:9000/{bucket_name}/{object_name}"
    except Exception as e:
        if os.path.exists(local_file_path): os.remove(local_file_path)
        raise HTTPException(status_code=500, detail=f"MinIO Storage Error: {str(e)}")

    ingestion_queue.enqueue(
        ingest_course_pdf, 
        file_path=local_file_path, 
        course_id=course_id, 
        minio_url=minio_url
    )

    return {
        "status": "success",
        "message": f"File uploaded securely by {current_user.name}. Aura is indexing.",
        "course_id": course_id
    }

@router.get("/chat/contexts")
async def get_chat_contexts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    enrolled_courses = db.query(Course).join(Enrollment).filter(Enrollment.student_id == current_user.id).all()
    created_courses = db.query(Course).filter(Course.instructor_id == current_user.id).all()

    all_courses = {c.id: c.title for c in (enrolled_courses + created_courses)}
    contexts = [{"id": cid, "title": title} for cid, title in all_courses.items()]
    return {"status": "success", "contexts": contexts}


# --- 4. STUDENT ACTIONS (Any logged-in user) ---

@router.get("/courses")
async def get_all_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch all courses
    courses = db.query(Course).all()
    
    # 2. 🚀 THE FAST-PASS FIX: Fetch user's owned course IDs in ONE query
    enrolled_course_ids = set()
    if current_user:
        # Get just the course_ids from the Enrollment table for this user
        enrollments = db.query(Enrollment.course_id).filter(Enrollment.student_id == current_user.id).all()
        # Unpack the tuples into a highly efficient lookup set
        enrolled_course_ids = {e[0] for e in enrollments}

    # 3. Map the data and inject the dynamic ownership flag
    courses_data = []
    for c in courses:
        courses_data.append({
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "category": c.category,
            "price": c.price,
            "thumbnail_url": c.thumbnail_url,
            "instructor_id": c.instructor_id,
            "status": c.status,
            # If the user is the creator OR is enrolled, they own it!
            "is_enrolled": (c.id in enrolled_course_ids) or (current_user and current_user.id == c.instructor_id)
        })

    return {"status": "success", "courses": courses_data}
@router.get("/courses/{course_id}")
async def get_course_details(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    course_data = {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "category": course.category,
        "price": course.price,
        "thumbnail_url": course.thumbnail_url,
        "instructor_id": course.instructor_id,
        "status": course.status,
        "modules": []
    }

    modules = db.query(Module).filter(Module.course_id == course_id).order_by(Module.order_index).all()
    for mod in modules:
        lessons = db.query(Lesson).filter(Lesson.module_id == mod.id).order_by(Lesson.order_index).all()
        mod_data = {
            "id": mod.id,
            "title": mod.title,
            "order_index": mod.order_index,
            "lessons": [{"id": l.id, "title": l.title, "video_url": l.video_url, "duration": l.duration} for l in lessons]
        }
        course_data["modules"].append(mod_data)

    return {"status": "success", "course": course_data}

class EnrollmentCreate(BaseModel):
    course_id: str

@router.post("/enroll")
async def enroll_student(
    enrollment: EnrollmentCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == enrollment.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # 🔒 SECURITY: Prevent free enrollment in paid courses — must go through payment flow
    if course.price and course.price > 0:
        raise HTTPException(
            status_code=402, 
            detail="This is a paid course. Please complete the payment process to enroll."
        )

    db_enrollment = Enrollment(student_id=current_user.id, course_id=enrollment.course_id)
    db.add(db_enrollment)
    try:
        db.commit()
        db.refresh(db_enrollment)
        return {"status": f"Enrollment successful for {current_user.name}. Aura AI Tutor unlocked!"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="You are already enrolled in this course.")

@router.post("/courses/{course_id}/generate-quiz")
async def generate_ai_quiz(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    is_authorized = False
    
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id, 
        Enrollment.course_id == course_id
    ).first()
    
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.instructor_id == current_user.id
    ).first()
    
    if enrollment or course:
        is_authorized = True

    if not is_authorized:
        raise HTTPException(status_code=403, detail="You must be enrolled to access AI Quiz Generation.")

    try:
        quiz_data = generate_quiz_pipeline(course_id=course_id)
        return {"status": "success", "data": quiz_data}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Quiz Generation Failed: {str(e)}")

class QueryRequest(BaseModel):
    query: str
    current_course_id: Optional[str] = None

@router.post("/ask-aura")
async def ask_aura(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    is_authorized = False

    if request.current_course_id:
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == current_user.id, 
            Enrollment.course_id == request.current_course_id
        ).first()
        
        course = db.query(Course).filter(
            Course.id == request.current_course_id,
            Course.instructor_id == current_user.id
        ).first()
        
        if enrollment or course:
            is_authorized = True

    if is_authorized:
        try:
            result = tutor_pipeline(query=request.query, course_id=request.current_course_id)
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI Engine Error: {str(e)}")
    else:
        try:
            result = sales_pipeline(query=request.query)
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Advisor Engine Error: {str(e)}")

class OrderCreateRequest(BaseModel):
    course_id: str

@router.post("/payments/create-order")
async def create_razorpay_order(
    request: OrderCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mitigation 1: The 'Price Spoofer'
    We NEVER trust the frontend's price. We look it up in the database.
    """
    course = db.query(Course).filter(Course.id == request.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check if they are already enrolled
    existing_enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.course_id == course.id
    ).first()
    
    if existing_enrollment:
        raise HTTPException(status_code=400, detail="You are already enrolled in this course.")

    # Convert Rupee to Paise (Razorpay requirement)
    amount_in_paise = int(course.price * 100)

    # 1. Ask Razorpay for a secure Order ID
    try:
        razorpay_order = razorpay_client.order.create({
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": f"receipt_{uuid.uuid4().hex[:10]}",
            "notes": {
                "course_id": course.id,
                "student_id": current_user.id
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to communicate with payment gateway: {str(e)}")

    # 2. Save the pending order in our database
    db_order = Order(
        student_id=current_user.id,
        course_id=course.id,
        amount=amount_in_paise,
        razorpay_order_id=razorpay_order["id"],
        status="created"
    )
    db.add(db_order)
    db.commit()

    # 3. Send the secure Order ID and public key back to the frontend
    return {
        "status": "success",
        "order_id": razorpay_order["id"],
        "amount": amount_in_paise,
        "currency": "INR",
        "key_id": os.getenv("RAZORPAY_KEY_ID") # Frontend needs this public key to open the modal
    }


class PaymentVerificationRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str

@router.post("/payments/verify")
async def verify_razorpay_payment(
    request: PaymentVerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mitigation 4: The 'Fake VIP'
    Cryptographically verify the signature using our hidden Secret Key.
    """
    order = db.query(Order).filter(
        Order.razorpay_order_id == request.razorpay_order_id,
        Order.student_id == current_user.id
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Original order not found.")

    if order.status == "paid":
        return {"status": "success", "message": "Payment already verified."}

    # Verify the cryptographic signature
    try:
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': request.razorpay_order_id,
            'razorpay_payment_id': request.razorpay_payment_id,
            'razorpay_signature': request.razorpay_signature
        })
    except razorpay.errors.SignatureVerificationError:
        order.status = "failed"
        db.commit()
        raise HTTPException(status_code=400, detail="Payment verification failed. Invalid signature.")

    # 🚀 The Payment is Legit! 
    # 1. Update the Order
    order.status = "paid"
    order.razorpay_payment_id = request.razorpay_payment_id
    order.razorpay_signature = request.razorpay_signature

    # 2. Create the Enrollment (Grant Access)
    new_enrollment = Enrollment(
        student_id=current_user.id,
        course_id=order.course_id
    )
    db.add(new_enrollment)
    db.commit()

    return {"status": "success", "message": "Payment verified. You are now enrolled!"}

# --- IDENTITY SYNC ENGINE ---
@router.get("/users/me")
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """
    The Single Source of Truth for frontend routing.
    Bypasses Clerk metadata to return the true database role.
    """
    return {
        "status": "success", 
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role # student, instructor, or admin
        }
    }

# --- 5. GOD MODE & RBAC ---

class InstructorApplicationCreate(BaseModel):
    full_name: str
    expertise: str
    portfolio_url: Optional[str] = None
    motivation: str

@router.post("/teach/apply")
async def submit_instructor_application(
    application: InstructorApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allows a student to apply to become an instructor."""
    # Edge Case 2: Identity Crisis (Already an instructor/admin)
    if current_user.role in ["instructor", "admin"]:
        raise HTTPException(status_code=400, detail="You already have instructor privileges.")

    # Edge Case 1: The Impatient Spammer
    existing_app = db.query(InstructorApplication).filter(
        InstructorApplication.user_id == current_user.id,
        InstructorApplication.status == "pending"
    ).first()
    
    if existing_app:
        raise HTTPException(status_code=400, detail="You already have a pending application.")

    new_app = InstructorApplication(
        user_id=current_user.id,
        full_name=application.full_name,
        expertise=application.expertise,
        portfolio_url=application.portfolio_url,
        motivation=application.motivation,
        status="pending"
    )
    db.add(new_app)
    db.commit()
    return {"status": "success", "message": "Application submitted successfully! Our admins will review it shortly."}

@router.get("/teach/status")
async def get_application_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Checks if the user has a recently resolved application to show in the banner."""
    app = db.query(InstructorApplication).filter(
        InstructorApplication.user_id == current_user.id,
        InstructorApplication.status.in_(["approved", "rejected"])
    ).first()

    if not app:
        return {"status": "success", "application": None}

    return {
        "status": "success", 
        "application": {
            "id": app.id,
            "status": app.status
        }
    }

@router.put("/teach/dismiss/{app_id}")
async def dismiss_application_notification(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Archives the application so the banner never shows again (Zombie Banner Fix)."""
    app = db.query(InstructorApplication).filter(
        InstructorApplication.id == app_id,
        InstructorApplication.user_id == current_user.id
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    app.status = "archived"
    db.commit()
    
    return {"status": "success", "message": "Notification dismissed and archived."}


@router.get("/admin/applications")
async def get_instructor_applications(
    db: Session = Depends(get_db),
    # Edge Case 3: Privilege Escalation Attack - Only Admins can hit this!
    current_admin: User = Depends(require_admin)
):
    """God Mode: Fetch all pending instructor applications."""
    applications = db.query(InstructorApplication).filter(InstructorApplication.status == "pending").all()
    
    # Format for the frontend
    result = []
    for app in applications:
        # Fetch the associated user's email so the Admin can contact them if needed
        user = db.query(User).filter(User.id == app.user_id).first()
        if user:
            result.append({
                "id": app.id,
                "user_id": app.user_id,
                "email": user.email,
                "full_name": app.full_name,
                "expertise": app.expertise,
                "portfolio_url": app.portfolio_url,
                "motivation": app.motivation,
                "created_at": app.created_at
            })

    return {"status": "success", "applications": result}

class ApplicationStatusUpdate(BaseModel):
    status: str # "approved" or "rejected"

@router.put("/admin/applications/{app_id}/status")
async def update_application_status(
    app_id: int,
    update_data: ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """God Mode: Approve or reject an application and upgrade the user."""
    if update_data.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'approved' or 'rejected'.")

    app = db.query(InstructorApplication).filter(InstructorApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    # Edge Case 4: The Orphaned Application
    user = db.query(User).filter(User.id == app.user_id).first()
    if not user:
        app.status = "archived" # User deleted their account
        db.commit()
        raise HTTPException(status_code=404, detail="The user associated with this application no longer exists.")

    # Update the application status
    app.status = update_data.status

    # If approved, perform the magic Role Upgrade!
    if update_data.status == "approved":
        # 🚀 THE EDGE CASE CATCH: Prevent Admins from downgrading themselves 
        # if they approve their own test applications!
        if user.role != "admin":
            user.role = "instructor"

    db.commit()
    return {"status": "success", "message": f"Application {update_data.status}. User role updated."}

@router.get("/admin/metrics")
async def get_admin_metrics(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin)
):
    """God Mode: Fetch platform-wide statistics securely and efficiently."""
    # Native SQL Aggregation: Insanely fast, consumes zero Python memory
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_instructors = db.query(func.count(User.id)).filter(User.role == "instructor").scalar() or 0
    active_courses = db.query(func.count(Course.id)).filter(Course.status == "Published").scalar() or 0
    pending_apps = db.query(func.count(InstructorApplication.id)).filter(InstructorApplication.status == "pending").scalar() or 0

    return {
        "status": "success",
        "metrics": {
            "total_users": total_users,
            "total_instructors": total_instructors,
            "active_courses": active_courses,
            "pending_applications": pending_apps
        }
    }

# ═════════════════════════════════════════════════════════
# 🚀 6. STUDENT TELEMETRY ENGINE (Sprint 2)
# ═════════════════════════════════════════════════════════

class TelemetryHeartbeat(BaseModel):
    course_id: str
    lesson_id: int
    watch_time_increment_seconds: int = 15 # Default ping interval

@router.post("/telemetry/heartbeat")
async def log_video_heartbeat(
    payload: TelemetryHeartbeat,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Safely upserts video watch time.
    Uses PostgreSQL ON CONFLICT to prevent duplicate rows during race conditions.
    """
    stmt = insert(LessonProgress).values(
        student_id=current_user.id,
        course_id=payload.course_id,
        lesson_id=payload.lesson_id,
        watch_time_seconds=payload.watch_time_increment_seconds
    )
    
    # The magical UPSERT lock
    stmt = stmt.on_conflict_do_update(
        constraint='uix_student_lesson',
        set_={
            'watch_time_seconds': LessonProgress.watch_time_seconds + payload.watch_time_increment_seconds,
            'last_accessed_at': func.now() # Auto-bump the timestamp
        }
    )
    
    db.execute(stmt)
    db.commit()
    return {"status": "success", "message": "Heartbeat logged."}

class QuizScorePayload(BaseModel):
    course_id: str
    score: int
    total_questions: int

@router.post("/telemetry/quiz")
async def log_quiz_score(
    payload: QuizScorePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Logs an AI Quiz attempt."""
    if payload.total_questions <= 0:
        raise HTTPException(status_code=400, detail="Invalid quiz format.")
        
    attempt = QuizAttempt(
        student_id=current_user.id,
        course_id=payload.course_id,
        score=payload.score,
        total_questions=payload.total_questions
    )
    db.add(attempt)
    db.commit()
    return {"status": "success", "message": "Quiz attempt recorded."}

@router.get("/dashboard/student/metrics")
async def get_student_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    The master aggregator for the Student Dashboard.
    Fetches total hours, average score, and the exact "Resume" coordinates.
    """
    # 1. Total Enrolled Courses
    active_courses = db.query(func.count(Enrollment.id)).filter(
        Enrollment.student_id == current_user.id
    ).scalar() or 0

    # 2. Total Hours Learned
    total_seconds = db.query(func.sum(LessonProgress.watch_time_seconds)).filter(
        LessonProgress.student_id == current_user.id
    ).scalar() or 0
    total_hours = round(total_seconds / 3600, 1)

    # 3. Lifetime Average Score (The High Watermark Aggregation)
    # Get all attempts
    attempts = db.query(QuizAttempt).filter(QuizAttempt.student_id == current_user.id).all()
    avg_score = 0
    if attempts:
        total_earned = sum(a.score for a in attempts)
        total_possible = sum(a.total_questions for a in attempts)
        if total_possible > 0:
            avg_score = round((total_earned / total_possible) * 100) # Convert to percentage

    # 4. "Pick Up Where You Left Off" logic
    resume_data = None
    last_progress = db.query(LessonProgress).filter(
        LessonProgress.student_id == current_user.id,
        LessonProgress.is_completed == False
    ).order_by(LessonProgress.last_accessed_at.desc()).first()

    if last_progress:
        # Fetch the contextual titles for the UI
        course = db.query(Course).filter(Course.id == last_progress.course_id).first()
        lesson = db.query(Lesson).filter(Lesson.id == last_progress.lesson_id).first()
        
        if course and lesson:
            resume_data = {
                "course_id": course.id,
                "course_title": course.title,
                "lesson_id": lesson.id,
                "lesson_title": lesson.title,
                "last_accessed_at": last_progress.last_accessed_at
            }

    return {
        "status": "success",
        "metrics": {
            "active_courses": active_courses,
            "total_hours": total_hours,
            "average_score": avg_score,
            "resume_target": resume_data
        }
    }

# ═════════════════════════════════════════════════════════
# 🚀 7. THE SOCIAL & STUDY ECOSYSTEM (Sprint 3)
# ═════════════════════════════════════════════════════════

class NoteCreate(BaseModel):
    content: str

@router.get("/courses/{course_id}/lessons/{lesson_id}/notes")
async def get_lesson_notes(
    course_id: str,
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches all notes for a specific user, tied to the exact video they are watching."""
    notes = db.query(Note).filter(
        Note.student_id == current_user.id,
        Note.course_id == course_id,
        Note.lesson_id == lesson_id
    ).order_by(Note.created_at.desc()).all() # Newest notes at the top!

    return {"status": "success", "notes": notes}

@router.post("/courses/{course_id}/lessons/{lesson_id}/notes")
async def create_lesson_note(
    course_id: str,
    lesson_id: int,
    payload: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Saves a new timestamped note for this specific lesson."""
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Note cannot be empty.")

    new_note = Note(
        student_id=current_user.id,
        course_id=course_id,
        lesson_id=lesson_id,
        content=payload.content
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    
    return {"status": "success", "note": new_note}

@router.delete("/notes/{note_id}")
async def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allows a user to securely delete their own note."""
    # The security check: Ensure the note belongs to the user requesting the delete
    note = db.query(Note).filter(Note.id == note_id, Note.student_id == current_user.id).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found or you don't have permission to delete it.")

    db.delete(note)
    db.commit()
    return {"status": "success", "message": "Note deleted successfully."}


# ═════════════════════════════════════════════════════════
# 🚀 8. THE DISCUSSION ENGINE (Sprint 3)
# ═════════════════════════════════════════════════════════

class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None
    target_username: Optional[str] = None

@router.get("/courses/{course_id}/lessons/{lesson_id}/comments")
async def get_lesson_comments(
    course_id: str,
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches all top-level comments and their replies.
    Uses 'selectinload' to prevent N+1 database meltdown.
    """
    # Fetch only top-level comments (parent_id is None)
    top_level_comments = db.query(Comment).filter(
        Comment.course_id == course_id,
        Comment.lesson_id == lesson_id,
        Comment.parent_id == None
    ).options(
        selectinload(Comment.user), # Load author
        selectinload(Comment.replies).selectinload(Comment.user) # Load replies and their authors
    ).order_by(Comment.created_at.desc()).all()

    # Format the data cleanly for the frontend to digest
    def format_comment(c):
        return {
            "id": c.id,
            "user_id": c.user_id,
            "author_name": c.user.name if c.user else "Unknown",
            "author_role": c.user.role if c.user else "student",
            "content": c.content if not c.is_deleted else "[This comment was removed by a moderator]",
            "is_deleted": c.is_deleted,
            "likes_count": c.likes_count,
            "target_username": c.target_username,
            "created_at": c.created_at,
            "replies": [format_comment(r) for r in c.replies] if hasattr(c, 'replies') else []
        }

    return {"status": "success", "comments": [format_comment(c) for c in top_level_comments]}

@router.post("/courses/{course_id}/lessons/{lesson_id}/comments")
async def post_comment(
    course_id: str,
    lesson_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Posts a new comment or a reply to an existing comment."""
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty.")

    new_comment = Comment(
        course_id=course_id,
        lesson_id=lesson_id,
        user_id=current_user.id,
        parent_id=payload.parent_id,
        target_username=payload.target_username,
        content=payload.content
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    return {"status": "success", "message": "Comment posted."}

@router.post("/comments/{comment_id}/like")
async def toggle_like_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Anti-Spam Like Toggle Engine"""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found.")

    existing_like = db.query(CommentLike).filter(
        CommentLike.comment_id == comment_id,
        CommentLike.user_id == current_user.id
    ).first()

    if existing_like:
        # Unlike
        db.delete(existing_like)
        comment.likes_count = max(0, comment.likes_count - 1)
        action = "unliked"
    else:
        # Like
        new_like = CommentLike(comment_id=comment_id, user_id=current_user.id)
        db.add(new_like)
        comment.likes_count += 1
        action = "liked"

    db.commit()
    return {"status": "success", "action": action, "likes_count": comment.likes_count}

@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    RBAC Secured Delete Engine with Smart Soft-Deletes.
    """
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found.")

    # Privilege Escalation Check: Only the author, an admin, or an instructor can delete
    if current_user.role == "student" and comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this comment.")

    # Smart Deletion Strategy
    replies_count = db.query(func.count(Comment.id)).filter(Comment.parent_id == comment.id).scalar()
    
    if replies_count > 0:
        # Soft delete to preserve the replies
        comment.is_deleted = True
        comment.content = "" # Wipe the content from the DB for safety
    else:
        # Hard delete
        db.delete(comment)
        
    db.commit()
    return {"status": "success", "message": "Comment deleted."}

@router.get("/courses/{course_id}/comments/social")
async def get_course_social_proof(
    course_id: str,
    db: Session = Depends(get_db)
):
    """
    Path A: The Social Proof Feed.
    Fetches the top 10 most liked top-level comments across the ENTIRE course.
    Notice there is no 'current_user' requirement here—this is public data for the sales page!
    """
    top_comments = db.query(Comment).filter(
        Comment.course_id == course_id,
        Comment.parent_id == None,
        Comment.is_deleted == False  # Don't show deleted comments on the sales page!
    ).options(
        selectinload(Comment.user)
    ).order_by(
        Comment.likes_count.desc(), 
        Comment.created_at.desc()
    ).limit(10).all()

    def format_social_comment(c):
        return {
            "id": c.id,
            "author_name": c.user.name if c.user else "Student",
            "author_role": c.user.role if c.user else "student",
            "content": c.content,
            "likes_count": c.likes_count,
            "created_at": c.created_at
        }

    return {"status": "success", "comments": [format_social_comment(c) for c in top_comments]}

@router.get("/dashboard/instructor/questions")
async def get_instructor_dashboard_questions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches the 'Instructor Inbox': The 15 most recent student questions 
    across ALL courses owned by this specific instructor, 
    EXCLUDING questions the instructor has already replied to.
    """
    # 1. Create an alias for the Comment table so we can join it against itself
    Reply = aliased(Comment)

    # 2. Build the "Ghost Buster" subquery: Does a reply from this instructor exist?
    has_instructor_reply = db.query(Reply.id).filter(
        Reply.parent_id == Comment.id,           # The reply belongs to this specific question
        Reply.user_id == current_user.id,        # The reply was written by the instructor
        Reply.is_deleted == False
    ).exists()

    # 3. Fetch the inbox, filtering out the answered questions
    recent_questions = db.query(Comment).join(Course, Comment.course_id == Course.id).filter(
        Course.instructor_id == current_user.id,
        Comment.parent_id == None,               # Only top-level questions
        Comment.is_deleted == False,
        ~has_instructor_reply                    # 🚀 THE FIX: The tilde (~) means NOT EXISTS
    ).options(
        selectinload(Comment.user),
        selectinload(Comment.course),
        selectinload(Comment.lesson)
    ).order_by(Comment.created_at.desc()).limit(15).all()

    def format_question(c):
        return {
            "id": c.id,
            "student_name": c.user.name if c.user else "Student",
            "course_id": c.course_id,
            "course_title": c.course.title if c.course else "Unknown Course",
            "lesson_id": c.lesson_id,
            "lesson_title": c.lesson.title if c.lesson else "Unknown Lesson",
            "content": c.content,
            "created_at": c.created_at
        }

    return {"status": "success", "questions": [format_question(c) for c in recent_questions]}