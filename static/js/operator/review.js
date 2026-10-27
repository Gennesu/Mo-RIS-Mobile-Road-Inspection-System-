const reviewCards = document.querySelectorAll("[data-review-id]");
const reviewCount = document.getElementById("review-count");

reviewCards.forEach((card) => {
    card.querySelectorAll("[data-decision]").forEach((button) => {
        button.addEventListener("click", async () => {
            const feedback = card.querySelector(".review-feedback");
            const buttons = card.querySelectorAll("button");
            const decision = button.dataset.decision;
            const note = card.querySelector(".review-note")?.value.trim() || "";
            buttons.forEach((item) => { item.disabled = true; });
            feedback.textContent = "Menyimpan keputusan…";

            try {
                const response = await fetch(`/operator/review/${card.dataset.reviewId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ decision, note }),
                });
                const result = await response.json();
                if (!response.ok || !result.ok) {
                    throw new Error(result.error || "Keputusan gagal disimpan.");
                }

                card.remove();
                const remaining = document.querySelectorAll("[data-review-id]").length;
                if (reviewCount) reviewCount.textContent = String(remaining);
                if (remaining === 0) {
                    const grid = document.querySelector(".review-grid");
                    if (grid) {
                        grid.outerHTML = '<section class="review-empty"><span aria-hidden="true">✓</span><h2>Antrean verifikasi kosong</h2><p>Deteksi baru akan muncul di sini setelah kamera mengirimkannya.</p></section>';
                    }
                }
            } catch (error) {
                feedback.textContent = error.message || "Terjadi kesalahan.";
                buttons.forEach((item) => { item.disabled = false; });
            }
        });
    });
});
