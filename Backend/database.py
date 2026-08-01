from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.detection import Base

DATABASE_URL = "mysql+pymysql://root:@localhost:3307/moris"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base.metadata.create_all(bind=engine)
