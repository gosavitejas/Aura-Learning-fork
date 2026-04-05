import uuid
from sqlalchemy import create_engine, Column, String, Integer, Boolean, ForeignKey, DateTime, Text, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from sqlalchemy.sql import func
from app.core.config import settings

engine = create_engine(settings.POSTGRES_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, default="student")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    enrollments = relationship("Enrollment", back_populates="student")
    courses = relationship("Course", back_populates="instructor")

class Course(Base):
    __tablename__ = "courses"
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    instructor_id = Column(String, ForeignKey("users.id"))
    
    price = Column(Integer, default=0)
    category = Column(String, default="General")
    thumbnail_url = Column(String, nullable=True)
    status = Column(String, default="Draft")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    instructor = relationship("User", back_populates="courses")
    enrollments = relationship("Enrollment", back_populates="course")
    modules = relationship("Module", back_populates="course", cascade="all, delete-orphan")

class Module(Base):
    __tablename__ = "modules"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    course = relationship("Course", back_populates="modules")
    lessons = relationship("Lesson", back_populates="module", cascade="all, delete-orphan")

class Lesson(Base):
    __tablename__ = "lessons"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    video_url = Column(String, nullable=True)
    duration = Column(String, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    module = relationship("Module", back_populates="lessons")

class Enrollment(Base):
    __tablename__ = "enrollments"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")

class InstructorApplication(Base):
    __tablename__ = "instructor_applications"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    full_name = Column(String, nullable=False)
    expertise = Column(String, nullable=False)
    portfolio_url = Column(String, nullable=True)
    motivation = Column(Text, nullable=False)
    
    status = Column(String, default="pending") 
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="instructor_applications")

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)
    amount = Column(Integer, nullable=False) 
    
    razorpay_order_id = Column(String, unique=True, index=True, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    razorpay_signature = Column(String, nullable=True)
    
    status = Column(String, default="created") 
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("User", backref="orders")
    course = relationship("Course", backref="orders")

# ═════════════════════════════════════════════════════════
# 🚀 NEW: THE TELEMETRY ENGINE MODELS
# ═════════════════════════════════════════════════════════

class LessonProgress(Base):
    """Tracks exactly what a user is watching to power the 'Pick Up Where You Left Off' card."""
    __tablename__ = "lesson_progress"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), index=True, nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), index=True, nullable=False)
    
    is_completed = Column(Boolean, default=False)
    watch_time_seconds = Column(Integer, default=0) # 🚀 FIX 1: Meaningful consumption tracking
    
    # Automatically updates every time the backend upserts this row
    last_accessed_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # 🚀 FIX 2: Prevents the Race Condition duplicate row bug
    __table_args__ = (
        UniqueConstraint('student_id', 'lesson_id', name='uix_student_lesson'),
    )

    student = relationship("User")
    course = relationship("Course")
    lesson = relationship("Lesson")

class QuizAttempt(Base):
    """Tracks AI Quiz scores to calculate the user's overall platform average."""
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), index=True, nullable=False)
    
    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 🚀 FIX 3: Prevents DivisionByZero crashes in backend aggregations
    __table_args__ = (
        CheckConstraint('total_questions > 0', name='chk_valid_quiz'),
    )

    student = relationship("User")
    course = relationship("Course")

def init_postgres():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Failed to connect to PostgreSQL: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_student_courses(student_id: str) -> list[str]:
    db = SessionLocal()
    try:
        records = db.query(Enrollment.course_id).filter(Enrollment.student_id == student_id).all()
        return [record[0] for record in records]
    finally:
        db.close()

# ═════════════════════════════════════════════════════════
# 🚀 NEW: THE SOCIAL & STUDY ECOSYSTEM 
# ═════════════════════════════════════════════════════════

class Note(Base):
    """Individual timestamped notes tied to a specific lesson."""
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    
    # 🚀 Tying the note to the specific video they are watching
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False) 
    
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("User")
    course = relationship("Course")
    lesson = relationship("Lesson")


class Comment(Base):
    """Self-referencing table for 1-level deep threaded discussions."""
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # The Self-Referencing Magic: If NULL, it's a top-level comment. If set, it's a reply.
    parent_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    
    # UX Context for flat replies
    target_username = Column(String, nullable=True) 
    
    content = Column(Text, nullable=False)
    likes_count = Column(Integer, default=0)
    
    # Soft Deletes for RBAC Moderation
    is_deleted = Column(Boolean, default=False) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    course = relationship("Course")
    lesson = relationship("Lesson")
    # 🚀 THE FIX: Explicitly define the parent-child relationship direction
    replies = relationship("Comment", back_populates="parent", cascade="all, delete-orphan")
    parent = relationship("Comment", back_populates="replies", remote_side=[id])


class CommentLike(Base):
    """Anti-Spam Like Engine to ensure 1 User = 1 Like."""
    __tablename__ = "comment_likes"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    comment_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    __table_args__ = (
        UniqueConstraint('comment_id', 'user_id', name='uix_comment_user_like'),
    )