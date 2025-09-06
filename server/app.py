"""Flask application serving market data."""
from flask import Flask, jsonify, request
from market_service import MarketService

app = Flask(__name__, static_folder="../client", static_url_path="")
service = MarketService()


@app.route("/api/market")
def market() -> tuple:
    item = request.args.get("item")
    if not item:
        return jsonify({"error": "Missing item parameter"}), 400
    data = service.market_data(item)
    status = 200 if "error" not in data else 404
    return jsonify(data), status


@app.errorhandler(Exception)
def handle_exception(exc: Exception):  # pragma: no cover - generic handler
    return jsonify({"error": str(exc)}), 500


@app.route("/")
def index():
    return app.send_static_file("index.html")


if __name__ == "__main__":
    app.run(debug=True)
