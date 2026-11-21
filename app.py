from pathlib import Path

from flask import Flask, redirect, send_from_directory, url_for

app = Flask(__name__)
PUBLIC_DIRECTORY = Path(app.root_path) / "public"


@app.route("/")
def index():
    return send_from_directory(PUBLIC_DIRECTORY, "index.html")


@app.route("/index.html")
def index_alias():
    return redirect(url_for("index"), code=308)


@app.route("/smart-room/")
def smart_room():
    return send_from_directory(PUBLIC_DIRECTORY / "smart-room", "index.html")


@app.route("/smart-room/index.html")
def smart_room_alias():
    return redirect(url_for("smart_room"), code=308)


@app.route("/<path:filename>")
def public_file(filename):
    return send_from_directory(PUBLIC_DIRECTORY, filename)


if __name__ == "__main__":
    app.run()
