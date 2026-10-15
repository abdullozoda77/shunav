"""Make an admin: python create_admin.py <username> <email> <password>
If the user already exists, it only gets admin rights."""
import sys

from database import SessionLocal, engine, Base
from crud import get_user_by_username, create_user
from schemas import UserCreate

Base.metadata.create_all(bind=engine)

if len(sys.argv) != 4:
    sys.exit(__doc__)

username, email, password = sys.argv[1:]
db = SessionLocal()
user = get_user_by_username(db, username.lower()) or create_user(
    db, UserCreate(name=username, username=username, email=email, password=password)
)
user.is_admin = True
db.commit()
print(f'{user.username} is admin now')
