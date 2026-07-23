"""
================================================================
PERSONAL DIGITAL PORTFOLIO — AHNAF ADIB YUNAN
File: app.py | Tahap 4 dari 4 (Backend Flask)
================================================================
INDEX
00. Setup & Konfigurasi
01. Model Database (SQLite via SQLAlchemy)
02. Helper: Upload File & Auth Decorator
03. Rute Publik (index, assets, contact API)
04. Rute Admin: Auth (login/logout)
05. Rute Admin: Dashboard
06. Rute Admin: Biodata
07. Rute Admin: CRUD Projects
08. Rute Admin: CRUD Experience
09. Rute Admin: CRUD Proposal
10. Rute Admin: CRUD Certificates
11. Rute Admin: CRUD Gallery
12. Template Inline Admin (login, layout, dashboard, forms)
13. CLI & Inisialisasi Database
14. Entry Point
================================================================
"""

import os
import uuid
from datetime import datetime
from functools import wraps

from flask import (
    Flask, render_template, render_template_string, request, redirect,
    url_for, session, flash, jsonify, send_from_directory, abort
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_sqlalchemy import SQLAlchemy

# ----------------------------------------------------------------
# 00. SETUP & KONFIGURASI
# ----------------------------------------------------------------
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "ganti-dengan-kunci-rahasia-yang-kuat")
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(BASE_DIR, "database.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["MAX_CONTENT_LENGTH"] = 15 * 1024 * 1024  # 15 MB per upload

ALLOWED_IMAGE_EXT = {"jpg", "jpeg", "png", "webp"}
ALLOWED_DOC_EXT = {"pdf"}

SUBFOLDERS = {
    "projects": "projects",
    "certificates": "certificates",
    "proposals": "proposals",
    "gallery": "gallery",
}

# Jangan membuat folder saat berjalan di Vercel
if not os.environ.get("VERCEL"):
    for sub in SUBFOLDERS.values():
        os.makedirs(os.path.join(ASSETS_DIR, sub), exist_ok=True)

db = SQLAlchemy(app)


# ----------------------------------------------------------------
# 01. MODEL DATABASE
# ----------------------------------------------------------------
class AdminUser(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    def set_password(self, raw):
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw):
        return check_password_hash(self.password_hash, raw)


class Profile(db.Model):
    """Biodata pemilik website — didesain sebagai singleton (satu baris)."""
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), default="Ahnaf Adib Yunan")
    nickname = db.Column(db.String(60), default="Adib")
    birth_date = db.Column(db.String(40), default="9 Maret 2007")
    address = db.Column(db.String(120), default="Klodran")
    email = db.Column(db.String(120), default="adibyunan6@gmail.com")
    whatsapp = db.Column(db.String(30), default="085600251347")
    instagram = db.Column(db.String(60), default="@ahnapp_")
    linkedin = db.Column(db.String(120), default="")
    github = db.Column(db.String(120), default="")
    university = db.Column(db.String(150), default="Institut Teknologi Sepuluh Nopember")
    program_studi = db.Column(db.String(120), default="Sistem Informasi")
    about_lead = db.Column(db.Text, default="")
    about_body = db.Column(db.Text, default="")


class Experience(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    period = db.Column(db.String(60), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    organization = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, default="")
    category = db.Column(db.String(60), default="Organisasi")
    order = db.Column(db.Integer, default=0)


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, default="")
    technologies = db.Column(db.String(255), default="")  # comma-separated
    thumbnail = db.Column(db.String(255), default="")
    github = db.Column(db.String(255), default="")
    demo = db.Column(db.String(255), default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def tech_list(self):
        return [t.strip() for t in self.technologies.split(",") if t.strip()]


class Proposal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(80), default="Akademik")
    date = db.Column(db.String(40), default="")
    file_path = db.Column(db.String(255), nullable=False)


class Certificate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    image_path = db.Column(db.String(255), nullable=False)
    issued_by = db.Column(db.String(150), default="")
    year = db.Column(db.String(10), default="")


class GalleryPhoto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    caption = db.Column(db.String(150), default="")
    category = db.Column(db.String(40), default="kegiatan")  # kegiatan/organisasi/proyek/seminar
    image_path = db.Column(db.String(255), nullable=False)


class ContactMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)


# ----------------------------------------------------------------
# 02. HELPER: UPLOAD FILE & AUTH DECORATOR
# ----------------------------------------------------------------
def allowed_file(filename, allowed_ext):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_ext


def save_upload(file_storage, subfolder, allowed_ext):
    """Simpan file upload dengan nama unik, kembalikan path relatif ('subfolder/nama.ext')."""
    if not file_storage or file_storage.filename == "":
        return None
    if not allowed_file(file_storage.filename, allowed_ext):
        raise ValueError("Tipe file tidak diizinkan.")
    ext = file_storage.filename.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    safe_name = secure_filename(unique_name)
    dest = os.path.join(ASSETS_DIR, subfolder, safe_name)
    file_storage.save(dest)
    return f"{subfolder}/{safe_name}"


def login_required(view_fn):
    @wraps(view_fn)
    def wrapped(*args, **kwargs):
        if not session.get("admin_id"):
            flash("Silakan login terlebih dahulu.", "error")
            return redirect(url_for("admin_login", next=request.path))
        return view_fn(*args, **kwargs)
    return wrapped


# ----------------------------------------------------------------
# 03. RUTE PUBLIK
# ----------------------------------------------------------------
@app.route("/assets/<path:filename>")
def assets(filename):
    """Menyajikan file dari folder assets/ (foto, cv, proposal, sertifikat, galeri)."""
    return send_from_directory(ASSETS_DIR, filename)


@app.route("/")
def index():
    profile = Profile.query.first()
    experiences = Experience.query.order_by(Experience.order.asc(), Experience.id.desc()).all()
    projects = Project.query.order_by(Project.created_at.desc()).all()
    proposals = Proposal.query.order_by(Proposal.id.desc()).all()
    certificates = Certificate.query.order_by(Certificate.id.desc()).all()
    gallery_photos = GalleryPhoto.query.order_by(GalleryPhoto.id.desc()).all()

    # Bentuk ulang data proyek agar cocok dengan Jinja di index.html (project.thumbnail = URL penuh)
    projects_ctx = [{
        "id": p.id, "title": p.title, "description": p.description,
        "technologies": p.tech_list(),
        "thumbnail": url_for("assets", filename=p.thumbnail) if p.thumbnail else "",
        "github": p.github, "demo": p.demo,
    } for p in projects]

    proposals_ctx = [{
        "title": d.title, "category": d.category, "date": d.date,
        "file_url": url_for("assets", filename=d.file_path),
    } for d in proposals]

    certificates_ctx = [{
        "title": c.title, "image_url": url_for("assets", filename=c.image_path),
    } for c in certificates]

    gallery_ctx = [{
        "caption": g.caption, "category": g.category,
        "url": url_for("assets", filename=g.image_path),
    } for g in gallery_photos]

    return render_template(
        "index.html",
        profile=profile,
        experiences=experiences,
        projects=projects_ctx,
        proposals=proposals_ctx,
        certificates=certificates_ctx,
        gallery_photos=gallery_ctx,
    )


@app.route("/api/contact", methods=["POST"])
def api_contact():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    message = (data.get("message") or "").strip()

    if len(name) < 2 or "@" not in email or len(message) < 10:
        return jsonify({"ok": False, "error": "Data tidak valid."}), 400

    entry = ContactMessage(name=name, email=email, message=message)
    db.session.add(entry)
    db.session.commit()
    return jsonify({"ok": True})


# ----------------------------------------------------------------
# 04. RUTE ADMIN: AUTH
# ----------------------------------------------------------------
@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        user = AdminUser.query.filter_by(username=username).first()
        if user and user.check_password(password):
            session["admin_id"] = user.id
            flash("Berhasil masuk.", "success")
            return redirect(request.args.get("next") or url_for("admin_dashboard"))
        flash("Username atau password salah.", "error")
    return render_template_string(TPL_LOGIN)


@app.route("/admin/logout")
def admin_logout():
    session.pop("admin_id", None)
    flash("Berhasil keluar.", "success")
    return redirect(url_for("admin_login"))


# ----------------------------------------------------------------
# 05. RUTE ADMIN: DASHBOARD
# ----------------------------------------------------------------
@app.route("/admin")
@login_required
def admin_dashboard():
    stats = {
        "projects": Project.query.count(),
        "experiences": Experience.query.count(),
        "proposals": Proposal.query.count(),
        "certificates": Certificate.query.count(),
        "gallery": GalleryPhoto.query.count(),
        "messages": ContactMessage.query.count(),
        "unread": ContactMessage.query.filter_by(is_read=False).count(),
    }
    messages = ContactMessage.query.order_by(ContactMessage.created_at.desc()).limit(5).all()
    return render_admin(TPL_DASHBOARD, stats=stats, messages=messages)


# ----------------------------------------------------------------
# 06. RUTE ADMIN: BIODATA
# ----------------------------------------------------------------
@app.route("/admin/profile", methods=["GET", "POST"])
@login_required
def admin_profile():
    profile = Profile.query.first()
    if not profile:
        profile = Profile()
        db.session.add(profile)
        db.session.commit()

    if request.method == "POST":
        for field in ["full_name", "nickname", "birth_date", "address", "email",
                      "whatsapp", "instagram", "linkedin", "github",
                      "university", "program_studi", "about_lead", "about_body"]:
            setattr(profile, field, request.form.get(field, "").strip())
        db.session.commit()
        flash("Biodata berhasil diperbarui.", "success")
        return redirect(url_for("admin_profile"))

    return render_admin(TPL_PROFILE, profile=profile)


# ----------------------------------------------------------------
# 07. RUTE ADMIN: CRUD PROJECTS
# ----------------------------------------------------------------
@app.route("/admin/projects", methods=["GET", "POST"])
@login_required
def admin_projects():
    if request.method == "POST":
        try:
            thumb_path = save_upload(request.files.get("thumbnail"), SUBFOLDERS["projects"], ALLOWED_IMAGE_EXT)
        except ValueError as e:
            flash(str(e), "error")
            return redirect(url_for("admin_projects"))

        project = Project(
            title=request.form.get("title", "").strip(),
            description=request.form.get("description", "").strip(),
            technologies=request.form.get("technologies", "").strip(),
            thumbnail=thumb_path or "",
            github=request.form.get("github", "").strip(),
            demo=request.form.get("demo", "").strip(),
        )
        db.session.add(project)
        db.session.commit()
        flash("Proyek berhasil ditambahkan.", "success")
        return redirect(url_for("admin_projects"))

    projects = Project.query.order_by(Project.created_at.desc()).all()
    return render_admin(TPL_PROJECTS, projects=projects)


@app.route("/admin/projects/<int:project_id>/delete", methods=["POST"])
@login_required
def admin_projects_delete(project_id):
    project = Project.query.get_or_404(project_id)
    db.session.delete(project)
    db.session.commit()
    flash("Proyek dihapus.", "success")
    return redirect(url_for("admin_projects"))


# ----------------------------------------------------------------
# 08. RUTE ADMIN: CRUD EXPERIENCE
# ----------------------------------------------------------------
@app.route("/admin/experience", methods=["GET", "POST"])
@login_required
def admin_experience():
    if request.method == "POST":
        exp = Experience(
            period=request.form.get("period", "").strip(),
            title=request.form.get("title", "").strip(),
            organization=request.form.get("organization", "").strip(),
            description=request.form.get("description", "").strip(),
            category=request.form.get("category", "Organisasi").strip(),
        )
        db.session.add(exp)
        db.session.commit()
        flash("Pengalaman berhasil ditambahkan.", "success")
        return redirect(url_for("admin_experience"))

    experiences = Experience.query.order_by(Experience.id.desc()).all()
    return render_admin(TPL_EXPERIENCE, experiences=experiences)


@app.route("/admin/experience/<int:exp_id>/delete", methods=["POST"])
@login_required
def admin_experience_delete(exp_id):
    exp = Experience.query.get_or_404(exp_id)
    db.session.delete(exp)
    db.session.commit()
    flash("Pengalaman dihapus.", "success")
    return redirect(url_for("admin_experience"))


# ----------------------------------------------------------------
# 09. RUTE ADMIN: CRUD PROPOSAL
# ----------------------------------------------------------------
@app.route("/admin/proposals", methods=["GET", "POST"])
@login_required
def admin_proposals():
    if request.method == "POST":
        try:
            file_path = save_upload(request.files.get("file"), SUBFOLDERS["proposals"], ALLOWED_DOC_EXT)
        except ValueError as e:
            flash(str(e), "error")
            return redirect(url_for("admin_proposals"))

        if not file_path:
            flash("File PDF wajib diunggah.", "error")
            return redirect(url_for("admin_proposals"))

        doc = Proposal(
            title=request.form.get("title", "").strip(),
            category=request.form.get("category", "Akademik").strip(),
            date=request.form.get("date", "").strip(),
            file_path=file_path,
        )
        db.session.add(doc)
        db.session.commit()
        flash("Proposal berhasil diunggah.", "success")
        return redirect(url_for("admin_proposals"))

    proposals = Proposal.query.order_by(Proposal.id.desc()).all()
    return render_admin(TPL_PROPOSALS, proposals=proposals)


@app.route("/admin/proposals/<int:doc_id>/delete", methods=["POST"])
@login_required
def admin_proposals_delete(doc_id):
    doc = Proposal.query.get_or_404(doc_id)
    db.session.delete(doc)
    db.session.commit()
    flash("Proposal dihapus.", "success")
    return redirect(url_for("admin_proposals"))


# ----------------------------------------------------------------
# 10. RUTE ADMIN: CRUD CERTIFICATES
# ----------------------------------------------------------------
@app.route("/admin/certificates", methods=["GET", "POST"])
@login_required
def admin_certificates():
    if request.method == "POST":
        try:
            image_path = save_upload(request.files.get("image"), SUBFOLDERS["certificates"], ALLOWED_IMAGE_EXT)
        except ValueError as e:
            flash(str(e), "error")
            return redirect(url_for("admin_certificates"))

        if not image_path:
            flash("Gambar sertifikat wajib diunggah.", "error")
            return redirect(url_for("admin_certificates"))

        cert = Certificate(
            title=request.form.get("title", "").strip(),
            issued_by=request.form.get("issued_by", "").strip(),
            year=request.form.get("year", "").strip(),
            image_path=image_path,
        )
        db.session.add(cert)
        db.session.commit()
        flash("Sertifikat berhasil ditambahkan.", "success")
        return redirect(url_for("admin_certificates"))

    certificates = Certificate.query.order_by(Certificate.id.desc()).all()
    return render_admin(TPL_CERTIFICATES, certificates=certificates)


@app.route("/admin/certificates/<int:cert_id>/delete", methods=["POST"])
@login_required
def admin_certificates_delete(cert_id):
    cert = Certificate.query.get_or_404(cert_id)
    db.session.delete(cert)
    db.session.commit()
    flash("Sertifikat dihapus.", "success")
    return redirect(url_for("admin_certificates"))


# ----------------------------------------------------------------
# 11. RUTE ADMIN: CRUD GALLERY
# ----------------------------------------------------------------
@app.route("/admin/gallery", methods=["GET", "POST"])
@login_required
def admin_gallery():
    if request.method == "POST":
        try:
            image_path = save_upload(request.files.get("image"), SUBFOLDERS["gallery"], ALLOWED_IMAGE_EXT)
        except ValueError as e:
            flash(str(e), "error")
            return redirect(url_for("admin_gallery"))

        if not image_path:
            flash("Foto wajib diunggah.", "error")
            return redirect(url_for("admin_gallery"))

        photo = GalleryPhoto(
            caption=request.form.get("caption", "").strip(),
            category=request.form.get("category", "kegiatan").strip(),
            image_path=image_path,
        )
        db.session.add(photo)
        db.session.commit()
        flash("Foto berhasil ditambahkan ke galeri.", "success")
        return redirect(url_for("admin_gallery"))

    photos = GalleryPhoto.query.order_by(GalleryPhoto.id.desc()).all()
    return render_admin(TPL_GALLERY, photos=photos)


@app.route("/admin/gallery/<int:photo_id>/delete", methods=["POST"])
@login_required
def admin_gallery_delete(photo_id):
    photo = GalleryPhoto.query.get_or_404(photo_id)
    db.session.delete(photo)
    db.session.commit()
    flash("Foto dihapus.", "success")
    return redirect(url_for("admin_gallery"))


# ----------------------------------------------------------------
# 12. TEMPLATE INLINE ADMIN
#     (Panel admin sengaja dibuat inline di app.py agar proyek tetap
#     hanya terdiri dari 4 file utama sesuai spesifikasi. Panel ini
#     memakai style.css yang sama dengan halaman publik.)
# ----------------------------------------------------------------
TPL_BASE = """
<!DOCTYPE html>
<html lang="id" data-theme="light">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin — {{ title|default('Dashboard') }}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{{ url_for('static', filename='style.css') }}">
<style>
  body{background:var(--bg-alt);} 
  .admin-shell{max-width:960px;margin:0 auto;padding:2.5rem 1.5rem;}
  .admin-nav{display:flex;gap:1.25rem;flex-wrap:wrap;margin-bottom:2rem;font-size:.9rem;}
  .admin-nav a{padding:.5rem .9rem;border-radius:999px;border:1px solid var(--border);}
  .admin-nav a.is-active{background:var(--ink);color:var(--bg);}
  .admin-card{background:var(--bg);border-radius:var(--radius-md);padding:1.75rem;box-shadow:var(--shadow-sm);margin-bottom:1.5rem;}
  .admin-flash{padding:.8rem 1.1rem;border-radius:var(--radius-sm);margin-bottom:1rem;font-size:.9rem;}
  .admin-flash.success{background:#DCFCE7;color:#166534;}
  .admin-flash.error{background:#FEE2E2;color:#991B1B;}
  .admin-form label{display:block;font-size:.8rem;color:var(--ink-soft);margin-bottom:.35rem;margin-top:1rem;}
  .admin-form input, .admin-form textarea, .admin-form select{width:100%;padding:.7rem .9rem;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-alt);}
  .admin-table{width:100%;border-collapse:collapse;font-size:.9rem;margin-top:1rem;}
  .admin-table th, .admin-table td{text-align:left;padding:.6rem .5rem;border-bottom:1px solid var(--border);}
  .stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;}
  .stat-card{background:var(--bg);border-radius:var(--radius-sm);padding:1.25rem;box-shadow:var(--shadow-sm);}
  .stat-card b{font-size:1.6rem;display:block;font-family:var(--font-display);}
</style>
</head>
<body>
<div class="admin-shell">
  <div class="admin-nav">
    <a href="{{ url_for('admin_dashboard') }}">Dashboard</a>
    <a href="{{ url_for('admin_profile') }}">Biodata</a>
    <a href="{{ url_for('admin_projects') }}">Projects</a>
    <a href="{{ url_for('admin_experience') }}">Experience</a>
    <a href="{{ url_for('admin_proposals') }}">Proposal</a>
    <a href="{{ url_for('admin_certificates') }}">Certificates</a>
    <a href="{{ url_for('admin_gallery') }}">Gallery</a>
    <a href="{{ url_for('index') }}" target="_blank">Lihat Situs &rarr;</a>
    <a href="{{ url_for('admin_logout') }}">Keluar</a>
  </div>

  {% with messages = get_flashed_messages(with_categories=true) %}
    {% for category, msg in messages %}
      <div class="admin-flash {{ category }}">{{ msg }}</div>
    {% endfor %}
  {% endwith %}

  {{ body|safe }}
</div>
</body>
</html>
"""

def render_admin(body_template, **ctx):
    body = render_template_string(body_template, **ctx)
    return render_template_string(TPL_BASE, body=body, **ctx)


TPL_LOGIN = """
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin Login</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{{ url_for('static', filename='style.css') }}">
<style>
  body{display:grid;place-items:center;min-height:100vh;background:var(--bg-alt);}
  .login-card{background:var(--bg);padding:2.5rem;border-radius:var(--radius-md);box-shadow:var(--shadow-md);width:min(360px,90vw);}
  .login-card h1{font-size:1.3rem;margin-bottom:1.5rem;}
  .login-card label{display:block;font-size:.8rem;color:var(--ink-soft);margin-bottom:.35rem;margin-top:1rem;}
  .login-card input{width:100%;padding:.75rem .9rem;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-alt);}
  .flash-error{color:#E5484D;font-size:.85rem;margin-bottom:1rem;}
</style>
</head>
<body>
  <form class="login-card" method="POST">
    <h1>Masuk sebagai Admin</h1>
    {% with messages = get_flashed_messages(with_categories=true) %}
      {% for category, msg in messages %}<div class="flash-error">{{ msg }}</div>{% endfor %}
    {% endwith %}
    <label for="username">Username</label>
    <input type="text" id="username" name="username" required autofocus>
    <label for="password">Password</label>
    <input type="password" id="password" name="password" required>
    <button type="submit" class="btn btn--primary" style="margin-top:1.5rem;width:100%;">Masuk</button>
  </form>
</body>
</html>
"""

TPL_DASHBOARD = """
<h2 class="section-title" style="font-size:1.6rem;margin-bottom:1.5rem;">Ringkasan</h2>
<div class="stat-grid">
  <div class="stat-card"><b>{{ stats.projects }}</b>Projects</div>
  <div class="stat-card"><b>{{ stats.experiences }}</b>Experience</div>
  <div class="stat-card"><b>{{ stats.proposals }}</b>Proposal</div>
  <div class="stat-card"><b>{{ stats.certificates }}</b>Certificates</div>
  <div class="stat-card"><b>{{ stats.gallery }}</b>Gallery</div>
  <div class="stat-card"><b>{{ stats.unread }}</b>Pesan Belum Dibaca</div>
</div>

<div class="admin-card">
  <h3 style="margin-bottom:1rem;">Pesan Terbaru</h3>
  <table class="admin-table">
    <thead><tr><th>Nama</th><th>Email</th><th>Pesan</th><th>Tanggal</th></tr></thead>
    <tbody>
      {% for m in messages %}
      <tr>
        <td>{{ m.name }}</td><td>{{ m.email }}</td>
        <td>{{ m.message[:60] }}{% if m.message|length > 60 %}…{% endif %}</td>
        <td>{{ m.created_at.strftime('%d %b %Y') }}</td>
      </tr>
      {% else %}
      <tr><td colspan="4">Belum ada pesan masuk.</td></tr>
      {% endfor %}
    </tbody>
  </table>
</div>
"""

TPL_PROFILE = """
<div class="admin-card">
  <h2 style="margin-bottom:1rem;">Edit Biodata</h2>
  <form method="POST" class="admin-form">
    <label>Nama Lengkap</label><input name="full_name" value="{{ profile.full_name }}">
    <label>Nama Panggilan</label><input name="nickname" value="{{ profile.nickname }}">
    <label>Tanggal Lahir</label><input name="birth_date" value="{{ profile.birth_date }}">
    <label>Alamat</label><input name="address" value="{{ profile.address }}">
    <label>Email</label><input name="email" value="{{ profile.email }}">
    <label>WhatsApp</label><input name="whatsapp" value="{{ profile.whatsapp }}">
    <label>Instagram</label><input name="instagram" value="{{ profile.instagram }}">
    <label>LinkedIn (URL)</label><input name="linkedin" value="{{ profile.linkedin }}">
    <label>GitHub (URL)</label><input name="github" value="{{ profile.github }}">
    <label>Universitas</label><input name="university" value="{{ profile.university }}">
    <label>Program Studi</label><input name="program_studi" value="{{ profile.program_studi }}">
    <label>Deskripsi Singkat (About Lead)</label><textarea name="about_lead" rows="3">{{ profile.about_lead }}</textarea>
    <label>Deskripsi Lengkap (About Body)</label><textarea name="about_body" rows="5">{{ profile.about_body }}</textarea>
    <button type="submit" class="btn btn--primary" style="margin-top:1.5rem;">Simpan Perubahan</button>
  </form>
</div>
"""

TPL_PROJECTS = """
<div class="admin-card">
  <h2 style="margin-bottom:1rem;">Tambah Project</h2>
  <form method="POST" enctype="multipart/form-data" class="admin-form">
    <label>Judul</label><input name="title" required>
    <label>Deskripsi</label><textarea name="description" rows="3"></textarea>
    <label>Teknologi (pisahkan dengan koma)</label><input name="technologies" placeholder="Flask, JavaScript, SQLite">
    <label>Thumbnail</label><input type="file" name="thumbnail" accept="image/*">
    <label>Link GitHub</label><input name="github" placeholder="https://github.com/...">
    <label>Link Demo</label><input name="demo" placeholder="https://...">
    <button type="submit" class="btn btn--primary" style="margin-top:1.5rem;">Tambah Project</button>
  </form>
</div>

<div class="admin-card">
  <h3 style="margin-bottom:1rem;">Daftar Project</h3>
  <table class="admin-table">
    <thead><tr><th>Judul</th><th>Teknologi</th><th></th></tr></thead>
    <tbody>
      {% for p in projects %}
      <tr>
        <td>{{ p.title }}</td><td>{{ p.technologies }}</td>
        <td>
          <form method="POST" action="{{ url_for('admin_projects_delete', project_id=p.id) }}" style="display:inline;" onsubmit="return confirm('Hapus project ini?');">
            <button type="submit" class="btn btn--ghost btn--sm">Hapus</button>
          </form>
        </td>
      </tr>
      {% else %}<tr><td colspan="3">Belum ada project.</td></tr>{% endfor %}
    </tbody>
  </table>
</div>
"""

TPL_EXPERIENCE = """
<div class="admin-card">
  <h2 style="margin-bottom:1rem;">Tambah Pengalaman</h2>
  <form method="POST" class="admin-form">
    <label>Periode</label><input name="period" placeholder="2024 — Sekarang" required>
    <label>Judul / Peran</label><input name="title" required>
    <label>Organisasi</label><input name="organization" required>
    <label>Deskripsi</label><textarea name="description" rows="3"></textarea>
    <label>Kategori</label>
    <select name="category">
      <option>Organisasi</option><option>Volunteer</option><option>Committee</option>
      <option>Leadership</option><option>Seminar</option><option>Pelatihan</option><option>Internship</option>
    </select>
    <button type="submit" class="btn btn--primary" style="margin-top:1.5rem;">Tambah</button>
  </form>
</div>

<div class="admin-card">
  <h3 style="margin-bottom:1rem;">Daftar Pengalaman</h3>
  <table class="admin-table">
    <thead><tr><th>Periode</th><th>Judul</th><th>Organisasi</th><th></th></tr></thead>
    <tbody>
      {% for e in experiences %}
      <tr>
        <td>{{ e.period }}</td><td>{{ e.title }}</td><td>{{ e.organization }}</td>
        <td>
          <form method="POST" action="{{ url_for('admin_experience_delete', exp_id=e.id) }}" style="display:inline;" onsubmit="return confirm('Hapus data ini?');">
            <button type="submit" class="btn btn--ghost btn--sm">Hapus</button>
          </form>
        </td>
      </tr>
      {% else %}<tr><td colspan="4">Belum ada data.</td></tr>{% endfor %}
    </tbody>
  </table>
</div>
"""

TPL_PROPOSALS = """
<div class="admin-card">
  <h2 style="margin-bottom:1rem;">Unggah Proposal</h2>
  <form method="POST" enctype="multipart/form-data" class="admin-form">
    <label>Judul</label><input name="title" required>
    <label>Kategori</label><input name="category" placeholder="Akademik / Organisasi / Lomba">
    <label>Tanggal</label><input name="date" placeholder="2025">
    <label>File PDF</label><input type="file" name="file" accept="application/pdf" required>
    <button type="submit" class="btn btn--primary" style="margin-top:1.5rem;">Unggah</button>
  </form>
</div>

<div class="admin-card">
  <h3 style="margin-bottom:1rem;">Daftar Proposal</h3>
  <table class="admin-table">
    <thead><tr><th>Judul</th><th>Kategori</th><th></th></tr></thead>
    <tbody>
      {% for d in proposals %}
      <tr>
        <td>{{ d.title }}</td><td>{{ d.category }}</td>
        <td>
          <form method="POST" action="{{ url_for('admin_proposals_delete', doc_id=d.id) }}" style="display:inline;" onsubmit="return confirm('Hapus proposal ini?');">
            <button type="submit" class="btn btn--ghost btn--sm">Hapus</button>
          </form>
        </td>
      </tr>
      {% else %}<tr><td colspan="3">Belum ada proposal.</td></tr>{% endfor %}
    </tbody>
  </table>
</div>
"""

TPL_CERTIFICATES = """
<div class="admin-card">
  <h2 style="margin-bottom:1rem;">Tambah Sertifikat</h2>
  <form method="POST" enctype="multipart/form-data" class="admin-form">
    <label>Judul</label><input name="title" required>
    <label>Diterbitkan Oleh</label><input name="issued_by">
    <label>Tahun</label><input name="year" placeholder="2025">
    <label>Gambar</label><input type="file" name="image" accept="image/*" required>
    <button type="submit" class="btn btn--primary" style="margin-top:1.5rem;">Tambah</button>
  </form>
</div>

<div class="admin-card">
  <h3 style="margin-bottom:1rem;">Daftar Sertifikat</h3>
  <table class="admin-table">
    <thead><tr><th>Judul</th><th>Penerbit</th><th>Tahun</th><th></th></tr></thead>
    <tbody>
      {% for c in certificates %}
      <tr>
        <td>{{ c.title }}</td><td>{{ c.issued_by }}</td><td>{{ c.year }}</td>
        <td>
          <form method="POST" action="{{ url_for('admin_certificates_delete', cert_id=c.id) }}" style="display:inline;" onsubmit="return confirm('Hapus sertifikat ini?');">
            <button type="submit" class="btn btn--ghost btn--sm">Hapus</button>
          </form>
        </td>
      </tr>
      {% else %}<tr><td colspan="4">Belum ada sertifikat.</td></tr>{% endfor %}
    </tbody>
  </table>
</div>
"""

TPL_GALLERY = """
<div class="admin-card">
  <h2 style="margin-bottom:1rem;">Tambah Foto Galeri</h2>
  <form method="POST" enctype="multipart/form-data" class="admin-form">
    <label>Keterangan</label><input name="caption">
    <label>Kategori</label>
    <select name="category">
      <option value="kegiatan">Kegiatan</option>
      <option value="organisasi">Organisasi</option>
      <option value="proyek">Proyek</option>
      <option value="seminar">Seminar</option>
    </select>
    <label>Foto</label><input type="file" name="image" accept="image/*" required>
    <button type="submit" class="btn btn--primary" style="margin-top:1.5rem;">Tambah</button>
  </form>
</div>

<div class="admin-card">
  <h3 style="margin-bottom:1rem;">Daftar Foto</h3>
  <table class="admin-table">
    <thead><tr><th>Keterangan</th><th>Kategori</th><th></th></tr></thead>
    <tbody>
      {% for g in photos %}
      <tr>
        <td>{{ g.caption }}</td><td>{{ g.category }}</td>
        <td>
          <form method="POST" action="{{ url_for('admin_gallery_delete', photo_id=g.id) }}" style="display:inline;" onsubmit="return confirm('Hapus foto ini?');">
            <button type="submit" class="btn btn--ghost btn--sm">Hapus</button>
          </form>
        </td>
      </tr>
      {% else %}<tr><td colspan="3">Belum ada foto.</td></tr>{% endfor %}
    </tbody>
  </table>
</div>
"""

# ----------------------------------------------------------------
# 13. CLI & INISIALISASI DATABASE
# ----------------------------------------------------------------
@app.cli.command("init-db")
def init_db_command():
    """Perintah: flask --app app.py init-db"""
    db.create_all()
    if not AdminUser.query.filter_by(username="admin").first():
        admin = AdminUser(username="admin")
        admin.set_password("gantipassword123")
        db.session.add(admin)
    if not Profile.query.first():
        db.session.add(Profile())
    db.session.commit()
    print("Database siap. Login admin default -> username: admin | password: gantipassword123")
    print("PENTING: segera ganti password ini setelah login pertama.")


def ensure_db():
    with app.app_context():
        db.create_all()
        if not AdminUser.query.filter_by(username="admin").first():
            admin = AdminUser(username="admin")
            admin.set_password("gantipassword123")
            db.session.add(admin)
        if not Profile.query.first():
            db.session.add(Profile())
        db.session.commit()


# ----------------------------------------------------------------
# 14. ENTRY POINT
# ----------------------------------------------------------------
if __name__ == "__main__":
    ensure_db()
    app.run(debug=True)
