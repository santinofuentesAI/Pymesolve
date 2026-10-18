const slides = Array.from(document.querySelectorAll(".slide"))
const count = document.getElementById("count")
let i = 0

function show(next) {
	i = (next + slides.length) % slides.length
	slides.forEach((slide, n) => slide.classList.toggle("on", n === i))
	count.textContent = `${i + 1} / ${slides.length}`
}

document.getElementById("prev").addEventListener("click", () => show(i - 1))
document.getElementById("next").addEventListener("click", () => show(i + 1))

document.addEventListener("keydown", (event) => {
	if (event.key === "ArrowRight" || event.key === "ArrowDown") show(i + 1)
	if (event.key === "ArrowLeft" || event.key === "ArrowUp") show(i - 1)
})
