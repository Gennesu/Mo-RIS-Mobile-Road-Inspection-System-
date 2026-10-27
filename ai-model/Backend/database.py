import os

from sqlalchemy import URL, create_engine
from sqlalchemy.orm import sessionmaker
from models.detection import Base

DATABASE_URL = URL.create(
    drivername="mysql+pymysql",
    username=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "3307")),
    database=os.getenv("DB_NAME", "moris"),
)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base.metadata.create_all(bind=engine)
