import pymysql
from pymysql.cursors import Cursor, DictCursor
from app.core.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD


def _create_connection():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset="utf8mb4",
        autocommit=False,
        cursorclass=Cursor,
    )


def get_db():
    connection = _create_connection()
    try:
        yield connection
    finally:
        connection.close()


def get_dict_cursor(db):
    return db.cursor(DictCursor)