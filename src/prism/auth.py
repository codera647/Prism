import base64
import hashlib
import hmac
import secrets
from .domain import Problem, identifier, timestamp


def password_hash(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    value = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1, dklen=32)
    return base64.b64encode(salt).decode() + ":" + base64.b64encode(value).decode()


def authenticate(store, name, password, register=False):
    name = name.strip().lower()
    if not 3 <= len(name) <= 40 or not all(c.isalnum() or c in "_-" for c in name):
        raise Problem("invalid_name", "Use 3–40 letters, numbers, underscores or hyphens.")
    if not 10 <= len(password) <= 200:
        raise Problem("invalid_password", "Use a password of 10–200 characters.")
    with store.connect(write=True) as db:
        if register:
            if db.execute("SELECT 1 FROM users WHERE name=?", (name,)).fetchone():
                raise Problem("name_taken", "That username is already in use.", 409)
            uid = identifier()
            db.execute("INSERT INTO users VALUES(?,?,?,?)", (uid, name, password_hash(password), timestamp()))
        else:
            row = db.execute("SELECT * FROM users WHERE name=?", (name,)).fetchone()
            expected = row["password"] if row else password_hash("dummy-password")
            salt = base64.b64decode(expected.split(":")[0])
            if not hmac.compare_digest(password_hash(password, salt), expected) or not row:
                raise Problem("login_failed", "Username or password is incorrect.", 401)
            uid = row["id"]
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        db.execute("DELETE FROM sessions WHERE expires<?", (timestamp(),))
        db.execute("INSERT INTO sessions VALUES(?,?,?,?)", (hashlib.sha256(token.encode()).hexdigest(), uid, csrf, timestamp() + 7*86400))
        store.audit(db, uid, "register" if register else "login", uid)
    return {"id": uid, "name": name, "csrf": csrf}, token


def principal(store, request):
    token = request.cookies.get("prism_session", "")
    with store.connect() as db:
        row = db.execute("SELECT users.id,users.name,sessions.csrf FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>?", (hashlib.sha256(token.encode()).hexdigest(), timestamp())).fetchone()
    if not row:
        raise Problem("unauthorized", "Sign in to open your boards.", 401)
    if request.method not in ("GET", "HEAD", "OPTIONS") and not hmac.compare_digest(request.headers.get("X-CSRF-Token", ""), row["csrf"]):
        raise Problem("csrf", "Refresh the page before trying again.", 403)
    return dict(row)
