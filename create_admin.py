"""Make an admin:  python create_admin.py <username> <email> <password>
If the user already exists, it only gets admin rights."""
import sys

from auth import hash_password
from database import Base, SessionLocal, engine
from models import User

Base.metadata.create_all(bind=engine)

if len(sys.argv) != 4:
    sys.exit(__doc__)

username, email, password = sys.argv[1], sys.argv[2], sys.argv[3]
db = SessionLocal()

user = db.query(User).filter(User.username == username.lower()).first()
if user is None:
    user = User(name=username, username=username.lower(), email=email.lower(), password_hash=hash_password(password))
    db.add(user)

user.is_admin = True
db.commit()
print(f'{user.username} is admin now')
